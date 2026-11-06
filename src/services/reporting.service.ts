import { apiClient } from "@/lib/axios";
import { downloadBlob } from "@/lib/file-download";
import type {
  AggregateDailyPayload,
  CameraStatDto,
  CreateReportTemplateDto,
  GenerateReportDto,
  PaginationMeta,
  ReportContentResult,
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
      const normalizedParams = params
        ? {
            ...params,
            groupBy: params.groupBy
              ? (params.groupBy.toUpperCase() as "DAY" | "WEEK" | "MONTH")
              : undefined,
          }
        : undefined;
      const res = await apiClient.get<unknown>(
        "/statistics/trends",
        { params: normalizedParams }
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

  /**
   * DELETE /api/v1/reports/templates/:id
   */
  async deleteTemplate(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/reports/templates/${id}`
    );
    return { message: res?.message || "Report template deleted successfully" };
  },

  /**
   * GET /api/v1/reports/:id/content
   */
  async getReportContent(id: string): Promise<ReportContentResult> {
    const res = await apiClient.get<unknown>(
      `/reports/${id}/content`
    );
    return unwrapData<ReportContentResult>(res);
  },

  /**
   * GET /api/v1/reports/:id/content (Binary Stream)
   * Tải về nội dung file báo cáo (PDF, Excel,...) dưới dạng Blob có kèm Authorization Bearer token.
   */
  async getReportContentBlob(id: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(`/reports/${id}/content`, {
      responseType: "blob",
    });
    return unwrapData<Blob>(res);
  },

  /**
   * Tải tệp báo cáo hoàn chỉnh về máy người dùng (PDF / Excel)
   * Tự động giải quyết tên tệp, phần mở rộng và xử lý lỗi phản hồi nếu BE trả về JSON dạng Blob.
   */
  async downloadReportFile(
    report:
      | ReportGenerationDto
      | { id: string; fileName?: string; template?: { fileType?: string } }
  ): Promise<void> {
    try {
      const blob = await this.getReportContentBlob(report.id);

      // Xác định tên tệp và phần mở rộng chuẩn
      let filename = report.fileName?.trim();
      const rawFileType = (report.template?.fileType || "").toUpperCase();
      const ext =
        rawFileType === "EXCEL"
          ? "xlsx"
          : rawFileType === "CSV"
          ? "csv"
          : rawFileType === "JSON"
          ? "json"
          : "pdf";

      if (!filename) {
        filename = `report_${report.id.slice(0, 8)}.${ext}`;
      } else if (!filename.includes(".")) {
        filename = `${filename}.${ext}`;
      }

      downloadBlob(blob, filename);
    } catch (error: any) {
      // Trường hợp BE trả về lỗi (403 BOLA Guard, 404, 500) khi responseType="blob",
      // Axios sẽ gói payload JSON của Backend vào một đối tượng Blob.
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            throw new Error(json.message);
          }
        } catch (parseErr) {
          if (
            parseErr instanceof Error &&
            parseErr !== error &&
            parseErr.message &&
            !parseErr.message.includes("JSON")
          ) {
            throw parseErr;
          }
        }
      }
      throw error;
    }
  },

  /**
   * POST /api/v1/statistics/aggregate-daily
   */
  async aggregateDaily(payload: AggregateDailyPayload): Promise<{ message: string }> {
    const res = await apiClient.post<unknown, any>(
      "/statistics/aggregate-daily",
      payload
    );
    return { message: res?.message || "Daily aggregation completed successfully" };
  },
};

