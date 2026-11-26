import {
  computeBoxAreaRatio,
  computeBoxCenterDistance,
  computeBoxIoU,
  extractSignalsFromIncident,
  type NotificationEnrichedSignals,
} from "@/lib/notification-enrichment";
import type {
  EvidenceItem,
  IncidentAssignmentItem,
  IncidentItem,
  IncidentSeverity,
  IncidentStatus,
  IncidentStatusHistoryItem,
} from "@/types";

export type IncidentAggregationMode = "clustered" | "raw";

export type IncidentClusterMatchMethod =
  | "EXACT_TRACK"
  | "SPATIAL_IOU"
  | "SINGLE";

export interface IncidentClusteringOptions {
  /** Cửa sổ thời gian gom theo cùng person track_id trên cùng camera (giây, mặc định 45s) */
  trackWindowSeconds?: number;
  /** Cửa sổ thời gian gom theo trùng khớp bounding box IoU (giây, mặc định 15s) */
  spatialWindowSeconds?: number;
  /** Ngưỡng IoU tối thiểu cho tầng SPATIAL_IOU (mặc định 0.45) */
  minSpatialIoU?: number;
}

export interface IncidentCluster {
  /** ID đại diện ổn định của cụm (ID bản ghi mới nhất trong cụm) */
  clusterId: string;
  /** Bản ghi mới nhất đại diện cho cụm */
  primary: IncidentItem;
  /** Toàn bộ các bản ghi thành phần trong cụm (mới nhất -> cũ nhất) */
  items: IncidentItem[];
  /** Tín hiệu trích xuất tương ứng từng bản ghi */
  signals: NotificationEnrichedSignals[];
  /** Tổng số bản ghi gốc trong DB được gom vào cụm */
  rawCount: number;
  /** Danh sách ID các bản ghi gốc thuộc cụm */
  incidentIds: string[];
  /** true nếu cụm gộp >= 2 loại vi phạm khác nhau hoặc có bản ghi MULTI_VIOLATION */
  isMultiViolation: boolean;
  /** Loại vi phạm chuẩn hóa của cụm (MULTI_VIOLATION hoặc mã đơn lẻ) */
  effectiveViolationType: string;
  /** Danh sách mã loại vi phạm thành phần duy nhất (VD: ["NO_HELMET", "NO_VEST"]) */
  violationCodes: string[];
  /** Mức độ nghiêm trọng cao nhất trong cụm */
  effectiveSeverity: IncidentSeverity | string;
  /** Trạng thái vòng đời tổng hợp của cụm */
  effectiveStatus: IncidentStatus | string;
  /** Thời điểm phát hiện sớm nhất (ISO) */
  earliestDetectedAt: string;
  /** Thời điểm phát hiện gần nhất (ISO) */
  latestDetectedAt: string;
  /** Thời điểm xử lý xong cuối cùng (chỉ có khi toàn cụm đã RESOLVED/CLOSED) */
  effectiveResolvedAt: string | null;
  /** Track ID định danh người vi phạm (nếu có) */
  personTrackId: number | null;
  /** Camera ID của cụm */
  cameraId: string;
  /** Phương thức khớp ưu tiên nhất của cụm */
  matchMethod: IncidentClusterMatchMethod;
  /** Toàn bộ lý do khớp giữa các thành viên */
  matchReasons: Array<"EXACT_TRACK" | "SPATIAL_IOU">;
  /** % trùng khớp khung người cao nhất (nếu khớp qua SPATIAL_IOU) */
  bestSpatialIoUPct: number | null;
}

export interface IncidentClusterStatusCounts {
  total: number;
  rawTotal: number;
  pendingReview: number;
  confirmed: number;
  resolved: number;
  closed: number;
  dismissed: number;
  critical: number;
  multiViolation: number;
}

export const DEFAULT_INCIDENT_CLUSTERING_OPTIONS: Required<IncidentClusteringOptions> =
  {
    trackWindowSeconds: 45,
    spatialWindowSeconds: 15,
    minSpatialIoU: 0.45,
  };

const SEVERITY_RANK: Record<string, number> = {
  LOW: 1,
  NORMAL: 2,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

class DisjointSet {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    let curr = x;
    while (this.parent[curr] !== root) {
      const next = this.parent[curr];
      this.parent[curr] = root;
      curr = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (ra < rb) this.parent[rb] = ra;
    else this.parent[ra] = rb;
  }
}

function normalizeViolationCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;
  if (trimmed === "NO_HARDHAT" || trimmed === "NO_HELMET") return "NO_HELMET";
  if (trimmed === "NO_SAFETY_VEST" || trimmed === "NO_VEST") return "NO_VEST";
  if (
    trimmed === "RESTRICTED_ZONE" ||
    trimmed === "UNAUTHORIZED_ZONE" ||
    trimmed === "RESTRICTED_AREA"
  ) {
    return "RESTRICTED_AREA";
  }
  return trimmed;
}

/**
 * Trích xuất danh sách mã vi phạm thành phần từ một bản ghi IncidentItem.
 * Hỗ trợ tương thích tiến khi BE đã gom thành 1 bản ghi MULTI_VIOLATION có mảng `violations[]`
 * trong `evidences[].metadata.aiDetections`.
 */
export function extractComponentViolationCodes(incident: IncidentItem): string[] {
  const codes = new Set<string>();

  for (const ev of incident.evidences ?? []) {
    const ai = ev.metadata?.aiDetections as Record<string, unknown> | null | undefined;
    if (!ai || typeof ai !== "object") continue;

    if (Array.isArray(ai.violations)) {
      for (const entry of ai.violations) {
        if (typeof entry === "string") {
          const code = normalizeViolationCode(entry);
          if (code && code !== "MULTI_VIOLATION") codes.add(code);
        } else if (entry && typeof entry === "object") {
          const rec = entry as Record<string, unknown>;
          const code = normalizeViolationCode(rec.type ?? rec.violationType);
          if (code && code !== "MULTI_VIOLATION") codes.add(code);
        }
      }
    }

    if (Array.isArray(ai.persons)) {
      for (const person of ai.persons) {
        if (!person || typeof person !== "object") continue;
        const pViolations = (person as Record<string, unknown>).violations;
        if (!Array.isArray(pViolations)) continue;
        for (const entry of pViolations) {
          if (!entry || typeof entry !== "object") continue;
          const rec = entry as Record<string, unknown>;
          const code = normalizeViolationCode(rec.type ?? rec.violationType);
          if (code && code !== "MULTI_VIOLATION") codes.add(code);
        }
      }
    }
  }

  const baseCode = normalizeViolationCode(incident.violationType);
  if (codes.size === 0 && baseCode) {
    codes.add(baseCode);
  } else if (baseCode && baseCode !== "MULTI_VIOLATION") {
    codes.add(baseCode);
  }

  return Array.from(codes);
}

function resolveEffectiveSeverity(items: readonly IncidentItem[]): string {
  if (items.length === 1) return items[0].severity;
  let best = items[0].severity;
  let bestRank = SEVERITY_RANK[(best || "").toUpperCase()] ?? 0;

  for (let i = 1; i < items.length; i++) {
    const sev = items[i].severity;
    const rank = SEVERITY_RANK[(sev || "").toUpperCase()] ?? 0;
    if (rank > bestRank) {
      best = sev;
      bestRank = rank;
    }
  }
  return best;
}

function resolveEffectiveStatus(items: readonly IncidentItem[]): string {
  if (items.length === 1) return items[0].status;

  const statuses = items.map((item) => (item.status || "").toUpperCase());
  if (statuses.includes("PENDING_REVIEW")) return "PENDING_REVIEW";
  if (statuses.includes("CONFIRMED")) return "CONFIRMED";
  if (statuses.includes("RESOLVED")) return "RESOLVED";
  if (statuses.every((s) => s === "DISMISSED")) return "DISMISSED";
  if (statuses.includes("CLOSED")) return "CLOSED";
  return items[0].status;
}

function resolveEffectiveResolvedAt(
  items: readonly IncidentItem[],
  effectiveStatus: string,
): string | null {
  if (items.length === 1) return items[0].resolvedAt ?? null;
  const upper = effectiveStatus.toUpperCase();
  if (upper !== "RESOLVED" && upper !== "CLOSED") return null;

  let maxTs = Number.NEGATIVE_INFINITY;
  let maxIso: string | null = null;
  for (const item of items) {
    const st = (item.status || "").toUpperCase();
    if (st === "DISMISSED") continue;
    const ts = Date.parse(item.resolvedAt ?? "");
    if (!Number.isFinite(ts)) {
      return null;
    }
    if (ts > maxTs) {
      maxTs = ts;
      maxIso = item.resolvedAt ?? null;
    }
  }
  return maxIso;
}

/**
 * Bộ lõi gom nhóm vi phạm theo đa sự cố dùng chung toàn hệ thống Frontend (`fe-ppe`).
 *
 * Dùng Union-Find đa tín hiệu trên cùng camera:
 * - Tầng 1 (`EXACT_TRACK`): Cùng `personTrackId` trong `trackWindowSeconds` (mặc định 45s).
 * - Tầng 2 (`SPATIAL_IOU`): Trùng khớp vị trí Bounding Box người trong `spatialWindowSeconds` (mặc định 15s, IoU >= 0.45 hoặc khoảng cách tâm <= 0.10 & tỉ lệ diện tích >= 0.60).
 *
 * An toàn tuyệt đối: Bản ghi không có `personTrackId` và không có `personBox` sẽ đứng độc lập (không gom nhầm 2 đối tượng khác nhau).
 */
export function clusterIncidentsByPerson(
  incidents: readonly IncidentItem[],
  options?: IncidentClusteringOptions,
): IncidentCluster[] {
  if (incidents.length === 0) return [];
  const opts = { ...DEFAULT_INCIDENT_CLUSTERING_OPTIONS, ...options };

  const signals = incidents.map((inc) => extractSignalsFromIncident(inc));
  const dsu = new DisjointSet(incidents.length);

  const edgeMeta: Array<{
    a: number;
    b: number;
    reason: "EXACT_TRACK" | "SPATIAL_IOU";
    spatialPct?: number;
  }> = [];

  const byCamera = new Map<string, number[]>();
  for (let i = 0; i < incidents.length; i++) {
    const camKey = incidents[i].cameraId || incidents[i].cameraCode || "";
    if (!camKey) continue;
    const list = byCamera.get(camKey) ?? [];
    list.push(i);
    byCamera.set(camKey, list);
  }

  const trackWindowMs = opts.trackWindowSeconds * 1000;
  const spatialWindowMs = opts.spatialWindowSeconds * 1000;

  for (const idxs of byCamera.values()) {
    if (idxs.length < 2) continue;

    for (let aPos = 0; aPos < idxs.length; aPos++) {
      const i = idxs[aPos];
      const si = signals[i];
      for (let bPos = aPos + 1; bPos < idxs.length; bPos++) {
        const j = idxs[bPos];
        const sj = signals[j];
        const deltaMs = Math.abs(si.detectedAtMs - sj.detectedAtMs);

        // Tầng 1: Khớp chính xác person track_id trên cùng camera
        if (
          si.personTrackId !== null &&
          sj.personTrackId !== null &&
          si.personTrackId === sj.personTrackId &&
          deltaMs <= trackWindowMs
        ) {
          dsu.union(i, j);
          edgeMeta.push({ a: i, b: j, reason: "EXACT_TRACK" });
          continue;
        }

        // Tầng 2: Khớp vị trí Bounding Box người (xử lý khi ByteTrack bị ID-switch)
        if (si.personBox && sj.personBox && deltaMs <= spatialWindowMs) {
          const iou = computeBoxIoU(si.personBox, sj.personBox);
          const centerDist = computeBoxCenterDistance(si.personBox, sj.personBox);
          const areaRatio = computeBoxAreaRatio(si.personBox, sj.personBox);
          if (
            iou >= opts.minSpatialIoU ||
            (centerDist <= 0.1 && areaRatio >= 0.6)
          ) {
            dsu.union(i, j);
            edgeMeta.push({
              a: i,
              b: j,
              reason: "SPATIAL_IOU",
              spatialPct: Math.round(Math.max(iou, 1 - centerDist) * 100),
            });
          }
        }
      }
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < incidents.length; i++) {
    const root = dsu.find(i);
    const list = buckets.get(root) ?? [];
    list.push(i);
    buckets.set(root, list);
  }

  const reasonsByRoot = new Map<number, Set<"EXACT_TRACK" | "SPATIAL_IOU">>();
  const bestSpatialByRoot = new Map<number, number>();

  for (const edge of edgeMeta) {
    const root = dsu.find(edge.a);
    const rSet = reasonsByRoot.get(root) ?? new Set<"EXACT_TRACK" | "SPATIAL_IOU">();
    rSet.add(edge.reason);
    reasonsByRoot.set(root, rSet);

    if (edge.spatialPct !== undefined) {
      const prev = bestSpatialByRoot.get(root) ?? 0;
      bestSpatialByRoot.set(root, Math.max(prev, edge.spatialPct));
    }
  }

  const orderedRoots = Array.from(buckets.keys()).sort((a, b) => a - b);

  return orderedRoots.map((root) => {
    const rawIndices = buckets.get(root)!;
    // Sắp xếp thành viên trong cụm mới nhất -> cũ nhất theo detectedAt (tie-break theo thứ tự gốc)
    const sortedIndices = [...rawIndices].sort((a, b) => {
      const diff = signals[b].detectedAtMs - signals[a].detectedAtMs;
      return diff !== 0 ? diff : a - b;
    });

    const memberItems = sortedIndices.map((idx) => incidents[idx]);
    const memberSignals = sortedIndices.map((idx) => signals[idx]);
    const primary = memberItems[0];
    const oldest = memberItems[memberItems.length - 1];

    const violationCodeSet = new Set<string>();
    for (const item of memberItems) {
      for (const code of extractComponentViolationCodes(item)) {
        violationCodeSet.add(code);
      }
    }
    const violationCodes = Array.from(violationCodeSet);
    const isMultiViolation =
      violationCodes.length > 1 ||
      violationCodes.includes("MULTI_VIOLATION") ||
      memberItems.some((m) => (m.violationType || "").toUpperCase() === "MULTI_VIOLATION");

    const effectiveViolationType = isMultiViolation
      ? "MULTI_VIOLATION"
      : violationCodes[0] || primary.violationType || "UNKNOWN";

    const effectiveSeverity = resolveEffectiveSeverity(memberItems);
    const effectiveStatus = resolveEffectiveStatus(memberItems);
    const effectiveResolvedAt = resolveEffectiveResolvedAt(
      memberItems,
      effectiveStatus,
    );

    const personTrackId =
      memberSignals.find((s) => s.personTrackId !== null)?.personTrackId ?? null;

    const reasons = Array.from(reasonsByRoot.get(root) ?? []);
    const matchMethod: IncidentClusterMatchMethod =
      memberItems.length <= 1
        ? "SINGLE"
        : reasons.includes("EXACT_TRACK")
          ? "EXACT_TRACK"
          : "SPATIAL_IOU";

    return {
      clusterId: primary.id,
      primary,
      items: memberItems,
      signals: memberSignals,
      rawCount: memberItems.length,
      incidentIds: memberItems.map((m) => m.id),
      isMultiViolation,
      effectiveViolationType,
      violationCodes: violationCodes.filter((c) => c !== "MULTI_VIOLATION").length > 0
        ? violationCodes.filter((c) => c !== "MULTI_VIOLATION")
        : violationCodes,
      effectiveSeverity,
      effectiveStatus,
      earliestDetectedAt: oldest.detectedAt || oldest.createdAt,
      latestDetectedAt: primary.detectedAt || primary.createdAt,
      effectiveResolvedAt,
      personTrackId,
      cameraId: primary.cameraId || "",
      matchMethod,
      matchReasons: reasons,
      bestSpatialIoUPct: bestSpatialByRoot.get(root) ?? null,
    };
  });
}

/**
 * Chiếu một `IncidentCluster` thành bản ghi `IncidentItem` đại diện để dùng trực tiếp
 * với các hàm thống kê/biểu đồ tổng hợp (giữ nguyên toàn vẹn dữ liệu khi cụm chỉ có 1 phần tử).
 */
export function projectClusterToRepresentativeIncident(
  cluster: IncidentCluster,
): IncidentItem {
  if (cluster.rawCount === 1) {
    if (
      cluster.primary.violationType === cluster.effectiveViolationType &&
      cluster.primary.severity === cluster.effectiveSeverity &&
      cluster.primary.status === cluster.effectiveStatus
    ) {
      return cluster.primary;
    }
    return {
      ...cluster.primary,
      violationType: cluster.effectiveViolationType,
      severity: cluster.effectiveSeverity,
      status: cluster.effectiveStatus,
    };
  }

  const assignmentsById = new Map<string, IncidentAssignmentItem>();
  const historyById = new Map<string, IncidentStatusHistoryItem>();
  const evidencesById = new Map<string, EvidenceItem>();

  for (const item of cluster.items) {
    for (const a of item.assignments ?? []) {
      assignmentsById.set(a.id, a);
    }
    for (const h of item.statusHistory ?? []) {
      historyById.set(h.id, h);
    }
    for (const e of item.evidences ?? []) {
      evidencesById.set(e.id, e);
    }
  }

  return {
    ...cluster.primary,
    violationType: cluster.effectiveViolationType,
    severity: cluster.effectiveSeverity,
    status: cluster.effectiveStatus,
    detectedAt: cluster.earliestDetectedAt,
    resolvedAt: cluster.effectiveResolvedAt,
    assignments: assignmentsById.size > 0 ? Array.from(assignmentsById.values()) : cluster.primary.assignments,
    statusHistory: historyById.size > 0 ? Array.from(historyById.values()) : cluster.primary.statusHistory,
    evidences: evidencesById.size > 0 ? Array.from(evidencesById.values()) : cluster.primary.evidences,
  };
}

/**
 * Tính bộ đếm KPI theo cụm vụ việc từ danh sách `IncidentCluster`.
 */
export function computeClusterStatusCounts(
  clusters: readonly IncidentCluster[],
): IncidentClusterStatusCounts {
  let rawTotal = 0;
  let pendingReview = 0;
  let confirmed = 0;
  let resolved = 0;
  let closed = 0;
  let dismissed = 0;
  let critical = 0;
  let multiViolation = 0;

  for (const cl of clusters) {
    rawTotal += cl.rawCount;
    const status = (cl.effectiveStatus || "").toUpperCase();
    if (status === "PENDING_REVIEW") pendingReview += 1;
    else if (status === "CONFIRMED") confirmed += 1;
    else if (status === "RESOLVED") resolved += 1;
    else if (status === "CLOSED") closed += 1;
    else if (status === "DISMISSED") dismissed += 1;

    const sev = (cl.effectiveSeverity || "").toUpperCase();
    if (sev === "CRITICAL") critical += 1;
    if (cl.isMultiViolation) multiViolation += 1;
  }

  return {
    total: clusters.length,
    rawTotal,
    pendingReview,
    confirmed,
    resolved,
    closed,
    dismissed,
    critical,
    multiViolation,
  };
}
