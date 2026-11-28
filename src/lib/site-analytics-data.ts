import type {
  CameraStatDto,
  HourlyRiskItemDto,
  HourlyRiskResponseDto,
  IncidentItem,
  ReportGenerationDto,
  ShiftRiskSummaryDto,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";
import {
  falseAlarmRate as computeFalseAlarmRate,
  incidentOutcomeOf,
  outcomeCountsFromSummary,
  trueViolationCount,
} from "@/lib/metrics/incident-metrics";
import type { DashboardCollection, DashboardPeriod } from "@/types/dashboard.types";
import { addCalendarDays, dashboardPeriod, vietnamToday } from "./dashboard-data";
import {
  clusterIncidentsByPerson,
  projectClusterToRepresentativeIncident,
  type IncidentAggregationMode,
} from "./incident-cluster-engine";

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
  rawTotalIncidents: number;
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
  return incidentOutcomeOf(item);
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

function bucketKey(day: string, groupBy: AnalyticsGroupBy): string {
  if (groupBy === "DAY") return day;
  if (groupBy === "MONTH") return day.slice(0, 7);
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Chuẩn hóa số liệu phân tích của công trường trực tiếp từ các API `/api/v1/statistics/*`
 * (loại bỏ hoàn toàn việc quét toàn bộ trang incidents và +200 calls GET /incidents/:id).
 */
export function buildSiteAnalyticsFromStatistics(params: {
  summary: StatisticsSummaryDto;
  trends: readonly TrendItemDto[];
  distribution: readonly ViolationTypeStatDto[];
  cameras: readonly CameraStatDto[];
  period: DashboardPeriod;
  groupBy: AnalyticsGroupBy;
}): SiteAnalytics {
  const { summary, trends: rawTrends, distribution: rawDistribution, cameras: rawCameras, period, groupBy } = params;

  // Quy ước reporting develop (lib/metrics): trueViolations = CONFIRMED, resolved = RESOLVED + CLOSED.
  const outcome = outcomeCountsFromSummary(summary);
  const totalIncidents = outcome.total;
  const pending = outcome.pending;
  const resolved = outcome.resolved;
  const dismissed = outcome.dismissed;
  const confirmed = outcome.confirmed;
  const trueViolations = trueViolationCount(outcome);
  const unknown = Math.max(
    0,
    totalIncidents - (pending + confirmed + resolved + dismissed),
  );

  // Zero-fill trend buckets across [period.startDate, period.endDate]
  const trendMap = new Map<string, TrendItemDto>();
  for (let day = period.startDate; day <= period.endDate; day = addCalendarDays(day, 1)) {
    const key = bucketKey(day, groupBy);
    if (!trendMap.has(key)) {
      trendMap.set(key, {
        date: key,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      });
    }
  }
  for (const item of rawTrends) {
    if (!item?.date) continue;
    const key =
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) && groupBy !== "DAY"
        ? bucketKey(item.date, groupBy)
        : item.date;
    const bucket = trendMap.get(key);
    if (!bucket) continue;
    bucket.totalIncidents += Math.max(0, item.totalIncidents ?? 0);
    bucket.trueViolations += Math.max(0, item.trueViolations ?? 0);
    bucket.falseAlarms += Math.max(0, item.falseAlarms ?? 0);
    bucket.resolvedCount += Math.max(0, item.resolvedCount ?? 0);
  }

  // Violation breakdown distribution
  const knownTypes = ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "MULTI_VIOLATION"];
  const distCounts = new Map<string, number>();
  for (const row of rawDistribution) {
    if (!row || row.violationType === "TOTAL_AGGREGATED") continue;
    const count = Math.max(0, row.count ?? 0);
    if (count <= 0) continue;
    const normalizedType = knownTypes.includes(row.violationType)
      ? row.violationType
      : "OTHER";
    distCounts.set(normalizedType, (distCounts.get(normalizedType) ?? 0) + count);
  }
  const distTotal = [...distCounts.values()].reduce((sum, n) => sum + n, 0);
  const distribution = [...distCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => ({
      type,
      count,
      percentage: distTotal > 0 ? (count / distTotal) * 100 : 0,
    }));

  // Severity breakdown & SLA rows
  const slaTargets: ReadonlyArray<readonly ["CRITICAL" | "HIGH" | "MEDIUM" | "LOW", number]> = [
    ["CRITICAL", 15],
    ["HIGH", 30],
    ["MEDIUM", 60],
    ["LOW", 120],
  ];
  let weightedMttrSum = 0;
  let resolutionSamples = 0;
  const severityRows: AnalyticsSeverity[] = slaTargets.map(([key, targetSlaMinutes]) => {
    const item = summary.severityBreakdown?.[key];
    const count = Math.max(0, item?.count ?? 0);
    const rowResolved = Math.max(0, item?.resolved ?? 0);
    const actualMttr =
      item &&
      typeof item.actualMttrMinutes === "number" &&
      Number.isFinite(item.actualMttrMinutes) &&
      item.actualMttrMinutes > 0
        ? item.actualMttrMinutes
        : null;
    const samples = actualMttr != null && rowResolved > 0 ? rowResolved : 0;
    if (samples > 0 && actualMttr != null) {
      weightedMttrSum += actualMttr * samples;
      resolutionSamples += samples;
    }
    return {
      key,
      count,
      resolved: rowResolved,
      targetSlaMinutes: item?.targetSlaMinutes ?? targetSlaMinutes,
      actualMttrMinutes: actualMttr,
      resolutionSamples: samples,
    };
  });

  const mttrMinutes =
    resolutionSamples > 0
      ? weightedMttrSum / resolutionSamples
      : typeof summary.meanTimeToResolveHours === "number" &&
          Number.isFinite(summary.meanTimeToResolveHours) &&
          summary.meanTimeToResolveHours > 0
        ? summary.meanTimeToResolveHours * 60
        : null;

  const confirmedRate =
    totalIncidents > 0 ? (trueViolations / totalIncidents) * 100 : null;
  const falseAlarmRate = computeFalseAlarmRate(outcome);

  const cameras: CameraStatDto[] = [...rawCameras]
    .filter((c) => Boolean(c?.cameraId))
    .map((c) => ({
      cameraId: c.cameraId,
      cameraName: c.cameraName,
      totalViolations: Math.max(0, c.totalViolations ?? 0),
      confirmedCount: Math.max(0, c.confirmedCount ?? 0),
      falseAlarmCount: Math.max(0, c.falseAlarmCount ?? 0),
      resolvedCount: Math.max(0, c.resolvedCount ?? 0),
    }))
    .sort(
      (a, b) =>
        b.totalViolations - a.totalViolations ||
        a.cameraId.localeCompare(b.cameraId),
    );

  return {
    totalIncidents,
    rawTotalIncidents: totalIncidents,
    trueViolations,
    pending,
    confirmed,
    resolved,
    dismissed,
    unknown,
    confirmedRate,
    falseAlarmRate,
    mttrMinutes,
    resolutionSamples,
    severityRows,
    distribution,
    trends: [...trendMap.values()],
    cameras,
  };
}

/**
 * Chuẩn hóa số liệu phân tích rủi ro 24 giờ & 3 ca trực từ `/api/v1/statistics/hourly-risk`.
 */
export function buildSiteHourlyRiskFromStatistics(
  dto: HourlyRiskResponseDto | null | undefined,
): SiteHourlyRisk {
  const defaultHourly: HourlyRiskItemDto[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    count: 0,
    riskLevel: "LOW",
    shift: hour >= 6 && hour < 14 ? "MORNING" : hour >= 14 && hour < 22 ? "AFTERNOON" : "NIGHT",
    severityBreakdown: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
  }));

  const hourly =
    dto?.hourly && dto.hourly.length === 24
      ? dto.hourly.map((h, idx) => ({
          ...defaultHourly[idx],
          ...h,
          count: Math.max(0, h.count ?? 0),
        }))
      : defaultHourly;

  const defaultShift = (
    name: string,
    timeRange: string,
    code: HourlyRiskItemDto["shift"],
  ): ShiftRiskSummaryDto => {
    const hours = hourly.filter((h) => h.shift === code);
    const totalIncidents = hours.reduce((sum, h) => sum + h.count, 0);
    const sumSev = (sev: keyof HourlyRiskItemDto["severityBreakdown"]) =>
      hours.reduce((n, h) => n + (h.severityBreakdown?.[sev] ?? 0), 0);
    const criticalCount = sumSev("CRITICAL");
    const highCount = sumSev("HIGH");
    const mediumCount = sumSev("MEDIUM");
    const lowCount = sumSev("LOW");
    const riskLevel =
      criticalCount || highCount >= 3
        ? "CRITICAL"
        : highCount || mediumCount >= 3
          ? "HIGH"
          : mediumCount || totalIncidents >= 2
            ? "MEDIUM"
            : "LOW";
    return {
      name,
      timeRange,
      totalIncidents,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      riskLevel,
    };
  };

  const shifts: Record<"morning" | "afternoon" | "night", ShiftRiskSummaryDto> = {
    morning: dto?.shifts?.morning ?? defaultShift("MORNING", "06:00–14:00", "MORNING"),
    afternoon: dto?.shifts?.afternoon ?? defaultShift("AFTERNOON", "14:00–22:00", "AFTERNOON"),
    night: dto?.shifts?.night ?? defaultShift("NIGHT", "00:00–06:00 · 22:00–24:00", "NIGHT"),
  };

  const total =
    typeof dto?.summary?.totalIncidents === "number"
      ? Math.max(0, dto.summary.totalIncidents)
      : hourly.reduce((sum, h) => sum + h.count, 0);

  if (total <= 0) {
    return {
      hourly,
      shifts,
      total: 0,
      peakHour: null,
      peakShift: null,
    };
  }

  const peakHour =
    typeof dto?.summary?.peakHour === "number"
      ? dto.summary.peakHour
      : hourly.reduce((a, b) => (b.count > a.count ? b : a)).hour;

  const rawPeakShift = dto?.summary?.peakShift?.toLowerCase();
  const keys = ["morning", "afternoon", "night"] as const;
  const peakShift: "morning" | "afternoon" | "night" =
    rawPeakShift === "morning" || rawPeakShift === "afternoon" || rawPeakShift === "night"
      ? rawPeakShift
      : keys.reduce((a, b) =>
          shifts[b].totalIncidents > shifts[a].totalIncidents ? b : a,
        );

  return {
    hourly,
    shifts,
    total,
    peakHour,
    peakShift,
  };
}

export async function fetchSiteStatisticsAnalytics(params: {
  siteId: string;
  period: DashboardPeriod;
  groupBy: AnalyticsGroupBy;
  signal?: AbortSignal;
  deps: {
    getSummary: (
      filter: { siteId: string; startDate: string; endDate: string },
      options?: { signal?: AbortSignal; suppressToast?: boolean; strict?: boolean },
    ) => Promise<StatisticsSummaryDto>;
    getTrends: (
      filter: {
        siteId: string;
        startDate: string;
        endDate: string;
        groupBy: AnalyticsGroupBy;
      },
      options?: { signal?: AbortSignal; suppressToast?: boolean; strict?: boolean },
    ) => Promise<TrendItemDto[]>;
    getViolationDistribution: (
      filter: { siteId: string; startDate: string; endDate: string },
      options?: { signal?: AbortSignal; suppressToast?: boolean; strict?: boolean },
    ) => Promise<ViolationTypeStatDto[]>;
    getCameraRankings?: (
      filter: { siteId: string; startDate: string; endDate: string; limit?: number },
      options?: { signal?: AbortSignal; suppressToast?: boolean; strict?: boolean },
    ) => Promise<CameraStatDto[]>;
  };
}): Promise<SiteAnalytics> {
  const { siteId, period, groupBy, signal, deps } = params;
  const baseFilter = {
    siteId,
    startDate: period.startDate,
    endDate: period.endDate,
  };
  const reqOpts = { signal, suppressToast: true, strict: true };

  const [summary, trends, distribution, cameras] = await Promise.all([
    deps.getSummary(baseFilter, reqOpts),
    deps.getTrends({ ...baseFilter, groupBy }, reqOpts),
    deps.getViolationDistribution(baseFilter, reqOpts),
    deps.getCameraRankings
      ? deps.getCameraRankings({ ...baseFilter, limit: 10 }, reqOpts)
      : Promise.resolve([]),
  ]);

  return buildSiteAnalyticsFromStatistics({
    summary,
    trends,
    distribution,
    cameras,
    period,
    groupBy,
  });
}

export function aggregateSiteAnalytics(
  items: readonly IncidentItem[],
  period: DashboardPeriod,
  groupBy: AnalyticsGroupBy,
  options: { mode?: IncidentAggregationMode } = {},
): SiteAnalytics {
  const mode: IncidentAggregationMode = options.mode ?? "clustered";
  const effectiveItems =
    mode === "clustered"
      ? clusterIncidentsByPerson(items).map(projectClusterToRepresentativeIncident)
      : items;
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
  for (const item of effectiveItems) {
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
    totalIncidents: effectiveItems.length,
    rawTotalIncidents: items.length,
    trueViolations, ...counts,
    confirmedRate: effectiveItems.length ? trueViolations / effectiveItems.length * 100 : null,
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

export function aggregateSiteHourlyRisk(
  items: readonly IncidentItem[],
  options: { mode?: IncidentAggregationMode } = {},
): SiteHourlyRisk {
  const mode: IncidentAggregationMode = options.mode ?? "clustered";
  const effectiveItems =
    mode === "clustered"
      ? clusterIncidentsByPerson(items).map(projectClusterToRepresentativeIncident)
      : items;
  const hourly: HourlyRiskItemDto[] = Array.from({ length: 24 }, (_, hour) => ({
    hour, label: `${String(hour).padStart(2, "0")}:00`, count: 0, riskLevel: "LOW",
    shift: hour >= 6 && hour < 14 ? "MORNING" : hour >= 14 && hour < 22 ? "AFTERNOON" : "NIGHT",
    severityBreakdown: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
  }));
  for (const item of effectiveItems) {
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
