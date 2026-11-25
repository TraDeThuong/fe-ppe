import {
  addCalendarDays,
  DASHBOARD_TIME_ZONE,
  vietnamToday,
} from "./dashboard-data";

export type IncidentPeriodMode =
  | "all"
  | "day"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface IncidentPeriodFilter {
  mode: IncidentPeriodMode;
  /** Mốc ngày (YYYY-MM-DD, giờ Việt Nam) dùng cho chế độ day / week / month / year */
  anchorDate: string;
  /** Ngày bắt đầu (YYYY-MM-DD) dùng cho chế độ custom */
  customStart: string;
  /** Ngày kết thúc (YYYY-MM-DD) dùng cho chế độ custom */
  customEnd: string;
}

export interface ResolvedIncidentPeriod {
  mode: IncidentPeriodMode;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  isValid: boolean;
}

const VALID_MODES: readonly IncidentPeriodMode[] = [
  "all",
  "day",
  "week",
  "month",
  "year",
  "custom",
];

const vnDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isValidCalendarDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

export function vietnamDateFromIso(iso?: string | null): string | null {
  if (!iso) return null;
  const trimmed = iso.trim();
  if (isValidCalendarDate(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const parts = vnDateFormatter.formatToParts(new Date(parsed));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

/** Tính khoảng 1 tuần (7 ngày kết thúc tại ngày mốc `dateStr`: dateStr - 6 → dateStr, đồng bộ Dashboard 7 ngày) */
export function getWeekBounds(dateStr: string): {
  startDate: string;
  endDate: string;
} {
  const startDate = addCalendarDays(dateStr, -6);
  return { startDate, endDate: dateStr };
}

/** Tính khoảng tháng (ngày 01 → ngày cuối tháng) chứa ngày `dateStr` */
export function getMonthBounds(dateStr: string): {
  startDate: string;
  endDate: string;
} {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const lastDay = daysInMonth(year, month);
  return {
    startDate: `${year}-${pad2(month)}-01`,
    endDate: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

/** Tính khoảng năm (01/01 → 31/12) chứa ngày `dateStr` */
export function getYearBounds(dateStr: string): {
  startDate: string;
  endDate: string;
} {
  const year = Number(dateStr.slice(0, 4));
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function createDefaultIncidentPeriodFilter(
  today = vietnamToday(),
): IncidentPeriodFilter {
  return {
    mode: "all",
    anchorDate: today,
    customStart: today,
    customEnd: today,
  };
}

export function shiftIncidentPeriodAnchor(
  mode: IncidentPeriodMode,
  anchorDate: string,
  delta: -1 | 1,
): string {
  if (!isValidCalendarDate(anchorDate)) return anchorDate;
  if (mode === "day") {
    return addCalendarDays(anchorDate, delta);
  }
  if (mode === "week") {
    return addCalendarDays(anchorDate, delta * 7);
  }
  if (mode === "month") {
    const year = Number(anchorDate.slice(0, 4));
    const month = Number(anchorDate.slice(5, 7));
    const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-01`;
  }
  if (mode === "year") {
    const year = Number(anchorDate.slice(0, 4));
    return `${year + delta}-01-01`;
  }
  return anchorDate;
}

export function resolveIncidentPeriod(
  filter: IncidentPeriodFilter,
): ResolvedIncidentPeriod {
  if (filter.mode === "all") {
    return { mode: "all", isValid: true };
  }

  let startDate: string | undefined;
  let endDate: string | undefined;

  if (filter.mode === "day") {
    if (!isValidCalendarDate(filter.anchorDate)) {
      return { mode: filter.mode, isValid: false };
    }
    startDate = filter.anchorDate;
    endDate = filter.anchorDate;
  } else if (filter.mode === "week") {
    if (!isValidCalendarDate(filter.anchorDate)) {
      return { mode: filter.mode, isValid: false };
    }
    ({ startDate, endDate } = getWeekBounds(filter.anchorDate));
  } else if (filter.mode === "month") {
    if (!isValidCalendarDate(filter.anchorDate)) {
      return { mode: filter.mode, isValid: false };
    }
    ({ startDate, endDate } = getMonthBounds(filter.anchorDate));
  } else if (filter.mode === "year") {
    if (!isValidCalendarDate(filter.anchorDate)) {
      return { mode: filter.mode, isValid: false };
    }
    ({ startDate, endDate } = getYearBounds(filter.anchorDate));
  } else {
    // custom
    const hasStart = Boolean(filter.customStart);
    const hasEnd = Boolean(filter.customEnd);
    if (!hasStart && !hasEnd) {
      return { mode: "custom", isValid: false };
    }
    if (hasStart && !isValidCalendarDate(filter.customStart)) {
      return { mode: "custom", isValid: false };
    }
    if (hasEnd && !isValidCalendarDate(filter.customEnd)) {
      return { mode: "custom", isValid: false };
    }
    if (hasStart && hasEnd && filter.customStart > filter.customEnd) {
      return {
        mode: "custom",
        startDate: filter.customStart,
        endDate: filter.customEnd,
        isValid: false,
      };
    }
    startDate = hasStart ? filter.customStart : undefined;
    endDate = hasEnd ? filter.customEnd : undefined;
  }

  const fromDate = startDate
    ? new Date(`${startDate}T00:00:00+07:00`).toISOString()
    : undefined;
  const toDate = endDate
    ? new Date(
        Date.parse(`${addCalendarDays(endDate, 1)}T00:00:00+07:00`) - 1,
      ).toISOString()
    : undefined;

  return {
    mode: filter.mode,
    startDate,
    endDate,
    fromDate,
    toDate,
    isValid: true,
  };
}

export function isIncidentPeriodCurrent(
  filter: IncidentPeriodFilter,
  today: string,
): boolean {
  if (!isValidCalendarDate(today) || !isValidCalendarDate(filter.anchorDate)) {
    return true;
  }
  if (filter.mode === "day") {
    return filter.anchorDate === today;
  }
  if (filter.mode === "week") {
    return (
      getWeekBounds(filter.anchorDate).endDate ===
      getWeekBounds(today).endDate
    );
  }
  if (filter.mode === "month") {
    return filter.anchorDate.slice(0, 7) === today.slice(0, 7);
  }
  if (filter.mode === "year") {
    return filter.anchorDate.slice(0, 4) === today.slice(0, 4);
  }
  return true;
}

export function parseIncidentPeriodFromUrl(
  params: {
    period?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
  },
  today?: string,
): IncidentPeriodFilter {
  const rawMode = params.period as IncidentPeriodMode | null | undefined;
  const explicitMode =
    rawMode && VALID_MODES.includes(rawMode) ? rawMode : null;
  const startDate = vietnamDateFromIso(params.fromDate);
  const endDate = vietnamDateFromIso(params.toDate);

  if (!startDate && !endDate) {
    return createDefaultIncidentPeriodFilter(today);
  }

  const fallbackAnchor = startDate || endDate || (today ?? vietnamToday());

  if (explicitMode && explicitMode !== "all") {
    if (explicitMode === "custom") {
      return {
        mode: "custom",
        anchorDate: fallbackAnchor,
        customStart: startDate || "",
        customEnd: endDate || "",
      };
    }
    const anchor =
      explicitMode === "week"
        ? endDate || startDate || fallbackAnchor
        : fallbackAnchor;
    return {
      mode: explicitMode,
      anchorDate: anchor,
      customStart: startDate || anchor,
      customEnd: endDate || anchor,
    };
  }

  // Không có `period` trên URL (vd: click từ Dashboard drilldown) → suy luận thông minh
  if (startDate && endDate) {
    if (startDate === endDate) {
      return {
        mode: "day",
        anchorDate: startDate,
        customStart: startDate,
        customEnd: endDate,
      };
    }
    const weekBounds = getWeekBounds(endDate);
    if (weekBounds.startDate === startDate && weekBounds.endDate === endDate) {
      return {
        mode: "week",
        anchorDate: endDate,
        customStart: startDate,
        customEnd: endDate,
      };
    }
    const monthBounds = getMonthBounds(startDate);
    if (
      monthBounds.startDate === startDate &&
      monthBounds.endDate === endDate
    ) {
      return {
        mode: "month",
        anchorDate: startDate,
        customStart: startDate,
        customEnd: endDate,
      };
    }
    const yearBounds = getYearBounds(startDate);
    if (yearBounds.startDate === startDate && yearBounds.endDate === endDate) {
      return {
        mode: "year",
        anchorDate: startDate,
        customStart: startDate,
        customEnd: endDate,
      };
    }
  }

  return {
    mode: "custom",
    anchorDate: fallbackAnchor,
    customStart: startDate || "",
    customEnd: endDate || "",
  };
}

function formatCalendarDateDisplay(dateStr: string, isVietnamese: boolean): string {
  if (!isValidCalendarDate(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split("-");
  return isVietnamese ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
}

export function formatIncidentPeriodLabel(
  resolved: ResolvedIncidentPeriod,
  locale: string,
): string {
  const isVietnamese = locale === "vi-VN";
  if (resolved.mode === "all") {
    return isVietnamese ? "Toàn thời gian" : "All time";
  }
  if (!resolved.isValid) {
    return isVietnamese ? "Khoảng thời gian chưa hợp lệ" : "Invalid date range";
  }
  if (resolved.mode === "day" && resolved.startDate) {
    return formatCalendarDateDisplay(resolved.startDate, isVietnamese);
  }
  if (resolved.mode === "month" && resolved.startDate) {
    const [year, month] = resolved.startDate.split("-");
    return isVietnamese ? `Tháng ${month}/${year}` : `${year}-${month}`;
  }
  if (resolved.mode === "year" && resolved.startDate) {
    const year = resolved.startDate.slice(0, 4);
    return isVietnamese ? `Năm ${year}` : `Year ${year}`;
  }
  const startText = resolved.startDate
    ? formatCalendarDateDisplay(resolved.startDate, isVietnamese)
    : "…";
  const endText = resolved.endDate
    ? formatCalendarDateDisplay(resolved.endDate, isVietnamese)
    : "…";
  return `${startText} → ${endText}`;
}

export function formatIncidentPeriodRangeSummary(
  resolved: ResolvedIncidentPeriod,
  locale: string,
): string | null {
  if (resolved.mode === "all" || !resolved.isValid) return null;
  if (!resolved.startDate && !resolved.endDate) return null;
  const isVietnamese = locale === "vi-VN";
  if (
    resolved.startDate &&
    resolved.endDate &&
    resolved.startDate === resolved.endDate
  ) {
    return `${formatCalendarDateDisplay(resolved.startDate, isVietnamese)} (00:00 – 23:59)`;
  }
  const startText = resolved.startDate
    ? formatCalendarDateDisplay(resolved.startDate, isVietnamese)
    : "…";
  const endText = resolved.endDate
    ? formatCalendarDateDisplay(resolved.endDate, isVietnamese)
    : "…";
  return `${startText} → ${endText}`;
}

export function filterItemsByDateRange<T>(
  items: readonly T[] | undefined,
  getTimestamp: (item: T) => string | Date | undefined | null,
  fromDate?: string,
  toDate?: string,
): T[] {
  if (!items || items.length === 0) return [];
  if (!fromDate && !toDate) return [...items];
  const fromMs = fromDate ? Date.parse(fromDate) : Number.NEGATIVE_INFINITY;
  const toMs = toDate ? Date.parse(toDate) : Number.POSITIVE_INFINITY;
  const hasValidFrom = Number.isFinite(fromMs);
  const hasValidTo = Number.isFinite(toMs);
  if (!hasValidFrom && !hasValidTo) return [...items];

  return items.filter((item) => {
    const raw = getTimestamp(item);
    if (!raw) return false;
    const ms = raw instanceof Date ? raw.getTime() : Date.parse(raw);
    if (!Number.isFinite(ms)) return false;
    if (hasValidFrom && ms < fromMs) return false;
    if (hasValidTo && ms > toMs) return false;
    return true;
  });
}
