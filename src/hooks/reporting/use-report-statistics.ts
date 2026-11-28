"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type {
  CameraStatDto,
  DashboardKpiDto,
  HourlyRiskResponseDto,
  ReportingFilterParams,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";

export function useDashboardKpi(
  siteId?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery<DashboardKpiDto | null>({
    queryKey: reportingKeys.dashboardKpi(siteId),
    queryFn: () => reportingService.getDashboardKpi(siteId || undefined),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useHourlyRisk(
  params?: {
    siteId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean },
) {
  return useQuery<HourlyRiskResponseDto | null>({
    queryKey: reportingKeys.hourlyRisk(params),
    queryFn: () => reportingService.getHourlyRisk(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useReportSummary(
  params?: ReportingFilterParams,
  options?: { enabled?: boolean },
) {
  return useQuery<StatisticsSummaryDto>({
    queryKey: reportingKeys.summary(params),
    queryFn: ({ signal }) => reportingService.getSummary(params, { signal, strict: true, suppressToast: true }),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useViolationTrends(
  params?: ReportingFilterParams,
  options?: { enabled?: boolean },
) {
  return useQuery<TrendItemDto[]>({
    queryKey: reportingKeys.trends(params),
    queryFn: ({ signal }) => reportingService.getTrends(params, { signal, strict: true, suppressToast: true }),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useViolationDistribution(
  params?: ReportingFilterParams,
  options?: { enabled?: boolean },
) {
  return useQuery<ViolationTypeStatDto[]>({
    queryKey: reportingKeys.distribution(params),
    queryFn: ({ signal }) => reportingService.getViolationDistribution(params, { signal, strict: true, suppressToast: true }),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCameraRankings(
  params?: ReportingFilterParams & { limit?: number },
  options?: { enabled?: boolean },
) {
  return useQuery<CameraStatDto[]>({
    queryKey: reportingKeys.rankings(params),
    queryFn: ({ signal }) => reportingService.getCameraRankings(params, { signal, strict: true, suppressToast: true }),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Thống kê tóm tắt theo từng công trường (BE develop không còn trả `siteBreakdown`).
 * Gọi `/statistics/summary?siteId=` cho mỗi công trường rồi gộp ở FE; dùng chung cache với
 * truy vấn summary của từng công trường.
 */
export function useSiteSummaryBreakdown(
  params: Omit<ReportingFilterParams, "siteId">,
  siteIds: readonly string[],
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && siteIds.length > 0;
  return useQueries({
    queries: siteIds.map((siteId) => {
      const siteParams = { ...params, siteId };
      return {
        queryKey: reportingKeys.summary(siteParams),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          reportingService.getSummary(siteParams, { signal, strict: true, suppressToast: true }),
        staleTime: 30 * 1000,
        enabled,
      };
    }),
    combine: (results) => {
      const loaded = results.every((r) => r.data !== undefined);
      return {
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
        siteBreakdown: loaded
          ? results.map((r, i) => ({ ...(r.data as StatisticsSummaryDto), siteId: siteIds[i] }))
          : undefined,
      };
    },
  });
}
