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
  confidence?: number;
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
  zoneId?: string;
  cameraId?: string;
  violationType?: ViolationType | string;
  severity?: IncidentSeverity | string;
  status?: IncidentStatus | string;
  fromDate?: string;
  toDate?: string;
  sortBy?: "detectedAt" | "createdAt" | "severity" | "status";
  sortOrder?: "asc" | "desc";
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

export interface ChecksumVerifyResult {
  isTampered: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  verifiedAt: string;
  algorithm: string;
}
