import { apiClient } from "@/lib/axios";
import type {
  ArchiveSiteResponse,
  CreateRestrictedAreaPayload,
  CreateSitePayload,
  CreateZonePayload,
  EffectiveSafetyConfigResponse,
  InvalidateSafetyRuleCachePayload,
  PaginationMeta,
  RestrictedAreaItem,
  RestrictedAreaQueryParams,
  SiteItem,
  SiteQueryParams,
  SiteSafetyConfigItem,
  SystemDefaultSafetyConfigResponse,
  UpdateCameraSafetyConfigPayload,
  UpdateRestrictedAreaPayload,
  UpdateSitePayload,
  UpdateSiteSafetyConfigPayload,
  UpdateZonePayload,
  ZoneItem,
  ZoneQueryParams,
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
   * POST /api/v1/sites/:id/archive
   * Lưu trữ công trường thi công.
   */
  async archiveSite(id: string): Promise<ArchiveSiteResponse> {
    const res = await apiClient.post<unknown, any>(`/sites/${id}/archive`);
    return unwrapData<ArchiveSiteResponse>(res);
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
   * GET /api/v1/safety-rules/effective
   * Lấy cấu hình an toàn AI hiệu lực sau khi giải quyết phân tầng: Camera Override -> Site Config -> System Default
   */
  async getEffectiveSafetyConfig(params: {
    siteId?: string;
    cameraId?: string;
  }): Promise<EffectiveSafetyConfigResponse> {
    const res = await apiClient.get<unknown, any>("/safety-rules/effective", {
      params,
    });
    return unwrapData<EffectiveSafetyConfigResponse>(res);
  },

  /**
   * GET /api/v1/safety-rules/cameras/:cameraId
   * Lấy cấu hình an toàn ghi đè riêng của Camera
   */
  async getCameraSafetyConfig(cameraId: string): Promise<any> {
    const res = await apiClient.get<unknown, any>(`/safety-rules/cameras/${cameraId}`);
    return unwrapData<any>(res);
  },

  /**
   * PUT /api/v1/safety-rules/cameras/:cameraId
   * Cập nhật cấu hình an toàn ghi đè riêng cho Camera
   */
  async updateCameraSafetyConfig(
    cameraId: string,
    payload: UpdateCameraSafetyConfigPayload,
  ): Promise<any> {
    const res = await apiClient.put<unknown, any>(
      `/safety-rules/cameras/${cameraId}`,
      payload,
    );
    return unwrapData<any>(res);
  },

  /**
   * DELETE /api/v1/safety-rules/cameras/:cameraId
   * Xóa cấu hình an toàn riêng để khôi phục mặc định theo Site
   */
  async deleteCameraSafetyConfig(cameraId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/safety-rules/cameras/${cameraId}`,
    );
    return { message: res?.message || "Camera safety config cleared successfully" };
  },

  /**
   * GET /api/v1/zones
   * Lấy danh sách toàn bộ phân khu trong hệ thống (kèm thông tin site).
   */
  async getAllZones(params?: ZoneQueryParams): Promise<ZoneItem[]> {
    const res = await apiClient.get<unknown, any>("/zones", {
      params: { limit: 100, ...params },
    });
    const data = unwrapData<any>(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
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
   * GET /api/v1/restricted-areas
   * Lấy danh sách toàn bộ vùng cấm nguy hiểm trong hệ thống (kèm thông tin site & zone).
   */
  async getAllRestrictedAreas(
    params?: RestrictedAreaQueryParams,
  ): Promise<RestrictedAreaItem[]> {
    const res = await apiClient.get<unknown, any>("/restricted-areas", {
      params: { limit: 100, ...params },
    });
    const data = unwrapData<any>(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
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

  /**
   * GET /api/v1/zones/:id
   * Lấy chi tiết thông tin phân khu theo ID.
   */
  async getZoneById(zoneId: string): Promise<ZoneItem> {
    const res = await apiClient.get<unknown, any>(`/zones/${zoneId}`);
    return unwrapData<ZoneItem>(res);
  },

  /**
   * PUT /api/v1/zones/:id
   * Cập nhật thông tin phân khu (tên, mã, mô tả, trạng thái).
   */
  async updateZone(
    zoneId: string,
    payload: UpdateZonePayload,
  ): Promise<ZoneItem> {
    const res = await apiClient.put<unknown, any>(`/zones/${zoneId}`, payload);
    return unwrapData<ZoneItem>(res);
  },

  /**
   * GET /api/v1/restricted-areas/:id
   * Lấy chi tiết thông tin vùng cấm theo ID.
   */
  async getRestrictedAreaById(areaId: string): Promise<RestrictedAreaItem> {
    const res = await apiClient.get<unknown, any>(`/restricted-areas/${areaId}`);
    return unwrapData<RestrictedAreaItem>(res);
  },

  /**
   * PUT /api/v1/restricted-areas/:id
   * Cập nhật thông tin và tọa độ ranh giới vùng cấm.
   */
  async updateRestrictedArea(
    areaId: string,
    payload: UpdateRestrictedAreaPayload,
  ): Promise<RestrictedAreaItem> {
    const res = await apiClient.put<unknown, any>(
      `/restricted-areas/${areaId}`,
      payload,
    );
    return unwrapData<RestrictedAreaItem>(res);
  },

  /**
   * GET /api/v1/safety-rules/system-default
   * Lấy cấu hình tiêu chuẩn an toàn mặc định toàn hệ thống.
   */
  async getSystemDefaultSafetyConfig(): Promise<SystemDefaultSafetyConfigResponse> {
    const res = await apiClient.get<unknown, any>("/safety-rules/system-default");
    return unwrapData<SystemDefaultSafetyConfigResponse>(res);
  },

  /**
   * POST /api/v1/safety-rules/cache/invalidate
   * Xóa bộ nhớ cache cấu hình an toàn khi có thay đổi.
   */
  async invalidateSafetyRuleCache(
    payload: InvalidateSafetyRuleCachePayload,
  ): Promise<{ message: string }> {
    const res = await apiClient.post<unknown, any>(
      "/safety-rules/cache/invalidate",
      payload,
    );
    return { message: res?.message || "Cache invalidated successfully" };
  },
};
