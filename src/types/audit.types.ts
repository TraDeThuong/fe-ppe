import type { PaginationMeta } from "./rbac.types";

export type AuditLogStatus = "SUCCESS" | "FAILED";

export interface AuditLogItem {
  id: string;
  userId: string | null;
  actorId?: string | null;
  actor?: {
    id: string;
    email: string | null;
    fullName: string | null;
    roleName?: string;
  } | null;
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
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditSummaryDto {
  totalLogs: number;
  successCount?: number;
  failedCount?: number;
  configChangesCount: number;
  incidentReviewsCount: number;
  successRate: number | null;
  recentActivity?: AuditLogItem[];
  byAction?: Record<string, number>;
  byTargetType?: Record<string, number>;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  actorId?: string;
  userId?: string;
  category?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  status?: AuditLogStatus;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
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
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
  action?: string;
  targetType?: string;
  status?: AuditLogStatus;
}
