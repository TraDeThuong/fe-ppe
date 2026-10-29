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

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res && !("success" in res)) {
    return res.data as T;
  }
  return res as T;
}

export const siteService = {
  /**
   * GET /api/v1/sites
   * Lấy danh sách công trường có lọc theo trạng thái và tìm kiếm.
   */
  async getSites(
    params?: SiteQueryParams,
  ): Promise<{ items: SiteItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<unknown, any>("/sites", {
      params,
    });
    if (res && typeof res === "object") {
      const rawItems = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.items)
          ? res.items
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res)
              ? res
              : [];
      const items: SiteItem[] = rawItems.map((s: any) => ({
        ...s,
        zoneCount: s.zoneCount ?? s._count?.zones ?? (s.zones?.length || 0),
        restrictedAreaCount: s.restrictedAreaCount ?? s._count?.restrictedAreas ?? (s.restrictedAreas?.length || 0),
        cameraCount: s.cameraCount ?? s._count?.cameras ?? (s.cameras?.length || 0),
      }));
      const meta = res.meta ?? res.data?.meta;
      return { items, meta };
    }
    return { items: [], meta: undefined };
  },

  /**
   * GET /api/v1/sites/:id
   * Lấy chi tiết công trường kèm các phân khu và cấu hình an toàn.
   */
  async getSiteById(id: string): Promise<SiteItem> {
    const res = await apiClient.get<unknown, any>(`/sites/${id}`);
    const s = unwrapData<any>(res);
    return {
      ...s,
      zoneCount: s.zoneCount ?? s._count?.zones ?? (s.zones?.length || 0),
      restrictedAreaCount: s.restrictedAreaCount ?? s._count?.restrictedAreas ?? (s.restrictedAreas?.length || 0),
      cameraCount: s.cameraCount ?? s._count?.cameras ?? (s.cameras?.length || 0),
    };
  },

  /**
   * POST /api/v1/sites
   * Tạo mới công trường thi công.
   */
  async createSite(payload: CreateSitePayload): Promise<SiteItem> {
    const res = await apiClient.post<unknown, any>("/sites", payload);
    return unwrapData<SiteItem>(res);
  },

  /**
   * PUT /api/v1/sites/:id
   * Cập nhật thông tin công trường.
   */
  async updateSite(id: string, payload: UpdateSitePayload): Promise<SiteItem> {
    const res = await apiClient.put<unknown, any>(`/sites/${id}`, payload);
    return unwrapData<SiteItem>(res);
  },

  /**
   * DELETE /api/v1/sites/:id
   * Xóa công trường khỏi hệ thống.
   */
  async deleteSite(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(`/sites/${id}`);
    return { message: res?.message || "Site deleted successfully" };
  },

  /**
   * GET /api/v1/sites/:id/safety-config
   * Lấy tiêu chuẩn an toàn PPE và quy tắc xác nhận vi phạm của site.
   */
  async getSafetyConfig(id: string): Promise<SiteSafetyConfigItem> {
    const res = await apiClient.get<unknown, any>(
      `/sites/${id}/safety-config`,
    );
    return unwrapData<SiteSafetyConfigItem>(res);
  },

  /**
   * PUT /api/v1/sites/:id/safety-config
   * Cập nhật các yêu cầu trang bị bảo hộ bắt buộc của site.
   */
  async updateSafetyConfig(
    id: string,
    payload: UpdateSiteSafetyConfigPayload,
  ): Promise<SiteSafetyConfigItem> {
    const res = await apiClient.put<unknown, any>(
      `/sites/${id}/safety-config`,
      payload,
    );
    return unwrapData<SiteSafetyConfigItem>(res);
  },

  /**
   * GET /api/v1/sites/:id/zones
   * Lấy danh sách phân khu thuộc công trường.
   */
  async getSiteZones(siteId: string): Promise<ZoneItem[]> {
    const res = await apiClient.get<unknown, any>(`/sites/${siteId}/zones`);
    const data = unwrapData<ZoneItem[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * POST /api/v1/sites/:id/zones
   * Tạo mới phân khu trong công trường.
   */
  async createZone(siteId: string, payload: CreateZonePayload): Promise<ZoneItem> {
    const res = await apiClient.post<unknown, any>(
      `/sites/${siteId}/zones`,
      payload,
    );
    return unwrapData<ZoneItem>(res);
  },

  /**
   * DELETE /api/v1/zones/:zoneId
   * Xóa phân khu.
   */
  async deleteZone(_siteId: string, zoneId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/zones/${zoneId}`,
    );
    return { message: res?.message || "Zone deleted successfully" };
  },

  /**
   * GET /api/v1/sites/:id/restricted-areas
   * Lấy danh sách vùng cấm / vùng nguy hiểm cao của công trường.
   */
  async getRestrictedAreas(siteId: string): Promise<RestrictedAreaItem[]> {
    const res = await apiClient.get<unknown, any>(
      `/sites/${siteId}/restricted-areas`,
    );
    const data = unwrapData<RestrictedAreaItem[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * POST /api/v1/sites/:id/restricted-areas
   * Tạo vùng cấm mới.
   */
  async createRestrictedArea(
    siteId: string,
    payload: CreateRestrictedAreaPayload,
  ): Promise<RestrictedAreaItem> {
    const res = await apiClient.post<unknown, any>(
      `/sites/${siteId}/restricted-areas`,
      payload,
    );
    return unwrapData<RestrictedAreaItem>(res);
  },

  /**
   * DELETE /api/v1/restricted-areas/:areaId
   * Xóa vùng cấm.
   */
  async deleteRestrictedArea(
    _siteId: string,
    areaId: string,
  ): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/restricted-areas/${areaId}`,
    );
    return { message: res?.message || "Restricted area deleted successfully" };
  },
};
