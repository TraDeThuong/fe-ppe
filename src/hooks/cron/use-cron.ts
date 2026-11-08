"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cronService } from "@/services/cron.service";
import { auditQueryKeys } from "@/hooks/audit/audit.query-keys";
import type { CronJobItem, CronJobName, TriggerCronJobPayload } from "@/types/cron.types";
import { cronQueryKeys } from "./cron.query-keys";

export function useCronJobs(enabled: boolean) {
  return useQuery({
    queryKey: cronQueryKeys.list(),
    queryFn: () => cronService.listJobs(),
    enabled,
    staleTime: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}

export function useCronMutations() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: cronQueryKeys.all });
    void client.invalidateQueries({ queryKey: auditQueryKeys.all });
  };
  const trigger = useMutation({
    mutationFn: ({ jobName, payload }: { jobName: CronJobName; payload: TriggerCronJobPayload }) => cronService.triggerJob(jobName, payload),
    retry: false,
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: (jobName: CronJobName) => cronService.toggleJob(jobName),
    retry: false,
    onSuccess: (result) => {
      client.setQueryData<CronJobItem[]>(cronQueryKeys.list(), (jobs) => jobs?.map((job) =>
        job.name === result.jobName ? { ...job, isEnabled: result.isEnabled } : job,
      ));
      refresh();
    },
  });
  return { trigger, toggle };
}
