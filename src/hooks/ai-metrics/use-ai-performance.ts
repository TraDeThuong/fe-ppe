"use client";

import { useQuery } from "@tanstack/react-query";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";
import type { AiPerformanceFilter } from "@/types";

export function useAiPerformance(filter?: AiPerformanceFilter, enabled = true) {
  const params = {
    cameraId: filter?.cameraId || undefined,
    startDate: filter?.startDate ?? filter?.fromDate,
    endDate: filter?.endDate ?? filter?.toDate,
  };

  return useQuery({
    queryKey: aiMetricsKeys.performance(params),
    queryFn: ({ signal }) => aiMetricsService.getAiPerformance(params, signal),
    enabled,
    staleTime: 30 * 1000,
  });
}
