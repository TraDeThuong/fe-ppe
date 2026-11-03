import type { PaginationMeta } from "./rbac.types";

/**
 * Contract Media & Object Storage theo Backend smart-ppe-media-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-media-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-media-service/src/modules/files/file.dto.ts & file.validation.ts
 * - Routes: smart-ppe-media-service/src/modules/files/file.route.ts
 */

export interface RequestMediaUploadUrlPayload {
  fileName: string;
  mimeType: string;
  size?: number;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MediaUploadUrlResponse {
  fileId: string;
  uploadUrl: string;
  bucketKey: string;
  isPublic: boolean;
  expiresIn: number;
}

export interface ConfirmMediaUploadPayload {
  size?: number;
}

export interface MediaFileItemDto {
  id: string;
  userId: string | null;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  bucketKey: string;
  folder: string;
  isPublic: boolean;
  isConfirmed: boolean;
  url?: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string | null;
  } | null;
}

export interface MediaFileListResponse {
  data: MediaFileItemDto[];
  meta: PaginationMeta;
}

export interface MediaFileQueryParams {
  folder?: string;
  isPublic?: boolean;
  mimeType?: string;
  search?: string;
  userId?: string;
  sortBy?: "createdAt" | "fileName" | "size";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface MediaDownloadUrlResponse {
  downloadUrl: string;
  expiresIn: number;
  fileName: string;
}

export interface ImageTransformQuery {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  format?: "webp" | "jpeg" | "png" | "avif";
  quality?: number;
}

export interface ImageTransformPayload extends ImageTransformQuery {
  saveAsNew?: boolean;
}

export interface CleanupFilesPayload {
  unconfirmedOlderThanMinutes?: number;
  softDeletedOlderThanDays?: number;
}

export interface CleanupFilesResponse {
  unconfirmedCleaned: number;
  softDeletedCleaned: number;
  cleanedAt: string;
}
