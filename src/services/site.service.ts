import { apiClient } from "@/lib/axios";
import type {
  CreateRestrictedAreaPayload,
  CreateSitePayload,
  CreateZonePayload,
  PaginationMeta,
  RestrictedAreaItem,
  SiteItem,
  SiteQueryParams,
  SiteSafetyConfigItem,
  UpdateSitePayload,
  UpdateSiteSafetyConfigPayload,
  ZoneItem,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export const siteService = {
  /**
   * GET /api/v1/sites
   * Lấy danh sách công trường có lọc theo trạng thái và tìm kiếm.
   */
  async getSites(
    params?: SiteQueryParams,
  ): Promise<{ items: SiteItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<ApiResponse<SiteItem[]>>("/api/v1/sites", {
      params,
    });
    return {
      items: res.data.data || [],
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/sites/:id
   * Lấy chi tiết công trường kèm các phân khu và cấu hình an toàn.
   */
  async getSiteById(id: string): Promise<SiteItem> {
    const res = await apiClient.get<ApiResponse<SiteItem>>(`/api/v1/sites/${id}`);
    return res.data.data;
  },

  /**
   * POST /api/v1/sites
   * Tạo mới công trường thi công.
   */
  async createSite(payload: CreateSitePayload): Promise<SiteItem> {
    const res = await apiClient.post<ApiResponse<SiteItem>>("/api/v1/sites", payload);
    return res.data.data;
  },

  /**
   * PUT /api/v1/sites/:id
   * Cập nhật thông tin công trường.
   */
  async updateSite(id: string, payload: UpdateSitePayload): Promise<SiteItem> {
    const res = await apiClient.put<ApiResponse<SiteItem>>(`/api/v1/sites/${id}`, payload);
    return res.data.data;
  },

  /**
   * DELETE /api/v1/sites/:id
   * Xóa công trường khỏi hệ thống.
   */
  async deleteSite(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/v1/sites/${id}`);
    return { message: res.data.message || "Site deleted successfully" };
  },

  /**
   * GET /api/v1/sites/:id/safety-config
   * Lấy tiêu chuẩn an toàn PPE và quy tắc xác nhận vi phạm của site.
   */
  async getSafetyConfig(id: string): Promise<SiteSafetyConfigItem> {
    const res = await apiClient.get<ApiResponse<SiteSafetyConfigItem>>(
      `/api/v1/sites/${id}/safety-config`,
    );
    return res.data.data;
  },

  /**
   * PUT /api/v1/sites/:id/safety-config
   * Cập nhật các yêu cầu trang bị bảo hộ bắt buộc của site.
   */
  async updateSafetyConfig(
    id: string,
    payload: UpdateSiteSafetyConfigPayload,
  ): Promise<SiteSafetyConfigItem> {
    const res = await apiClient.put<ApiResponse<SiteSafetyConfigItem>>(
      `/api/v1/sites/${id}/safety-config`,
      payload,
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/sites/:id/zones
   * Lấy danh sách phân khu thuộc công trường.
   */
  async getSiteZones(siteId: string): Promise<ZoneItem[]> {
    const res = await apiClient.get<ApiResponse<ZoneItem[]>>(`/api/v1/sites/${siteId}/zones`);
    return res.data.data || [];
  },

  /**
   * POST /api/v1/sites/:id/zones
   * Tạo mới phân khu trong công trường.
   */
  async createZone(siteId: string, payload: CreateZonePayload): Promise<ZoneItem> {
    const res = await apiClient.post<ApiResponse<ZoneItem>>(
      `/api/v1/sites/${siteId}/zones`,
      payload,
    );
    return res.data.data;
  },

  /**
   * DELETE /api/v1/sites/:siteId/zones/:zoneId
   * Xóa phân khu.
   */
  async deleteZone(siteId: string, zoneId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/sites/${siteId}/zones/${zoneId}`,
    );
    return { message: res.data.message || "Zone deleted successfully" };
  },

  /**
   * GET /api/v1/sites/:id/restricted-areas
   * Lấy danh sách vùng cấm / vùng nguy hiểm cao của công trường.
   */
  async getRestrictedAreas(siteId: string): Promise<RestrictedAreaItem[]> {
    const res = await apiClient.get<ApiResponse<RestrictedAreaItem[]>>(
      `/api/v1/sites/${siteId}/restricted-areas`,
    );
    return res.data.data || [];
  },

  /**
   * POST /api/v1/sites/:id/restricted-areas
   * Tạo vùng cấm mới.
   */
  async createRestrictedArea(
    siteId: string,
    payload: CreateRestrictedAreaPayload,
  ): Promise<RestrictedAreaItem> {
    const res = await apiClient.post<ApiResponse<RestrictedAreaItem>>(
      `/api/v1/sites/${siteId}/restricted-areas`,
      payload,
    );
    return res.data.data;
  },

  /**
   * DELETE /api/v1/sites/:siteId/restricted-areas/:areaId
   * Xóa vùng cấm.
   */
  async deleteRestrictedArea(
    siteId: string,
    areaId: string,
  ): Promise<{ message: string }> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/sites/${siteId}/restricted-areas/${areaId}`,
    );
    return { message: res.data.message || "Restricted area deleted successfully" };
  },
};
