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

export const auditService = {
  /**
   * GET /api/v1/audit-logs
   * Lấy danh sách nhật ký kiểm toán có phân trang và lọc đa tiêu chí.
   */
  async getLogs(
    params?: AuditLogQueryParams,
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<AuditLogsListResponse>("/api/v1/audit-logs", {
      params,
    });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/audit-logs/:id
   * Lấy chi tiết 1 bản ghi kiểm toán kèm JSON Diff và siêu dữ liệu.
   */
  async getLogDetail(id: string): Promise<AuditLogDetail> {
    const res = await apiClient.get<AuditLogDetailResponse>(`/api/v1/audit-logs/${id}`);
    return res.data.data;
  },

  /**
   * GET /api/v1/audit-logs/summary
   * Lấy số liệu thống kê KPI kiểm toán.
   */
  async getSummary(params?: { fromDate?: string; toDate?: string; siteId?: string }): Promise<AuditSummaryDto> {
    const res = await apiClient.get<AuditSummaryResponse>("/api/v1/audit-logs/summary", {
      params,
    });
    return res.data.data;
  },

  /**
   * GET /api/v1/audit-logs/config-changes
   * Lọc nhanh danh sách thay đổi cấu hình hệ thống.
   */
  async getConfigChanges(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<AuditLogsListResponse>("/api/v1/audit-logs/config-changes", {
      params,
    });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/audit-logs/incident-reviews
   * Lọc nhanh danh sách thẩm duyệt và xử lý sự cố PPE.
   */
  async getIncidentReviews(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<AuditLogsListResponse>("/api/v1/audit-logs/incident-reviews", {
      params,
    });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
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
    const res = await apiClient.get<AuditLogsListResponse>(
      `/api/v1/audit-logs/resource/${targetType}/${targetId}`,
      { params },
    );
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/audit-logs/export
   * Xuất báo cáo kiểm toán định dạng CSV hoặc JSON (Download stream).
   */
  async exportLogs(params: ExportAuditParams): Promise<Blob> {
    const res = await apiClient.get("/api/v1/audit-logs/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },
};
