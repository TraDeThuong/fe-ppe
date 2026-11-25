import type { ReportHistoryQueryDto, ReportingFilterParams } from "@/types";

export const reportingKeys = {
  all: ["reporting"] as const,
  dashboardKpi: (siteId?: string | null) =>
    [...reportingKeys.all, "dashboardKpi", siteId || "all"] as const,
  hourlyRisk: (params?: {
    siteId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => [...reportingKeys.all, "hourlyRisk", params] as const,
  summary: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "summary", params] as const,
  trends: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "trends", params] as const,
  distribution: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "distribution", params] as const,
  rankings: (params?: ReportingFilterParams & { limit?: number }) =>
    [...reportingKeys.all, "rankings", params] as const,
  aiPerformance: (params?: {
    cameraId?: string;
    startDate?: string;
    endDate?: string;
  }) => [...reportingKeys.all, "aiPerformance", params] as const,
  templates: () => [...reportingKeys.all, "templates"] as const,
  template: (id: string) => [...reportingKeys.templates(), id] as const,
  historyAll: () => [...reportingKeys.all, "history"] as const,
  history: (params?: ReportHistoryQueryDto) =>
    [...reportingKeys.historyAll(), params] as const,
};
