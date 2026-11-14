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

