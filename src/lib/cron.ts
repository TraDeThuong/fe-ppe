import type { CronJobItem, CronJobName, CronScheduleFilter, TriggerCronJobPayload } from "@/types/cron.types";

export const CRON_TIMEZONE = "Asia/Ho_Chi_Minh";

export function getCronParameter(jobName: CronJobName) {
  if (jobName === "cleanup-audit-logs") {
    return { name: "retentionDays", min: 30, max: 3650, defaultValue: 30 } as const;
  }
  if (jobName === "cleanup-unconfirmed-uploads") {
    return { name: "maxAgeHours", min: 1, max: 720, defaultValue: 24 } as const;
  }
  return null;
}

/** Empty values must never coerce to zero or silently use the cleanup default. */
export function buildCronPayload(jobName: CronJobName, value: string): TriggerCronJobPayload | null {
  const field = getCronParameter(jobName);
  if (!field) return { params: {} };
  if (!/^\d+$/.test(value.trim())) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < field.min || number > field.max) return null;
  return { params: { [field.name]: number } };
}

export function filterCronJobs(jobs: CronJobItem[], search: string, filter: CronScheduleFilter) {
  const term = search.trim().toLocaleLowerCase();
  return jobs.filter((job) =>
    (!term || `${job.name} ${job.description}`.toLocaleLowerCase().includes(term)) &&
    (filter === "all" || job.isEnabled === (filter === "enabled")),
  );
}

// Decode only expressions we can accurately describe. Do not infer from the job
// name: a different expression returned by the API must remain visible as-is.
export function describeCronSchedule(cron: string, t: (key: string, params?: Record<string, string | number>) => string) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return t("cron.schedule.custom");
  const [minute, hour, day, month, weekday] = parts;
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour) || Number(minute) > 59 || Number(hour) > 23 || day !== "*" || month !== "*") {
    return t("cron.schedule.custom");
  }
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (weekday === "*") return t("cron.schedule.daily", { time });
  if (weekday === "1") return t("cron.schedule.monday", { time });
  return t("cron.schedule.custom");
}

export function canReadCron(status: string, permissions: readonly string[]) {
  return status === "authenticated" && permissions.includes("CRON_JOB_READ");
}
