/**
 * Contract Incident Management theo Backend smart-ppe-incident-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-incident-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-incident-service/src/modules/incident/incident.dto.ts
 * - Routes: smart-ppe-incident-service/src/modules/incident/incident.route.ts
 */

import type { PaginationMeta } from "./rbac.types";

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const INCIDENT_STATUS = {
  PENDING_REVIEW: "PENDING_REVIEW",
  CONFIRMED: "CONFIRMED",
  DISMISSED: "DISMISSED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export type IncidentStatus =
  (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

export const VIOLATION_TYPE = {
  NO_HELMET: "NO_HELMET",
  NO_VEST: "NO_VEST",
  RESTRICTED_AREA: "RESTRICTED_AREA",
  MULTI_VIOLATION: "MULTI_VIOLATION",
} as const;

export type ViolationType =
  (typeof VIOLATION_TYPE)[keyof typeof VIOLATION_TYPE];

export const INCIDENT_SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type IncidentSeverity =
  (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];

export const EVIDENCE_TYPE = {
  SNAPSHOT: "SNAPSHOT",
  REFERENCE_SNAPSHOT: "REFERENCE_SNAPSHOT",
  VIDEO_CLIP: "VIDEO_CLIP",
} as const;

export type EvidenceType =
  (typeof EVIDENCE_TYPE)[keyof typeof EVIDENCE_TYPE];

export const ASSIGNMENT_STATUS = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

export type AssignmentStatus =
  (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

// ============================================================================
// 2. BOUNDING BOX & EVIDENCE TYPES
// ============================================================================

export interface BoundingBox {
  x: number;      // 0 to 1 normalized, or pixel value
  y: number;
  width: number;
  height: number;
  label?: string; // "NO_HELMET", "NO_VEST", "PERSON"
  confidence?: number;
}

export interface AiDetectionMetadata {
  persons?: {
    box: BoundingBox;
    confidence: number;
    violations?: {
      type: string;
      box: BoundingBox;
      confidence: number;
    }[];
  }[];
  rawDetections?: unknown;
}

export interface EvidenceMetadataItem {
  id: string;
  evidenceId: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  frameRate?: number | null;
  checksum?: string | null;
  aiDetections?: AiDetectionMetadata | null;
  createdAt: string;
}

export interface EvidenceIncidentSummary {
  id: string;
  siteId: string;
  cameraId: string;
  violationType: ViolationType | string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  detectedAt: string;
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  cameraId: string;
  evidenceType: EvidenceType | string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number | string;
  capturedAt: string;
  createdAt: string;
  metadata?: EvidenceMetadataItem | null;
  url?: string;
  incident?: EvidenceIncidentSummary | null;
}

export interface IncidentAssignmentItem {
  id: string;
  incidentId: string;
  assignedTo: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assignedAt: string;
  unassignedAt?: string | null;
  status: AssignmentStatus | string;
  deadline?: string | null;
  priority?: "URGENT" | "HIGH" | "NORMAL";
  note?: string | null;
  /** Người giao (BE cần lưu cột assigned_by — xem hợp đồng mục 4). */
  assignedBy?: string | null;
  /** Mã đợt giao việc: mọi phân công tạo trong cùng một lệnh batch-assign có chung batchId. */
  batchId?: string | null;
}

export interface IncidentCommentItem {
  id: string;
  incidentId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  comment: string;
  createdAt: string;
}

export interface IncidentStatusHistoryItem {
  id: string;
  incidentId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  reason?: string | null;
}

export interface IncidentItem {
  id: string;
  siteId: string;
  siteName?: string;
  zoneId?: string | null;
  zoneName?: string | null;
  cameraId: string;
  cameraName?: string;
  cameraCode?: string;
  violationId?: string | null;
  violationType: ViolationType | string;
  severity: IncidentSeverity | string;
  status: IncidentStatus | string;
  detectedAt: string;
  resolvedAt?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  evidences?: EvidenceItem[];
  assignments?: IncidentAssignmentItem[];
  comments?: IncidentCommentItem[];
  statusHistory?: IncidentStatusHistoryItem[];
  _count?: {
    evidences?: number;
    comments?: number;
    assignments?: number;
  };
  confidence?: number | null;
  trackId?: number | null;
  snapshotUrl?: string;
}

// ============================================================================
// 3. QUERY & MUTATION PAYLOADS
// ============================================================================

export interface IncidentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: string;
  /** Bộ lọc phân khu tầng UI — được ánh xạ sang `cameraIds` trước khi gọi BE */
  zoneId?: string;
  cameraId?: string;
  cameraIds?: string[] | string;
  assignedTo?: string;
  assignedToMe?: boolean;
  /** Lọc CONFIRMED đã (true) / chưa (false) có phân công ACTIVE — hợp đồng mục 3; BE cũ bỏ qua. */
  hasActiveAssignment?: boolean;
  /** Lọc các sự cố thuộc một đợt giao việc — hợp đồng mục 4; BE cũ bỏ qua. */
  batchId?: string;
  violationType?: ViolationType | string;
  severity?: IncidentSeverity | string;
  status?: IncidentStatus | string;
  fromDate?: string;
  toDate?: string;
  sortBy?: "detectedAt" | "createdAt" | "severity" | "status";
  sortOrder?: "asc" | "desc";
  includeAssignments?: boolean;
  includeAllAssignments?: boolean;
}

export interface IncidentStatusCounts {
  total: number;
  pendingReview: number;
  confirmed: number;
  critical: number;
  resolved: number;
  closed: number;
  dismissed: number;
  /** CONFIRMED chưa có phân công ACTIVE (hợp đồng mục 3; BE cũ không trả). */
  confirmedUnassigned?: number;
  /** CONFIRMED đang có phân công ACTIVE (hợp đồng mục 3; BE cũ không trả). */
  confirmedAssigned?: number;
  /** FE tự đếm khi mở panel thống kê (BE develop không trả). */
  bySeverity?: Partial<Record<IncidentSeverity, number>>;
  /** FE tự đếm khi mở panel thống kê (BE develop không trả). */
  byViolationType?: Partial<Record<ViolationType, number>>;
  /** Suy ra ở FE: số sự cố đã xử lý, kể cả đã đóng. */
  remediated?: number;
  /** Suy ra ở FE: số sự cố bị bác bỏ. */
  falseAlarms?: number;
}

export type IncidentStatusCountsFilters = Pick<
  IncidentQueryParams,
  "siteId" | "cameraId" | "cameraIds" | "fromDate" | "toDate" |
  "search" | "severity" | "violationType" | "assignedTo" | "assignedToMe"
>;

export type FeedbackDatasetLabel = "TRUE_VIOLATION" | "FALSE_ALARM";

export interface FeedbackDatasetQueryParams {
  page?: number;
  limit?: number;
  siteId?: string;
  cameraId?: string;
  cameraIds?: string[] | string;
  violationType?: ViolationType | string;
  label?: FeedbackDatasetLabel;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface FeedbackDatasetItem {
  incidentId: string;
  label: FeedbackDatasetLabel;
  status: IncidentStatus | string;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  violationType: ViolationType | string;
  confidence: number | null;
  trackId: number | null;
  cameraId: string;
  siteId: string;
  detectedAt: string;
  snapshotStorageKey: string | null;
  aiDetections: Record<string, unknown> | null;
}

export interface InitialEvidencePayload {
  cameraId?: string;
  evidenceType?: EvidenceType | string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  capturedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreateIncidentPayload {
  siteId: string;
  cameraId: string;
  violationId?: string | null;
  violationType: ViolationType | string;
  severity?: IncidentSeverity | string;
  status?: "PENDING_REVIEW";
  detectedAt: string;
  description?: string | null;
  initialEvidence?: InitialEvidencePayload;
  initialReferenceEvidence?: InitialEvidencePayload;
}

export interface ReviewIncidentPayload {
  decision: "CONFIRMED" | "DISMISSED";
  reason?: string;
  notes?: string;
}

export interface ResolveIncidentPayload {
  resolutionNote: string;
  correctiveAction?: string;
}

export interface CloseIncidentPayload {
  closeNote?: string;
}

export interface CreateAssignmentPayload {
  assignedTo?: string;
  assignedToUserId?: string;
  priority?: "URGENT" | "HIGH" | "NORMAL";
  deadline?: string;
  note?: string;
}

/** Kết quả POST /incidents/batch-assign */
export interface BatchAssignIncidentsResult {
  total: number;
  assignedCount: number;
  assignedTo: string;
  assignedToName?: string;
  assignedIds: string[];
  skippedIds: string[];
  /** Mã đợt giao việc BE tạo cho lệnh này (hợp đồng mục 4). */
  batchId?: string;
}

/** Tệp đã tải lên một lần, gắn chung cho nhiều sự cố khi khắc phục hàng loạt */
export interface SharedResolutionEvidencePayload {
  cameraId?: string;
  evidenceType?: EvidenceType;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

/** Kết quả POST /incidents/batch-resolve */
export interface BatchResolveIncidentsResult {
  total: number;
  resolvedCount: number;
  newStatus: string;
  resolvedIds: string[];
  skippedIds: string[];
  sharedEvidenceStorageKey?: string;
}

/** Kết quả POST /incidents/batch-close */
export interface BatchCloseIncidentsResult {
  total: number;
  closedCount: number;
  newStatus: string;
  closedIds: string[];
  skippedIds: string[];
}

export interface ChecksumVerifyResult {
  evidenceId?: string;
  isValid?: boolean;
  isTampered?: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  verifiedAt: string;
  algorithm?: string;
}

export interface UpdateIncidentPayload {
  violationType?: ViolationType | string;
  severity?: IncidentSeverity | string;
  description?: string | null;
}

export interface CreateEvidencePayload {
  cameraId: string;
  evidenceType: EvidenceType | string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  capturedAt: string;
  metadata?: {
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
    frameRate?: number | null;
    checksum?: string | null;
    aiDetections?: AiDetectionMetadata | null;
  };
}

export interface RequestEvidenceUploadUrlPayload {
  incidentId: string;
  cameraId: string;
  siteId: string;
  evidenceType: EvidenceType | string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export interface EvidenceUploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

/**
 * Bộ lọc vòng đời gửi lên `GET /evidences` (`lifecycle`).
 * BE: ACTIVE/OPEN = sự cố chưa CLOSED; ARCHIVED = sự cố CLOSED; còn lại = đúng trạng thái sự cố.
 */
export type EvidenceLifecycleQuery =
  | "ACTIVE"
  | "OPEN"
  | "ARCHIVED"
  | "PENDING_REVIEW"
  | "CONFIRMED"
  | "DISMISSED"
  | "RESOLVED"
  | "CLOSED";

/** Bộ lọc server-side dùng chung cho `GET /evidences` và `GET /evidences/summary`. */
export interface EvidenceFilterParams {
  incidentId?: string;
  siteId?: string;
  cameraId?: string;
  evidenceType?: EvidenceType | string;
  violationType?: ViolationType | string;
  incidentStatus?: string;
  lifecycle?: EvidenceLifecycleQuery;
  hasChecksum?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface EvidenceQueryParams extends EvidenceFilterParams {
  page?: number;
  limit?: number;
  sortBy?: "capturedAt" | "createdAt" | "fileSize";
  sortOrder?: "asc" | "desc";
}

/** `GET /evidences/summary` — tổng hợp toàn kho theo đúng bộ lọc (không phụ thuộc phân trang). */
export interface EvidenceSummary {
  total: number;
  byType: Record<string, number>;
  totalBytes: number;
  withChecksumCount: number;
}

export interface EvidenceVaultCounts {
  total: number;
  snapshot: number;
  referenceSnapshot: number;
  videoClip: number;
  /** Tổng dung lượng (byte) toàn bộ bằng chứng khớp bộ lọc */
  totalBytes?: number;
  /** Số bằng chứng có SHA-256 trong toàn bộ tập khớp bộ lọc */
  withChecksumCount?: number;
}

/** `POST /evidences/batch-delete` */
export interface BatchDeleteEvidencesResult {
  total: number;
  deletedCount: number;
  deletedIds: string[];
  skippedIds: string[];
}

/**
 * Payload sự kiện realtime SSE `notification:ppe_violation` từ notification-service
 */
export interface PpeViolationRealtimeAlert {
  incidentId: string;
  siteId?: string;
  cameraId?: string;
  cameraCode?: string;
  siteName?: string;
  violationType: ViolationType | string;
  severity: IncidentSeverity | string;
  title?: string;
  content?: string;
  description?: string;
  evidenceUrl?: string;
  referenceEvidenceUrl?: string;
  detectedAt?: string;
  [key: string]: unknown;
}

