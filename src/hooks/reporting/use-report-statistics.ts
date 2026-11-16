"use client";

import { useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type {
  AiPerformanceStatDto,
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
    queryFn: () => reportingService.getSummary(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useViolationTrends(params?: ReportingFilterParams) {
  return useQuery<TrendItemDto[]>({
    queryKey: reportingKeys.trends(params),
    queryFn: () => reportingService.getTrends(params),
    staleTime: 30 * 1000,
  });
}

export function useViolationDistribution(params?: ReportingFilterParams) {
  return useQuery<ViolationTypeStatDto[]>({
    queryKey: reportingKeys.distribution(params),
    queryFn: () => reportingService.getViolationDistribution(params),
    staleTime: 30 * 1000,
  });
}

export function useCameraRankings(params?: ReportingFilterParams & { limit?: number }) {
  return useQuery<CameraStatDto[]>({
    queryKey: reportingKeys.rankings(params),
    queryFn: () => reportingService.getCameraRankings(params),
    staleTime: 30 * 1000,
  });
}

export function useAiPerformanceStats(params?: ReportingFilterParams) {
  return useQuery<AiPerformanceStatDto[]>({
    queryKey: reportingKeys.aiPerformance(params),
    queryFn: () => reportingService.getAiPerformance(params),
    staleTime: 30 * 1000,
  });
}
