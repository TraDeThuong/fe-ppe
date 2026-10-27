import { apiClient } from "@/lib/axios";
import type {
  CameraConfigItem,
  CameraHealthLogItem,
  CameraItem,
  CameraQueryParams,
  CameraStreamItem,
  CreateCameraPayload,
  PaginationMeta,
  PingCameraResult,
  UpdateCameraConfigPayload,
  UpdateCameraPayload,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export const cameraService = {
  /**
   * GET /api/v1/cameras
   * Lấy danh sách camera theo bộ lọc (site, zone, status, search).
   */
  async getCameras(
    params?: CameraQueryParams,
  ): Promise<{ items: CameraItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<ApiResponse<CameraItem[]>>("/api/v1/cameras", {
      params,
    });
    return {
      items: res.data.data || [],
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/cameras/:id
   * Lấy thông tin chi tiết camera kèm cấu hình và danh sách luồng stream.
   */
  async getCameraById(id: string): Promise<CameraItem> {
    const res = await apiClient.get<ApiResponse<CameraItem>>(`/api/v1/cameras/${id}`);
    return res.data.data;
  },

  /**
   * POST /api/v1/cameras
   * Thêm mới camera vào hệ thống.
   */
  async createCamera(payload: CreateCameraPayload): Promise<CameraItem> {
    const res = await apiClient.post<ApiResponse<CameraItem>>("/api/v1/cameras", payload);
    return res.data.data;
  },

  /**
   * PUT /api/v1/cameras/:id
   * Cập nhật thông tin camera (tên, luồng RTSP, vị trí...).
   */
  async updateCamera(id: string, payload: UpdateCameraPayload): Promise<CameraItem> {
    const res = await apiClient.put<ApiResponse<CameraItem>>(`/api/v1/cameras/${id}`, payload);
    return res.data.data;
  },

  /**
   * DELETE /api/v1/cameras/:id
   * Xóa camera khỏi hệ thống.
   */
  async deleteCamera(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/cameras/${id}`);
    return { message: res.data.message || "Camera deleted successfully" };
  },

  /**
   * GET /api/v1/cameras/:id/config
   * Lấy thông số cấu hình AI ROI của camera.
   */
  async getCameraConfig(id: string): Promise<CameraConfigItem> {
    const res = await apiClient.get<ApiResponse<CameraConfigItem>>(`/api/v1/cameras/${id}/config`);
    return res.data.data;
  },

  /**
   * PUT /api/v1/cameras/:id/config
   * Cập nhật thông số cấu hình và tọa độ vùng nhận diện AI ROI.
   */
  async updateCameraConfig(
    id: string,
    payload: UpdateCameraConfigPayload,
  ): Promise<CameraConfigItem> {
    const res = await apiClient.put<ApiResponse<CameraConfigItem>>(
      `/api/v1/cameras/${id}/config`,
      payload,
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/cameras/:id/streams
   * Lấy danh sách luồng stream (RTSP/HLS/WebRTC) của camera.
   */
  async getCameraStreams(id: string): Promise<CameraStreamItem[]> {
    const res = await apiClient.get<ApiResponse<CameraStreamItem[]>>(`/api/v1/cameras/${id}/streams`);
    return res.data.data || [];
  },

  /**
   * POST /api/v1/cameras/:id/ping
   * Thực hiện Ping test tức thì kiểm tra độ trễ mạng và phản hồi camera.
   */
  async pingCamera(id: string): Promise<PingCameraResult> {
    const res = await apiClient.post<ApiResponse<PingCameraResult>>(`/api/v1/cameras/${id}/ping`);
    return res.data.data;
  },

  /**
   * GET /api/v1/cameras/:id/health-logs
   * Lấy nhật ký đo sức khỏe nhịp tim camera.
   */
  async getHealthLogs(
    id: string,
    params?: { page?: number; limit?: number },
  ): Promise<CameraHealthLogItem[]> {
    const res = await apiClient.get<ApiResponse<CameraHealthLogItem[]>>(
      `/api/v1/cameras/${id}/health-logs`,
      { params },
    );
    return res.data.data || [];
  },
};
