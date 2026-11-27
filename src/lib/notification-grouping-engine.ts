import { parseNotificationDisplay } from "@/lib/notification-display";
import {
  getNotificationChannels,
  isNotificationRead,
} from "@/lib/notification-inbox";
import {
  computeBoxAreaRatio,
  computeBoxCenterDistance,
  computeBoxIoU,
  type NotificationEnrichedSignals,
} from "@/lib/notification-enrichment";
import type {
  NotificationChannel,
  NotificationItemDto,
  NotificationSeverity,
} from "@/types";

export type NotificationViewMode = "flat" | "person" | "hour" | "camera";

export type ClusterMatchReason =
  | "EXACT_TRACK"
  | "SPATIAL_IOU";

export interface NotificationGroupingOptions {
  /** Ngôn ngữ hiển thị để trích xuất & đặt nhãn */
  isVietnamese?: boolean;
  /** Cửa sổ thời gian gom theo cùng track_id (giây, mặc định 45s) */
  trackWindowSeconds?: number;
  /** Cửa sổ thời gian gom theo trùng khớp vị trí bbox (giây, mặc định 15s) */
  spatialWindowSeconds?: number;
  /** Ngưỡng IoU tối thiểu cho tầng SPATIAL_IOU (mặc định 0.45) */
  minSpatialIoU?: number;
  /** Ở chế độ Theo giờ / Theo camera: có đồng thời gom đa vi phạm của cùng 1 người bên trong mỗi section không */
  combinePersonInSections?: boolean;
}

export interface NotificationPersonCluster {
  /** ID đại diện (ID thông báo mới nhất trong cụm) */
  key: string;
  /** Thông báo mới nhất đại diện cho cụm */
  primary: NotificationItemDto;
  /** Toàn bộ các thông báo thuộc cụm (sắp xếp mới nhất -> cũ nhất) */
  items: NotificationItemDto[];
  count: number;
  unreadCount: number;
  channels: NotificationChannel[];
  /** true nếu cụm tổng hợp >= 2 loại vi phạm PPE khác nhau (VD: NO_HELMET + NO_VEST) */
  isMultiViolation: boolean;
  /** Danh sách mã loại vi phạm duy nhất đã phát hiện trong cụm */
  violationCodes: string[];
  highestSeverity: NotificationSeverity;
  trackId: number | null;
  cameraId: string | null;
  cameraCode: string | null;
  siteName: string | null;
  /** Lý do giải thích minh bạch tại sao FE gom các thông báo này lại */
  matchReasons: ClusterMatchReason[];
  /** % trùng khớp khung người cao nhất (nếu khớp nhờ SPATIAL_IOU) */
  bestSpatialIoUPct: number | null;
  earliestAt: string | Date;
  latestAt: string | Date;
}

export interface NotificationSectionGroup {
  key: string;
  kind: "hour" | "camera";
  title: string;
  subtitle?: string;
  totalNotifications: number;
  unreadCount: number;
  violationBreakdown: Array<{ code: string; count: number }>;
  clusters: NotificationPersonCluster[];
  allNotificationIds: string[];
  unreadNotificationIds: string[];
}

export const DEFAULT_GROUPING_OPTIONS: Required<NotificationGroupingOptions> = {
  isVietnamese: true,
  trackWindowSeconds: 45,
  spatialWindowSeconds: 15,
  minSpatialIoU: 0.45,
  combinePersonInSections: true,
};

const SEVERITY_RANK: Record<string, number> = {
  LOW: 1,
  NORMAL: 2,
  MEDIUM: 3,
  HIGH: 4,
  CRITICAL: 5,
};

function getItemTimestampMs(
  item: NotificationItemDto,
  signal?: NotificationEnrichedSignals,
): number {
  if (signal && signal.detectedAtMs > 0) {
    return signal.detectedAtMs;
  }
  const ts = Date.parse(String(item.sentAt || item.createdAt));
  return Number.isFinite(ts) ? ts : 0;
}

function getCameraScopeKey(
  item: NotificationItemDto,
  parsed: ReturnType<typeof parseNotificationDisplay>,
  signal?: NotificationEnrichedSignals,
): string | null {
  if (signal?.cameraId) return `id:${signal.cameraId}`;
  if (signal?.cameraCode) return `code:${signal.cameraCode.toUpperCase()}`;
  if (parsed.cameraCode) return `code:${parsed.cameraCode.toUpperCase()}`;
  const metaCam = item.metadata?.cameraId || item.metadata?.cameraCode;
  if (typeof metaCam === "string" && metaCam.trim()) {
    return `meta:${metaCam.trim().toUpperCase()}`;
  }
  return null;
}

class DisjointSet {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
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
    // Giữ phần tử xuất hiện sớm hơn (mới nhất) làm gốc
    if (ra < rb) {
      this.parent[rb] = ra;
    } else {
      this.parent[ra] = rb;
    }
  }
}

interface IndexedNotification {
  index: number;
  item: NotificationItemDto;
  parsed: ReturnType<typeof parseNotificationDisplay>;
  signal?: NotificationEnrichedSignals;
  isPpeAlert: boolean;
  cameraKey: string | null;
  timestampMs: number;
}

function indexNotifications(
  items: readonly NotificationItemDto[],
  signalsMap: ReadonlyMap<string, NotificationEnrichedSignals> | undefined,
  isVietnamese: boolean,
): IndexedNotification[] {
  return items.map((item, index) => {
    const parsed = parseNotificationDisplay(item, isVietnamese);
    const incidentId = parsed.incidentId || item.incidentId || undefined;
    const signal = incidentId ? signalsMap?.get(incidentId) : undefined;
    const isPpeAlert = parsed.kind === "PPE_ALERT" && Boolean(incidentId);
    const cameraKey = isPpeAlert ? getCameraScopeKey(item, parsed, signal) : null;
    return {
      index,
      item,
      parsed,
      signal,
      isPpeAlert,
      cameraKey,
      timestampMs: getItemTimestampMs(item, signal),
    };
  });
}

function buildCluster(
  members: IndexedNotification[],
  reasons: Set<ClusterMatchReason>,
  bestSpatialPct: number | null,
): NotificationPersonCluster {
  // Đảm bảo thứ tự mới nhất -> cũ nhất theo thứ tự gốc
  members.sort((a, b) => a.index - b.index);
  const primaryEntry = members[0];
  const oldestEntry = members[members.length - 1];

  const channelSet = new Set<NotificationChannel>();
  const violationCodeSet = new Set<string>();
  let unreadCount = 0;
  let highestSeverity: NotificationSeverity = primaryEntry.item.severity || "NORMAL";
  let trackId: number | null = null;
  let cameraId: string | null = null;
  let cameraCode: string | null = null;
  let siteName: string | null = null;

  for (const m of members) {
    if (!isNotificationRead(m.item)) {
      unreadCount += 1;
    }
    for (const ch of getNotificationChannels(m.item)) {
      channelSet.add(ch);
    }
    const vCode = m.signal?.violationType || m.parsed.violationCode;
    if (vCode) {
      violationCodeSet.add(vCode.toUpperCase());
    }
    const sev = m.item.severity || "NORMAL";
    if ((SEVERITY_RANK[sev] ?? 0) > (SEVERITY_RANK[highestSeverity] ?? 0)) {
      highestSeverity = sev;
    }
    if (trackId === null && m.signal?.personTrackId !== null && m.signal?.personTrackId !== undefined) {
      trackId = m.signal.personTrackId;
    }
    if (!cameraId && m.signal?.cameraId) {
      cameraId = m.signal.cameraId;
    }
    if (!cameraCode) {
      cameraCode = m.signal?.cameraCode || m.parsed.cameraCode || null;
    }
    if (!siteName) {
      siteName = m.signal?.siteName || m.parsed.siteName || null;
    }
  }

  const violationCodes = Array.from(violationCodeSet);
  const isMultiViolation =
    violationCodes.length > 1 || violationCodes.includes("MULTI_VIOLATION");

  return {
    key: primaryEntry.item.id,
    primary: primaryEntry.item,
    items: members.map((m) => m.item),
    count: members.length,
    unreadCount,
    channels: Array.from(channelSet),
    isMultiViolation,
    violationCodes,
    highestSeverity,
    trackId,
    cameraId,
    cameraCode,
    siteName,
    matchReasons: Array.from(reasons),
    bestSpatialIoUPct: bestSpatialPct,
    latestAt: primaryEntry.item.sentAt || primaryEntry.item.createdAt,
    earliestAt: oldestEntry.item.sentAt || oldestEntry.item.createdAt,
  };
}

/**
 * Bọc mỗi thông báo thành 1 cluster đơn lẻ (dùng cho chế độ `flat`).
 */
export function wrapFlatPersonClusters(
  items: readonly NotificationItemDto[],
  signalsMap?: ReadonlyMap<string, NotificationEnrichedSignals>,
  isVietnamese = true,
): NotificationPersonCluster[] {
  const indexed = indexNotifications(items, signalsMap, isVietnamese);
  return indexed.map((entry) => buildCluster([entry], new Set(), null));
}

/**
 * Gom nhóm thông báo vi phạm PPE của CÙNG 1 NGƯỜI / ĐA VI PHẠM bằng Union-Find đa tín hiệu:
 * 1. EXACT_TRACK: Cùng camera + cùng personTrackId trong cửa sổ trackWindowSeconds (gộp NO_HELMET + NO_VEST).
 * 2. SPATIAL_IOU: Cùng camera + bounding box người trùng khớp cao (chống ByteTrack ID-switch).
 */
export function groupNotificationsByPerson(
  items: readonly NotificationItemDto[],
  signalsMap?: ReadonlyMap<string, NotificationEnrichedSignals>,
  options?: NotificationGroupingOptions,
): NotificationPersonCluster[] {
  const opts = { ...DEFAULT_GROUPING_OPTIONS, ...options };
  if (items.length === 0) return [];

  const indexed = indexNotifications(items, signalsMap, opts.isVietnamese);
  const dsu = new DisjointSet(indexed.length);

  // Ghi nhận các cạnh liên kết & lý do khớp để hiển thị minh bạch cho người dùng
  const edgeMeta: Array<{
    a: number;
    b: number;
    reason: ClusterMatchReason;
    spatialPct?: number;
  }> = [];

  const byCamera = new Map<string, IndexedNotification[]>();
  for (const entry of indexed) {
    if (!entry.isPpeAlert || !entry.cameraKey) continue;
    const list = byCamera.get(entry.cameraKey) ?? [];
    list.push(entry);
    byCamera.set(entry.cameraKey, list);
  }

  const trackWindowMs = opts.trackWindowSeconds * 1000;
  const spatialWindowMs = opts.spatialWindowSeconds * 1000;

  for (const camEntries of byCamera.values()) {
    if (camEntries.length < 2) continue;

    for (let i = 0; i < camEntries.length; i++) {
      const a = camEntries[i];
      for (let j = i + 1; j < camEntries.length; j++) {
        const b = camEntries[j];
        const deltaMs = Math.abs(a.timestampMs - b.timestampMs);

        // Tầng 1: Khớp chính xác person track_id trên cùng camera
        const trackA = a.signal?.personTrackId;
        const trackB = b.signal?.personTrackId;
        if (
          trackA !== null &&
          trackA !== undefined &&
          trackB !== null &&
          trackB !== undefined &&
          trackA === trackB &&
          deltaMs <= trackWindowMs
        ) {
          dsu.union(a.index, b.index);
          edgeMeta.push({ a: a.index, b: b.index, reason: "EXACT_TRACK" });
          continue;
        }

        // Tầng 2: Khớp vị trí bounding box (xử lý khi ByteTrack bị nhảy track_id)
        const boxA = a.signal?.personBox;
        const boxB = b.signal?.personBox;
        if (boxA && boxB && deltaMs <= spatialWindowMs) {
          const iou = computeBoxIoU(boxA, boxB);
          const centerDist = computeBoxCenterDistance(boxA, boxB);
          const areaRatio = computeBoxAreaRatio(boxA, boxB);

          if (
            iou >= opts.minSpatialIoU ||
            (centerDist <= 0.1 && areaRatio >= 0.6)
          ) {
            dsu.union(a.index, b.index);
            edgeMeta.push({
              a: a.index,
              b: b.index,
              reason: "SPATIAL_IOU",
              spatialPct: Math.round(Math.max(iou, 1 - centerDist) * 100),
            });
            continue;
          }
        }
      }
    }
  }

  // Gom các phần tử theo gốc Union-Find
  const buckets = new Map<number, IndexedNotification[]>();
  for (const entry of indexed) {
    const root = dsu.find(entry.index);
    const list = buckets.get(root) ?? [];
    list.push(entry);
    buckets.set(root, list);
  }

  const reasonsByRoot = new Map<number, Set<ClusterMatchReason>>();
  const bestSpatialByRoot = new Map<number, number>();

  for (const edge of edgeMeta) {
    const root = dsu.find(edge.a);
    const rSet = reasonsByRoot.get(root) ?? new Set<ClusterMatchReason>();
    rSet.add(edge.reason);
    reasonsByRoot.set(root, rSet);

    if (edge.spatialPct !== undefined) {
      const prev = bestSpatialByRoot.get(root) ?? 0;
      bestSpatialByRoot.set(root, Math.max(prev, edge.spatialPct));
    }
  }

  // Duyệt theo thứ tự xuất hiện của gốc (mới nhất -> cũ nhất)
  const orderedRoots = Array.from(buckets.keys()).sort((a, b) => a - b);
  return orderedRoots.map((root) =>
    buildCluster(
      buckets.get(root)!,
      reasonsByRoot.get(root) ?? new Set(),
      bestSpatialByRoot.get(root) ?? null,
    ),
  );
}

function formatHourBucket(
  timestampMs: number,
  isVietnamese: boolean,
): { key: string; title: string; subtitle: string } {
  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) {
    return {
      key: "unknown-hour",
      title: isVietnamese ? "Không rõ thời gian" : "Unknown time",
      subtitle: "",
    };
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = date.getHours();
  const nextHour = (hour + 1) % 24;

  const hh = String(hour).padStart(2, "0");
  const nextHh = String(nextHour).padStart(2, "0");
  const key = `${year}-${month}-${day}T${hh}`;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  const dateStr = `${year}-${month}-${day}`;

  let dayLabel = `${day}/${month}/${year}`;
  if (dateStr === todayStr) {
    dayLabel = isVietnamese ? "Hôm nay" : "Today";
  } else if (dateStr === yesterdayStr) {
    dayLabel = isVietnamese ? "Hôm qua" : "Yesterday";
  }

  return {
    key,
    title: `${hh}:00 – ${nextHh}:00`,
    subtitle: dayLabel,
  };
}

/**
 * Gom thông báo thành các Section theo Khung giờ (`hour`) hoặc theo Camera (`camera`).
 * Có thể tùy chọn kết hợp gộp đa vi phạm của cùng 1 người ngay bên trong mỗi section.
 */
export function groupNotificationsIntoSections(
  items: readonly NotificationItemDto[],
  mode: "hour" | "camera",
  signalsMap?: ReadonlyMap<string, NotificationEnrichedSignals>,
  options?: NotificationGroupingOptions,
): NotificationSectionGroup[] {
  const opts = { ...DEFAULT_GROUPING_OPTIONS, ...options };
  if (items.length === 0) return [];

  const baseClusters = opts.combinePersonInSections
    ? groupNotificationsByPerson(items, signalsMap, opts)
    : wrapFlatPersonClusters(items, signalsMap, opts.isVietnamese);

  const sectionOrder: string[] = [];
  const sectionMap = new Map<
    string,
    {
      title: string;
      subtitle?: string;
      clusters: NotificationPersonCluster[];
    }
  >();

  for (const cluster of baseClusters) {
    let secKey: string;
    let secTitle: string;
    let secSubtitle: string | undefined;

    if (mode === "hour") {
      const ts = Date.parse(String(cluster.latestAt));
      const bucket = formatHourBucket(ts, opts.isVietnamese);
      secKey = bucket.key;
      secTitle = bucket.title;
      secSubtitle = bucket.subtitle;
    } else {
      const camLabel =
        cluster.cameraCode ||
        (cluster.cameraId ? `CAM-${cluster.cameraId.slice(0, 6).toUpperCase()}` : null);
      if (camLabel) {
        secKey = `cam:${cluster.cameraId || camLabel}`;
        secTitle = camLabel;
        secSubtitle = cluster.siteName || (opts.isVietnamese ? "Camera giám sát PPE" : "PPE Camera");
      } else {
        secKey = "system:other";
        secTitle = opts.isVietnamese ? "Thông báo hệ thống & Khác" : "System & Other Alerts";
        secSubtitle = opts.isVietnamese ? "Không gắn với camera cụ thể" : "Not bound to a camera";
      }
    }

    let bucket = sectionMap.get(secKey);
    if (!bucket) {
      bucket = { title: secTitle, subtitle: secSubtitle, clusters: [] };
      sectionMap.set(secKey, bucket);
      sectionOrder.push(secKey);
    }
    bucket.clusters.push(cluster);
  }

  return sectionOrder.map((secKey) => {
    const bucket = sectionMap.get(secKey)!;
    const allIds: string[] = [];
    const unreadIds: string[] = [];
    const violationCounts = new Map<string, number>();

    for (const cluster of bucket.clusters) {
      for (const member of cluster.items) {
        allIds.push(member.id);
        if (!isNotificationRead(member)) {
          unreadIds.push(member.id);
        }
        const parsed = parseNotificationDisplay(member, opts.isVietnamese);
        const sig = member.incidentId ? signalsMap?.get(member.incidentId) : undefined;
        const vCode = (sig?.violationType || parsed.violationCode)?.toUpperCase();
        if (vCode) {
          violationCounts.set(vCode, (violationCounts.get(vCode) ?? 0) + 1);
        }
      }
    }

    const violationBreakdown = Array.from(violationCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    return {
      key: secKey,
      kind: mode,
      title: bucket.title,
      subtitle: bucket.subtitle,
      totalNotifications: allIds.length,
      unreadCount: unreadIds.length,
      violationBreakdown,
      clusters: bucket.clusters,
      allNotificationIds: allIds,
      unreadNotificationIds: unreadIds,
    };
  });
}
