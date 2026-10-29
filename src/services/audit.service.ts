import { apiClient } from "@/lib/axios";
import type {
  AuditLogDetail,
  AuditLogDetailResponse,
  AuditLogItem,
  AuditLogQueryParams,
  AuditLogsListResponse,
  AuditSummaryDto,
  AuditSummaryResponse,
  ExportAuditParams,
  PaginationMeta,
} from "@/types";

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object") {
    if ("data" in res && !("status" in res && "headers" in res)) {
      return (res.data as T) ?? (res as T);
    }
  }
  return res as T;
}

function unwrapPaginated<T>(res: any): { items: T[]; meta: PaginationMeta } {
  const defaultMeta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };
  if (!res) return { items: [], meta: defaultMeta };
  if (Array.isArray(res)) return { items: res, meta: defaultMeta };
  const items = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.items)
      ? res.items
      : [];
  const meta = res.meta ?? res.data?.meta ?? defaultMeta;
  return { items, meta };
}

export const auditService = {
  /**
   * GET /api/v1/audit-logs
   * Lấy danh sách nhật ký kiểm toán có phân trang và lọc đa tiêu chí.
   */
  async getLogs(
    params?: AuditLogQueryParams,
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>("/audit-logs", {
      params,
    });
    return unwrapPaginated<AuditLogItem>(res);
  },

  /**
   * GET /api/v1/audit-logs/:id
   * Lấy chi tiết 1 bản ghi kiểm toán kèm JSON Diff và siêu dữ liệu.
   */
  async getLogDetail(id: string): Promise<AuditLogDetail> {
    const res = await apiClient.get<unknown>(`/audit-logs/${id}`);
    return unwrapData<AuditLogDetail>(res);
  },

  /**
   * GET /api/v1/audit-logs/summary
   * Lấy số liệu thống kê KPI kiểm toán.
   */
  async getSummary(params?: { fromDate?: string; toDate?: string; siteId?: string }): Promise<AuditSummaryDto> {
    const res = await apiClient.get<unknown>("/audit-logs/summary", {
      params,
    });
    return unwrapData<AuditSummaryDto>(res);
  },

  /**
   * GET /api/v1/audit-logs/config-changes
   * Lọc nhanh danh sách thay đổi cấu hình hệ thống.
   */
  async getConfigChanges(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>("/audit-logs/config-changes", {
      params,
    });
    return unwrapPaginated<AuditLogItem>(res);
  },

  /**
   * GET /api/v1/audit-logs/incident-reviews
   * Lọc nhanh danh sách thẩm duyệt và xử lý sự cố PPE.
   */
  async getIncidentReviews(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>("/audit-logs/incident-reviews", {
      params,
    });
    return unwrapPaginated<AuditLogItem>(res);
  },

  /**
   * GET /api/v1/audit-logs/resource/:targetType/:targetId
   * Lấy timeline kiểm toán của một tài nguyên cụ thể.
   */
  async getResourceTrail(
    targetType: string,
    targetId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>(
      `/audit-logs/resource/${targetType}/${targetId}`,
      { params },
    );
    return unwrapPaginated<AuditLogItem>(res);
  },

  /**
   * GET /api/v1/audit-logs/export
   * Xuất báo cáo kiểm toán định dạng CSV hoặc JSON (Download stream).
   */
  async exportLogs(params: ExportAuditParams): Promise<Blob> {
    const res = await apiClient.get("/audit-logs/export", {
      params,
      responseType: "blob",
    });
    return unwrapData<Blob>(res);
  },
};
