import type { PaginationMeta } from "./rbac.types";

export type AuditLogStatus = "SUCCESS" | "FAILED";

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  status: AuditLogStatus;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditSummaryDto {
  totalLogs: number;
  configChangesCount: number;
  incidentReviewsCount: number;
  successRate: number;
  byAction?: Record<string, number>;
  byTargetType?: Record<string, number>;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  status?: AuditLogStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuditLogsListResponse {
  success: boolean;
  data: AuditLogItem[];
  meta: PaginationMeta;
}

export interface AuditLogDetailResponse {
  success: boolean;
  data: AuditLogDetail;
}

export interface AuditSummaryResponse {
  success: boolean;
  data: AuditSummaryDto;
}

export interface ExportAuditParams {
  format: "csv" | "json";
  fromDate?: string;
  toDate?: string;
  action?: string;
  targetType?: string;
}
