import type {
  CronJobItem,
  CronJobName,
  CronScheduleConflict,
  CronScheduleFilter,
  NextRunCalculation,
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
