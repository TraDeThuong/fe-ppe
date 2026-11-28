import {
  EVIDENCE_TYPE,
  type BoundingBox,
  type ChecksumVerifyResult,
  type EvidenceFilterParams,
  type EvidenceIncidentSummary,
  type EvidenceItem,
  type EvidenceLifecycleQuery,
  type IncidentItem,
} from "@/types";

export type EvidenceDatePreset = "all" | "today" | "7d" | "30d";
export type EvidenceChecksumFilter = "all" | "has_hash" | "missing_hash";
export type EvidenceLifecycleScope =
  | "all"
  | "active"
  | "closed"
  | "dismissed";

export interface EvidenceFilterCriteria {
  search?: string;
  siteId?: string;
  cameraId?: string;
  evidenceType?: string;
  violationType?: string;
  checksumFilter?: EvidenceChecksumFilter;
  datePreset?: EvidenceDatePreset;
  lifecycleScope?: EvidenceLifecycleScope;
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

const LIFECYCLE_SCOPE_TO_QUERY: Record<
  Exclude<EvidenceLifecycleScope, "all">,
  EvidenceLifecycleQuery
> = {
  active: "ACTIVE",
  closed: "CLOSED",
  dismissed: "DISMISSED",
};

/**
 * Mốc bắt đầu (ISO) cho preset thời gian. Làm tròn xuống đầu phút để query key ổn định giữa các lần render.
 */
export function getEvidenceDatePresetFromIso(
  datePreset: EvidenceDatePreset,
  nowMs = Date.now(),
): string | undefined {
  if (datePreset === "all") return undefined;
  if (datePreset === "today") {
    const startOfToday = new Date(nowMs);
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday.toISOString();
  }
  const days = datePreset === "7d" ? 7 : 30;
  const fromMs = nowMs - days * 24 * 60 * 60 * 1000;
  return new Date(Math.floor(fromMs / 60_000) * 60_000).toISOString();
}

/**
 * Chuyển state bộ lọc của trang /evidences thành query server-side cho
 * `GET /evidences` và `GET /evidences/summary` (lọc + phân trang 100% ở BE).
 */
export function buildEvidenceServerFilters(
  criteria: EvidenceFilterCriteria,
  nowMs = Date.now(),
): EvidenceFilterParams {
  const params: EvidenceFilterParams = {};
  const search = criteria.search?.trim();
  if (search) params.search = search.slice(0, 200);
  if (criteria.siteId) params.siteId = criteria.siteId;
  if (criteria.cameraId) params.cameraId = criteria.cameraId;
  if (criteria.evidenceType) params.evidenceType = criteria.evidenceType;
  if (criteria.violationType) params.violationType = criteria.violationType;
  if (criteria.checksumFilter === "has_hash") params.hasChecksum = true;
  else if (criteria.checksumFilter === "missing_hash") params.hasChecksum = false;
  const fromDate = getEvidenceDatePresetFromIso(criteria.datePreset ?? "all", nowMs);
  if (fromDate) params.fromDate = fromDate;
  const scope = criteria.lifecycleScope ?? "all";
  if (scope !== "all") params.lifecycle = LIFECYCLE_SCOPE_TO_QUERY[scope];
  return params;
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

const CSV_FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Escape một ô CSV và vô hiệu hóa công thức (CWE-1236 CSV/Formula Injection):
 * ô văn bản bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc CR được thêm tiền tố `'` để Excel/Sheets
 * hiển thị như chuỗi thay vì thực thi.
 */
export function escapeEvidenceCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (typeof val === "string" && CSV_FORMULA_PREFIX_RE.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str) || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportEvidencesToCsv(
  evidences: EvidenceItem[],
  helpers: {
    incidentsMap?: Map<string, IncidentItem>;
    getCameraCode?: (cameraId: string) => string | undefined;
    getSiteCode?: (siteId?: string | null) => string | undefined;
  } = {},
  fileNamePrefix = "ppe-evidence-manifest",
): void {
  if (typeof window === "undefined" || evidences.length === 0) return;

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
      .map(escapeEvidenceCsvCell)
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

/**
 * Tải tệp qua thẻ <a> ẩn thay vì `window.open`: không mở tab mới nên không bị popup blocker chặn
 * khi gọi sau `await` hoặc lặp nhiều tệp. Presigned DOWNLOAD URL của BE đã có
 * `Content-Disposition: attachment` nên trình duyệt tải về mà không rời trang.
 */
export function triggerEvidenceFileDownload(url: string, fileName?: string): void {
  if (typeof document === "undefined" || !url) return;
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  if (fileName) link.setAttribute("download", fileName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
