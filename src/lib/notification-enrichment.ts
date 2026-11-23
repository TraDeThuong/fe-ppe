import {
  isDockerInternalMinioUrl,
  resolveEvidenceUrl,
} from "@/lib/evidence-url";
import { EVIDENCE_TYPE } from "@/types/incident.types";
import type { EvidenceItem, IncidentItem } from "@/types";

export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NotificationEnrichedSignals {
  incidentId: string;
  cameraId: string;
  cameraCode?: string;
  siteId: string;
  siteName?: string;
  detectedAtMs: number;
  violationType: string;
  severity: string;
  status: string;
  personTrackId: number | null;
  personBox: NormalizedBox | null;
  evidenceId: string | null;
  evidenceChecksum: string | null;
  evidenceUrl: string | null;
}

const TRACK_KEY_RE = /(?:^|[_/-])track(\d+)(?:[_.-]|$)/i;

/**
 * Trích xuất track_id từ storageKey ảnh MinIO (VD: `..._track7_<uuid>.jpg`).
 */
export function extractTrackIdFromStorageKey(
  storageKey?: string | null,
): number | null {
  if (!storageKey || typeof storageKey !== "string") return null;
  const match = storageKey.match(TRACK_KEY_RE);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeCandidateBox(
  raw: unknown,
  frameW?: number | null,
  frameH?: number | null,
): NormalizedBox | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const x = Number(obj.x);
  const y = Number(obj.y);
  const w = Number(obj.width);
  const h = Number(obj.height);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return null;
  }

  // Nếu giá trị > 1.5 coi như pixel thô, chuẩn hóa về [0..1]
  if (x > 1.5 || y > 1.5 || w > 1.5 || h > 1.5) {
    const fw = frameW && frameW > 0 ? frameW : 1280;
    const fh = frameH && frameH > 0 ? frameH : 720;
    return {
      x: Math.max(0, Math.min(1, x / fw)),
      y: Math.max(0, Math.min(1, y / fh)),
      width: Math.max(0, Math.min(1, w / fw)),
      height: Math.max(0, Math.min(1, h / fh)),
    };
  }

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    width: Math.max(0, Math.min(1, w)),
    height: Math.max(0, Math.min(1, h)),
  };
}

/**
 * Tính Intersection-over-Union (IoU) giữa 2 bounding box chuẩn hóa [0..1].
 */
export function computeBoxIoU(a: NormalizedBox, b: NormalizedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const unionArea = areaA + areaB - interArea;
  if (unionArea <= 0) return 0;

  return interArea / unionArea;
}

/**
 * Tính khoảng cách Euclidean giữa tâm 2 bounding box chuẩn hóa [0..1].
 */
export function computeBoxCenterDistance(
  a: NormalizedBox,
  b: NormalizedBox,
): number {
  const cxA = a.x + a.width / 2;
  const cyA = a.y + a.height / 2;
  const cxB = b.x + b.width / 2;
  const cyB = b.y + b.height / 2;
  return Math.hypot(cxA - cxB, cyA - cyB);
}

/**
 * Tỉ lệ diện tích nhỏ / lớn giữa 2 bounding box (0..1).
 */
export function computeBoxAreaRatio(
  a: NormalizedBox,
  b: NormalizedBox,
): number {
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const maxArea = Math.max(areaA, areaB);
  if (maxArea <= 0) return 0;
  return Math.min(areaA, areaB) / maxArea;
}

function selectPrimarySnapshot(evidences?: EvidenceItem[]): EvidenceItem | null {
  if (!evidences || evidences.length === 0) return null;
  return (
    evidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ??
    evidences[0] ??
    null
  );
}

function extractPersonIdentityFromAiDetections(
  evidence: EvidenceItem | null,
): { personTrackId: number | null; personBox: NormalizedBox | null } {
  if (!evidence) return { personTrackId: null, personBox: null };

  const meta = evidence.metadata;
  const frameW = meta?.width ?? 1280;
  const frameH = meta?.height ?? 720;
  const ai = (meta?.aiDetections ?? null) as Record<string, unknown> | null;

  let violationBox: NormalizedBox | null = null;
  let trackId: number | null = null;

  if (ai && typeof ai === "object") {
    const violationObj = ai.violation as Record<string, unknown> | undefined;
    if (violationObj && typeof violationObj === "object") {
      violationBox = normalizeCandidateBox(violationObj.box, frameW, frameH);
      const directTrack = violationObj.track_id ?? violationObj.trackId;
      if (directTrack !== undefined && directTrack !== null) {
        const parsed = Number(directTrack);
        if (Number.isInteger(parsed) && parsed >= 0) {
          trackId = parsed;
        }
      }
    }

    const rawAll = Array.isArray(ai.allDetections)
      ? ai.allDetections
      : Array.isArray(ai.persons)
        ? ai.persons
        : [];

    const personCandidates: Array<{
      trackId: number | null;
      box: NormalizedBox | null;
    }> = [];

    for (const det of rawAll) {
      if (!det || typeof det !== "object") continue;
      const d = det as Record<string, unknown>;
      const cls = String(d.class ?? d.classLabel ?? "PERSON").toUpperCase();
      if (cls !== "PERSON") continue;
      const detTrackRaw = d.track_id ?? d.trackId;
      const detTrack =
        detTrackRaw !== undefined && detTrackRaw !== null && Number.isInteger(Number(detTrackRaw))
          ? Number(detTrackRaw)
          : null;
      const detBox = normalizeCandidateBox(d.box, frameW, frameH);
      personCandidates.push({ trackId: detTrack, box: detBox });
    }

    if (trackId === null && personCandidates.length > 0) {
      if (violationBox) {
        let bestIoU = 0;
        let bestTrack: number | null = null;
        for (const cand of personCandidates) {
          if (cand.trackId === null || !cand.box) continue;
          const iou = computeBoxIoU(violationBox, cand.box);
          if (iou > bestIoU) {
            bestIoU = iou;
            bestTrack = cand.trackId;
          }
        }
        if (bestIoU >= 0.35 && bestTrack !== null) {
          trackId = bestTrack;
        }
      } else if (personCandidates.length === 1) {
        trackId = personCandidates[0].trackId;
        violationBox = personCandidates[0].box;
      }
    }

    if (!violationBox && trackId !== null) {
      const matched = personCandidates.find((c) => c.trackId === trackId && c.box);
      if (matched?.box) {
        violationBox = matched.box;
      }
    }
  }

  // Fallback: trích xuất `_track<N>` từ storageKey / fileName MinIO
  if (trackId === null) {
    trackId =
      extractTrackIdFromStorageKey(evidence.storageKey) ??
      extractTrackIdFromStorageKey(evidence.fileName);
  }

  return { personTrackId: trackId, personBox: violationBox };
}

function resolveIncidentSnapshotUrl(
  incident: IncidentItem,
  snapshot: EvidenceItem | null,
): string | null {
  const candidates = [
    incident.snapshotUrl,
    snapshot?.url,
    snapshot?.storageKey,
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    if (isDockerInternalMinioUrl(raw)) {
      const normalized = resolveEvidenceUrl(raw);
      if (normalized) return normalized;
      continue;
    }
    const resolved = resolveEvidenceUrl(raw);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Trích xuất tín hiệu định danh người vi phạm & ảnh bằng chứng từ bản ghi IncidentItem có sẵn.
 */
export function extractSignalsFromIncident(
  incident: IncidentItem,
): NotificationEnrichedSignals {
  const snapshot = selectPrimarySnapshot(incident.evidences);
  const { personTrackId, personBox } =
    extractPersonIdentityFromAiDetections(snapshot);
  const detectedAtMs = Date.parse(incident.detectedAt || incident.createdAt);

  return {
    incidentId: incident.id,
    cameraId: incident.cameraId,
    cameraCode: incident.cameraCode || undefined,
    siteId: incident.siteId,
    siteName: incident.siteName || undefined,
    detectedAtMs: Number.isFinite(detectedAtMs) ? detectedAtMs : 0,
    violationType: incident.violationType,
    severity: incident.severity,
    status: incident.status,
    personTrackId,
    personBox,
    evidenceId: snapshot?.id ?? null,
    evidenceChecksum: snapshot?.metadata?.checksum ?? null,
    evidenceUrl: resolveIncidentSnapshotUrl(incident, snapshot),
  };
}

/**
 * Lập chỉ mục tra cứu nhanh `Map<incidentId, NotificationEnrichedSignals>` cho tầng gom nhóm FE.
 */
export function buildIncidentSignalMap(
  incidents: readonly IncidentItem[],
): Map<string, NotificationEnrichedSignals> {
  const map = new Map<string, NotificationEnrichedSignals>();
  for (const incident of incidents) {
    if (!incident?.id) continue;
    map.set(incident.id, extractSignalsFromIncident(incident));
  }
  return map;
}
