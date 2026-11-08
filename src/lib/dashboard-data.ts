import type { IncidentItem } from "@/types";
import type {
  DashboardAnalytics,
  DashboardCameraStat,
  DashboardCollection,
  DashboardPage,
  DashboardPeriod,
  DashboardPreset,
  DashboardSeverity,
} from "@/types/dashboard.types";

export const DASHBOARD_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const DASHBOARD_MAX_RECORDS = 5000;
const DAY_MS = 86_400_000;
const vnDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const vnHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

export function vietnamToday(now = new Date()): string {
  const parts = vnDate.formatToParts(now);
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join("-");
}
export function addCalendarDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function dashboardPeriod(
  preset: DashboardPreset,
  today: string,
  customStart = today,
  customEnd = today,
): DashboardPeriod | null {
  const endDate = preset === "custom" ? customEnd : today;
  const startDate =
    preset === "custom"
      ? customStart
      : preset === "7d"
        ? addCalendarDays(today, -6)
        : preset === "month"
          ? `${today.slice(0, 7)}-01`
          : today;
  if (
    !validDate(startDate) ||
    !validDate(endDate) ||
    startDate > endDate ||
    endDate > today ||
    (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS >= 90
  )
    return null;
  const fromDate = new Date(`${startDate}T00:00:00+07:00`).toISOString();
  const endExclusive = new Date(
    `${addCalendarDays(endDate, 1)}T00:00:00+07:00`,
  ).toISOString();
  return {
    startDate,
    endDate,
    fromDate,
    endExclusive,
    toDate: new Date(Date.parse(endExclusive) - 1).toISOString(),
  };
}

export function pageTotal<T>(
  page: DashboardPage<T>,
  expectedPage: number,
  limit: number,
): number | null {
  const meta = page.meta;
  if (
    !meta ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0 ||
    meta.page !== expectedPage ||
    meta.limit !== limit ||
    meta.totalPages !== Math.ceil(meta.total / limit)
  )
    return null;
  return meta.total;
}

/** Bounded pagination: partial collections never become aggregate input. */
export async function collectDashboardPages<T extends { id: string }>(
  fetchPage: (page: number, limit: number) => Promise<DashboardPage<T>>,
  options: {
    signal?: AbortSignal;
    maxRecords?: number;
    accept?: (item: T) => boolean;
  } = {},
): Promise<DashboardCollection<T>> {
  const {
    signal,
    maxRecords = DASHBOARD_MAX_RECORDS,
    accept = () => true,
  } = options;
  const limit = 100;
  signal?.throwIfAborted();
  const first = await fetchPage(1, limit);
  const total = pageTotal(first, 1, limit);
  const incomplete = (
    issue: DashboardCollection<T>["issue"],
  ): DashboardCollection<T> => ({ items: [], total, complete: false, issue });
  if (total === null) return incomplete("metadata");
  if (total > maxRecords) return incomplete("limit");
  const pages = [first];
  for (let page = 2; page <= first.meta!.totalPages; page += 3) {
    signal?.throwIfAborted();
    try {
      const batch = await Promise.all(
        Array.from(
          { length: Math.min(3, first.meta!.totalPages - page + 1) },
          (_, index) => fetchPage(page + index, limit),
        ),
      );
      signal?.throwIfAborted();
      for (let index = 0; index < batch.length; index++) {
        const nextTotal = pageTotal(batch[index], page + index, limit);
        if (nextTotal === null) return incomplete("metadata");
        if (nextTotal !== total) return incomplete("changed");
      }
      pages.push(...batch);
    } catch (error) {
      signal?.throwIfAborted();
      // Authorization failures must not be disguised as a partial success.
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error.status === 401 || error.status === 403)
      )
        throw error;
      return incomplete("page-error");
    }
  }
  const items = pages.flatMap((page) => page.items);
  const unique = new Map(items.map((item) => [item.id, item]));
  if (items.some((item) => !item.id || !accept(item)))
    return incomplete("invalid-record");
  if (unique.size !== total || items.length !== total)
    return incomplete("changed");
  return { items: [...unique.values()], total, complete: true, issue: null };
}

export function incidentInPeriod(
  item: IncidentItem,
  period: DashboardPeriod,
  siteId?: string | null,
): boolean {
  const time = Date.parse(item.detectedAt);
  return (
    Number.isFinite(time) &&
    time >= Date.parse(period.fromDate) &&
    time < Date.parse(period.endExclusive) &&
    (!siteId || item.siteId === siteId)
  );
}

export function aggregateDashboard(
  incidents: readonly IncidentItem[],
): DashboardAnalytics {
  const distribution = new Map<string, number>(
    ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "MULTI_VIOLATION", "OTHER"].map(
      (key) => [key, 0],
    ),
  );
  const hours = Array<number>(24).fill(0);
  const severities = new Map<string, DashboardSeverity>(
    ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OTHER"].map((key) => [
      key,
      {
        key,
        count: 0,
        pending: 0,
        confirmed: 0,
        resolved: 0,
        dismissed: 0,
        other: 0,
        mttrMinutes: null,
        resolutionSamples: 0,
      },
    ]),
  );
  const cameras = new Map<string, DashboardCameraStat>();
  const durations = new Map<string, number>();
  let reviewed = 0;
  let dismissed = 0;
  for (const item of incidents) {
    const type = distribution.has(item.violationType)
      ? item.violationType
      : "OTHER";
    distribution.set(type, distribution.get(type)! + 1);
    hours[Number(vnHour.format(new Date(item.detectedAt)))]++;
    const severity = severities.get(item.severity) ?? severities.get("OTHER")!;
    severity.count++;
    if (item.status === "PENDING_REVIEW") severity.pending++;
    else if (item.status === "CONFIRMED") {
      severity.confirmed++;
      reviewed++;
    } else if (item.status === "DISMISSED") {
      severity.dismissed++;
      dismissed++;
      reviewed++;
    } else if (item.status === "RESOLVED" || item.status === "CLOSED") {
      severity.resolved++;
      reviewed++;
      const minutes =
        (Date.parse(item.resolvedAt ?? "") - Date.parse(item.detectedAt)) /
        60_000;
      if (Number.isFinite(minutes) && minutes >= 0) {
        severity.resolutionSamples++;
        durations.set(
          severity.key,
          (durations.get(severity.key) ?? 0) + minutes,
        );
      }
    } else severity.other++;
    const cameraId = item.cameraId || "OTHER";
    const camera = cameras.get(cameraId) ?? {
      cameraId,
      cameraName: item.cameraName,
      total: 0,
      pending: 0,
    };
    camera.total++;
    if (item.status === "PENDING_REVIEW" || item.status === "CONFIRMED")
      camera.pending++;
    cameras.set(cameraId, camera);
  }
  const rows = [...severities.values()].filter(
    (item) => item.key !== "OTHER" || item.count > 0,
  );
  rows.forEach((item) => {
    item.mttrMinutes = item.resolutionSamples
      ? durations.get(item.key)! / item.resolutionSamples
      : null;
  });
  const resolutionSamples = rows.reduce(
    (sum, row) => sum + row.resolutionSamples,
    0,
  );
  const minutes = [...durations.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  return {
    total: incidents.length,
    dismissed,
    reviewed,
    dismissedRate: reviewed ? (dismissed / reviewed) * 100 : null,
    distribution: [...distribution]
      .map(([key, count]) => ({ key, count }))
      .filter((item) => item.key !== "OTHER" || item.count > 0),
    hours,
    shifts: {
      morning: hours.slice(6, 14).reduce((a, b) => a + b, 0),
      afternoon: hours.slice(14, 22).reduce((a, b) => a + b, 0),
      night: [...hours.slice(22), ...hours.slice(0, 6)].reduce(
        (a, b) => a + b,
        0,
      ),
    },
    severities: rows,
    cameras: [...cameras.values()].sort(
      (a, b) => b.total - a.total || a.cameraId.localeCompare(b.cameraId),
    ),
    mttrMinutes: resolutionSamples ? minutes / resolutionSamples : null,
    resolutionSamples,
  };
}

export function dashboardIncidentHref(
  siteId?: string | null,
  period?: DashboardPeriod | null,
  status?: string,
): string {
  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  else params.set("siteId", ""); // An explicit all-sites selection must not inherit an old global site.
  if (period) {
    params.set("fromDate", period.fromDate);
    params.set("toDate", period.toDate);
  }
  if (status) params.set("status", status);
  return `/incidents?${params}`;
}
