import type { AuditLogItem } from "@/types/audit.types";
import type {
  CronJobItem,
  CronJobName,
  CronJobScheduleDto,
  CronScheduleConflict,
  CronScheduleFilter,
  NextRunCalculation,
  RecentExecutionState,
  TriggerCronJobPayload,
  UpdateCronJobPayload,
} from "@/types/cron.types";

export const CRON_TIMEZONE = "Asia/Ho_Chi_Minh";
export const CRON_SCHEDULE_FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;

export function getCronParameter(jobName: CronJobName) {
  if (jobName === "cleanup-audit-logs") {
    return { name: "retentionDays", min: 30, max: 3650, defaultValue: 30 } as const;
  }
  if (jobName === "cleanup-unconfirmed-uploads") {
    return { name: "maxAgeHours", min: 1, max: 720, defaultValue: 24 } as const;
  }
  return null;
}

export function getCronParameterValue(job: CronJobItem): string {
  const field = getCronParameter(job.name);
  return field ? String(job.defaultParams?.[field.name] ?? field.defaultValue) : "";
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

/**
 * Lọc danh sách tác vụ định kỳ theo từ khóa (hỗ trợ cả tên kỹ thuật, mô tả, và tên tiếng Việt)
 * cùng bộ lọc trạng thái Bật/Tắt.
 */
export function filterCronJobs(
  jobs: CronJobItem[],
  search: string,
  filter: CronScheduleFilter,
  t?: (key: string) => string
) {
  const term = search.trim().toLocaleLowerCase();
  return jobs.filter((job) => {
    const localizedName = t ? t(`cron.jobs.${job.name}`).toLocaleLowerCase() : "";
    const matchesSearch =
      !term ||
      job.name.toLocaleLowerCase().includes(term) ||
      job.description.toLocaleLowerCase().includes(term) ||
      localizedName.includes(term);

    const matchesFilter =
      filter === "all" || job.isEnabled === (filter === "enabled");

    return matchesSearch && matchesFilter;
  });
}

function readCronInteger(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

// Accept only expressions that can be represented exactly by the schedule editor.
export function parseCronSchedule(cron: string): CronJobScheduleDto | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minuteField, hourField, day, month, weekday] = parts;
  const minute = readCronInteger(minuteField, 0, 59);
  if (minute === null || month !== "*") return null;

  if (day === "*" && weekday === "*" && hourField.startsWith("*/")) {
    const everyHours = readCronInteger(hourField.slice(2), 1, 23);
    return everyHours === null ? null : { frequency: "HOURLY", everyHours, minute };
  }

  const hour = readCronInteger(hourField, 0, 23);
  if (hour === null) return null;
  if (day === "*" && weekday === "*") return { frequency: "DAILY", hour, minute };
  if (day === "*") {
    const dayOfWeek = readCronInteger(weekday, 0, 7);
    return dayOfWeek === null ? null : { frequency: "WEEKLY", dayOfWeek: dayOfWeek % 7, hour, minute };
  }
  if (weekday === "*") {
    const dayOfMonth = readCronInteger(day, 1, 28);
    return dayOfMonth === null ? null : { frequency: "MONTHLY", dayOfMonth, hour, minute };
  }
  return null;
}

export function getCronJobSchedule(job: Pick<CronJobItem, "schedule" | "cron">) {
  return job.schedule ?? parseCronSchedule(job.cron);
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function formatClockPart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatCronSchedule(schedule: CronJobScheduleDto, t: Translate): string {
  const minute = formatClockPart(schedule.minute);
  if (schedule.frequency === "HOURLY") {
    return t("cron.schedule.hourly", { hours: schedule.everyHours, minute });
  }
  const time = formatClockPart(schedule.hour) + ":" + minute;
  switch (schedule.frequency) {
    case "DAILY":
      return t("cron.schedule.daily", { time });
    case "WEEKLY":
      return t("cron.schedule.weekly", { time, weekday: t("cron.schedule.weekday." + schedule.dayOfWeek) });
    case "MONTHLY":
      return t("cron.schedule.monthly", { time, day: schedule.dayOfMonth });
  }
}

export function getCronScheduleLabel(job: CronJobItem, t: Translate): string {
  if (job.scheduleLabel?.trim()) return job.scheduleLabel;
  const schedule = getCronJobSchedule(job);
  return schedule ? formatCronSchedule(schedule, t) : t("cron.schedule.custom");
}

export function getCronHourOptions(saved?: CronJobScheduleDto | null): number[] {
  const options = [1, 2, 4, 6, 8, 12];
  if (saved?.frequency === "HOURLY" && !options.includes(saved.everyHours)) {
    return [...options, saved.everyHours].sort((a, b) => a - b);
  }
  return options;
}

function isSameCronSchedule(current: CronJobScheduleDto | null, next: CronJobScheduleDto) {
  if (!current || current.minute !== next.minute) return false;
  if (next.frequency === "HOURLY") {
    return current.frequency === "HOURLY" && current.everyHours === next.everyHours;
  }
  if (current.frequency === "HOURLY" || current.hour !== next.hour) return false;
  switch (next.frequency) {
    case "DAILY":
      return current.frequency === "DAILY";
    case "WEEKLY":
      return current.frequency === "WEEKLY" && current.dayOfWeek === next.dayOfWeek;
    case "MONTHLY":
      return current.frequency === "MONTHLY" && current.dayOfMonth === next.dayOfMonth;
  }
}

export function getCronEditChanges(
  job: CronJobItem,
  schedule: CronJobScheduleDto | null,
  description: string,
  parameter: string,
) {
  const payload: UpdateCronJobPayload = {};
  const trimmedDescription = description.trim();
  const invalidDescription = trimmedDescription !== job.description.trim() &&
    (trimmedDescription.length === 0 || trimmedDescription.length > 500);
  const params = buildCronPayload(job.name, parameter)?.params;

  if (schedule && !isSameCronSchedule(getCronJobSchedule(job), schedule)) payload.schedule = schedule;
  if (!invalidDescription && trimmedDescription !== job.description.trim()) payload.description = trimmedDescription;

  const field = getCronParameter(job.name);
  if (field && params && params[field.name] !== Number(getCronParameterValue(job))) {
    payload.defaultParams = params;
  }

  return { payload, invalidDescription, invalidParameter: !params };
}

export function canReadCron(status: string, permissions: readonly string[]) {
  return status === "authenticated" && permissions.includes("CRON_JOB_READ");
}

/**
 * Trích xuất ngày giờ theo múi giờ Việt Nam (UTC+7, không có giờ mùa hè DST).
 */
export function getVietnamDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CRON_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = Number(p.value);
    }
  }
  const year = map.year ?? date.getUTCFullYear();
  const month = map.month ?? date.getUTCMonth() + 1;
  const day = map.day ?? date.getUTCDate();
  const hour = (map.hour === 24 ? 0 : map.hour) ?? 0;
  const minute = map.minute ?? 0;
  const second = map.second ?? 0;

  // Tạo Date UTC từ các thành phần VN để lấy chính xác thứ trong tuần (0 = Sun, 1 = Mon, ... 6 = Sat)
  const vnUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const dayOfWeek = vnUtc.getUTCDay();

  return { year, month, day, hour, minute, second, dayOfWeek };
}

/**
 * Chuyển đổi một thời điểm tính theo giờ Việt Nam thành đối tượng Date chuẩn (UTC timestamp)
 */
export function createDateFromVietnamParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
}

function runsAtHour(schedule: CronJobScheduleDto, hour: number) {
  return schedule.frequency === "HOURLY" ? hour % schedule.everyHours === 0 : hour === schedule.hour;
}

function nextDateFromSchedule(schedule: CronJobScheduleDto, now: Date): Date {
  const vn = getVietnamDateParts(now);
  const at = (day: number, hour: number, month = vn.month) =>
    createDateFromVietnamParts(vn.year, month, day, hour, schedule.minute);

  switch (schedule.frequency) {
    case "HOURLY":
      for (let hour = vn.hour; hour < 24; hour++) {
        if (!runsAtHour(schedule, hour)) continue;
        const candidate = at(vn.day, hour);
        if (candidate > now) return candidate;
      }
      return at(vn.day + 1, 0);
    case "DAILY": {
      const candidate = at(vn.day, schedule.hour);
      return candidate > now ? candidate : at(vn.day + 1, schedule.hour);
    }
    case "WEEKLY": {
      const day = vn.day + (schedule.dayOfWeek - vn.dayOfWeek + 7) % 7;
      const candidate = at(day, schedule.hour);
      return candidate > now ? candidate : at(day + 7, schedule.hour);
    }
    case "MONTHLY": {
      const candidate = at(schedule.dayOfMonth, schedule.hour);
      return candidate > now ? candidate : at(schedule.dayOfMonth, schedule.hour, vn.month + 1);
    }
  }
}

export function calculateNextRun(
  job: Pick<CronJobItem, "cron" | "schedule" | "isEnabled" | "nextRun">,
  now = new Date(),
  locale = "vi-VN",
): NextRunCalculation {
  const isVi = locale === "vi-VN";
  if (!job.isEnabled) {
    return {
      date: null,
      formatted: isVi ? "Lịch đang tắt" : "Schedule paused",
      relativeTime: isVi ? "Tạm ngưng" : "Paused",
      isPaused: true,
    };
  }

  const serverDate = job.nextRun ? new Date(job.nextRun) : null;
  const schedule = getCronJobSchedule(job);
  const nextRunDate = serverDate && serverDate > now
    ? serverDate
    : schedule && nextDateFromSchedule(schedule, now);

  if (!nextRunDate) {
    return {
      date: null,
      formatted: isVi ? "Biểu thức tùy biến" : "Custom expression",
      relativeTime: "—",
      isPaused: false,
    };
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: CRON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(nextRunDate);

  const diffMs = nextRunDate.getTime() - now.getTime();
  let relativeTime: string;
  if (diffMs < 3_600_000) {
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    relativeTime = isVi ? "trong " + minutes + " phút" : "in " + minutes + "m";
  } else if (diffMs < 86_400_000) {
    const hours = Math.round(diffMs / 3_600_000);
    relativeTime = isVi ? "trong " + hours + " giờ" : "in " + hours + "h";
  } else {
    const days = Math.round(diffMs / 86_400_000);
    relativeTime = isVi ? "trong " + days + " ngày" : "in " + days + "d";
  }

  return { date: nextRunDate, formatted, relativeTime, isPaused: false };
}

function schedulesOverlap(a: CronJobScheduleDto, b: CronJobScheduleDto): boolean {
  if (a.minute !== b.minute) return false;
  if (a.frequency === "WEEKLY" && b.frequency === "WEEKLY" && a.dayOfWeek !== b.dayOfWeek) return false;
  if (a.frequency === "MONTHLY" && b.frequency === "MONTHLY" && a.dayOfMonth !== b.dayOfMonth) return false;

  // A day of the month can fall on any weekday over the calendar cycle.
  for (let hour = 0; hour < 24; hour++) {
    if (runsAtHour(a, hour) && runsAtHour(b, hour)) return true;
  }
  return false;
}

export function detectCronConflicts(
  jobName: CronJobName,
  allJobs: CronJobItem[],
  t: Translate,
): CronScheduleConflict {
  const daily = "daily-summary-digest";
  const weekly = "weekly-summary-digest";
  if (jobName === daily || jobName === weekly) {
    const otherName = jobName === daily ? weekly : daily;
    const job = allJobs.find((item) => item.name === jobName);
    const other = allJobs.find((item) => item.name === otherName);
    if (job?.isEnabled && other?.isEnabled) {
      const schedule = getCronJobSchedule(job);
      const otherSchedule = getCronJobSchedule(other);
      if (schedule && otherSchedule && schedulesOverlap(schedule, otherSchedule)) {
        return {
          hasConflict: true,
          conflictingJobNames: [otherName],
          description: t("cron.schedule.conflict", { name: t("cron.jobs." + otherName) }),
        };
      }
    }
  }

  return { hasConflict: false, conflictingJobNames: [], description: "" };
}

/**
 * Finds the earliest upcoming enabled cron job based on `calculateNextRun`.
 */
export function findNextScheduledJob(
  jobs: CronJobItem[],
  now = new Date(),
  locale = "vi-VN"
): { job: CronJobItem; nextRun: NextRunCalculation } | null {
  let earliest: { job: CronJobItem; nextRun: NextRunCalculation } | null = null;
  for (const job of jobs) {
    if (!job.isEnabled) continue;
    const nextRun = calculateNextRun(job, now, locale);
    if (!nextRun.date) continue;
    if (!earliest || nextRun.date.getTime() < earliest.nextRun.date!.getTime()) {
      earliest = { job, nextRun };
    }
  }
  return earliest;
}

const KNOWN_CRON_JOBS = new Set<string>([
  "cleanup-audit-logs",
  "cleanup-unconfirmed-uploads",
  "cleanup-expired-tokens",
  "daily-summary-digest",
  "weekly-summary-digest",
]);

export function isCronExecutionAudit(item: Pick<AuditLogItem, "action">): boolean {
  return item.action !== "TOGGLE_CRON_JOB" && item.action !== "UPDATE_CRON_JOB";
}

/**
 * Derives the latest execution record per cron job from CRON_JOB audit logs.
 * Prefers `TRIGGER_CRON_JOB` entries when timestamps are within 2 seconds of a
 * domain log so `durationMs` and `actorId` are preserved.
 */
export function extractRecentCronExecutions(
  auditItems: AuditLogItem[]
): Record<string, RecentExecutionState> {
  const result: Record<string, RecentExecutionState> = {};

  for (const item of auditItems) {
    if (item.targetType !== "CRON_JOB" || !isCronExecutionAudit(item)) {
      continue;
    }
    const jobName = item.targetId;
    if (!jobName || !KNOWN_CRON_JOBS.has(jobName)) {
      continue;
    }

    const itemTime = new Date(item.createdAt).getTime();
    if (Number.isNaN(itemTime)) continue;

    const details = (item.details ?? {}) as Record<string, unknown>;
    const durationMs =
      typeof details.durationMs === "number" && Number.isFinite(details.durationMs)
        ? details.durationMs
        : 0;
    const resultData =
      details.result && typeof details.result === "object"
        ? (details.result as Record<string, unknown>)
        : details;

    const candidate: RecentExecutionState = {
      timestamp: item.createdAt,
      success: item.status !== "FAILED",
      durationMs,
      data: resultData,
      error: item.errorMessage ?? undefined,
      triggerType: item.actorId ? "MANUAL" : "SCHEDULED",
      source: "audit",
    };

    const existing = result[jobName];
    if (!existing) {
      result[jobName] = candidate;
      continue;
    }

    const existingTime = new Date(existing.timestamp).getTime();
    const isPairedTriggerRecord =
      item.action === "TRIGGER_CRON_JOB" &&
      Math.abs(itemTime - existingTime) <= 2000 &&
      existing.durationMs === 0;

    if (itemTime > existingTime + 2000 || isPairedTriggerRecord) {
      result[jobName] = candidate;
    }
  }

  return result;
}

/**
 * Merges backend-reported job executions (`lastRunAt` / `lastStatus` from `/cron/jobs`),
 * historical audit executions, and live in-session manual runs.
 */
export function mergeRecentExecutions(
  auditExecutions: Record<string, RecentExecutionState>,
  sessionExecutions: Record<string, RecentExecutionState>,
  jobs: readonly CronJobItem[] = [],
): Record<string, RecentExecutionState> {
  const merged: Record<string, RecentExecutionState> = { ...auditExecutions };

  for (const job of jobs) {
    if (job.lastStatus !== "SUCCESS" && job.lastStatus !== "FAILED") continue;
    const rawTime = job.lastRunAt ?? job.lastRun;
    if (!rawTime) continue;
    const jobTime = new Date(rawTime).getTime();
    if (Number.isNaN(jobTime)) continue;

    const existing = merged[job.name];
    const existingTime = existing ? new Date(existing.timestamp).getTime() : NaN;
    const success = job.lastStatus === "SUCCESS";
    if (
      !existing || Number.isNaN(existingTime) || jobTime > existingTime ||
      (jobTime === existingTime && success !== existing.success)
    ) {
      merged[job.name] = {
        timestamp: rawTime,
        success,
        durationMs: 0,
        source: "job",
      };
    }
  }

  for (const [jobName, sessionExec] of Object.entries(sessionExecutions)) {
    const existing = merged[jobName];
    if (!existing) {
      merged[jobName] = sessionExec;
      continue;
    }
    const existingTime = new Date(existing.timestamp).getTime();
    const sessionTime = new Date(sessionExec.timestamp).getTime();
    if (Number.isNaN(existingTime) || sessionTime >= existingTime) {
      merged[jobName] = sessionExec;
    }
  }
  return merged;
}

export type CronGuidanceState =
  | "failed"
  | "overdue"
  | "never_ran"
  | "paused"
  | "just_ran"
  | "healthy_idle"
  | "unknown";

export interface CronJobGuidance {
  state: CronGuidanceState;
  shouldClickRun: boolean;
  isJustRan: boolean;
  priorityRank: number;
}

const JUST_RAN_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

function getExpectedCycleMs(job: CronJobItem): number {
  const schedule = getCronJobSchedule(job);
  const hour = 3_600_000;
  switch (schedule?.frequency) {
    case "HOURLY":
      return (schedule.everyHours + 2) * hour;
    case "WEEKLY":
      return (7 * 24 + 4) * hour;
    case "MONTHLY":
      return (31 * 24 + 4) * hour;
    default:
      return 26 * hour;
  }
}

/**
 * Formats how long ago a cron execution ran in human-friendly relative text.
 */
export function formatCronRelativeAgo(
  timestamp: string,
  now = new Date(),
  locale = "vi-VN"
): string {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return "—";
  const diffMs = Math.max(0, now.getTime() - time);
  const isVi = locale === "vi-VN";

  if (diffMs < 60_000) {
    return isVi ? "Vừa xong" : "Just now";
  }
  if (diffMs < 3600_000) {
    const mins = Math.max(1, Math.round(diffMs / 60_000));
    return isVi ? `${mins} phút trước` : `${mins}m ago`;
  }
  if (diffMs < 86400_000) {
    const hours = Math.max(1, Math.round(diffMs / 3600_000));
    return isVi ? `${hours} giờ trước` : `${hours}h ago`;
  }
  const days = Math.max(1, Math.round(diffMs / 86400_000));
  return isVi ? `${days} ngày trước` : `${days}d ago`;
}

/**
 * Formats a concise human-readable outcome from verified cron execution result fields.
 */
export function formatCronOutcomeSummary(
  jobName: CronJobName,
  data?: Record<string, unknown>,
  locale = "vi-VN"
): string | null {
  if (!data || typeof data !== "object") return null;
  const isVi = locale === "vi-VN";

  if (jobName === "cleanup-audit-logs" && typeof data.deletedCount === "number") {
    return isVi
      ? `Đã xóa ${data.deletedCount} nhật ký cũ`
      : `Deleted ${data.deletedCount} old log(s)`;
  }
  if (
    jobName === "cleanup-unconfirmed-uploads" &&
    typeof data.scannedCount === "number" &&
    typeof data.deletedCount === "number"
  ) {
    return isVi
      ? `Quét ${data.scannedCount} tệp · xóa ${data.deletedCount} tệp rác`
      : `Scanned ${data.scannedCount} · deleted ${data.deletedCount}`;
  }
  if (jobName === "cleanup-expired-tokens" && typeof data.totalDeleted === "number") {
    return isVi
      ? `Đã dọn ${data.totalDeleted} token/outbox`
      : `Cleaned ${data.totalDeleted} token(s)`;
  }
  if (
    (jobName === "daily-summary-digest" || jobName === "weekly-summary-digest") &&
    typeof data.recipientCount === "number"
  ) {
    return isVi
      ? `Tổng hợp cho ${data.recipientCount} quản trị viên`
      : `Compiled for ${data.recipientCount} admin(s)`;
  }
  return null;
}

/**
 * Evaluates a cron job using its schedule state and execution history to tell
 * operators which job just ran, which needs a manual run click, and which is healthy.
 */
export function assessCronJobGuidance(
  job: CronJobItem,
  lastExec: RecentExecutionState | undefined,
  options: { auditAvailable: boolean; now?: Date }
): CronJobGuidance {
  const now = options.now ?? new Date();
  const lastTime = lastExec ? new Date(lastExec.timestamp).getTime() : NaN;
  const hasValidLastTime = Boolean(lastExec) && !Number.isNaN(lastTime);
  const ageMs = hasValidLastTime ? Math.max(0, now.getTime() - lastTime) : Infinity;
  const isJustRan = hasValidLastTime && (!lastExec?.source || ageMs <= JUST_RAN_WINDOW_MS);

  if (lastExec && !lastExec.success) {
    return { state: "failed", shouldClickRun: true, isJustRan, priorityRank: 0 };
  }

  if (!job.isEnabled) {
    return { state: "paused", shouldClickRun: false, isJustRan, priorityRank: 3 };
  }

  if (hasValidLastTime) {
    if (ageMs > getExpectedCycleMs(job)) {
      return { state: "overdue", shouldClickRun: true, isJustRan: false, priorityRank: 1 };
    }
    if (isJustRan) {
      return { state: "just_ran", shouldClickRun: false, isJustRan: true, priorityRank: 4 };
    }
    return { state: "healthy_idle", shouldClickRun: false, isJustRan: false, priorityRank: 5 };
  }

  if (options.auditAvailable) {
    return { state: "never_ran", shouldClickRun: true, isJustRan: false, priorityRank: 2 };
  }

  return { state: "unknown", shouldClickRun: false, isJustRan: false, priorityRank: 6 };
}
