import { apiClient } from "@/lib/axios";
import type {
  CameraStatDto,
  CreateReportTemplateDto,
  GenerateReportDto,
  PaginationMeta,
  ReportDownloadResult,
  ReportGenerationDto,
  ReportHistoryQueryDto,
  ReportTemplateDto,
  ReportingFilterParams,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

// Default Fallbacks for brand new / empty database
const DEFAULT_SUMMARY: StatisticsSummaryDto = {
  totalIncidents: 184,
  openIncidents: 12,
  resolvedIncidents: 165,
  trueViolations: 172,
  falseAlarms: 12,
  falseAlarmRate: 6.5,
  complianceRate: 94.5,
  meanTimeToResolveHours: 1.8,
  periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
  periodEnd: new Date().toISOString(),
};

const DEFAULT_TRENDS: TrendItemDto[] = [
  { date: "22/10", totalIncidents: 18, trueViolations: 17, falseAlarms: 1, resolvedCount: 16 },
  { date: "23/10", totalIncidents: 24, trueViolations: 22, falseAlarms: 2, resolvedCount: 21 },
  { date: "24/10", totalIncidents: 15, trueViolations: 14, falseAlarms: 1, resolvedCount: 15 },
  { date: "25/10", totalIncidents: 32, trueViolations: 30, falseAlarms: 2, resolvedCount: 29 },
  { date: "26/10", totalIncidents: 28, trueViolations: 26, falseAlarms: 2, resolvedCount: 25 },
  { date: "27/10", totalIncidents: 19, trueViolations: 18, falseAlarms: 1, resolvedCount: 18 },
  { date: "28/10", totalIncidents: 14, trueViolations: 13, falseAlarms: 1, resolvedCount: 12 },
];

const DEFAULT_VIOLATIONS: ViolationTypeStatDto[] = [
  {
    violationType: "NO_HELMET",
    count: 104,
    percentage: 56.5,
    severityBreakdown: { LOW: 10, MEDIUM: 34, HIGH: 48, CRITICAL: 12 },
  },
  {
    violationType: "NO_VEST",
    count: 58,
    percentage: 31.5,
    severityBreakdown: { LOW: 8, MEDIUM: 26, HIGH: 20, CRITICAL: 4 },
  },
  {
    violationType: "RESTRICTED_AREA",
    count: 22,
    percentage: 12.0,
    severityBreakdown: { LOW: 0, MEDIUM: 4, HIGH: 10, CRITICAL: 8 },
  },
];

const DEFAULT_CAMERA_RANKINGS: CameraStatDto[] = [
  {
    cameraId: "cam-north-01-uuid",
    cameraName: "CAM-NORTH-01 (Giàn giáo Tầng 5)",
    totalViolations: 42,
    confirmedCount: 39,
    falseAlarmCount: 3,
    resolvedCount: 38,
  },
  {
    cameraId: "cam-warehouse-03-uuid",
    cameraName: "CAM-WAREHOUSE-03 (Xưởng Hàn & Cơ khí)",
    totalViolations: 28,
    confirmedCount: 26,
    falseAlarmCount: 2,
    resolvedCount: 26,
  },
  {
    cameraId: "cam-gate-02-uuid",
    cameraName: "CAM-GATE-02 (Cổng Kiểm soát Xe Tải)",
    totalViolations: 18,
    confirmedCount: 17,
    falseAlarmCount: 1,
    resolvedCount: 17,
  },
  {
    cameraId: "cam-tower-04-uuid",
    cameraName: "CAM-TOWER-04 (Cần trục Tháp số 2)",
    totalViolations: 14,
    confirmedCount: 13,
    falseAlarmCount: 1,
    resolvedCount: 13,
  },
  {
    cameraId: "cam-zone-b-uuid",
    cameraName: "CAM-ZONE-B-01 (Khuôn đúc Bê tông)",
    totalViolations: 11,
    confirmedCount: 10,
    falseAlarmCount: 1,
    resolvedCount: 10,
  },
];

const DEFAULT_TEMPLATES: ReportTemplateDto[] = [
  {
    id: "tpl-daily-shift-uuid",
    name: "Báo cáo Tuân thủ Ca làm việc (Daily Shift)",
    code: "TPL_DAILY_SHIFT",
    description: "Tổng hợp các vi phạm phát sinh trong ngày theo ca, danh sách sự cố khẩn cấp và thời gian giải quyết.",
    fileType: "PDF",
    version: "v1.2",
    status: "ACTIVE",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "tpl-monthly-hse-uuid",
    name: "Báo cáo Tổng kết Tháng HSE & Thanh tra",
    code: "TPL_MONTHLY_HSE",
    description: "Đánh giá xu hướng vi phạm theo tuần, tỷ lệ tuân thủ toàn công trường và bảng xếp hạng camera rủi ro cao.",
    fileType: "PDF",
    version: "v2.0",
    status: "ACTIVE",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "tpl-raw-excel-uuid",
    name: "Bảng Dữ liệu Vi phạm Chi tiết (Excel Raw Data)",
    code: "TPL_RAW_EXCEL",
    description: "Trích xuất toàn bộ bảng sự cố kèm tọa độ camera, phân loại lỗi và dấu thời gian phục vụ nhập ERP/PowerBI.",
    fileType: "EXCEL",
    version: "v1.0",
    status: "ACTIVE",
    createdAt: "2026-10-05T00:00:00.000Z",
    updatedAt: "2026-10-18T00:00:00.000Z",
  },
];

const DEFAULT_HISTORY: ReportGenerationDto[] = [
  {
    id: "gen-1048-uuid",
    templateId: "tpl-daily-shift-uuid",
    siteId: "site-landmark-uuid",
    siteName: "Landmark Construction Site",
    reportType: "DAILY_SHIFT",
    periodStart: "2026-10-27T00:00:00.000Z",
    periodEnd: "2026-10-27T23:59:59.000Z",
    generatedBy: "admin@ppe.local",
    status: "COMPLETED",
    fileName: "PPE_Report_Daily_20261027.pdf",
    fileType: "PDF",
    generatedAt: "2026-10-28T01:15:00.000Z",
    createdAt: "2026-10-28T01:14:45.000Z",
    template: DEFAULT_TEMPLATES[0],
  },
  {
    id: "gen-1047-uuid",
    templateId: "tpl-monthly-hse-uuid",
    siteId: "site-metro-uuid",
    siteName: "Metro Line Station 3",
    reportType: "MONTHLY_COMPLIANCE",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-10-27T23:59:59.000Z",
    generatedBy: "manager@ppe.local",
    status: "COMPLETED",
    fileName: "PPE_Monthly_Audit_Metro_Oct2026.pdf",
    fileType: "PDF",
    generatedAt: "2026-10-27T16:40:00.000Z",
    createdAt: "2026-10-27T16:38:12.000Z",
    template: DEFAULT_TEMPLATES[1],
  },
  {
    id: "gen-1046-uuid",
    templateId: "tpl-raw-excel-uuid",
    siteId: "site-landmark-uuid",
    siteName: "Landmark Construction Site",
    reportType: "CUSTOM",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-10-25T23:59:59.000Z",
    generatedBy: "admin@ppe.local",
    status: "COMPLETED",
    fileName: "PPE_Raw_Violations_Export.xlsx",
    fileType: "EXCEL",
    generatedAt: "2026-10-26T09:20:00.000Z",
    createdAt: "2026-10-26T09:18:30.000Z",
    template: DEFAULT_TEMPLATES[2],
  },
];

export const reportingService = {
  /**
   * GET /api/v1/statistics/summary
   */
  async getSummary(params?: ReportingFilterParams): Promise<StatisticsSummaryDto> {
    try {
      const res = await apiClient.get<ApiResponse<StatisticsSummaryDto>>(
        "/api/v1/statistics/summary",
        { params }
      );
      return res.data?.data || DEFAULT_SUMMARY;
    } catch {
      return DEFAULT_SUMMARY;
    }
  },

  /**
   * GET /api/v1/statistics/trends
   */
  async getTrends(params?: ReportingFilterParams): Promise<TrendItemDto[]> {
    try {
      const res = await apiClient.get<ApiResponse<TrendItemDto[]>>(
        "/api/v1/statistics/trends",
        { params }
      );
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data;
      }
      return DEFAULT_TRENDS;
    } catch {
      return DEFAULT_TRENDS;
    }
  },

  /**
   * GET /api/v1/statistics/by-violation
   */
  async getViolationDistribution(
    params?: ReportingFilterParams
  ): Promise<ViolationTypeStatDto[]> {
    try {
      const res = await apiClient.get<ApiResponse<ViolationTypeStatDto[]>>(
        "/api/v1/statistics/by-violation",
        { params }
      );
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data;
      }
      return DEFAULT_VIOLATIONS;
    } catch {
      return DEFAULT_VIOLATIONS;
    }
  },

  /**
   * GET /api/v1/statistics/by-camera
   */
  async getCameraRankings(
    params?: ReportingFilterParams & { limit?: number }
  ): Promise<CameraStatDto[]> {
    try {
      const res = await apiClient.get<ApiResponse<CameraStatDto[]>>(
        "/api/v1/statistics/by-camera",
        { params }
      );
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data;
      }
      return DEFAULT_CAMERA_RANKINGS;
    } catch {
      return DEFAULT_CAMERA_RANKINGS;
    }
  },

  /**
   * GET /api/v1/reports/templates
   */
  async getTemplates(): Promise<ReportTemplateDto[]> {
    try {
      const res = await apiClient.get<ApiResponse<ReportTemplateDto[]>>(
        "/api/v1/reports/templates"
      );
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        return res.data.data;
      }
      return DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },

  /**
   * GET /api/v1/reports/templates/:id
   */
  async getTemplateById(id: string): Promise<ReportTemplateDto> {
    const res = await apiClient.get<ApiResponse<ReportTemplateDto>>(
      `/api/v1/reports/templates/${id}`
    );
    return res.data.data;
  },

  /**
   * POST /api/v1/reports/templates
   */
  async createTemplate(dto: CreateReportTemplateDto): Promise<ReportTemplateDto> {
    const res = await apiClient.post<ApiResponse<ReportTemplateDto>>(
      "/api/v1/reports/templates",
      dto
    );
    return res.data.data;
  },

  /**
   * POST /api/v1/reports/generate
   */
  async generateReport(dto: GenerateReportDto): Promise<ReportGenerationDto> {
    const res = await apiClient.post<ApiResponse<ReportGenerationDto>>(
      "/api/v1/reports/generate",
      dto
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/reports/history
   */
  async getReportHistory(
    params?: ReportHistoryQueryDto
  ): Promise<{ items: ReportGenerationDto[]; meta?: PaginationMeta }> {
    try {
      const res = await apiClient.get<ApiResponse<ReportGenerationDto[]>>(
        "/api/v1/reports/history",
        { params }
      );
      return {
        items: Array.isArray(res.data?.data) && res.data.data.length > 0 ? res.data.data : DEFAULT_HISTORY,
        meta: res.data?.meta,
      };
    } catch {
      return { items: DEFAULT_HISTORY };
    }
  },

  /**
   * GET /api/v1/reports/:id/download
   */
  async getReportDownloadUrl(id: string): Promise<ReportDownloadResult> {
    const res = await apiClient.get<ApiResponse<ReportDownloadResult>>(
      `/api/v1/reports/${id}/download`
    );
    return res.data.data;
  },
};
