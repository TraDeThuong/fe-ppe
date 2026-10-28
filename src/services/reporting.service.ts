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

const EMPTY_SUMMARY: StatisticsSummaryDto = {
  totalIncidents: 0,
  openIncidents: 0,
  resolvedIncidents: 0,
  trueViolations: 0,
  falseAlarms: 0,
  falseAlarmRate: 0,
  complianceRate: 0,
  meanTimeToResolveHours: 0,
  periodStart: "",
  periodEnd: "",
};

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
      return res.data?.data || EMPTY_SUMMARY;
    } catch {
      return EMPTY_SUMMARY;
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
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
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
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
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
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
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
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
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
        items: Array.isArray(res.data?.data) ? res.data.data : [],
        meta: res.data?.meta,
      };
    } catch {
      return { items: [] };
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

