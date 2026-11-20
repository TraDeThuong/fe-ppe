import { apiClient } from "@/lib/axios";
import type {
  AuditLogDetail,
  AuditLogDetailResponse,
  AuditLogItem,
  AuditLogQueryParams,
  AuditLogStatus,
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

const FAILED_ACTION_REGEX = /(^|_)(FAIL|FAILED|ERROR|DENIED|REJECTED)$/i;

function normalizeAuditItem(raw: any): AuditLogItem {
  if (!raw || typeof raw !== "object") return raw;
  const actor = raw.actor;
  const details = (raw.details && typeof raw.details === "object" ? raw.details : {}) as Record<string, unknown>;

  let status: AuditLogStatus = "SUCCESS";
  if (raw.status) {
    status = String(raw.status).toUpperCase() === "FAILED" ? "FAILED" : "SUCCESS";
  } else if (typeof details.status === "string" && ["FAILED", "ERROR"].includes(details.status.trim().toUpperCase())) {
    status = "FAILED";
  } else if (details.success === false) {
    status = "FAILED";
  } else if (
    (typeof details.errorMessage === "string" && details.errorMessage.trim().length > 0) ||
    (details.error !== undefined &&
      details.error !== null &&
      details.error !== false &&
      (typeof details.error !== "string" || details.error.trim().length > 0)) ||
    raw.errorMessage
  ) {
    status = "FAILED";
  } else if (
    typeof raw.action === "string" &&
    (raw.action === "ACCOUNT_LOCKED" || FAILED_ACTION_REGEX.test(raw.action))
  ) {
    status = "FAILED";
  }

  return {
    ...raw,
    id: raw.id,
    userId: raw.userId ?? raw.actorId ?? actor?.id ?? null,
    actorId: raw.actorId ?? raw.userId ?? actor?.id ?? null,
    actor: actor ?? null,
    userEmail: raw.userEmail ?? actor?.email ?? (typeof details.email === "string" ? details.email : null),
    userName: raw.userName ?? actor?.fullName ?? (typeof details.fullName === "string" ? details.fullName : null),
    userRole: raw.userRole ?? actor?.roleName ?? (typeof details.roleName === "string" ? details.roleName : null),
    action: raw.action,
    targetType: raw.targetType,
    targetId: raw.targetId ?? null,
    status,
    errorMessage: raw.errorMessage ?? (typeof details.errorMessage === "string" ? details.errorMessage : null),
    ipAddress: raw.ipAddress ?? null,
    userAgent: raw.userAgent ?? null,
    details,
    createdAt: raw.createdAt,
  };
}

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

const DIFF_ENVELOPE_KEYS = new Set([
  "oldValue",
  "newValue",
  "previous",
  "updated",
  "current",
  "before",
  "after",
  "metadata",
]);

function normalizeAuditDetail(raw: any): AuditLogDetail {
  const item = normalizeAuditItem(raw);
  const details = isPlainRecord(item.details) ? item.details : {};

  // Backend services store mutations under previous/updated or previous/current (or oldValue/newValue).
  const rawOld =
    raw.oldValue ??
    details.oldValue ??
    details.previous ??
    details.before ??
    null;
  const rawNew =
    raw.newValue ??
    details.newValue ??
    details.updated ??
    details.current ??
    details.after ??
    null;

  const oldValue = isPlainRecord(rawOld) ? rawOld : null;
  const newValue = isPlainRecord(rawNew) ? rawNew : null;

  let metadata: Record<string, unknown> | null = null;
  if (isPlainRecord(raw.metadata)) {
    metadata = raw.metadata;
  } else if (isPlainRecord(details.metadata)) {
    metadata = details.metadata;
  } else if (Object.keys(details).length > 0) {
    // Strip diff envelope fields from metadata when a structured diff was extracted
    const remaining: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(details)) {
      if ((oldValue || newValue) && DIFF_ENVELOPE_KEYS.has(k)) continue;
      remaining[k] = v;
    }
    metadata = Object.keys(remaining).length > 0 ? remaining : null;
  }

  return {
    ...item,
    oldValue,
    newValue,
    metadata,
  };
}

function normalizeAuditSummary(raw: any): AuditSummaryDto {
  if (!raw) {
    return {
      totalLogs: 0,
      successCount: 0,
      failedCount: 0,
      configChangesCount: 0,
      incidentReviewsCount: 0,
      successRate: null,
      recentActivity: [],
    };
  }
  const categoryCounts = raw.categoryCounts || {};
  const totalLogs = raw.totalLogs ?? 0;
  const successRate =
    raw.successRate !== undefined
      ? raw.successRate
      : totalLogs === 0
        ? null
        : null;

  return {
    ...raw,
    totalLogs,
    successCount: raw.successCount,
    failedCount: raw.failedCount,
    configChangesCount: raw.configChangesCount ?? categoryCounts.config ?? 0,
    incidentReviewsCount: raw.incidentReviewsCount ?? categoryCounts.incidentReview ?? 0,
    successRate,
    recentActivity: Array.isArray(raw.recentActivity)
      ? raw.recentActivity.map(normalizeAuditItem)
      : undefined,
    byAction: raw.byAction ?? (Array.isArray(raw.topActions)
      ? Object.fromEntries(raw.topActions.map((a: any) => [a.action, a.count]))
      : undefined),
    byTargetType: raw.byTargetType,
  };
}

function mapAuditQueryParams<
  T extends {
    userId?: string;
    actorId?: string;
    fromDate?: string;
    toDate?: string;
    startDate?: string;
    endDate?: string;
  },
>(params?: T) {
  if (!params) return undefined;
  const { fromDate, toDate, userId, actorId, ...rest } = params;
  return {
    ...rest,
    actorId: actorId ?? userId,
    startDate: params.startDate ?? fromDate,
    endDate: params.endDate ?? toDate,
  };
}

function unwrapPaginated<T>(res: any, normalizer?: (item: any) => T): { items: T[]; meta: PaginationMeta } {
  const defaultMeta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };
  if (!res) return { items: [], meta: defaultMeta };
  if (Array.isArray(res)) {
    const items = normalizer ? res.map(normalizer) : res;
    return { items, meta: defaultMeta };
  }
  const rawItems = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.items)
      ? res.items
      : [];
  const items = normalizer ? rawItems.map(normalizer) : rawItems;
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
      params: mapAuditQueryParams(params),
    });
    return unwrapPaginated<AuditLogItem>(res, normalizeAuditItem);
  },

  /**
   * GET /api/v1/audit-logs/:id
   * Lấy chi tiết 1 bản ghi kiểm toán kèm JSON Diff và siêu dữ liệu.
   */
  async getLogDetail(id: string): Promise<AuditLogDetail> {
    const res = await apiClient.get<unknown>(`/audit-logs/${id}`);
    const data = unwrapData<any>(res);
    return normalizeAuditDetail(data);
  },

  /**
   * GET /api/v1/audit-logs/summary
   * Lấy số liệu thống kê KPI kiểm toán.
   */
  async getSummary(params?: { fromDate?: string; toDate?: string; startDate?: string; endDate?: string; siteId?: string }): Promise<AuditSummaryDto> {
    const res = await apiClient.get<unknown>("/audit-logs/summary", {
      params: mapAuditQueryParams(params),
    });
    const data = unwrapData<any>(res);
    return normalizeAuditSummary(data);
  },

  /**
   * GET /api/v1/audit-logs/config-changes
   * Lọc nhanh danh sách thay đổi cấu hình hệ thống.
   */
  async getConfigChanges(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; startDate?: string; endDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>("/audit-logs/config-changes", {
      params: mapAuditQueryParams(params),
    });
    return unwrapPaginated<AuditLogItem>(res, normalizeAuditItem);
  },

  /**
   * GET /api/v1/audit-logs/incident-reviews
   * Lọc nhanh danh sách thẩm duyệt và xử lý sự cố PPE.
   */
  async getIncidentReviews(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; startDate?: string; endDate?: string },
  ): Promise<{ items: AuditLogItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<any>("/audit-logs/incident-reviews", {
      params: mapAuditQueryParams(params),
    });
    return unwrapPaginated<AuditLogItem>(res, normalizeAuditItem);
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
    return unwrapPaginated<AuditLogItem>(res, normalizeAuditItem);
  },

  /**
   * GET /api/v1/audit-logs/export
   * Xuất báo cáo kiểm toán định dạng CSV hoặc JSON (Download stream).
   */
  async exportLogs(params: ExportAuditParams): Promise<Blob> {
    const res = await apiClient.get("/audit-logs/export", {
      params: mapAuditQueryParams(params),
      responseType: "blob",
    });
    return unwrapData<Blob>(res);
  },
};
