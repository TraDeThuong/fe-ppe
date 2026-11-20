import type { AuditLogQueryParams } from "@/types";

export const auditQueryKeys = {
  all: ["audit-logs"] as const,
  list: (params?: AuditLogQueryParams) =>
    [...auditQueryKeys.all, "list", params ?? {}] as const,
  detail: (id: string) =>
    [...auditQueryKeys.all, "detail", id] as const,
  summary: (params?: { fromDate?: string; toDate?: string; startDate?: string; endDate?: string; siteId?: string }) =>
    [...auditQueryKeys.all, "summary", params ?? {}] as const,
  configChanges: (params?: { page?: number; limit?: number }) =>
    [...auditQueryKeys.all, "config-changes", params ?? {}] as const,
  incidentReviews: (params?: { page?: number; limit?: number }) =>
    [...auditQueryKeys.all, "incident-reviews", params ?? {}] as const,
  resourceTrail: (targetType: string, targetId: string, limit?: number) =>
    [...auditQueryKeys.all, "resource", targetType, targetId, limit ?? 20] as const,
};
