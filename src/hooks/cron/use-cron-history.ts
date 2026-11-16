"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/services/audit.service";
import { cronQueryKeys } from "./cron.query-keys";
import type { CronJobName } from "@/types/cron.types";

export function useCronJobHistory(jobName: CronJobName | null, enabled = true) {
  return useQuery({
    queryKey: jobName ? cronQueryKeys.history(jobName) : ["cron-jobs", "history", "none"],
    queryFn: async () => {
      if (!jobName) {
        return { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }
      return auditService.getResourceTrail("CRON_JOB", jobName, { page: 1, limit: 20 });
    },
    enabled: Boolean(jobName) && enabled,
    staleTime: 10 * 1000,
  });
}

/**
 * Fetches recent CRON_JOB audit trail entries so cron views can display real
 * historical last-run timestamps and durations without backend changes.
 */
export function useCronRecentExecutions(enabled = true) {
  return useQuery({
    queryKey: cronQueryKeys.recentAudit(),
    queryFn: () => auditService.getLogs({ targetType: "CRON_JOB", limit: 30 }),
    enabled,
    staleTime: 15 * 1000,
    retry: false,
  });
}

