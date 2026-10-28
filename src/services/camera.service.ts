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

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res && !("success" in res)) {
    return res.data as T;
  }
  return res as T;
}

export const cameraService = {
  /**
   * GET /api/v1/cameras
   * Lấy danh sách camera theo bộ lọc (site, zone, status, search).
   */
  async getCameras(
    params?: CameraQueryParams,
  ): Promise<{ items: CameraItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<unknown, any>("/cameras", {
      params,
    });
    if (res && typeof res === "object") {
      const items = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.items)
          ? res.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res)
              ? res
              : [];
      const meta = res.meta ?? res.data?.meta;
      return { items, meta };
    }
    return { items: [], meta: undefined };
  },

  /**
   * GET /api/v1/cameras/:id
   * Lấy thông tin chi tiết camera kèm cấu hình và danh sách luồng stream.
   */
  async getCameraById(id: string): Promise<CameraItem> {
    const res = await apiClient.get<unknown, any>(`/cameras/${id}`);
    return unwrapData<CameraItem>(res);
  },

  /**
   * POST /api/v1/cameras
   * Thêm mới camera vào hệ thống.
   */
  async createCamera(payload: CreateCameraPayload): Promise<CameraItem> {
    const res = await apiClient.post<unknown, any>("/cameras", payload);
    return unwrapData<CameraItem>(res);
  },

  /**
   * PUT /api/v1/cameras/:id
   * Cập nhật thông tin camera (tên, luồng RTSP, vị trí...).
   */
  async updateCamera(id: string, payload: UpdateCameraPayload): Promise<CameraItem> {
    const res = await apiClient.put<unknown, any>(`/cameras/${id}`, payload);
    return unwrapData<CameraItem>(res);
  },

  /**
   * DELETE /api/v1/cameras/:id
   * Xóa camera khỏi hệ thống.
   */
  async deleteCamera(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(`/cameras/${id}`);
    return { message: res?.message || "Camera deleted successfully" };
  },

  /**
   * GET /api/v1/cameras/:id/config
   * Lấy thông số cấu hình AI ROI của camera.
   */
  async getCameraConfig(id: string): Promise<CameraConfigItem> {
    const res = await apiClient.get<unknown, any>(`/cameras/${id}/config`);
    return unwrapData<CameraConfigItem>(res);
  },

  /**
   * PUT /api/v1/cameras/:id/config
   * Cập nhật thông số cấu hình và tọa độ vùng nhận diện AI ROI.
   */
  async updateCameraConfig(
    id: string,
    payload: UpdateCameraConfigPayload,
  ): Promise<CameraConfigItem> {
    const res = await apiClient.put<unknown, any>(
      `/cameras/${id}/config`,
      payload,
    );
    return unwrapData<CameraConfigItem>(res);
  },

  /**
   * GET /api/v1/cameras/:id/streams
   * Lấy danh sách luồng stream (RTSP/HLS/WebRTC) của camera.
   */
  async getCameraStreams(id: string): Promise<CameraStreamItem[]> {
    const res = await apiClient.get<unknown, any>(`/cameras/${id}/streams`);
    const data = unwrapData<CameraStreamItem[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * POST /api/v1/cameras/:id/ping
   * Thực hiện Ping test tức thì kiểm tra độ trễ mạng và phản hồi camera.
   */
  async pingCamera(id: string): Promise<PingCameraResult> {
    const res = await apiClient.post<unknown, any>(`/cameras/${id}/ping`);
    return unwrapData<PingCameraResult>(res);
  },

  /**
   * GET /api/v1/cameras/:id/health-logs
   * Lấy nhật ký đo sức khỏe nhịp tim camera.
   */
  async getHealthLogs(
    id: string,
    params?: { page?: number; limit?: number },
  ): Promise<CameraHealthLogItem[]> {
    const res = await apiClient.get<unknown, any>(
      `/cameras/${id}/health-logs`,
      { params },
    );
    const data = unwrapData<CameraHealthLogItem[]>(res);
    return Array.isArray(data) ? data : [];
  },
};
