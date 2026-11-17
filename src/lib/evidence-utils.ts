import {
  EVIDENCE_TYPE,
  type BoundingBox,
  type ChecksumVerifyResult,
  type EvidenceIncidentSummary,
  type EvidenceItem,
  type IncidentItem,
} from "@/types";

export type EvidenceDatePreset = "all" | "today" | "7d" | "30d";
export type EvidenceChecksumFilter = "all" | "has_hash" | "missing_hash";
export type EvidenceLifecycleScope =
  | "all"
  | "active"
  | "closed"
  | "dismissed"
  | "archived";

export const ARCHIVED_EVIDENCES_STORAGE_KEY = "ppe_archived_evidence_ids_v1";

export interface EvidenceClientFilterCriteria {
  search?: string;
  siteId?: string;
  violationType?: string;
  checksumFilter?: EvidenceChecksumFilter;
  datePreset?: EvidenceDatePreset;
  lifecycleScope?: EvidenceLifecycleScope;
  archivedIds?: ReadonlySet<string>;
}

export interface EvidenceIncidentGroup {
  incidentId: string;
  incident?: EvidenceIncidentSummary | IncidentItem | null;
  cameraId: string;
  siteId?: string;
  latestCapturedAt: string;
  snapshot?: EvidenceItem;
  reference?: EvidenceItem;
  videos: EvidenceItem[];
  others: EvidenceItem[];
  allItems: EvidenceItem[];
}

/**
 * Determine whether a SHA-256 verification response indicates an authentic, untampered file.
 * Handles both backend `isValid` and legacy `isTampered` contract shapes safely.
 */
export function isChecksumVerifyValid(result?: ChecksumVerifyResult | null): boolean {
  if (!result) return false;
  if (typeof result.isValid === "boolean") {
    return result.isValid && result.isTampered !== true;
  }
  if (typeof result.isTampered === "boolean") {
    return !result.isTampered;
  }
  return false;
}

export function isReferenceEvidenceItem(ev: Pick<EvidenceItem, "evidenceType" | "url" | "storageKey" | "fileName">): boolean {
  const urlLower = (ev.url || ev.storageKey || "").toLowerCase();
  const fileLower = (ev.fileName || "").toLowerCase();
  return (
    ev.evidenceType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT ||
    ev.evidenceType === "REFERENCE" ||
    urlLower.includes("reference_snapshot") ||
    urlLower.includes("_ref") ||
    fileLower.includes("reference") ||
    fileLower.includes("_ref")
  );
}

export function isVideoEvidenceItem(ev: Pick<EvidenceItem, "evidenceType" | "mimeType" | "fileName">): boolean {
  return (
    ev.evidenceType === EVIDENCE_TYPE.VIDEO_CLIP ||
    Boolean(ev.mimeType?.toLowerCase().startsWith("video/")) ||
    /\.(mp4|webm|mov|mkv)$/i.test(ev.fileName || "")
  );
}

function normalizeBoxToPercent(raw: Partial<BoundingBox>, label?: string, confidence?: number): BoundingBox | null {
  if (
    typeof raw.x !== "number" ||
    typeof raw.y !== "number" ||
    typeof raw.width !== "number" ||
    typeof raw.height !== "number" ||
    !Number.isFinite(raw.x) ||
    !Number.isFinite(raw.y) ||
    !Number.isFinite(raw.width) ||
    !Number.isFinite(raw.height) ||
    raw.width <= 0 ||
    raw.height <= 0
  ) {
    return null;
  }
  const isNormalized = raw.x <= 1 && raw.y <= 1 && raw.width <= 1 && raw.height <= 1;
  return {
    x: isNormalized ? raw.x * 100 : raw.x,
    y: isNormalized ? raw.y * 100 : raw.y,
    width: isNormalized ? raw.width * 100 : raw.width,
    height: isNormalized ? raw.height * 100 : raw.height,
    label: raw.label || label,
    confidence: typeof raw.confidence === "number" ? raw.confidence : confidence,
  };
}

/**
 * Extract normalized percentage [0..100] bounding boxes from an evidence's AI detection metadata.
 */
export function extractEvidenceBoundingBoxes(
  ev?: EvidenceItem | null,
  fallbackLabel?: string,
  fallbackConfidence?: number,
): BoundingBox[] {
  const ai = ev?.metadata?.aiDetections as Record<string, unknown> | null | undefined;
  if (!ai || typeof ai !== "object") return [];

  const boxes: BoundingBox[] = [];

  const pushBox = (candidate: unknown, lbl?: string, conf?: number) => {
    if (!candidate || typeof candidate !== "object") return;
    const normalized = normalizeBoxToPercent(candidate as Partial<BoundingBox>, lbl, conf);
    if (normalized) boxes.push(normalized);
  };

  if (ai.box) {
    pushBox(ai.box, fallbackLabel, fallbackConfidence);
  }

  const singleViolation = ai.violation as Record<string, unknown> | undefined;
  if (singleViolation?.box) {
    pushBox(
      singleViolation.box,
      (singleViolation.type as string) || fallbackLabel,
      typeof singleViolation.confidence === "number" ? singleViolation.confidence : fallbackConfidence,
    );
  }

  if (Array.isArray(ai.violations)) {
    for (const v of ai.violations) {
      if (v && typeof v === "object") {
        const rec = v as Record<string, unknown>;
        pushBox(
          rec.box ?? rec,
          (rec.type as string) || (rec.label as string) || fallbackLabel,
          typeof rec.confidence === "number" ? rec.confidence : fallbackConfidence,
        );
      }
    }
  }

  if (Array.isArray(ai.persons)) {
    for (const p of ai.persons) {
      if (!p || typeof p !== "object") continue;
      const person = p as Record<string, unknown>;
      if (Array.isArray(person.violations) && person.violations.length > 0) {
        for (const v of person.violations) {
          if (v && typeof v === "object") {
            const rec = v as Record<string, unknown>;
            pushBox(
              rec.box,
              (rec.type as string) || fallbackLabel,
              typeof rec.confidence === "number" ? rec.confidence : fallbackConfidence,
            );
          }
        }
      } else if (person.box) {
        pushBox(
          person.box,
          fallbackLabel,
          typeof person.confidence === "number" ? person.confidence : fallbackConfidence,
        );
      }
    }
  }

  // Deduplicate identical boxes
  const seen = new Set<string>();
  return boxes.filter((b) => {
    const key = `${b.x.toFixed(2)}:${b.y.toFixed(2)}:${b.width.toFixed(2)}:${b.height.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatEvidenceFileSize(fileSize?: number | string | null): string {
  const bytes = typeof fileSize === "string" ? Number(fileSize) : Number(fileSize ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMediaDuration(seconds?: number | null): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getViolationLabel(violationType?: string | null, isVi = true): string {
  if (!violationType) return isVi ? "Vi phạm PPE" : "PPE Violation";
  const key = violationType.toUpperCase().trim();
  const labels: Record<string, { vi: string; en: string }> = {
    NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
    NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
    NO_BOOTS: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
    NO_GLOVES: { vi: "Không đeo găng tay", en: "No Safety Gloves" },
    NO_MASK: { vi: "Không đeo khẩu trang", en: "No Mask" },
    RESTRICTED_AREA: { vi: "Vào vùng cấm", en: "Restricted Area" },
    MULTI_VIOLATION: { vi: "Đa vi phạm PPE", en: "Multiple Violations" },
  };
  const found = labels[key];
  return found ? (isVi ? found.vi : found.en) : violationType;
}

export function formatRelativeEvidenceTime(isoDate: string, isVi = true, nowMs = Date.now()): string {
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return isoDate;
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 60) return isVi ? "Vừa xong" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isVi ? `${diffMin} phút trước` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isVi ? `${diffHr} giờ trước` : `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return isVi ? `${diffDays} ngày trước` : `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString(isVi ? "vi-VN" : "en-US");
}

/**
 * Group evidences by incidentId so operators can inspect Reference (Before) vs Snapshot (After) pairs together.
 */
export function groupEvidencesByIncident(
  evidences: EvidenceItem[],
  incidentsMap?: Map<string, IncidentItem>,
  getCameraSiteId?: (cameraId: string) => string | undefined,
): EvidenceIncidentGroup[] {
  const groups = new Map<string, EvidenceIncidentGroup>();

  for (const ev of evidences) {
    const inc = ev.incident ?? incidentsMap?.get(ev.incidentId) ?? null;
    const siteId = inc?.siteId ?? getCameraSiteId?.(ev.cameraId);
    let group = groups.get(ev.incidentId);

    if (!group) {
      group = {
        incidentId: ev.incidentId,
        incident: inc,
        cameraId: ev.cameraId,
        siteId,
        latestCapturedAt: ev.capturedAt,
        videos: [],
        others: [],
        allItems: [],
      };
      groups.set(ev.incidentId, group);
    }

    group.allItems.push(ev);
    if (Date.parse(ev.capturedAt) > Date.parse(group.latestCapturedAt)) {
      group.latestCapturedAt = ev.capturedAt;
    }

    if (isVideoEvidenceItem(ev)) {
      group.videos.push(ev);
    } else if (isReferenceEvidenceItem(ev)) {
      if (!group.reference) group.reference = ev;
      else group.others.push(ev);
    } else if (ev.evidenceType === EVIDENCE_TYPE.SNAPSHOT) {
      if (!group.snapshot) group.snapshot = ev;
      else group.others.push(ev);
    } else {
      group.others.push(ev);
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => Date.parse(b.latestCapturedAt) - Date.parse(a.latestCapturedAt),
  );
}

/**
 * Apply rich client-side filtering on hydrated EvidenceItems (search, site, violation, checksum, date preset).
 */
export function filterEvidencesClientSide(
  evidences: EvidenceItem[],
  criteria: EvidenceClientFilterCriteria,
  helpers: {
    incidentsMap?: Map<string, IncidentItem>;
    getCameraSiteId?: (cameraId: string) => string | undefined;
    getCameraLabel?: (cameraId: string) => string;
    getSiteLabel?: (siteId?: string) => string;
    nowMs?: number;
  } = {},
): EvidenceItem[] {
  const {
    search = "",
    siteId = "",
    violationType = "",
    checksumFilter = "all",
    datePreset = "all",
    lifecycleScope = "all",
    archivedIds,
  } = criteria;
  const nowMs = helpers.nowMs ?? Date.now();
  const normalizedQuery = search.trim().toLowerCase();

  let minTimestampMs: number | null = null;
  if (datePreset === "today") {
    const startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    minTimestampMs = startOfToday.getTime();
  } else if (datePreset === "7d") {
    minTimestampMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  } else if (datePreset === "30d") {
    minTimestampMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  }

  return evidences.filter((ev) => {
    const isArchived = Boolean(archivedIds?.has(ev.id));

    if (lifecycleScope === "archived") {
      if (!isArchived) return false;
    } else {
      // Khi ở chế độ xem chính (all, active, closed, dismissed), tự động ẩn các mục đã đưa vào Kho Lưu trữ
      if (isArchived) return false;
    }

    const inc = ev.incident ?? helpers.incidentsMap?.get(ev.incidentId);
    const incStatus = inc?.status;

    if (lifecycleScope === "active") {
      if (incStatus === "CLOSED" || incStatus === "DISMISSED") return false;
    } else if (lifecycleScope === "closed") {
      if (incStatus !== "CLOSED") return false;
    } else if (lifecycleScope === "dismissed") {
      if (incStatus !== "DISMISSED") return false;
    }

    const resolvedSiteId = inc?.siteId ?? helpers.getCameraSiteId?.(ev.cameraId) ?? "";

    if (siteId && resolvedSiteId !== siteId) {
      return false;
    }

    if (violationType) {
      if (!inc || inc.violationType !== violationType) {
        return false;
      }
    }

    const hasHash = Boolean(ev.metadata?.checksum);
    if (checksumFilter === "has_hash" && !hasHash) return false;
    if (checksumFilter === "missing_hash" && hasHash) return false;

    if (minTimestampMs !== null) {
      const capturedMs = Date.parse(ev.capturedAt);
      if (!Number.isNaN(capturedMs) && capturedMs < minTimestampMs) {
        return false;
      }
    }

    if (normalizedQuery) {
      const cameraLabel = helpers.getCameraLabel?.(ev.cameraId) || "";
      const siteLabel = helpers.getSiteLabel?.(resolvedSiteId) || "";
      const haystack = [
        ev.fileName,
        ev.id,
        ev.incidentId,
        ev.cameraId,
        ev.evidenceType,
        ev.metadata?.checksum || "",
        cameraLabel,
        siteLabel,
        inc?.violationType || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function sumEvidenceBytes(evidences: EvidenceItem[]): number {
  let total = 0;
  for (const ev of evidences) {
    const num = typeof ev.fileSize === "string" ? Number(ev.fileSize) : Number(ev.fileSize ?? 0);
    if (Number.isFinite(num) && num > 0) {
      total += num;
    }
  }
  return total;
}

export function loadArchivedEvidenceIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ARCHIVED_EVIDENCES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((item): item is string => typeof item === "string"));
    }
  } catch {
    // Ignore storage read errors
  }
  return new Set();
}

export function saveArchivedEvidenceIds(ids: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ARCHIVED_EVIDENCES_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // Ignore storage write errors
  }
}

export function exportEvidencesToCsv(
  evidences: EvidenceItem[],
  helpers: {
    incidentsMap?: Map<string, IncidentItem>;
    getCameraCode?: (cameraId: string) => string | undefined;
    getSiteCode?: (siteId?: string | null) => string | undefined;
  } = {},
  fileNamePrefix = "ppe-evidence-archive",
): void {
  if (typeof window === "undefined" || evidences.length === 0) return;

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    "EvidenceID",
    "FileName",
    "EvidenceType",
    "FileSizeBytes",
    "FileSizeFormatted",
    "SHA256Checksum",
    "IncidentID",
    "ViolationType",
    "IncidentSeverity",
    "IncidentStatus",
    "CameraCode",
    "SiteCode",
    "CapturedAt",
    "StorageKey",
  ];

  const rows = evidences.map((ev) => {
    const inc = ev.incident ?? helpers.incidentsMap?.get(ev.incidentId);
    const camCode = helpers.getCameraCode?.(ev.cameraId) || ev.cameraId;
    const siteCode = helpers.getSiteCode?.(inc?.siteId) || inc?.siteId || "";
    return [
      ev.id,
      ev.fileName,
      ev.evidenceType,
      ev.fileSize,
      formatEvidenceFileSize(ev.fileSize),
      ev.metadata?.checksum || "",
      ev.incidentId,
      inc?.violationType || "",
      inc?.severity || "",
      inc?.status || "",
      camCode,
      siteCode,
      ev.capturedAt,
      ev.storageKey,
    ]
      .map(escapeCsv)
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = url;
  link.setAttribute("download", `${fileNamePrefix}-${stamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
