/**
 * Contract Camera & Stream Management theo Backend smart-ppe-camera-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-camera-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-camera-service/src/modules/camera/camera.dto.ts
 * - Routes: smart-ppe-camera-service/src/modules/camera/camera.route.ts
 */

import type { PaginationMeta } from "./rbac.types";

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const CAMERA_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  CONNECTING: "CONNECTING",
  ERROR: "ERROR",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type CameraStatus = (typeof CAMERA_STATUS)[keyof typeof CAMERA_STATUS];

export const CAMERA_SOURCE_TYPE = {
  RTSP: "RTSP",
  HLS: "HLS",
  HTTP: "HTTP",
  FILE: "FILE",
} as const;

export type CameraSourceType =
  (typeof CAMERA_SOURCE_TYPE)[keyof typeof CAMERA_SOURCE_TYPE];

export const STREAM_PROTOCOL = {
  RTSP: "RTSP",
  HLS: "HLS",
  WEBRTC: "WEBRTC",
} as const;

export type StreamProtocol =
  (typeof STREAM_PROTOCOL)[keyof typeof STREAM_PROTOCOL];

export const STREAM_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type StreamStatus = (typeof STREAM_STATUS)[keyof typeof STREAM_STATUS];

// ============================================================================
// 2. ROI (REGION OF INTEREST) TYPES
// ============================================================================

export interface RoiPoint {
  x: number; // 0.0 to 1.0 (normalized percentage)
  y: number; // 0.0 to 1.0 (normalized percentage)
}

export type RoiPolygon = RoiPoint[];

// ============================================================================
// 3. CAMERA DTOs
// ============================================================================

export interface CameraStreamItem {
  id: string;
  cameraId: string;
  protocol: StreamProtocol | string;
  streamUrl: string;
  resolution: string;
  fps: number;
  status: StreamStatus | string;
  lastConnectedAt?: string | null;
  lastDisconnectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CameraConfigItem {
  id: string;
  cameraId: string;
  enabled: boolean;
  captureFps: number;
  resolution: string;
  processingEnabled: boolean;
  roiPolygon?: RoiPolygon | null;
  motionSensitivity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CameraHealthLogItem {
  id: string;
  cameraId: string;
  status: CameraStatus;
  latencyMs?: number | null;
  errorMessage?: string | null;
  checkedAt: string;
}

export interface CameraItem {
  id: string;
  siteId: string;
  siteName?: string;
  zoneId?: string | null;
  zoneName?: string | null;
  name: string;
  code: string;
  sourceType: CameraSourceType | string;
  streamUrl: string;
  status: CameraStatus;
  location?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  streams?: CameraStreamItem[];
  config?: CameraConfigItem | null;
  currentFps?: number;
  currentLatencyMs?: number;
  snapshotUrl?: string;
}

export interface PingCameraResult {
  cameraId: string;
  status: CameraStatus;
  latencyMs: number | null;
  packetLoss?: number;
  success: boolean;
  errorMessage?: string | null;
  checkedAt?: string;
}

// ============================================================================
// 4. QUERY & MUTATION PAYLOADS
// ============================================================================

export interface CameraQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: string;
  zoneId?: string;
  status?: CameraStatus | string;
  sourceType?: CameraSourceType | string;
  sortBy?: "name" | "code" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

export interface CreateCameraPayload {
  siteId: string;
  zoneId?: string | null;
  name: string;
  code: string;
  sourceType?: CameraSourceType;
  streamUrl: string;
  status?: CameraStatus;
  location?: string;
  description?: string;
}

export interface UpdateCameraPayload {
  siteId?: string;
  zoneId?: string | null;
  name?: string;
  code?: string;
  sourceType?: CameraSourceType;
  streamUrl?: string;
  status?: CameraStatus;
  location?: string | null;
  description?: string | null;
}

export interface UpdateCameraConfigPayload {
  enabled?: boolean;
  captureFps?: number;
  resolution?: string;
  processingEnabled?: boolean;
  roiPolygon?: RoiPolygon;
  motionSensitivity?: number;
}

export interface CameraListResponse {
  data: CameraItem[];
  meta: PaginationMeta;
}
