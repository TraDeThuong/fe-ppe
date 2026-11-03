import { apiClient } from "@/lib/axios";
import type {
  CleanupFilesPayload,
  CleanupFilesResponse,
  ConfirmMediaUploadPayload,
  ImageTransformPayload,
  ImageTransformQuery,
  MediaDownloadUrlResponse,
  MediaFileItemDto,
  MediaFileListResponse,
  MediaFileQueryParams,
  MediaUploadUrlResponse,
  PaginationMeta,
  RequestMediaUploadUrlPayload,
} from "@/types";

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object") {
    if ("data" in res && !("status" in res && "headers" in res)) {
      return (res.data as T) ?? (res as T);
    }
  }
  return res as T;
}

function unwrapPaginated<T>(res: any): { items: T[]; meta?: PaginationMeta } {
  if (!res) return { items: [] };
  if (Array.isArray(res)) return { items: res };
  const raw = res as any;
  const items = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const meta = raw.meta ?? raw.data?.meta;
  return { items, meta };
}

/**
 * Service Quản lý Tệp tin & Media Storage (Media Service - Cổng 8890).
 * Định tuyến qua Traefik Gateway tại prefix /api/v1/files.
 */
export const mediaService = {
  /**
   * POST /api/v1/files/upload-url
   * Yêu cầu presigned upload URL để đẩy tệp trực tiếp lên MinIO/S3/R2.
   */
  async requestUploadUrl(
    payload: RequestMediaUploadUrlPayload,
  ): Promise<MediaUploadUrlResponse> {
    const res = await apiClient.post<unknown>("/files/upload-url", payload);
    return unwrapData<MediaUploadUrlResponse>(res);
  },

  /**
   * POST /api/v1/files/:id/confirm
   * Xác nhận tệp đã được tải lên thành công, chuyển trạng thái sang CONFIRMED.
   */
  async confirmUpload(
    fileId: string,
    payload?: ConfirmMediaUploadPayload,
  ): Promise<MediaFileItemDto> {
    const res = await apiClient.post<unknown>(
      `/files/${fileId}/confirm`,
      payload || {},
    );
    return unwrapData<MediaFileItemDto>(res);
  },

  /**
   * GET /api/v1/files
   * Lấy danh sách tệp tin có bộ lọc theo folder, tìm kiếm và phân trang.
   */
  async getFiles(
    params?: MediaFileQueryParams,
  ): Promise<{ items: MediaFileItemDto[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<unknown>("/files", { params });
    return unwrapPaginated<MediaFileItemDto>(res);
  },

  /**
   * GET /api/v1/files/:id
   * Lấy chi tiết thông tin tệp tin theo ID.
   */
  async getFileById(fileId: string): Promise<MediaFileItemDto> {
    const res = await apiClient.get<unknown>(`/files/${fileId}`);
    return unwrapData<MediaFileItemDto>(res);
  },

  /**
   * GET /api/v1/files/:id/download-url
   * Lấy presigned URL tải tệp tin bảo mật (private).
   */
  async getDownloadUrl(fileId: string): Promise<MediaDownloadUrlResponse> {
    const res = await apiClient.get<unknown>(`/files/${fileId}/download-url`);
    return unwrapData<MediaDownloadUrlResponse>(res);
  },

  /**
   * DELETE /api/v1/files/:id
   * Xóa tệp tin (soft-delete hoặc xóa vĩnh viễn trên S3).
   */
  async deleteFile(fileId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(`/files/${fileId}`);
    return { message: res?.message || "File deleted successfully" };
  },

  /**
   * POST /api/v1/files/upload-image
   * Tải ảnh trực tiếp dạng multipart buffer và tối ưu hóa tức thời qua Sharp.
   */
  async uploadImageDirect(
    formData: FormData,
  ): Promise<MediaFileItemDto> {
    const res = await apiClient.post<unknown>("/files/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrapData<MediaFileItemDto>(res);
  },

  /**
   * POST /api/v1/files/:id/transform
   * Biến đổi ảnh (resize, convert format) và lưu thành tệp tin mới.
   */
  async transformAndSave(
    fileId: string,
    payload: ImageTransformPayload,
  ): Promise<MediaFileItemDto> {
    const res = await apiClient.post<unknown>(
      `/files/${fileId}/transform`,
      payload,
    );
    return unwrapData<MediaFileItemDto>(res);
  },

  /**
   * POST /api/v1/files/cleanup
   * Dọn dẹp tệp tin rác mồ côi (chỉ dành cho Quản trị viên).
   */
  async cleanupOrphanFiles(
    payload?: CleanupFilesPayload,
  ): Promise<CleanupFilesResponse> {
    const res = await apiClient.post<unknown>("/files/cleanup", payload || {});
    return unwrapData<CleanupFilesResponse>(res);
  },
};
