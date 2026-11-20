import type { CameraStatDto, HourlyRiskItemDto, IncidentItem, ReportGenerationDto, ShiftRiskSummaryDto, TrendItemDto } from "@/types";
import type { DashboardCollection, DashboardPage, DashboardPeriod } from "@/types/dashboard.types";
import { addCalendarDays, collectDashboardPages, dashboardPeriod, incidentInPeriod, vietnamToday } from "./dashboard-data";

export type AnalyticsGroupBy = "DAY" | "WEEK" | "MONTH";
export type IncidentOutcome = "pending" | "confirmed" | "resolved" | "dismissed" | "unknown";
export type AnalyticsIssue = DashboardCollection<IncidentItem>["issue"] | "closed-limit" | "closed-history" | "detail-error";
export interface AnalyticsCollection extends Omit<DashboardCollection<IncidentItem>, "issue"> {
  issue: AnalyticsIssue;
}
export interface AnalyticsSeverity {
  key: string;
  count: number;
  resolved: number;
  targetSlaMinutes: number | null;
  actualMttrMinutes: number | null;
  resolutionSamples: number;
}
export interface SiteAnalytics {
  totalIncidents: number;
  trueViolations: number;
  pending: number;
  confirmed: number;
  resolved: number;
  dismissed: number;
  unknown: number;
  confirmedRate: number | null;
  falseAlarmRate: number | null;
  mttrMinutes: number | null;
  resolutionSamples: number;
  severityRows: AnalyticsSeverity[];
  distribution: { type: string; count: number; percentage: number }[];
  trends: TrendItemDto[];
  cameras: CameraStatDto[];
}
export interface SiteHourlyRisk {
  hourly: HourlyRiskItemDto[];
  shifts: Record<"morning" | "afternoon" | "night", ShiftRiskSummaryDto>;
  total: number;
  peakHour: number | null;
  peakShift: "morning" | "afternoon" | "night" | null;
}

export function analyticsPeriod(start: string, end: string, today = vietnamToday()) {
  return dashboardPeriod("custom", today, start, end);
}

export function analyticsPreset(days: 7 | 30 | 90, today = vietnamToday()) {
  return { startDate: addCalendarDays(today, 1 - days), endDate: today };
}

/** CLOSED is a workflow endpoint for both resolved violations and false alarms. */
export function incidentOutcome(item: IncidentItem): IncidentOutcome {
  if (item.status === "PENDING_REVIEW") return "pending";
  if (item.status === "CONFIRMED") return "confirmed";
  if (item.status === "RESOLVED") return "resolved";
  if (item.status === "DISMISSED") return "dismissed";
  if (item.status !== "CLOSED") return "unknown";
  const transitions = (item.statusHistory ?? [])
    .filter((row) => row.newStatus === "CLOSED" && Number.isFinite(Date.parse(row.changedAt)))
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt));
  if (transitions[0]?.oldStatus === "RESOLVED") return "resolved";
  if (transitions[0]?.oldStatus === "DISMISSED") return "dismissed";
  return "unknown";
}

export function isAccessError(error: unknown): boolean {
  return !!error && typeof error === "object" && "status" in error &&
    (error.status === 401 || error.status === 403);
}

export function canAccessSiteReport(
  report: ReportGenerationDto,
  user: { id: string; role: string } | null,
  canExport: boolean,
  siteId: string,
): boolean {
  return canExport && report.siteId === siteId && report.status === "COMPLETED" && !!user?.id &&
    (user.role === "ADMIN" || (!!report.generatedBy && report.generatedBy === user.id));
}

/** All requests are bounded; incomplete or changing input never becomes an aggregate. */
export async function collectAnalyticsIncidents(
  fetchPage: (page: number, limit: number) => Promise<DashboardPage<IncidentItem>>,
  fetchDetail: (id: string) => Promise<IncidentItem>,
  period: DashboardPeriod,
  siteId: string,
  signal?: AbortSignal,
): Promise<AnalyticsCollection> {
  const collected = await collectDashboardPages(fetchPage, {
    signal,
    accept: (item) => incidentInPeriod(item, period, siteId),
  });
  if (!collected.complete) return collected;
  const closed = collected.items.filter((item) => item.status === "CLOSED");
  const incomplete = (issue: AnalyticsIssue): AnalyticsCollection => ({
    items: [], total: collected.total, complete: false, issue,
  });
  if (closed.length > 200) return incomplete("closed-limit");
  const details = new Map<string, IncidentItem>();
  for (let index = 0; index < closed.length; index += 3) {
    signal?.throwIfAborted();
    let batch: IncidentItem[];
    try {
      batch = await Promise.all(closed.slice(index, index + 3).map((item) => fetchDetail(item.id)));
    } catch (error) {
      signal?.throwIfAborted();
      if (isAccessError(error)) throw error;
      return incomplete("detail-error");
    }
    signal?.throwIfAborted();
    for (const [offset, detail] of batch.entries()) {
      const original = closed[index + offset];
      if (detail.id !== original.id || !incidentInPeriod(detail, period, siteId) ||
        detail.status !== original.status || detail.detectedAt !== original.detectedAt ||
        detail.cameraId !== original.cameraId || detail.violationType !== original.violationType ||
        detail.severity !== original.severity || detail.resolvedAt !== original.resolvedAt) {
        return incomplete("changed");
      }
      if (incidentOutcome(detail) === "unknown") return incomplete("closed-history");
      details.set(detail.id, detail);
    }
  }
  signal?.throwIfAborted();
  return { ...collected, items: collected.items.map((item) => details.get(item.id) ?? item) };
}

function bucketKey(day: string, groupBy: AnalyticsGroupBy): string {
  if (groupBy === "DAY") return day;
  if (groupBy === "MONTH") return day.slice(0, 7);
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function aggregateSiteAnalytics(
  items: readonly IncidentItem[], period: DashboardPeriod, groupBy: AnalyticsGroupBy,
): SiteAnalytics {
  const trends = new Map<string, TrendItemDto>();
  for (let day = period.startDate; day <= period.endDate; day = addCalendarDays(day, 1)) {
    const date = bucketKey(day, groupBy);
    trends.set(date, { date, totalIncidents: 0, trueViolations: 0, falseAlarms: 0, resolvedCount: 0 });
  }
  const severities = new Map<string, AnalyticsSeverity>(
    ([["CRITICAL", 15], ["HIGH", 30], ["MEDIUM", 60], ["LOW", 120], ["OTHER", null]] as const)
      .map(([key, targetSlaMinutes]) => [key, { key, targetSlaMinutes, count: 0, resolved: 0, actualMttrMinutes: null, resolutionSamples: 0 }]),
  );
  const durations = new Map<string, number>();
  const distribution = new Map<string, number>();
  const cameras = new Map<string, CameraStatDto>();
  const counts = { pending: 0, confirmed: 0, resolved: 0, dismissed: 0, unknown: 0 };
  for (const item of items) {
    const outcome = incidentOutcome(item);
    counts[outcome]++;
    const trend = trends.get(bucketKey(vietnamToday(new Date(item.detectedAt)), groupBy))!;
    trend.totalIncidents++;
    if (outcome === "dismissed") trend.falseAlarms++;
    if (outcome !== "confirmed" && outcome !== "resolved") continue;
    trend.trueViolations++;
    if (outcome === "resolved") trend.resolvedCount++;
    const knownTypes = ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "MULTI_VIOLATION"];
    const type = knownTypes.includes(item.violationType) ? item.violationType : "OTHER";
    distribution.set(type, (distribution.get(type) ?? 0) + 1);
    const severity = severities.get(item.severity === "NORMAL" ? "MEDIUM" : item.severity) ?? severities.get("OTHER")!;
    severity.count++;
    if (outcome === "resolved") {
      severity.resolved++;
      const minutes = (Date.parse(item.resolvedAt ?? "") - Date.parse(item.detectedAt)) / 60_000;
      if (Number.isFinite(minutes) && minutes >= 0) {
        severity.resolutionSamples++;
        durations.set(severity.key, (durations.get(severity.key) ?? 0) + minutes);
      }
    }
    const cameraId = item.cameraId || "UNKNOWN";
    const camera = cameras.get(cameraId) ?? { cameraId, cameraName: item.cameraName, totalViolations: 0, confirmedCount: 0, falseAlarmCount: 0, resolvedCount: 0 };
    camera.totalViolations++;
    camera.confirmedCount++;
    if (outcome === "resolved") camera.resolvedCount++;
    cameras.set(cameraId, camera);
  }
  for (const row of severities.values()) {
    if (row.resolutionSamples) row.actualMttrMinutes = durations.get(row.key)! / row.resolutionSamples;
  }
  const resolutionSamples = [...severities.values()].reduce((sum, row) => sum + row.resolutionSamples, 0);
  const trueViolations = counts.confirmed + counts.resolved;
  const reviewed = trueViolations + counts.dismissed;
  return {
    totalIncidents: items.length, trueViolations, ...counts,
    confirmedRate: items.length ? trueViolations / items.length * 100 : null,
    falseAlarmRate: reviewed ? counts.dismissed / reviewed * 100 : null,
    mttrMinutes: resolutionSamples ? [...durations.values()].reduce((a, b) => a + b, 0) / resolutionSamples : null,
    resolutionSamples,
    severityRows: [...severities.values()].filter((row) => row.key !== "OTHER" || row.count > 0),
    distribution: [...distribution].sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => ({ type, count, percentage: count / trueViolations * 100 })),
    trends: [...trends.values()],
    cameras: [...cameras.values()].sort((a, b) => b.totalViolations - a.totalViolations || a.cameraId.localeCompare(b.cameraId)),
  };
}

const vnHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hourCycle: "h23" });

export function aggregateSiteHourlyRisk(items: readonly IncidentItem[]): SiteHourlyRisk {
  const hourly: HourlyRiskItemDto[] = Array.from({ length: 24 }, (_, hour) => ({
    hour, label: `${String(hour).padStart(2, "0")}:00`, count: 0, riskLevel: "LOW",
    shift: hour >= 6 && hour < 14 ? "MORNING" : hour >= 14 && hour < 22 ? "AFTERNOON" : "NIGHT",
    severityBreakdown: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
  }));
  for (const item of items) {
    if (!["confirmed", "resolved"].includes(incidentOutcome(item))) continue;
    const hour = hourly[Number(vnHour.format(new Date(item.detectedAt)))];
    hour.count++;
    const severity = item.severity === "CRITICAL" ? "CRITICAL" : item.severity === "HIGH" ? "HIGH" :
      item.severity === "MEDIUM" || item.severity === "NORMAL" ? "MEDIUM" : "LOW";
    hour.severityBreakdown[severity]++;
  }
  for (const hour of hourly) {
    const s = hour.severityBreakdown;
    hour.riskLevel = s.CRITICAL ? "CRITICAL" : s.HIGH ? "HIGH" : s.MEDIUM || hour.count >= 3 ? "MEDIUM" : "LOW";
  }
  const shift = (name: string, timeRange: string, code: HourlyRiskItemDto["shift"]): ShiftRiskSummaryDto => {
    const hours = hourly.filter((hour) => hour.shift === code);
    const totalIncidents = hours.reduce((sum, hour) => sum + hour.count, 0);
    const sum = (severity: keyof HourlyRiskItemDto["severityBreakdown"]) => hours.reduce((n, h) => n + h.severityBreakdown[severity], 0);
    const criticalCount = sum("CRITICAL"), highCount = sum("HIGH"), mediumCount = sum("MEDIUM"), lowCount = sum("LOW");
    const riskLevel = criticalCount || highCount >= 3 ? "CRITICAL" : highCount || mediumCount >= 3 ? "HIGH" : mediumCount || totalIncidents >= 2 ? "MEDIUM" : "LOW";
    return { name, timeRange, totalIncidents, criticalCount, highCount, mediumCount, lowCount, riskLevel };
  };
  const shifts = {
    morning: shift("MORNING", "06:00–14:00", "MORNING"),
    afternoon: shift("AFTERNOON", "14:00–22:00", "AFTERNOON"),
    night: shift("NIGHT", "00:00–06:00 · 22:00–24:00", "NIGHT"),
  };
  const total = hourly.reduce((sum, hour) => sum + hour.count, 0);
  const peakHour = total ? hourly.reduce((a, b) => b.count > a.count ? b : a).hour : null;
  const keys = ["morning", "afternoon", "night"] as const;
  const peakShift = total ? keys.reduce((a, b) => shifts[b].totalIncidents > shifts[a].totalIncidents ? b : a) : null;
  return { hourly, shifts, total, peakHour, peakShift };
}
