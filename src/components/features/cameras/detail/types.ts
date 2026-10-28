export interface DetectionItem {
  class_name: "person" | "helmet" | "safety_vest" | string;
  track_id: number | null;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  w: number;
  h: number;
}

export interface FrameAssociation {
  person: number;
  helmet: number | null;
  vest: number | null;
  status: "matched" | "unknown" | string;
}

export interface PersonStatus {
  track_id: number;
  status: "COMPLIANT" | "VIOLATION_CANDIDATE" | "UNKNOWN" | string;
  violations: string[];
  reason: string;
}

export interface ViolationEvent {
  event_id: string;
  camera_id: string;
  person: number;
  canonical_person?: number;
  violation_type: "no_helmet" | "no_safety_vest" | string;
  start_t: number;
  confirmed_t: number;
  duration_s: number;
  frame: number;
}

export interface EvidenceRecord {
  event_id: string;
  status: "saved" | "error" | string;
  path?: string;
  error?: string;
  frame: number;
}

export interface FrameLogEntry {
  frame: number;
  t: number;
  detections: DetectionItem[];
  summary: {
    person: number;
    helmet: number;
    safety_vest: number;
    tracks: number;
  };
  events: string[];
  associations: FrameAssociation[];
  persons: PersonStatus[];
  confirmations: any[];
  violations: ViolationEvent[];
  evidence: EvidenceRecord[];
}

export interface AiVideoMeta {
  job_id: string;
  source: string;
  fps: number;
  size: [number, number]; // [width, height]
  total_frames: number;
  model: string;
  confirmation_duration_s: number;
  status: string;
  processed_at?: string;
}

export interface ComputedPersonTrack {
  id: number;
  frames: number[];
  okFrames: number[];
  noHelmetFrames: Set<number>;
  noVestFrames: Set<number>;
  unknownCount: number;
}
