"use client";

import { useQuery } from "@tanstack/react-query";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";
import type { AiModelVersionDto } from "@/types";

export function useActiveModelVersion(options?: { enabled?: boolean }) {
  return useQuery<AiModelVersionDto | null>({
    queryKey: aiMetricsKeys.activeVersion(),
    queryFn: () => aiMetricsService.getActiveModelVersion(),
    staleTime: 30 * 1000,
    ...options,
  });
}
