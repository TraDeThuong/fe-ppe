"use client";

import { useQuery } from "@tanstack/react-query";
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
    queryFn: () => reportingService.getSummary(params),
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
    queryFn: () => reportingService.getTrends(params),
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
    queryFn: () => reportingService.getViolationDistribution(params),
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
    queryFn: () => reportingService.getCameraRankings(params),
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}
