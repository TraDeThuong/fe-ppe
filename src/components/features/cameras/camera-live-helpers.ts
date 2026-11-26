import { resolveEvidenceUrl } from "@/lib/evidence-url";
import { pickLocaleText } from "@/lib/i18n-runtime";
import {
  EVIDENCE_TYPE,
  type CameraConfigItem,
  type CameraItem,
  type EffectiveSafetyConfigResponse,
  type IncidentItem,
} from "@/types";
import type {
  EvidenceItem,
  LiveConfigPayload,
  LiveSessionInfo,
  LiveStartPayload,
  LiveVideoItem,
} from "@/types/ai-test.types";

const SAFE_LIVE_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
const JOB_UPLOAD_ID_REGEX = /^[a-zA-Z0-9_-]{6,64}(\.[a-zA-Z0-9]{2,5})?$/;
const SUPPORTED_STREAM_PROTOCOLS = new Set(["rtsp:", "rtsps:"]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);
const HTML5_VIDEO_EXT_REGEX = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

/**
 * Normalize camera code/id to a backend-safe Live Engine `camera_id`
 * matching `SafeId = ^[A-Za-z0-9_-]{1,64}$`.
 */
export function toSafeLiveCameraId(
  camera: Pick<CameraItem, "id" | "code"> | string,
): string {
  const raw =
    typeof camera === "string"
      ? camera
      : camera.code?.trim() || camera.id?.trim() || "CAM-01";
  const normalized = raw
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (!normalized || !SAFE_LIVE_ID_REGEX.test(normalized)) {
    return "CAM-01";
  }
  return normalized;
}

/** Checks whether a string is a YouTube URL accepted by `_resolve_live_source`. */
export function isYouTubeLiveUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Validates whether `raw` matches the 4 allowlisted live source forms
 * supported by `smart-ppe-ai-service/test-ui/server.py` `_resolve_live_source`:
 * 1) Webcam index ("0".."9")
 * 2) Uploaded video filename / job_id (from `/api/live/videos` or `/api/ai-test/upload`)
 * 3) YouTube URL
 * 4) `rtsp://` or `rtsps://` URL with hostname
 */
export function isSupportedLiveSource(
  raw: string | undefined | null,
  uploadedVideos: LiveVideoItem[] = [],
): boolean {
  const src = (raw ?? "").trim();
  if (!src) return false;

  if (/^[0-9]$/.test(src)) {
    return true;
  }

  if (
    uploadedVideos.some(
      (v) => v.filename === src || (v.stem && v.stem === src),
    )
  ) {
    return true;
  }

  // Also allow freshly uploaded job_id or filename before list refreshes
  if (!src.includes("/") && !src.includes("\\") && JOB_UPLOAD_ID_REGEX.test(src)) {
    const ext = src.includes(".") ? src.slice(src.lastIndexOf(".")).toLowerCase() : "";
    if (!ext || [".mp4", ".mkv", ".avi", ".mov", ".webm"].includes(ext)) {
      return true;
    }
  }

  if (isYouTubeLiveUrl(src)) {
    return true;
  }

  try {
    const parsed = new URL(src);
    return (
      SUPPORTED_STREAM_PROTOCOLS.has(parsed.protocol.toLowerCase()) &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Detects RTSP credentials masked by camera-service (`maskStreamCredentials`: `:***@` or URL-encoded `%2A%2A%2A`).
 */
export function hasMaskedCredentials(raw?: string | null): boolean {
  if (!raw) return false;
  return raw.includes(":***@") || raw.includes("***") || raw.toUpperCase().includes("%2A%2A%2A");
}

export interface EditedStreamUrlResolution {
  ok: boolean;
  /** `undefined` nghĩa là giữ nguyên URL gốc trong DB (không gửi đè chuỗi `***` lên Backend). */
  streamUrl?: string;
  errorCode?: "EMPTY_URL" | "MASKED_PASSWORD_CHANGED";
}

/**
 * Chuẩn hóa `streamUrl` khi cập nhật Camera (`EditCameraModal`):
 * - Nếu không đổi so với URL hiện tại: trả `streamUrl: undefined` để giữ nguyên mật khẩu thật trong DB.
 * - Nếu user đã sửa URL nhưng vẫn còn ký tự che mật khẩu `***`: chặn sớm trên form yêu cầu nhập mật khẩu thật.
 */
export function resolveEditedStreamUrl(
  nextUrl: string,
  originalUrl?: string | null,
): EditedStreamUrlResolution {
  const trimmedNext = nextUrl.trim();
  const trimmedOriginal = (originalUrl ?? "").trim();

  if (!trimmedNext) {
    return { ok: false, errorCode: "EMPTY_URL" };
  }
  if (trimmedNext === trimmedOriginal) {
    return { ok: true, streamUrl: undefined };
  }
  if (hasMaskedCredentials(trimmedNext)) {
    return { ok: false, errorCode: "MASKED_PASSWORD_CHANGED" };
  }
  return { ok: true, streamUrl: trimmedNext };
}

export interface LiveSourceModeOptions {
  /** Production 24/7 AI server (`app/server.py`) hỗ trợ tra cứu M2M RTSP gốc khi URL bị mask `:***@`. */
  productionMode?: boolean;
}

/**
 * Checks whether a camera DB URL can be previewed natively via HTML5 `<video>`.
 */
export function isHtml5VideoUrl(raw?: string | null): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  if (value.startsWith("/") && HTML5_VIDEO_EXT_REGEX.test(value)) return true;
  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.toLowerCase();
    return (
      (protocol === "http:" || protocol === "https:") &&
      HTML5_VIDEO_EXT_REGEX.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Extracts a safe embed URL when a camera points to YouTube so standby view can preview it.
 */
export function getYouTubeEmbedUrl(raw?: string | null): string | null {
  const value = (raw ?? "").trim();
  if (!value || !isYouTubeLiveUrl(value)) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = parsed.pathname.replace(/^\/+/, "").split("/")[0] || null;
    } else if (parsed.pathname.startsWith("/watch")) {
      videoId = parsed.searchParams.get("v");
    } else if (
      parsed.pathname.startsWith("/live/") ||
      parsed.pathname.startsWith("/embed/")
    ) {
      videoId = parsed.pathname.split("/")[2] || null;
    }
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a camera DB record has a direct, non-masked source ready for auto-start
 * (or masked RTSP when running against Production 24/7 AI Server with M2M internal lookup).
 */
export function canAutoStartCameraSource(
  camera: Pick<CameraItem, "sourceType" | "streamUrl">,
  uploadedVideos: LiveVideoItem[] = [],
  options: LiveSourceModeOptions = {},
): boolean {
  const dbUrl = (camera.streamUrl ?? "").trim();
  if (hasMaskedCredentials(dbUrl)) {
    return Boolean(options.productionMode) && isSupportedLiveSource(dbUrl, uploadedVideos);
  }
  return isSupportedLiveSource(dbUrl, uploadedVideos);
}

/**
 * Returns a human-readable explanation if `camera.streamUrl` cannot run directly on AI Engine.
 */
export function resolveCameraSourceIssue(
  camera: Pick<CameraItem, "sourceType" | "streamUrl">,
  uploadedVideos: LiveVideoItem[] = [],
  options: LiveSourceModeOptions = {},
): string | null {
  const dbUrl = (camera.streamUrl ?? "").trim();

  if (!dbUrl) {
    return pickLocaleText(
      "Camera chưa có URL nguồn trong hồ sơ DB. Mở Tab 03 → Nguồn chạy thử AI (Override) nếu cần test.",
      "Camera has no stream URL in DB. Open Tab 03 → AI Test Source (Override) to test.",
    );
  }

  if (hasMaskedCredentials(dbUrl)) {
    if (options.productionMode && isSupportedLiveSource(dbUrl, uploadedVideos)) {
      return null;
    }
    return pickLocaleText(
      "URL RTSP từ Camera Service đang bị ẩn mật khẩu (:***@) nên AI Engine chưa thể tự đăng nhập. Mở Tab 03 → Nguồn Override để nhập RTSP đầy đủ hoặc chọn video test.",
      "RTSP URL from Camera Service has masked credentials (:***@). Open Tab 03 → Override Source to enter full RTSP URL or choose a test video.",
    );
  }

  if (isSupportedLiveSource(dbUrl, uploadedVideos)) {
    return null;
  }

  if (isHtml5VideoUrl(dbUrl)) {
    return pickLocaleText(
      `Nguồn MP4/HTTP (${dbUrl}) hiện dùng để Xem thử (HTML5 Preview). Để chạy nhận diện AI Live trực tiếp, hãy dùng luồng RTSP, YouTube hoặc chọn Video trên AI Server ở phần Override (Tab 03).`,
      `MP4/HTTP source (${dbUrl}) is used for HTML5 Preview. To run live AI detection, use RTSP, YouTube, or select a server video in Override (Tab 03).`,
    );
  }

  return pickLocaleText(
    `Nguồn DB (${dbUrl}) không thuộc RTSP / YouTube / Server Video mà Live AI Engine hỗ trợ trực tiếp. Mở Tab 03 → Nguồn chạy thử AI (Override) để test AI.`,
    `DB source (${dbUrl}) is not directly supported by Live AI Engine (RTSP / YouTube / Server Video). Open Tab 03 → AI Test Source (Override).`,
  );
}

export interface InitialCameraSourceResolution {
  source: string;
  usesFallbackServerVideo: boolean;
  cameraSourceNote: string | null;
}

/**
 * Resolves the best initial Live Engine `source` string for a DB camera without
 * altering backend validation rules.
 */
export function resolveInitialCameraSource(
  camera: CameraItem,
  uploadedVideos: LiveVideoItem[] = [],
  options: LiveSourceModeOptions = {},
): InitialCameraSourceResolution {
  const dbUrl = (camera.streamUrl ?? "").trim();

  if (
    (!hasMaskedCredentials(dbUrl) || options.productionMode) &&
    isSupportedLiveSource(dbUrl, uploadedVideos)
  ) {
    return {
      source: dbUrl,
      usesFallbackServerVideo: false,
      cameraSourceNote: null,
    };
  }

  const issue = resolveCameraSourceIssue(camera, uploadedVideos, options);

  if (uploadedVideos.length > 0) {
    return {
      source: uploadedVideos[0].filename,
      usesFallbackServerVideo: Boolean(dbUrl),
      cameraSourceNote:
        issue ??
        pickLocaleText(
          `Đã chọn sẵn video test từ AI Engine (${uploadedVideos[0].filename}).`,
          `Pre-selected test video from AI Engine (${uploadedVideos[0].filename}).`,
        ),
    };
  }

  return {
    source: "",
    usesFallbackServerVideo: Boolean(dbUrl),
    cameraSourceNote: issue,
  };
}

export interface AutoStartSelectionOptions extends LiveSourceModeOptions {
  maxTotalSessions?: number;
  attemptedIds?: ReadonlySet<string>;
}

/**
 * Selects ONLINE cameras whose DB source can run directly on AI Engine without
 * exceeding backend session capacity or retrying already-attempted/stopped cameras.
 */
export function selectAutoStartCandidates(
  cameras: readonly CameraItem[],
  sessions: readonly LiveSessionInfo[],
  uploadedVideos: readonly LiveVideoItem[] = [],
  options: AutoStartSelectionOptions = {},
): CameraItem[] {
  const maxTotal = Math.max(1, options.maxTotalSessions ?? 4);
  const attempted = options.attemptedIds;

  const sessionMap = new Map<string, LiveSessionInfo>();
  let activeCount = 0;
  for (const s of sessions) {
    sessionMap.set(s.camera_id, s);
    if (s.status === "running" || s.status === "initializing" || s.status === "reconnecting") {
      activeCount++;
    }
  }

  const remainingSlots = Math.max(0, maxTotal - activeCount);
  if (remainingSlots === 0) return [];

  const candidates: CameraItem[] = [];
  for (const camera of cameras) {
    if (candidates.length >= remainingSlots) break;
    if (camera.status !== "ONLINE") continue;
    if (camera.config?.enabled === false) continue;
    if (camera.config?.processingEnabled === false) continue;
    if (attempted?.has(camera.id)) continue;

    const existing = findSessionForCamera(sessionMap, camera);
    if (
      existing &&
      (existing.status === "running" || existing.status === "initializing" || existing.status === "reconnecting")
    ) {
      continue;
    }

    if (!canAutoStartCameraSource(camera, [...uploadedVideos], options)) continue;
    candidates.push(camera);
  }

  return candidates;
}

export interface CameraLiveFormValues {
  source: string;
  cameraUuid?: string | null;
  model?: string | null;
  targetFps: number;
  aiFps: number;
  confirmHelmetSec: number;
  confirmVestSec: number;
  confidenceThreshold?: number;
  cooldownSec?: number;
  enableNoHelmet: boolean;
  enableNoVest: boolean;
  enableRestrictedArea: boolean;
  enableSceneCut: boolean;
  roiPolygon?: ReadonlyArray<{ x: number; y: number }> | null;
}

/**
 * Chuyển đổi mảng điểm `{ x, y }` từ CameraConfig.roiPolygon hoặc RestrictedArea.boundary
 * sang định dạng `number[][][]` (`[[[x, y], ...]]`) của AI Engine.
 * Tự động bỏ qua đa giác placeholder (0,0) có diện tích bằng 0.
 */
export function toLiveRoiPolygons(
  points?: ReadonlyArray<{ x: number; y: number }> | unknown,
): number[][][] | null {
  if (!Array.isArray(points) || points.length < 3 || points.length > 50) {
    return null;
  }
  const coords: number[][] = [];
  for (const item of points) {
    if (item && typeof item === "object" && "x" in item && "y" in item) {
      const x = Number((item as { x: unknown }).x);
      const y = Number((item as { y: unknown }).y);
      if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0) {
        coords.push([x, y]);
      }
    }
  }
  if (coords.length < 3) return null;
  const hasNonZero = coords.some(([x, y]) => x > 0.0001 || y > 0.0001);
  if (!hasNonZero) return null;
  return [coords];
}

function clampFps(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(60, Math.max(1, Math.round(value)));
}

function clampConfirmSec(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(30, Math.max(0.5, Number(value.toFixed(1))));
}

function clampConfidence(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1.0, Math.max(0.1, Number(value.toFixed(2))));
}

function clampCooldownSec(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(3600, Math.max(0, Math.round(value)));
}

/**
 * Maps optional camera DB config and effective safety config into initial Live form defaults.
 * Priority: Effective Safety Config (Camera Override or Site Level) -> CameraConfigItem -> Fallback defaults.
 */
export function deriveLiveDefaultsFromConfig(
  config?: CameraConfigItem | null,
  effectiveSafety?: EffectiveSafetyConfigResponse | null,
): Omit<CameraLiveFormValues, "source" | "model"> {
  const targetFps = clampFps(
    effectiveSafety?.captureFps ?? config?.captureFps ?? 25,
    25,
  );
  const aiFps = clampFps(Math.min(targetFps, 15), 15);
  const processingEnabled = config?.processingEnabled ?? true;

  const rawHelmetConfirm =
    effectiveSafety?.helmetConfirmationDuration ??
    effectiveSafety?.confirmationDuration;
  const confirmHelmetSec =
    rawHelmetConfirm != null
      ? clampConfirmSec(Number(rawHelmetConfirm), 2.0)
      : 2.0;

  // Đọc độc lập vestConfirmationDuration (mặc định 4.0s, không ép theo confirmationDuration của Mũ)
  const confirmVestSec =
    effectiveSafety?.vestConfirmationDuration != null
      ? clampConfirmSec(Number(effectiveSafety.vestConfirmationDuration), 4.0)
      : 4.0;

  const confidenceThreshold =
    effectiveSafety?.confidenceThreshold != null
      ? clampConfidence(Number(effectiveSafety.confidenceThreshold), 0.8)
      : 0.8;

  const cooldownSec =
    effectiveSafety?.cooldownDuration != null
      ? clampCooldownSec(Number(effectiveSafety.cooldownDuration), 30)
      : 30;

  const enableNoHelmet =
    effectiveSafety?.rules?.enableNoHelmet !== undefined
      ? Boolean(effectiveSafety.rules.enableNoHelmet)
      : processingEnabled;

  const enableNoVest =
    effectiveSafety?.rules?.enableNoVest !== undefined
      ? Boolean(effectiveSafety.rules.enableNoVest)
      : processingEnabled;

  const enableRestrictedArea =
    effectiveSafety?.rules?.enableRestrictedArea !== undefined
      ? Boolean(effectiveSafety.rules.enableRestrictedArea)
      : processingEnabled;

  return {
    targetFps,
    aiFps,
    confirmHelmetSec,
    confirmVestSec,
    confidenceThreshold,
    cooldownSec,
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    enableSceneCut: true,
  };
}

/**
 * Builds strict `LiveStartPayload` adhering to BE `ConfigDict(extra="forbid")`.
 * In Production 24/7 mode, sends `camera_uuid` and omits masked `source` so AI Server
 * performs M2M internal lookup against Camera Service.
 */
export function buildCameraStartPayload(
  camera: Pick<CameraItem, "id" | "code"> | string,
  values: CameraLiveFormValues,
  options: LiveSourceModeOptions = {},
): LiveStartPayload {
  const trimmedSource = values.source.trim();
  const roiPolygons = toLiveRoiPolygons(values.roiPolygon);
  const base: LiveStartPayload = {
    camera_id: toSafeLiveCameraId(camera),
    source: trimmedSource,
    model: values.model ? values.model : undefined,
    target_fps: clampFps(values.targetFps, 25),
    ai_fps: clampFps(values.aiFps, 15),
    confirmation_duration_s: clampConfirmSec(values.confirmHelmetSec, 2.0),
    confirmation_duration_vest_s: clampConfirmSec(values.confirmVestSec, 4.0),
    enable_no_helmet: values.enableNoHelmet,
    enable_no_vest: values.enableNoVest,
    enable_restricted_area: values.enableRestrictedArea,
    enable_scene_cut: values.enableSceneCut,
  };

  if (values.confidenceThreshold !== undefined) {
    base.confidence_threshold = clampConfidence(values.confidenceThreshold, 0.8);
  }
  if (values.cooldownSec !== undefined) {
    base.cooldown_s = clampCooldownSec(values.cooldownSec, 30);
  }

  if (roiPolygons) {
    base.roi_polygons = roiPolygons;
  }

  if (options.productionMode) {
    const camUuid =
      values.cameraUuid ?? (typeof camera === "object" ? camera.id : undefined);
    if (camUuid) {
      base.camera_uuid = camUuid;
    }
    if (!trimmedSource || hasMaskedCredentials(trimmedSource)) {
      delete base.source;
    }
  }

  return base;
}

/**
 * Builds strict `LiveConfigPayload` adhering to BE `ConfigDict(extra="forbid")`.
 */
export function buildCameraHotConfigPayload(
  values: Omit<CameraLiveFormValues, "source" | "model">,
): LiveConfigPayload {
  const roiPolygons = toLiveRoiPolygons(values.roiPolygon);
  const payload: LiveConfigPayload = {
    target_fps: clampFps(values.targetFps, 25),
    ai_fps: clampFps(values.aiFps, 15),
    enable_no_helmet: values.enableNoHelmet,
    enable_no_vest: values.enableNoVest,
    enable_restricted_area: values.enableRestrictedArea,
    enable_scene_cut: values.enableSceneCut,
    confirmation_duration_s: clampConfirmSec(values.confirmHelmetSec, 2.0),
    confirmation_duration_vest_s: clampConfirmSec(values.confirmVestSec, 4.0),
  };
  if (values.confidenceThreshold !== undefined) {
    payload.confidence_threshold = clampConfidence(values.confidenceThreshold, 0.8);
  }
  if (values.cooldownSec !== undefined) {
    payload.cooldown_s = clampCooldownSec(values.cooldownSec, 30);
  }
  if (roiPolygons) {
    payload.roi_polygons = roiPolygons;
  }
  return payload;
}

/**
 * Matches a camera item to any matching Live Engine session across safe/raw IDs.
 */
export function findSessionForCamera(
  sessionMap: Map<string, LiveSessionInfo>,
  camera: Pick<CameraItem, "id" | "code">,
): LiveSessionInfo | undefined {
  const safeId = toSafeLiveCameraId(camera);
  return (
    sessionMap.get(safeId) ??
    sessionMap.get(camera.code) ??
    sessionMap.get(camera.id)
  );
}

/**
 * Splits AI Engine live sessions into those matching existing DB cameras and
 * orphaned sessions whose camera records have been deleted.
 */
export function filterSessionsForCameras(
  sessions: readonly LiveSessionInfo[],
  cameras: readonly Pick<CameraItem, "id" | "code">[],
): {
  matchedSessions: LiveSessionInfo[];
  orphanedSessions: LiveSessionInfo[];
} {
  if (sessions.length === 0) {
    return { matchedSessions: [], orphanedSessions: [] };
  }
  if (cameras.length === 0) {
    return { matchedSessions: [], orphanedSessions: [...sessions] };
  }

  const validKeys = new Set<string>();
  for (const cam of cameras) {
    if (cam.id) validKeys.add(cam.id);
    if (cam.code) validKeys.add(cam.code);
    validKeys.add(toSafeLiveCameraId(cam));
  }

  const matchedSessions: LiveSessionInfo[] = [];
  const orphanedSessions: LiveSessionInfo[] = [];

  for (const s of sessions) {
    const isMatched =
      validKeys.has(s.camera_id) ||
      validKeys.has(toSafeLiveCameraId(s.camera_id)) ||
      Boolean(s.camera_uuid && validKeys.has(s.camera_uuid));
    if (isMatched) {
      matchedSessions.push(s);
    } else {
      orphanedSessions.push(s);
    }
  }

  return { matchedSessions, orphanedSessions };
}

/**
 * Resolves the primary violation snapshot URL stored in Incident DB / MinIO.
 */
export function getDbIncidentSnapshotUrl(incident: IncidentItem): string {
  if (incident.snapshotUrl) {
    return resolveEvidenceUrl(incident.snapshotUrl);
  }
  const snapshot =
    incident.evidences?.find(
      (ev) => ev.evidenceType === EVIDENCE_TYPE.SNAPSHOT,
    ) ??
    incident.evidences?.find(
      (ev) => ev.evidenceType !== EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
    ) ??
    incident.evidences?.[0];
  if (!snapshot) return "";
  return resolveEvidenceUrl(snapshot.url || snapshot.storageKey);
}

function extractTrackLabel(incident: IncidentItem): string {
  const desc = incident.description ?? "";
  const match = desc.match(/(?:track|person)\s*#?\s*(\d+)/i);
  if (match?.[1]) return match[1];
  return `DB-${incident.id.slice(0, 6)}`;
}

export interface ExtractedIncidentEvidencePair {
  beforeUrl: string | null;
  afterUrl: string | null;
  primaryUrl: string;
  isPair: boolean;
  lightboxItem: EvidenceItem | null;
}

/**
 * Extracts Before (`REFERENCE_SNAPSHOT`) and After (`SNAPSHOT`) URLs plus a Lightbox-ready `EvidenceItem`
 * from an `IncidentItem` so both List rows and Before/After Grid cards share one normalized contract.
 */
export function extractIncidentEvidencePair(
  incident: IncidentItem,
  cameraCode = "",
): ExtractedIncidentEvidencePair {
  const afterUrl = getDbIncidentSnapshotUrl(incident) || null;
  const refEv = incident.evidences?.find(
    (ev) => ev.evidenceType === EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
  );
  const beforeUrl = refEv
    ? resolveEvidenceUrl(refEv.url || refEv.storageKey) || null
    : null;
  const primaryUrl = afterUrl || beforeUrl || "";
  const isPair = Boolean(beforeUrl && afterUrl);
  const lightboxItem: EvidenceItem | null = primaryUrl
    ? {
        id: `db-${incident.id}`,
        source: "live",
        sourceId: cameraCode ? `${cameraCode} (DB)` : "Incident DB",
        type: incident.violationType,
        trackId:
          incident.trackId != null
            ? String(incident.trackId)
            : extractTrackLabel(incident),
        timestamp: incident.detectedAt || incident.createdAt,
        beforeUrl,
        afterUrl,
        primaryUrl,
      }
    : null;

  return { beforeUrl, afterUrl, primaryUrl, isPair, lightboxItem };
}

/**
 * Normalizes Incident DB records (`SNAPSHOT` & `REFERENCE_SNAPSHOT`) into shared `EvidenceItem[]`.
 */
export function normalizeIncidentEvidences(
  cameraCode: string,
  incidents: IncidentItem[],
): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  for (const inc of incidents) {
    const { lightboxItem } = extractIncidentEvidencePair(inc, cameraCode);
    if (lightboxItem) out.push(lightboxItem);
  }
  return out;
}

/**
 * Merges current Live RAM evidences and persisted Incident DB evidences cleanly without duplicates.
 */
export function mergeCameraEvidences(
  liveEvidences: EvidenceItem[],
  dbEvidences: EvidenceItem[],
): EvidenceItem[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const merged: EvidenceItem[] = [];

  for (const item of [...liveEvidences, ...dbEvidences]) {
    if (seenIds.has(item.id)) continue;
    const urlKey = item.afterUrl || item.primaryUrl;
    if (urlKey && seenUrls.has(urlKey)) continue;
    seenIds.add(item.id);
    if (urlKey) seenUrls.add(urlKey);
    merged.push(item);
  }

  return merged;
}

