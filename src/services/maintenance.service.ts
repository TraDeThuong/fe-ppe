import { apiClient } from "@/lib/axios";
import type {
  EnableMaintenancePayload,
  MaintenanceConfig,
  PublicMaintenanceStatus,
  UpdateMaintenancePayload,
} from "@/types";

/**
 * Service Quản trị Chế độ Bảo trì Toàn Web (System Maintenance Service).
 * Tương tác với /api/v1/maintenance trên identity-service.
 */
export const maintenanceService = {
  /**
   * GET /api/v1/maintenance/public
   * Lấy trạng thái bảo trì công khai (không cần đăng nhập).
   */
  async getPublicStatus(): Promise<PublicMaintenanceStatus> {
    const res = await apiClient.get<unknown>("/maintenance/public");
    if (res && typeof res === "object") {
      if ("data" in res && (res as { data?: unknown }).data) {
        return (res as { data: PublicMaintenanceStatus }).data;
      }
      return res as unknown as PublicMaintenanceStatus;
    }
    return {
      enabled: false,
      status: "ONLINE",
      title: "Hệ thống đang hoạt động",
      message: "",
      startAt: null,
      estimatedEndAt: null,
    };
  },

  /**
   * GET /api/v1/maintenance/config
   * Lấy toàn bộ cấu hình bảo trì chi tiết (Cần quyền MAINTENANCE_READ / MAINTENANCE_MANAGE).
   */
  async getConfig(): Promise<MaintenanceConfig> {
    const res = await apiClient.get<unknown>("/maintenance/config");
    if (res && typeof res === "object") {
      if ("data" in res && (res as { data?: unknown }).data) {
        return (res as { data: MaintenanceConfig }).data;
      }
      return res as unknown as MaintenanceConfig;
    }
    return res as unknown as MaintenanceConfig;
  },

  /**
   * POST /api/v1/maintenance/enable
   * Kích hoạt chế độ bảo trì toàn web (Cần quyền MAINTENANCE_MANAGE).
   */
  async enableMaintenance(
    payload?: EnableMaintenancePayload,
  ): Promise<MaintenanceConfig> {
    const res = await apiClient.post<unknown>("/maintenance/enable", payload || {});
    if (res && typeof res === "object") {
      if ("data" in res && (res as { data?: unknown }).data) {
        return (res as { data: MaintenanceConfig }).data;
      }
      return res as unknown as MaintenanceConfig;
    }
    return res as unknown as MaintenanceConfig;
  },

  /**
   * POST /api/v1/maintenance/disable
   * Ngắt chế độ bảo trì, đưa web trở về ONLINE (Cần quyền MAINTENANCE_MANAGE).
   */
  async disableMaintenance(): Promise<MaintenanceConfig> {
    const res = await apiClient.post<unknown>("/maintenance/disable", {});
    if (res && typeof res === "object") {
      if ("data" in res && (res as { data?: unknown }).data) {
        return (res as { data: MaintenanceConfig }).data;
      }
      return res as unknown as MaintenanceConfig;
    }
    return res as unknown as MaintenanceConfig;
  },

  /**
   * PUT /api/v1/maintenance/config
   * Cập nhật thông số cấu hình bảo trì (Cần quyền MAINTENANCE_MANAGE).
   */
  async updateConfig(
    payload: UpdateMaintenancePayload,
  ): Promise<MaintenanceConfig> {
    const res = await apiClient.put<unknown>("/maintenance/config", payload);
    if (res && typeof res === "object") {
      if ("data" in res && (res as { data?: unknown }).data) {
        return (res as { data: MaintenanceConfig }).data;
      }
      return res as unknown as MaintenanceConfig;
    }
    return res as unknown as MaintenanceConfig;
  },
};
