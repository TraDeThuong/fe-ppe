"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/axios";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";
import type { AiModelVersionDto } from "@/types";

export function useActiveModelVersion(options?: { enabled?: boolean }) {
  return useQuery<AiModelVersionDto | null>({
    queryKey: aiMetricsKeys.activeVersion(),
    queryFn: async ({ signal }) => {
      try {
        return await aiMetricsService.getActiveModelVersion({ signal, strict: true });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 30 * 1000,
    ...options,
  });
}
