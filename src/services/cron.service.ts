import { apiClient } from "@/lib/axios";
import type {
  CronJobExecutionResult,
  CronJobItem,
  CronJobName,
  ToggleCronJobResult,
  TriggerCronJobPayload,
} from "@/types/cron.types";

// The shared interceptor already unwraps the outer { success, data } envelope.
// In particular, result.data below is the job output, not another envelope.
const requestOptions = { timeout: 15_000, suppressToast: true };

export const cronService = {
  listJobs(search?: string): Promise<CronJobItem[]> {
    return apiClient.get<never, CronJobItem[]>("/cron/jobs", {
      params: search ? { search } : undefined,
      ...requestOptions,
    });
  },
  triggerJob(jobName: CronJobName, payload: TriggerCronJobPayload): Promise<CronJobExecutionResult> {
    return apiClient.post<never, CronJobExecutionResult>(
      `/cron/jobs/${encodeURIComponent(jobName)}/trigger`, payload,
      { ...requestOptions, timeout: 60_000 },
    );
  },
  toggleJob(jobName: CronJobName): Promise<ToggleCronJobResult> {
    return apiClient.patch<never, ToggleCronJobResult>(
      `/cron/jobs/${encodeURIComponent(jobName)}/toggle`, undefined,
      requestOptions,
    );
  },
};
