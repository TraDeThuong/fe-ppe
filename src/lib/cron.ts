import type { AuditLogItem } from "@/types/audit.types";
import type {
  CronJobItem,
  CronJobName,
  CronScheduleConflict,
  CronScheduleFilter,
  NextRunCalculation,
  RecentExecutionState,
  TriggerCronJobPayload,
} from "@/types/cron.types";

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

// Decode only expressions we can accurately describe. Do not infer from the job
// name: a different expression returned by the API must remain visible as-is.
export function describeCronSchedule(
  cron: string,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return t("cron.schedule.custom");
  const [minute, hour, day, month, weekday] = parts;
  if (
    !/^\d+$/.test(minute) ||
    !/^\d+$/.test(hour) ||
    Number(minute) > 59 ||
    Number(hour) > 23 ||
    day !== "*" ||
    month !== "*"
  ) {
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

/**
 * Tính toán thời điểm chạy tiếp theo (Next Run) cho biểu thức cron 5 trường tiêu chuẩn.
 */
export function calculateNextRun(
  cron: string,
  isEnabled: boolean,
  now = new Date(),
  locale = "vi-VN"
): NextRunCalculation {
  if (!isEnabled) {
    return {
      date: null,
      formatted: locale === "vi-VN" ? "Lịch đang tắt" : "Schedule paused",
      relativeTime: locale === "vi-VN" ? "Tạm ngưng" : "Paused",
      isPaused: true,
    };
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      date: null,
      formatted: locale === "vi-VN" ? "Biểu thức tùy biến" : "Custom expression",
      relativeTime: "—",
      isPaused: false,
    };
  }

  const [minStr, hourStr, domStr, monStr, dowStr] = parts;
  if (!/^\d+$/.test(minStr) || !/^\d+$/.test(hourStr) || domStr !== "*" || monStr !== "*") {
    return {
      date: null,
      formatted: locale === "vi-VN" ? "Biểu thức tùy biến" : "Custom expression",
      relativeTime: "—",
      isPaused: false,
    };
  }

  const targetMinute = Number(minStr);
  const targetHour = Number(hourStr);
  if (targetMinute > 59 || targetHour > 23) {
    return {
      date: null,
      formatted: locale === "vi-VN" ? "Lỗi cú pháp cron" : "Invalid cron",
      relativeTime: "—",
      isPaused: false,
    };
  }

  const vn = getVietnamDateParts(now);

  let nextRunDate: Date;

  if (dowStr === "*") {
    // Hằng ngày vào targetHour:targetMinute
    const isPastToday =
      vn.hour > targetHour || (vn.hour === targetHour && vn.minute >= targetMinute);

    const dayOffset = isPastToday ? 1 : 0;
    const candidateVnDate = new Date(Date.UTC(vn.year, vn.month - 1, vn.day + dayOffset));
    nextRunDate = createDateFromVietnamParts(
      candidateVnDate.getUTCFullYear(),
      candidateVnDate.getUTCMonth() + 1,
      candidateVnDate.getUTCDate(),
      targetHour,
      targetMinute,
      0
    );
  } else if (/^\d+$/.test(dowStr)) {
    // Vào một thứ cụ thể trong tuần (0-6 hoặc 7=0)
    const targetDow = Number(dowStr) % 7;
    const currentDow = vn.dayOfWeek;

    let daysToAdd = 0;
    if (currentDow === targetDow) {
      const isPastToday =
        vn.hour > targetHour || (vn.hour === targetHour && vn.minute >= targetMinute);
      daysToAdd = isPastToday ? 7 : 0;
    } else {
      daysToAdd = (targetDow - currentDow + 7) % 7;
    }

    const candidateVnDate = new Date(Date.UTC(vn.year, vn.month - 1, vn.day + daysToAdd));
    nextRunDate = createDateFromVietnamParts(
      candidateVnDate.getUTCFullYear(),
      candidateVnDate.getUTCMonth() + 1,
      candidateVnDate.getUTCDate(),
      targetHour,
      targetMinute,
      0
    );
  } else {
    return {
      date: null,
      formatted: locale === "vi-VN" ? "Biểu thức tùy biến" : "Custom expression",
      relativeTime: "—",
      isPaused: false,
    };
  }

  // Định dạng ngày giờ hiển thị
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: CRON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(nextRunDate);

  // Định dạng thời gian đếm ngược tương đối
  const diffMs = nextRunDate.getTime() - now.getTime();
  let relativeTime = "";
  if (diffMs <= 0) {
    relativeTime = locale === "vi-VN" ? "Sắp diễn ra" : "Imminent";
  } else if (diffMs < 3600_000) {
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    relativeTime = locale === "vi-VN" ? `trong ${minutes} phút` : `in ${minutes}m`;
  } else if (diffMs < 86400_000) {
    const hours = Math.round(diffMs / 3600_000);
    relativeTime = locale === "vi-VN" ? `trong ${hours} giờ` : `in ${hours}h`;
  } else {
    const days = Math.round(diffMs / 86400_000);
    relativeTime = locale === "vi-VN" ? `trong ${days} ngày` : `in ${days}d`;
  }

  return {
    date: nextRunDate,
    formatted,
    relativeTime,
    isPaused: false,
  };
}

/**
 * Phát hiện xung đột lịch trình giữa các tác vụ định kỳ.
 * Nhận diện cụ thể: daily-summary-digest (0 8 * * *) và weekly-summary-digest (0 8 * * 1) cùng chạy lúc 08:00 sáng Thứ Hai.
 */
export function detectCronConflicts(
  jobName: CronJobName,
  allJobs: CronJobItem[],
  isVietnamese = true
): CronScheduleConflict {
  if (jobName === "daily-summary-digest") {
    const weeklyJob = allJobs.find((j) => j.name === "weekly-summary-digest");
    if (weeklyJob && weeklyJob.isEnabled) {
      return {
        hasConflict: true,
        conflictingJobNames: ["weekly-summary-digest"],
        description: isVietnamese
          ? "Trùng lịch với Báo cáo tuần vào lúc 08:00 Thứ Hai hằng tuần."
          : "Schedule collision with Weekly Digest at 08:00 every Monday.",
      };
    }
  }
  if (jobName === "weekly-summary-digest") {
    const dailyJob = allJobs.find((j) => j.name === "daily-summary-digest");
    if (dailyJob && dailyJob.isEnabled) {
      return {
        hasConflict: true,
        conflictingJobNames: ["daily-summary-digest"],
        description: isVietnamese
          ? "Trùng lịch với Báo cáo ngày vào lúc 08:00 Thứ Hai hằng tuần."
          : "Schedule collision with Daily Digest at 08:00 every Monday.",
      };
    }
  }
  return {
    hasConflict: false,
    conflictingJobNames: [],
    description: "",
  };
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
    const nextRun = calculateNextRun(job.cron, true, now, locale);
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
    if (item.targetType !== "CRON_JOB" || item.action === "TOGGLE_CRON_JOB") {
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
      fromAuditLog: true,
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
 * Merges historical audit executions with live in-session manual runs.
 */
export function mergeRecentExecutions(
  auditExecutions: Record<string, RecentExecutionState>,
  sessionExecutions: Record<string, RecentExecutionState>
): Record<string, RecentExecutionState> {
  const merged: Record<string, RecentExecutionState> = { ...auditExecutions };
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

function getExpectedCycleMs(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5 && /^\d+$/.test(parts[4])) {
    // Weekly schedule (+4h grace)
    return 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000;
  }
  // Daily schedule (+2h grace)
  return 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000;
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
  const isJustRan = hasValidLastTime && (!lastExec?.fromAuditLog || ageMs <= JUST_RAN_WINDOW_MS);

  if (lastExec && !lastExec.success) {
    return { state: "failed", shouldClickRun: true, isJustRan, priorityRank: 0 };
  }

  if (!job.isEnabled) {
    return { state: "paused", shouldClickRun: false, isJustRan, priorityRank: 3 };
  }

  if (hasValidLastTime) {
    if (ageMs > getExpectedCycleMs(job.cron)) {
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
