/**
 * Contract Reporting & Statistics theo Backend smart-ppe-reporting-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-reporting-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-reporting-service/src/modules/reporting/reporting.dto.ts
 * - Routes: smart-ppe-reporting-service/src/modules/reporting/reporting.route.ts
 */

import type { PaginationMeta } from "./rbac.types";

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const REPORT_TYPE = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  VIOLATION_SUMMARY: "VIOLATION_SUMMARY",
  AI_PERFORMANCE: "AI_PERFORMANCE",
  DAILY_SHIFT: "DAILY_SHIFT",
  WEEKLY_SUMMARY: "WEEKLY_SUMMARY",
  MONTHLY_COMPLIANCE: "MONTHLY_COMPLIANCE",
  AUDIT_INSPECTION: "AUDIT_INSPECTION",
  CUSTOM: "CUSTOM",
} as const;

export type ReportType = (typeof REPORT_TYPE)[keyof typeof REPORT_TYPE];

export const REPORT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

export const REPORT_FILE_TYPE = {
  PDF: "PDF",
  EXCEL: "EXCEL",
  CSV: "CSV",
} as const;

export type ReportFileType = (typeof REPORT_FILE_TYPE)[keyof typeof REPORT_FILE_TYPE];

export const REPORT_TEMPLATE_STATUS = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export type ReportTemplateStatus =
  (typeof REPORT_TEMPLATE_STATUS)[keyof typeof REPORT_TEMPLATE_STATUS];

// ============================================================================
// 2. STATISTICAL AGGREGATION DTOS
// ============================================================================

export interface ReportingFilterParams {
  siteId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
}

export interface StatisticsSummaryDto {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  trueViolations: number;
  falseAlarms: number;
  falseAlarmRate: number; // Tỷ lệ cảnh báo sai: 0 - 100%
  complianceRate: number; // Tỷ lệ tuân thủ an toàn: 0 - 100%
  meanTimeToResolveHours: number; // Thời gian giải quyết trung bình (MTTR)
  periodStart?: string;
  periodEnd?: string;
}

export interface TrendItemDto {
  date: string;
  totalIncidents: number;
  trueViolations: number;
  falseAlarms: number;
  resolvedCount: number;
}

export interface ViolationTypeStatDto {
  violationType: string;
  count: number;
  percentage: number;
  severityBreakdown: {
    LOW: number;
    NORMAL?: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface CameraStatDto {
  cameraId: string;
  cameraName?: string;
  totalViolations: number;
  confirmedCount: number;
  falseAlarmCount: number;
  resolvedCount: number;
}

// ============================================================================
// 3. TEMPLATES & ASYNC GENERATION DTOS
// ============================================================================

export interface ReportTemplateDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  fileType: ReportFileType | string;
  version: string;
  status: ReportTemplateStatus | string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplateDto {
  name: string;
  code: string;
  description?: string;
  filePath?: string;
  fileName?: string;
  fileType?: ReportFileType | string;
  version?: string;
}

export interface GenerateReportDto {
  templateId: string;
  siteId?: string;
  reportType: ReportType | string;
  periodStart: string;
  periodEnd: string;
  format?: ReportFileType | string;
}

export interface ReportGenerationDto {
  id: string;
  templateId: string;
  siteId: string;
  siteName?: string;
  reportType: ReportType | string;
  periodStart: string;
  periodEnd: string;
  generatedBy: string;
  status: ReportStatus | string;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: ReportFileType | string;
  errorMessage?: string | null;
  generatedAt: string;
  createdAt: string;
  template?: ReportTemplateDto;
}

export interface ReportHistoryQueryDto {
  page?: number;
  limit?: number;
  siteId?: string;
  reportType?: string;
  status?: string;
}

export interface ReportDownloadResult {
  downloadUrl: string;
  fileName: string;
}
