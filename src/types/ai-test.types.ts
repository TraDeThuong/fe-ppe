export type AiTestViewTab = "live" | "player" | "gallery";

export type JobStatus = "idle" | "queued" | "running" | "done" | "error";

export type ViolationFilterType =
  | "ALL"
  | "NO_HELMET"
  | "NO_VEST"
  | "RESTRICTED_AREA";

export interface ModelInfo {
  name: string;
  path: string;
  size_mb?: number;
  is_default?: boolean;
}

export interface JobSummary {
  job_id: string;
  status: JobStatus;
  video_name?: string;
  filename?: string;
  progress?: number;
  current_frame?: number;
  total_frames?: number;
  fps?: number;
  width?: number;
  height?: number;
  model?: string;
  conf?: number;
  error?: string | null;
  created_at?: string;
  has_video?: boolean;
  has_log?: boolean;
  evidence_count?: number;
  violation_count?: number;
}

export interface UploadJobResponse {
  job_id: string;
  video_name?: string;
  filename?: string;
  path?: string;
  status?: JobStatus;
  message?: string;
}

export interface JobMeta {
  job_id: string;
  video_name?: string;
  fps?: number;
  width?: number;
  height?: number;
  total_frames?: number;
  duration_sec?: number;
  model?: string;
  conf?: number;
  iou?: number;
  imgsz?: number;
  stride?: number;
  evidences?: RawEvidenceRecord[];
  summary?: Record<string, unknown>;
}

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type RawBBox = [number, number, number, number] | BBox;

export interface FramePersonDetection {
  track_id: number | string;
  bbox?: RawBBox;
  conf?: number;
  has_helmet?: boolean;
  has_vest?: boolean;
  missing?: string[];
  label?: string;
}

export interface PpeAssociationItem {
  track_id?: number | string;
  person_track_id?: number | string;
  person_bbox?: RawBBox;
  helmet?: {
    matched?: boolean;
    present?: boolean;
    conf?: number;
    bbox?: RawBBox;
    label?: string;
  } | boolean | null;
  safety_vest?: {
    matched?: boolean;
    present?: boolean;
    conf?: number;
    bbox?: RawBBox;
    label?: string;
  } | boolean | null;
  vest?: {
    matched?: boolean;
    present?: boolean;
    conf?: number;
    bbox?: RawBBox;
    label?: string;
  } | boolean | null;
  missing?: string[];
  status?: string;
}

export interface FrameViolationRecord {
  violation_id?: string;
  type: string;
  label?: string;
  track_id: number | string;
  person_bbox?: RawBBox;
  bbox?: RawBBox;
  duration_sec?: number;
  sustained_sec?: number;
  active?: boolean;
  conf?: number;
}

export interface RawEvidenceRecord {
  evidence_id?: string;
  id?: string;
  filename?: string;
  file?: string;
  before_filename?: string;
  after_filename?: string;
  before_url?: string;
  after_url?: string;
  snapshot_url?: string;
  reference_snapshot_url?: string;
  image_url?: string;
  url?: string;
  type?: string;
  violation_type?: string;
  track_id?: number | string;
  person_id?: number | string;
  canonical_person_id?: number | string;
  frame_idx?: number;
  frame?: number;
  time_sec?: number;
  timestamp_sec?: number;
  confirmed_t?: number;
  start_t?: number;
  timestamp?: string;
  created_at?: string;
  conf?: number;
}

export interface FrameLogEntry {
  frame_idx: number;
  time_sec?: number;
  persons?: FramePersonDetection[];
  associations?: PpeAssociationItem[];
  violations?: FrameViolationRecord[];
  evidences?: RawEvidenceRecord[];
  inference_ms?: number;
}

export interface FrameRange {
  start: number;
  end: number;
}

export interface PersonTrackSummary {
  trackId: string;
  totalFrames: number;
  firstFrame: number;
  lastFrame: number;
  firstTimeSec: number;
  lastTimeSec: number;
  ranges: FrameRange[];
  violationRanges: FrameRange[];
  violationTypes: string[];
}

export interface ViolationTimelineEvent {
  key: string;
  trackId: string;
  type: string;
  startFrame: number;
  endFrame: number;
  startTimeSec: number;
  endTimeSec: number;
  maxDurationSec: number;
}

export interface EvidenceItem {
  id: string;
  source: "job" | "live";
  sourceId: string;
  type: string;
  trackId: string;
  frameIdx?: number;
  timeSec?: number;
  timestamp?: string;
  beforeUrl: string | null;
  afterUrl: string | null;
  primaryUrl: string;
}

export interface LiveVideoItem {
  filename: string;
  stem?: string;
  name?: string;
  size_mb?: number;
  duration_sec?: number;
  fps?: number;
  width?: number;
  height?: number;
  resolution?: string;
}

export interface LiveStartPayload {
  camera_id: string;
  source: string;
  model?: string | null;
  target_fps: number;
  ai_fps: number;
  roi_polygons?: number[][][] | null;
  confirmation_duration_s: number;
  confirmation_duration_vest_s?: number | null;
  enable_no_helmet: boolean;
  enable_no_vest: boolean;
  enable_restricted_area: boolean;
  enable_scene_cut: boolean;
}

export interface LiveConfigPayload {
  target_fps?: number | null;
  ai_fps?: number | null;
  roi_polygons?: number[][][] | null;
  enable_no_helmet?: boolean | null;
  enable_no_vest?: boolean | null;
  enable_restricted_area?: boolean | null;
  enable_scene_cut?: boolean | null;
  confirmation_duration_s?: number | null;
  confirmation_duration_vest_s?: number | null;
}

export interface LiveMetrics {
  fps?: number;
  target_fps?: number;
  ai_fps?: number;
  ai_fps_actual?: number;
  inference_latency_ms?: number;
  rule_latency_ms?: number;
  e2e_alert_latency_ms?: number;
  active_persons?: number;
  active_violations?: number;
  counts?: {
    person?: number;
    helmet?: number;
    safety_vest?: number;
  };
}

export interface LiveViolationEvent {
  event_id: string;
  camera_id: string;
  person_id?: number;
  canonical_person_id?: number;
  violation_type: string;
  start_t?: number;
  confirmed_t?: number;
  duration_s?: number;
  frame?: number;
  snapshot_url?: string;
  reference_snapshot_url?: string;
  has_reference?: boolean;
  reference_type?: string;
  dispatched_via?: string;
  e2e_alert_latency_ms?: number;
  timestamp?: string;
}

export interface LiveSessionInfo {
  camera_id: string;
  status?: string;
  target_fps?: number;
  ai_fps?: number;
  source?: string;
  metrics?: LiveMetrics;
}

export interface LiveStatsResponse {
  camera_id: string;
  status?: string;
  error?: string | null;
  metrics?: LiveMetrics;
  recent_violations?: LiveViolationEvent[];
  evidences?: RawEvidenceRecord[];
}
