"use client";

import { useQuery } from "@tanstack/react-query";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";
import type { AiPerformanceDto, AiPerformanceFilter } from "@/types";

export function useAiPerformance(filter?: AiPerformanceFilter) {
  return useQuery<AiPerformanceDto>({
    queryKey: aiMetricsKeys.performance(filter),
    queryFn: () => aiMetricsService.getAiPerformance(filter),
    staleTime: 30 * 1000,
  });
}
