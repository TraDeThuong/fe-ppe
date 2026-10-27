"use client";

import { useQuery } from "@tanstack/react-query";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";
import type { AiModelDto } from "@/types";

export function useAiModels() {
  return useQuery<AiModelDto[]>({
    queryKey: aiMetricsKeys.models(),
    queryFn: () => aiMetricsService.getAiModels(),
    staleTime: 60 * 1000,
  });
}

export function useAiModelDetail(id: string, enabled = true) {
  return useQuery<AiModelDto>({
    queryKey: aiMetricsKeys.model(id),
    queryFn: () => aiMetricsService.getAiModelById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
  });
}
