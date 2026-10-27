"use client";

import { useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type {
  CameraStatDto,
  ReportingFilterParams,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";

export function useReportSummary(params?: ReportingFilterParams) {
  return useQuery<StatisticsSummaryDto>({
    queryKey: reportingKeys.summary(params),
    queryFn: () => reportingService.getSummary(params),
    staleTime: 30 * 1000,
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
