import { resolveEvidenceUrl } from "@/lib/evidence-url";
import { extractSignalsFromIncident } from "@/lib/notification-enrichment";
import { EVIDENCE_TYPE, type EvidenceItem, type IncidentItem } from "@/types";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;
const SAMPLE_SNAPSHOT_RE = /(?:^|\/)images\/camera-live-evidence\.jpg(?:$|[?#])/i;

/**
 * Nhận diện bằng chứng là tệp video clip dựa trên evidenceType, mimeType hoặc phần mở rộng URL/fileName.
 */
export function isVideoEvidence(
  evidence?: Partial<EvidenceItem> | null,
  url?: string | null,
): boolean {
  if (evidence) {
    const evType = String(evidence.evidenceType || "").toUpperCase();
    if (evType === EVIDENCE_TYPE.VIDEO_CLIP || evType === "VIDEO") {
      return true;
    }
    const mime = String(evidence.mimeType || "").toLowerCase().trim();
    if (mime.startsWith("video/")) {
      return true;
    }
    if (evidence.fileName && VIDEO_EXT_RE.test(evidence.fileName)) {
      return true;
    }
    if (evidence.storageKey && VIDEO_EXT_RE.test(evidence.storageKey)) {
      return true;
    }
    if (evidence.url && VIDEO_EXT_RE.test(evidence.url)) {
      return true;
    }
  }
  if (url && VIDEO_EXT_RE.test(url)) {
    return true;
  }
  return false;
}

function resolveIncidentSnapshot(value?: string | null): string {
  const url = resolveEvidenceUrl(value);
  return SAMPLE_SNAPSHOT_RE.test(url) || isVideoEvidence(null, url) ? "" : url;
}

export function getIncidentEvidenceUrl(incident: IncidentItem): string {
  const snapshotUrl = resolveIncidentSnapshot(incident.snapshotUrl);
  if (snapshotUrl) return snapshotUrl;

  let firstImageUrl = "";
  for (const evidence of incident.evidences ?? []) {
    if (isVideoEvidence(evidence)) continue;
    const url = resolveIncidentSnapshot(evidence.url) || resolveIncidentSnapshot(evidence.storageKey);
    if (!url) continue;
    if (evidence.evidenceType === EVIDENCE_TYPE.SNAPSHOT) return url;
    firstImageUrl ||= url;
  }
  if (firstImageUrl) return firstImageUrl;

  const cachedByIncident = typeof window === "undefined"
    ? null
    : sessionStorage.getItem(`ppe_incident_evidence_${incident.id}`);
  return resolveIncidentSnapshot(cachedByIncident);
}

/**
 * Chuẩn hóa confidence hợp lệ về khoảng [0..1]; trả về null nếu không có dữ liệu thật (không hardcode 0.96).
 */
export function normalizeConfidenceRatio(raw?: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw >= 0 && raw <= 1) return raw;
  if (raw > 1 && raw <= 100) return raw / 100;
  return null;
}

/**
 * Trả về phần trăm độ tin cậy AI nguyên (0..100) khi có dữ liệu thật, hoặc null khi thiếu dữ liệu.
 */
export function formatConfidencePct(raw?: unknown): number | null {
  const ratio = normalizeConfidenceRatio(raw);
  if (ratio === null) return null;
  return Math.round(ratio * 100);
}

function extractFallbackConfidenceFromEvidences(
  evidences?: readonly EvidenceItem[],
): number | null {
  if (!evidences || evidences.length === 0) return null;
  for (const ev of evidences) {
    const ai = ev.metadata?.aiDetections as Record<string, unknown> | null | undefined;
    if (!ai || typeof ai !== "object") continue;

    const violation = ai.violation as Record<string, unknown> | undefined;
    const direct =
      normalizeConfidenceRatio(violation?.confidence) ??
      normalizeConfidenceRatio(ai.confidence);
    if (direct !== null) return direct;

  }
  return null;
}

/**
 * Trích xuất chuẩn hóa `trackId` và `confidence` thật của sự cố từ BE hoặc metadata bằng chứng.
 */
export function resolveIncidentTelemetry(incident?: IncidentItem | null): {
  trackId: number | null;
  confidence: number | null;
  confidencePct: number | null;
} {
  if (!incident) {
    return { trackId: null, confidence: null, confidencePct: null };
  }

  let trackId: number | null =
    typeof incident.trackId === "number" &&
    Number.isInteger(incident.trackId) &&
    incident.trackId >= 0
      ? incident.trackId
      : null;

  if (trackId === null && incident.evidences && incident.evidences.length > 0) {
    trackId = extractSignalsFromIncident(incident).personTrackId;
  }

  const confidence =
    normalizeConfidenceRatio(incident.confidence) ??
    extractFallbackConfidenceFromEvidences(incident.evidences);

  return {
    trackId,
    confidence,
    confidencePct: confidence !== null ? Math.round(confidence * 100) : null,
  };
}

export function formatViolationLabel(
  violationType?: string,
  isVietnamese = true,
): string {
  if (!violationType) return isVietnamese ? "Vi phạm bảo hộ PPE" : "PPE Violation";
  const map: Record<string, { vi: string; en: string }> = {
    NO_HELMET: { vi: "Không đội mũ bảo hộ", en: "No Hard Hat" },
    NO_VEST: { vi: "Không mặc áo phản quang", en: "No Safety Vest" },
    NO_BOOTS: { vi: "Không mang giày bảo hộ", en: "No Safety Boots" },
    NO_GLOVES: { vi: "Không đeo găng tay bảo hộ", en: "No Safety Gloves" },
    NO_MASK: { vi: "Không đeo khẩu trang", en: "No Mask" },
    RESTRICTED_AREA: { vi: "Vào khu vực nguy hiểm", en: "Restricted Zone Entry" },
    MULTI_VIOLATION: { vi: "Nhiều vi phạm an toàn", en: "Multiple Violations" },
  };
  const key = violationType.toUpperCase().trim();
  if (map[key]) {
    return isVietnamese ? map[key].vi : map[key].en;
  }
  return violationType;
}
