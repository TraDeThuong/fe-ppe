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

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object") {
    if ("data" in res && !("status" in res && "headers" in res)) {
      return (res.data as T) ?? (res as T);
    }
  }
  return res as T;
}

function unwrapArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "object") {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
  }
  return [];
}

function unwrapPaginated<T>(res: any): { items: T[]; meta?: PaginationMeta } {
  if (!res) return { items: [] };
  if (Array.isArray(res)) return { items: res };
  const raw = res as any;
  const items = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const meta = raw.meta ?? raw.data?.meta;
  return { items, meta };
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
      const res = await apiClient.get<unknown>(
        "/statistics/summary",
        { params }
      );
      const data = unwrapData<StatisticsSummaryDto>(res);
      return data && typeof data === "object" && "totalIncidents" in data
        ? data
        : EMPTY_SUMMARY;
    } catch {
      return EMPTY_SUMMARY;
    }
  },

  /**
   * GET /api/v1/statistics/trends
   */
  async getTrends(params?: ReportingFilterParams): Promise<TrendItemDto[]> {
    try {
      const res = await apiClient.get<unknown>(
        "/statistics/trends",
        { params }
      );
      return unwrapArray<TrendItemDto>(res);
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
      const res = await apiClient.get<unknown>(
        "/statistics/by-violation",
        { params }
      );
      return unwrapArray<ViolationTypeStatDto>(res);
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
      const res = await apiClient.get<unknown>(
        "/statistics/by-camera",
        { params }
      );
      return unwrapArray<CameraStatDto>(res);
    } catch {
      return [];
    }
  },

  /**
   * GET /api/v1/reports/templates
   */
  async getTemplates(): Promise<ReportTemplateDto[]> {
    try {
      const res = await apiClient.get<unknown>(
        "/reports/templates"
      );
      return unwrapArray<ReportTemplateDto>(res);
    } catch {
      return [];
    }
  },

  /**
   * GET /api/v1/reports/templates/:id
   */
  async getTemplateById(id: string): Promise<ReportTemplateDto> {
    const res = await apiClient.get<unknown>(
      `/reports/templates/${id}`
    );
    return unwrapData<ReportTemplateDto>(res);
  },

  /**
   * POST /api/v1/reports/templates
   */
  async createTemplate(dto: CreateReportTemplateDto): Promise<ReportTemplateDto> {
    const res = await apiClient.post<unknown>(
      "/reports/templates",
      dto
    );
    return unwrapData<ReportTemplateDto>(res);
  },

  /**
   * POST /api/v1/reports/generate
   */
  async generateReport(dto: GenerateReportDto): Promise<ReportGenerationDto> {
    const res = await apiClient.post<unknown>(
      "/reports/generate",
      dto
    );
    return unwrapData<ReportGenerationDto>(res);
  },

  /**
   * GET /api/v1/reports/history
   */
  async getReportHistory(
    params?: ReportHistoryQueryDto
  ): Promise<{ items: ReportGenerationDto[]; meta?: PaginationMeta }> {
    try {
      const res = await apiClient.get<unknown, any>(
        "/reports/history",
        { params }
      );
      return unwrapPaginated<ReportGenerationDto>(res);
    } catch {
      return { items: [] };
    }
  },

  /**
   * GET /api/v1/reports/:id/download
   */
  async getReportDownloadUrl(id: string): Promise<ReportDownloadResult> {
    const res = await apiClient.get<unknown>(
      `/reports/${id}/download`
    );
    return unwrapData<ReportDownloadResult>(res);
  },
};

