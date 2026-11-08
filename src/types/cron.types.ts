export type CronJobName =
  | "cleanup-audit-logs"
  | "cleanup-unconfirmed-uploads"
  | "cleanup-expired-tokens"
  | "daily-summary-digest"
  | "weekly-summary-digest";

export interface CronJobItem {
  name: CronJobName;
  cron: string;
  description: string;
  isEnabled: boolean;
  lastStatus?: string;
  lastRun?: string;
  nextRun?: string;
}

export interface TriggerCronJobPayload {
  params: { retentionDays?: number; maxAgeHours?: number };
}

export interface CronJobExecutionResult {
  jobName: CronJobName;
  success: boolean;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ToggleCronJobResult {
  jobName: CronJobName;
  isEnabled: boolean;
}

export type CronScheduleFilter = "all" | "enabled" | "disabled";
