import type { ReportHistoryQueryDto, ReportingFilterParams } from "@/types";

export const reportingKeys = {
  all: ["reporting"] as const,
  summary: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "summary", params] as const,
  trends: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "trends", params] as const,
  distribution: (params?: ReportingFilterParams) =>
    [...reportingKeys.all, "distribution", params] as const,
  rankings: (params?: ReportingFilterParams & { limit?: number }) =>
    [...reportingKeys.all, "rankings", params] as const,
  templates: () => [...reportingKeys.all, "templates"] as const,
  template: (id: string) => [...reportingKeys.templates(), id] as const,
  history: (params?: ReportHistoryQueryDto) =>
    [...reportingKeys.all, "history", params] as const,
};
