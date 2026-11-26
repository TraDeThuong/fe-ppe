export type CronJobName =
  | "cleanup-audit-logs"
  | "cleanup-unconfirmed-uploads"
  | "cleanup-expired-tokens"
  | "daily-summary-digest"
  | "weekly-summary-digest";

export type CronJobScheduleDto =
  | { frequency: "HOURLY"; everyHours: number; minute: number }
  | { frequency: "DAILY"; hour: number; minute: number }
  | { frequency: "WEEKLY"; dayOfWeek: number; hour: number; minute: number }
  | { frequency: "MONTHLY"; dayOfMonth: number; hour: number; minute: number };

export interface CronJobDefaultParamsDto {
  retentionDays?: number;
  maxAgeHours?: number;
}

export interface UpdateCronJobPayload {
  schedule?: CronJobScheduleDto;
  description?: string;
  isEnabled?: boolean;
  defaultParams?: CronJobDefaultParamsDto;
}

export interface CronJobItem {
  name: CronJobName;
  cron: string;
  description: string;
  isEnabled: boolean;
  schedule?: CronJobScheduleDto;
  scheduleLabel?: string;
  defaultParams?: CronJobDefaultParamsDto;
  lastStatus?: string;
  lastRun?: string;
  nextRun?: string;
}

export interface TriggerCronJobPayload {
  params: CronJobDefaultParamsDto;
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

export interface CronScheduleConflict {
  hasConflict: boolean;
  conflictingJobNames: CronJobName[];
  description: string;
}

export interface NextRunCalculation {
  date: Date | null;
  formatted: string;
  relativeTime: string;
  isPaused: boolean;
}

export interface RecentExecutionState {
  timestamp: string;
  success: boolean;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
  triggerType?: "SCHEDULED" | "MANUAL";
  fromAuditLog?: boolean;
}

