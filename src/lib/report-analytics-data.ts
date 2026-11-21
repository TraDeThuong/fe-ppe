import { addCalendarDays, vietnamToday } from "@/lib/dashboard-data";
import {
  resolveIncidentResponsibility,
  type ResponsiblePersonRef,
} from "@/lib/incident-workflow";
import type {
  IncidentItem,
  ReportGenerationDto,
  ReportTemplateDto,
  SiteItem,
  StatisticsSummaryDto,
  TrendItemDto,
  UserResponseDto,
} from "@/types";
import type { TrendGroupBy } from "@/components/features/reports";

const MAX_BUCKETS_DAYS = 90;

/**
 * Compute inclusive YYYY-MM-DD range in Vietnam timezone (Asia/Ho_Chi_Minh).
 */
export function getReportDateRange(
  period: string,
  customStartDate?: string,
  customEndDate?: string,
  today = vietnamToday(),
): { startDate: string; endDate: string } {
  if (period === "custom") {
    return {
      startDate: customStartDate || addCalendarDays(today, -29),
      endDate: customEndDate || today,
    };
  }

  const daysBack = period === "today" ? 0 : period === "7d" ? 6 : 29;
  return {
    startDate: addCalendarDays(today, -daysBack),
    endDate: today,
  };
}

/**
 * Convert YYYY-MM-DD bounds to full-day UTC ISO timestamps in Vietnam timezone (+07:00).
 */
export function getVietnamDateBoundaries(
  startDate: string,
  endDate: string,
): { fromDate: string; toDate: string } {
  return {
    fromDate: new Date(`${startDate}T00:00:00+07:00`).toISOString(),
    toDate: new Date(`${endDate}T23:59:59.999+07:00`).toISOString(),
  };
}

/**
 * Return ISO 8601 week key (YYYY-Www) for a YYYY-MM-DD calendar date.
 */
export function getIsoWeekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + (((4 - target.getUTCDay()) + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekYear = new Date(firstThursday).getUTCFullYear();
  return `${weekYear}-W${String(weekNum).padStart(2, "0")}`;
}

export function getTrendBucketKey(dateStr: string, groupBy: TrendGroupBy): string {
  if (groupBy === "WEEK") return getIsoWeekKey(dateStr);
  if (groupBy === "MONTH") return dateStr.slice(0, 7);
  return dateStr;
}

/**
 * Resolve an incident's detectedAt/createdAt timestamp to a YYYY-MM-DD Vietnam calendar date.
 */
export function getIncidentVietnamDate(inc: Pick<IncidentItem, "detectedAt" | "createdAt">): string | null {
  const rawTs = inc.detectedAt || inc.createdAt;
  if (!rawTs) return null;
  const parsed = new Date(rawTs);
  if (Number.isNaN(parsed.getTime())) return null;
  return vietnamToday(parsed);
}

/**
 * Filter incidents by siteId and inclusive Vietnam calendar date bounds [startDate, endDate].
 */
export function filterIncidentsInDateRange(
  incidents: readonly IncidentItem[],
  startDate: string,
  endDate: string,
  siteId?: string,
): IncidentItem[] {
  return incidents.filter((inc) => {
    if (siteId && inc.siteId !== siteId) return false;
    const vnDate = getIncidentVietnamDate(inc);
    if (!vnDate) return false;
    return vnDate >= startDate && vnDate <= endDate;
  });
}

function createZeroFilledBuckets(
  startDate: string,
  endDate: string,
  groupBy: TrendGroupBy,
): Map<string, TrendItemDto> {
  const buckets = new Map<string, TrendItemDto>();
  if (!startDate || !endDate || startDate > endDate) {
    return buckets;
  }

  let day = startDate;
  let guard = 0;
  while (day <= endDate && guard <= MAX_BUCKETS_DAYS) {
    const key = getTrendBucketKey(day, groupBy);
    if (!buckets.has(key)) {
      buckets.set(key, {
        date: key,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      });
    }
    day = addCalendarDays(day, 1);
    guard += 1;
  }

  return buckets;
}

/**
 * Reconcile rollup trends from Reporting Service with live incidents from Incident Service,
 * ensuring continuous zero-filled buckets across [startDate, endDate] whenever data exists.
 */
export function reconcileReportTrends(params: {
  rawTrends: readonly TrendItemDto[];
  rawSummary?: StatisticsSummaryDto | null;
  filteredIncidents: readonly IncidentItem[];
  startDate: string;
  endDate: string;
  groupBy: TrendGroupBy;
}): TrendItemDto[] {
  const { rawTrends, rawSummary, filteredIncidents, startDate, endDate, groupBy } = params;

  const rawTrendsTotal = rawTrends.reduce(
    (sum, item) => sum + (item.totalIncidents ?? 0),
    0,
  );
  const summaryTotal = rawSummary?.totalIncidents ?? 0;

  // Rollup is authoritative only when both summary and trends contain real non-zero counts
  // that are at least as complete as the live incidents list.
  const isRollupTrendsAuthoritative =
    summaryTotal > 0 &&
    rawTrendsTotal > 0 &&
    summaryTotal >= filteredIncidents.length &&
    rawTrendsTotal >= filteredIncidents.length;

  if (!isRollupTrendsAuthoritative && filteredIncidents.length === 0) {
    if (rawTrendsTotal === 0) {
      return [];
    }
    const buckets = createZeroFilledBuckets(startDate, endDate, groupBy);
    for (const item of rawTrends) {
      const existing = buckets.get(item.date) || {
        date: item.date,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      };
      existing.totalIncidents += item.totalIncidents ?? 0;
      existing.trueViolations += item.trueViolations ?? 0;
      existing.falseAlarms += item.falseAlarms ?? 0;
      existing.resolvedCount += item.resolvedCount ?? 0;
      buckets.set(item.date, existing);
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  const buckets = createZeroFilledBuckets(startDate, endDate, groupBy);

  if (isRollupTrendsAuthoritative) {
    for (const item of rawTrends) {
      const existing = buckets.get(item.date) || {
        date: item.date,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      };
      existing.totalIncidents += item.totalIncidents ?? 0;
      existing.trueViolations += item.trueViolations ?? 0;
      existing.falseAlarms += item.falseAlarms ?? 0;
      existing.resolvedCount += item.resolvedCount ?? 0;
      buckets.set(item.date, existing);
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  for (const inc of filteredIncidents) {
    const vnDate = getIncidentVietnamDate(inc);
    if (!vnDate) continue;
    const key = getTrendBucketKey(vnDate, groupBy);
    const existing = buckets.get(key) || {
      date: key,
      totalIncidents: 0,
      trueViolations: 0,
      falseAlarms: 0,
      resolvedCount: 0,
    };

    const status = String(inc.status || "").toUpperCase();
    existing.totalIncidents += 1;
    if (status === "DISMISSED") {
      existing.falseAlarms += 1;
    } else {
      existing.trueViolations += 1;
    }
    if (status === "RESOLVED" || status === "CLOSED") {
      existing.resolvedCount += 1;
    }
    buckets.set(key, existing);
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type ReportArchiveFormat = "PDF" | "EXCEL" | "CSV" | "JSON";

export interface ReportArchiveStats {
  totalReports: number;
  completedCount: number;
  processingCount: number;
  failedCount: number;
  periodicCount: number;
  specializedCount: number;
  pdfCount: number;
  excelCount: number;
  activeTemplatesCount: number;
  totalTemplatesCount: number;
  byType: Record<string, number>;
}

/**
 * Determine canonical document format from fileType, template fileType, or fileName extension.
 */
export function detectReportFormat(
  report: Pick<ReportGenerationDto, "fileType" | "fileName" | "template">,
): ReportArchiveFormat {
  const rawType = (report.fileType || report.template?.fileType || "").toUpperCase();
  const fileName = (report.fileName || "").toLowerCase();

  if (rawType === "EXCEL" || fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return "EXCEL";
  }
  if (rawType === "CSV" || fileName.endsWith(".csv")) {
    return "CSV";
  }
  if (rawType === "JSON" || fileName.endsWith(".json")) {
    return "JSON";
  }
  return "PDF";
}

/**
 * BOLA access check matching backend ReportingService: only ADMIN/SUPER_ADMIN or report creator can view/download.
 */
export function canAccessGeneratedReport(
  report: Pick<ReportGenerationDto, "generatedBy">,
  currentUserId?: string,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  if (!currentUserId || !report.generatedBy) return false;
  return report.generatedBy === currentUserId;
}

/**
 * Compute KPI metrics for the Reports archive tab from report history and template catalog.
 */
export function computeReportArchiveStats(
  history: readonly ReportGenerationDto[],
  templates: readonly ReportTemplateDto[],
  totalFromMeta?: number,
): ReportArchiveStats {
  let completedCount = 0;
  let processingCount = 0;
  let failedCount = 0;
  let periodicCount = 0;
  let specializedCount = 0;
  let pdfCount = 0;
  let excelCount = 0;
  const byType: Record<string, number> = {
    DAILY: 0,
    WEEKLY: 0,
    MONTHLY: 0,
    VIOLATION_SUMMARY: 0,
    AI_PERFORMANCE: 0,
  };

  for (const item of history) {
    const status = String(item.status || "").toUpperCase();
    if (status === "COMPLETED") completedCount += 1;
    else if (status === "PENDING" || status === "PROCESSING") processingCount += 1;
    else if (status === "FAILED") failedCount += 1;

    const rType = String(item.reportType || "").toUpperCase();
    byType[rType] = (byType[rType] ?? 0) + 1;
    if (rType === "DAILY" || rType === "WEEKLY" || rType === "MONTHLY") {
      periodicCount += 1;
    } else if (rType === "VIOLATION_SUMMARY" || rType === "AI_PERFORMANCE") {
      specializedCount += 1;
    }

    const fmt = detectReportFormat(item);
    if (fmt === "EXCEL" || fmt === "CSV") excelCount += 1;
    else pdfCount += 1;
  }

  const activeTemplatesCount = templates.filter(
    (tpl) => !tpl.status || String(tpl.status).toUpperCase() === "ACTIVE",
  ).length;

  return {
    totalReports: totalFromMeta ?? history.length,
    completedCount,
    processingCount,
    failedCount,
    periodicCount,
    specializedCount,
    pdfCount,
    excelCount,
    activeTemplatesCount,
    totalTemplatesCount: templates.length,
    byType,
  };
}

// ============================================================================
// ROW 2 ANALYTICS: RESOLUTION FUNNEL, SITE COMPARISON & PERSONNEL PERFORMANCE
// ============================================================================

export type FunnelStageKey =
  | "detected"
  | "pendingReview"
  | "awaitingDispatch"
  | "remediating"
  | "awaitingAcceptance"
  | "closed"
  | "dismissed";

export interface ResolutionFunnelSummary {
  totalDetected: number;
  pendingReview: number;
  awaitingDispatch: number;
  remediating: number;
  awaitingAcceptance: number;
  closed: number;
  dismissed: number;
  trueViolationsTotal: number;
  completedTotal: number;
  resolutionRate: number;
  falseAlarmRate: number;
  bottleneckStage: Exclude<FunnelStageKey, "detected" | "closed" | "dismissed"> | null;
  bottleneckCount: number;
}

const SLA_TARGET_MINUTES: Record<string, number> = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 60,
  NORMAL: 60,
  LOW: 120,
};

function getIncidentResolutionMinutes(inc: Pick<IncidentItem, "detectedAt" | "createdAt" | "resolvedAt" | "updatedAt">): number | null {
  const startRaw = inc.detectedAt || inc.createdAt;
  const endRaw = inc.resolvedAt || inc.updatedAt;
  if (!startRaw || !endRaw) return null;
  const startMs = new Date(startRaw).getTime();
  const endMs = new Date(endRaw).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;
  return (endMs - startMs) / 60000;
}

/**
 * Compute the 5-stage operational resolution funnel + false alarms from period incidents.
 */
export function computeResolutionFunnel(
  incidents: readonly IncidentItem[],
): ResolutionFunnelSummary {
  let pendingReview = 0;
  let awaitingDispatch = 0;
  let remediating = 0;
  let awaitingAcceptance = 0;
  let closed = 0;
  let dismissed = 0;

  for (const inc of incidents) {
    const status = String(inc.status || "").toUpperCase();
    if (status === "DISMISSED") {
      dismissed += 1;
      continue;
    }

    const resp = resolveIncidentResponsibility(inc);
    if (resp.phase === "AWAITING_MANAGER_REVIEW") {
      pendingReview += 1;
    } else if (resp.phase === "AWAITING_MANAGER_DISPATCH") {
      // If BE _count.assignments > 0 (not hydrated yet), treat as remediating instead of unassigned.
      if (!Array.isArray(inc.assignments) && (inc._count?.assignments ?? 0) > 0) {
        remediating += 1;
      } else {
        awaitingDispatch += 1;
      }
    } else if (resp.phase === "OFFICER_REMEDIATING") {
      remediating += 1;
    } else if (resp.phase === "AWAITING_MANAGER_ACCEPTANCE") {
      awaitingAcceptance += 1;
    } else {
      closed += 1;
    }
  }

  const trueViolationsTotal = awaitingDispatch + remediating + awaitingAcceptance + closed;
  const completedTotal = awaitingAcceptance + closed;
  const resolutionRate =
    trueViolationsTotal > 0 ? Math.round((completedTotal / trueViolationsTotal) * 100) : 0;
  const reviewedTotal = trueViolationsTotal + dismissed;
  const falseAlarmRate =
    reviewedTotal > 0 ? Number(((dismissed / reviewedTotal) * 100).toFixed(1)) : 0;

  const backlogCandidates: Array<{
    key: Exclude<FunnelStageKey, "detected" | "closed" | "dismissed">;
    count: number;
  }> = [
    { key: "pendingReview", count: pendingReview },
    { key: "awaitingDispatch", count: awaitingDispatch },
    { key: "remediating", count: remediating },
    { key: "awaitingAcceptance", count: awaitingAcceptance },
  ];

  let bottleneckStage: ResolutionFunnelSummary["bottleneckStage"] = null;
  let bottleneckCount = 0;
  for (const candidate of backlogCandidates) {
    if (candidate.count > bottleneckCount) {
      bottleneckCount = candidate.count;
      bottleneckStage = candidate.key;
    }
  }

  return {
    totalDetected: incidents.length,
    pendingReview,
    awaitingDispatch,
    remediating,
    awaitingAcceptance,
    closed,
    dismissed,
    trueViolationsTotal,
    completedTotal,
    resolutionRate,
    falseAlarmRate,
    bottleneckStage,
    bottleneckCount,
  };
}

export interface SiteComparisonStat {
  siteId: string;
  siteName: string;
  siteCode?: string;
  totalIncidents: number;
  pendingReview: number;
  confirmedActive: number;
  resolvedCount: number;
  falseAlarms: number;
  complianceRate: number;
  resolutionRate: number;
  meanTimeToResolveHours: number;
}

/**
 * Aggregate violation, compliance, resolution, and MTTR metrics grouped by site.
 */
export function computeSiteComparisonStats(
  incidents: readonly IncidentItem[],
  sites: readonly SiteItem[] = [],
  resolveSiteName?: (siteId: string, fallback?: string) => string,
): SiteComparisonStat[] {
  const siteMap = new Map<
    string,
    {
      siteId: string;
      siteName: string;
      siteCode?: string;
      totalIncidents: number;
      pendingReview: number;
      confirmedActive: number;
      resolvedCount: number;
      falseAlarms: number;
      resolveMinutes: number[];
    }
  >();

  for (const site of sites) {
    siteMap.set(site.id, {
      siteId: site.id,
      siteName: site.name,
      siteCode: site.code,
      totalIncidents: 0,
      pendingReview: 0,
      confirmedActive: 0,
      resolvedCount: 0,
      falseAlarms: 0,
      resolveMinutes: [],
    });
  }

  for (const inc of incidents) {
    if (!inc.siteId) continue;
    let entry = siteMap.get(inc.siteId);
    if (!entry) {
      entry = {
        siteId: inc.siteId,
        siteName:
          inc.siteName ||
          (resolveSiteName ? resolveSiteName(inc.siteId) : `Site #${inc.siteId.slice(0, 8)}`),
        totalIncidents: 0,
        pendingReview: 0,
        confirmedActive: 0,
        resolvedCount: 0,
        falseAlarms: 0,
        resolveMinutes: [],
      };
      siteMap.set(inc.siteId, entry);
    }

    entry.totalIncidents += 1;
    const status = String(inc.status || "").toUpperCase();
    if (status === "PENDING_REVIEW") {
      entry.pendingReview += 1;
    } else if (status === "CONFIRMED") {
      entry.confirmedActive += 1;
    } else if (status === "DISMISSED") {
      entry.falseAlarms += 1;
    } else if (status === "RESOLVED" || status === "CLOSED") {
      entry.resolvedCount += 1;
      const mins = getIncidentResolutionMinutes(inc);
      if (mins !== null) {
        entry.resolveMinutes.push(mins);
      }
    }
  }

  return Array.from(siteMap.values())
    .map((entry) => {
      const trueViolationsTotal = entry.confirmedActive + entry.resolvedCount;
      const complianceRate =
        entry.totalIncidents > 0
          ? Number(
              Math.max(0, 100 - (entry.confirmedActive / entry.totalIncidents) * 100).toFixed(1),
            )
          : 100;
      const resolutionRate =
        trueViolationsTotal > 0
          ? Math.round((entry.resolvedCount / trueViolationsTotal) * 100)
          : 100;
      const meanTimeToResolveHours =
        entry.resolveMinutes.length > 0
          ? Number(
              (
                entry.resolveMinutes.reduce((s, m) => s + m, 0) /
                entry.resolveMinutes.length /
                60
              ).toFixed(2),
            )
          : 0;

      return {
        siteId: entry.siteId,
        siteName: entry.siteName,
        siteCode: entry.siteCode,
        totalIncidents: entry.totalIncidents,
        pendingReview: entry.pendingReview,
        confirmedActive: entry.confirmedActive,
        resolvedCount: entry.resolvedCount,
        falseAlarms: entry.falseAlarms,
        complianceRate,
        resolutionRate,
        meanTimeToResolveHours,
      };
    })
    .sort((a, b) => {
      if (b.totalIncidents !== a.totalIncidents) {
        return b.totalIncidents - a.totalIncidents;
      }
      return a.complianceRate - b.complianceRate;
    });
}

export interface PersonnelPerformanceItem {
  userId: string;
  name: string;
  email?: string;
  role: string;
  isUnassignedBucket: boolean;
  siteNames: string[];
  totalAssigned: number;
  activeCount: number;
  awaitingAcceptanceCount: number;
  closedCount: number;
  resolvedTotal: number;
  completionRate: number;
  avgMttrHours: number;
  slaMetCount: number;
  slaMeasuredCount: number;
  slaComplianceRate: number;
}

export interface PersonnelPerformanceSummary {
  items: PersonnelPerformanceItem[];
  totalTrackedIncidents: number;
  assignedIncidentsCount: number;
  unassignedConfirmedCount: number;
  staffCount: number;
  activeHandlersCount: number;
  idleStaffCount: number;
  avgCompletionRate: number;
  avgSlaComplianceRate: number;
}

/**
 * Compute per-person violation remediation workload, completion rate, MTTR, and SLA compliance
 * from confirmed/resolved/closed incidents, seeded with all directory users so both top handlers
 * and zero-workload staff are visible.
 */
export function computePersonnelPerformanceStats(
  incidents: readonly IncidentItem[],
  context?: {
    usersById?: ReadonlyMap<string, ResponsiblePersonRef>;
    allUsers?: readonly UserResponseDto[];
    selectedSiteId?: string;
    resolveSiteName?: (siteId: string, fallback?: string) => string;
  },
): PersonnelPerformanceSummary {
  const personMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email?: string;
      role: string;
      isUnassignedBucket: boolean;
      siteNames: Set<string>;
      activeCount: number;
      awaitingAcceptanceCount: number;
      closedCount: number;
      resolveMinutes: number[];
      slaMetCount: number;
      slaMeasuredCount: number;
    }
  >();

  // 0. Seed all active directory users (so zero-workload users are included in the comparison)
  const selectedSiteId = context?.selectedSiteId?.trim() || "";
  const allUsers = context?.allUsers ?? [];
  if (allUsers.length > 0) {
    for (const u of allUsers) {
      if (u.deletedAt || u.isActive === false) continue;
      const roleName = (u.role?.name || "USER").toUpperCase();
      const userSiteIds = Array.isArray(u.siteIds) ? u.siteIds : [];
      if (
        selectedSiteId &&
        userSiteIds.length > 0 &&
        !userSiteIds.includes(selectedSiteId) &&
        roleName !== "ADMIN" &&
        roleName !== "SUPER_ADMIN"
      ) {
        continue;
      }

      const siteNames = new Set<string>();
      for (const sid of userSiteIds) {
        if (selectedSiteId && sid !== selectedSiteId) continue;
        const label = context?.resolveSiteName ? context.resolveSiteName(sid) : "";
        if (label) siteNames.add(label);
      }

      personMap.set(u.id, {
        userId: u.id,
        name: u.fullName || u.email || `#${u.id.slice(0, 8)}`,
        email: u.email || undefined,
        role: roleName,
        isUnassignedBucket: false,
        siteNames,
        activeCount: 0,
        awaitingAcceptanceCount: 0,
        closedCount: 0,
        resolveMinutes: [],
        slaMetCount: 0,
        slaMeasuredCount: 0,
      });
    }
  } else if (context?.usersById && context.usersById.size > 0) {
    // Fallback when USER_READ is absent: seed site contact officers / known refs
    for (const ref of context.usersById.values()) {
      if (!ref.id) continue;
      personMap.set(ref.id, {
        userId: ref.id,
        name: ref.name || `#${ref.id.slice(0, 8)}`,
        email: ref.email,
        role: (ref.role || "SAFETY_OFFICER").toUpperCase(),
        isUnassignedBucket: false,
        siteNames: new Set<string>(),
        activeCount: 0,
        awaitingAcceptanceCount: 0,
        closedCount: 0,
        resolveMinutes: [],
        slaMetCount: 0,
        slaMeasuredCount: 0,
      });
    }
  }

  let totalTrackedIncidents = 0;
  let assignedIncidentsCount = 0;
  let unassignedConfirmedCount = 0;

  for (const inc of incidents) {
    const status = String(inc.status || "").toUpperCase();
    if (status !== "CONFIRMED" && status !== "RESOLVED" && status !== "CLOSED") {
      continue;
    }

    totalTrackedIncidents += 1;

    // 1. Resolve handler from assignments (active first, otherwise latest)
    const assignments = Array.isArray(inc.assignments) ? inc.assignments : [];
    const chosenAssignment =
      assignments.find((a) => String(a.status || "").toUpperCase() !== "COMPLETED") ||
      assignments[0];

    let handlerId =
      chosenAssignment?.assignedTo ||
      (chosenAssignment as unknown as { assignedToUserId?: string } | undefined)?.assignedToUserId;
    let handlerName = chosenAssignment?.assignedToName;
    let handlerEmail = chosenAssignment?.assignedToEmail;
    let handlerRole = "SAFETY_OFFICER";

    // 2. Fallback to statusHistory resolver when incident was resolved/closed directly without assignment
    if (!handlerId && (status === "RESOLVED" || status === "CLOSED") && Array.isArray(inc.statusHistory)) {
      const resolverEntry =
        inc.statusHistory.find((h) => String(h.newStatus || "").toUpperCase() === "RESOLVED") ||
        inc.statusHistory.find((h) => String(h.newStatus || "").toUpperCase() === "CLOSED");
      if (resolverEntry?.changedBy) {
        handlerId = resolverEntry.changedBy;
        handlerName = resolverEntry.changedByName || handlerName;
      }
    }

    const isUnassigned = !handlerId;
    if (isUnassigned) {
      if (status === "CONFIRMED") {
        unassignedConfirmedCount += 1;
      }
    } else {
      assignedIncidentsCount += 1;
    }

    const userRef = handlerId ? context?.usersById?.get(handlerId) : undefined;
    const bucketKey = handlerId || "__UNASSIGNED__";
    const resolvedName = isUnassigned
      ? "__UNASSIGNED__"
      : userRef?.name || handlerName || `#${handlerId!.slice(0, 8)}`;
    const resolvedEmail = userRef?.email || handlerEmail;
    const resolvedRole = isUnassigned ? "UNASSIGNED" : userRef?.role || handlerRole;

    let entry = personMap.get(bucketKey);
    if (!entry) {
      entry = {
        userId: bucketKey,
        name: resolvedName,
        email: resolvedEmail,
        role: resolvedRole,
        isUnassignedBucket: isUnassigned,
        siteNames: new Set<string>(),
        activeCount: 0,
        awaitingAcceptanceCount: 0,
        closedCount: 0,
        resolveMinutes: [],
        slaMetCount: 0,
        slaMeasuredCount: 0,
      };
      personMap.set(bucketKey, entry);
    }

    const siteName =
      inc.siteName || (inc.siteId && context?.resolveSiteName ? context.resolveSiteName(inc.siteId) : "");
    if (siteName) {
      entry.siteNames.add(siteName);
    }

    if (status === "CONFIRMED") {
      entry.activeCount += 1;
    } else if (status === "RESOLVED") {
      entry.awaitingAcceptanceCount += 1;
    } else if (status === "CLOSED") {
      entry.closedCount += 1;
    }

    if (status === "RESOLVED" || status === "CLOSED") {
      const mins = getIncidentResolutionMinutes(inc);
      if (mins !== null) {
        entry.resolveMinutes.push(mins);
        const sev = String(inc.severity || "HIGH").toUpperCase();
        const slaTarget = SLA_TARGET_MINUTES[sev] ?? 60;
        entry.slaMeasuredCount += 1;
        if (mins <= slaTarget) {
          entry.slaMetCount += 1;
        }
      }
    }
  }

  const items: PersonnelPerformanceItem[] = Array.from(personMap.values())
    .map((entry) => {
      const resolvedTotal = entry.awaitingAcceptanceCount + entry.closedCount;
      const totalAssigned = entry.activeCount + resolvedTotal;
      const completionRate =
        totalAssigned > 0 ? Math.round((resolvedTotal / totalAssigned) * 100) : 0;
      const avgMttrHours =
        entry.resolveMinutes.length > 0
          ? Number(
              (
                entry.resolveMinutes.reduce((sum, m) => sum + m, 0) /
                entry.resolveMinutes.length /
                60
              ).toFixed(2),
            )
          : 0;
      const slaComplianceRate =
        entry.slaMeasuredCount > 0
          ? Math.round((entry.slaMetCount / entry.slaMeasuredCount) * 100)
          : 0;

      return {
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        isUnassignedBucket: entry.isUnassignedBucket,
        siteNames: Array.from(entry.siteNames),
        totalAssigned,
        activeCount: entry.activeCount,
        awaitingAcceptanceCount: entry.awaitingAcceptanceCount,
        closedCount: entry.closedCount,
        resolvedTotal,
        completionRate,
        avgMttrHours,
        slaMetCount: entry.slaMetCount,
        slaMeasuredCount: entry.slaMeasuredCount,
        slaComplianceRate,
      };
    })
    .sort((a, b) => {
      if (a.isUnassignedBucket !== b.isUnassignedBucket) {
        return a.isUnassignedBucket ? 1 : -1;
      }
      if (b.totalAssigned !== a.totalAssigned) {
        return b.totalAssigned - a.totalAssigned;
      }
      return b.completionRate - a.completionRate;
    });

  const realStaff = items.filter((item) => !item.isUnassignedBucket);
  const activeHandlers = realStaff.filter((item) => item.totalAssigned > 0);
  const staffCompleted = realStaff.reduce((sum, item) => sum + item.resolvedTotal, 0);
  const staffTotal = realStaff.reduce((sum, item) => sum + item.totalAssigned, 0);
  const staffSlaMet = realStaff.reduce((sum, item) => sum + item.slaMetCount, 0);
  const staffSlaMeasured = realStaff.reduce((sum, item) => sum + item.slaMeasuredCount, 0);

  return {
    items,
    totalTrackedIncidents,
    assignedIncidentsCount,
    unassignedConfirmedCount,
    staffCount: realStaff.length,
    activeHandlersCount: activeHandlers.length,
    idleStaffCount: realStaff.length - activeHandlers.length,
    avgCompletionRate: staffTotal > 0 ? Math.round((staffCompleted / staffTotal) * 100) : 0,
    avgSlaComplianceRate:
      staffSlaMeasured > 0 ? Math.round((staffSlaMet / staffSlaMeasured) * 100) : 0,
  };
}

export type PersonnelRoleBucket = "officer" | "manager" | "admin";

export function classifyPersonnelRoleBucket(role?: string | null): PersonnelRoleBucket {
  const upper = (role || "").toUpperCase();
  if (upper === "SAFETY_OFFICER") return "officer";
  if (upper === "SAFETY_MANAGER" || upper === "MANAGER") return "manager";
  return "admin";
}

export interface ManagerPerformanceItem {
  userId: string;
  name: string;
  email?: string;
  role: string;
  managedSiteIds: string[];
  siteNames: string[];
  confirmedReviewCount: number;
  dismissedReviewCount: number;
  reviewedTotal: number;
  closedAcceptanceCount: number;
  directResolveCount: number;
  totalActions: number;
  avgReviewHours: number;
  siteBacklogCount: number;
}

export interface ManagerPerformanceSummary {
  items: ManagerPerformanceItem[];
  totalReviewActions: number;
  totalClosedActions: number;
  totalActions: number;
  staffCount: number;
  activeHandlersCount: number;
  idleStaffCount: number;
  avgReviewHours: number;
}

export interface AdminPerformanceItem {
  userId: string;
  name: string;
  email?: string;
  role: string;
  siteNames: string[];
  reviewAndCloseCount: number;
  directResolveCount: number;
  totalActions: number;
  avgResponseHours: number;
}

export interface AdminPerformanceSummary {
  items: AdminPerformanceItem[];
  totalActions: number;
  staffCount: number;
  activeHandlersCount: number;
  idleStaffCount: number;
}

export interface RoleSegmentedPersonnelSummary {
  officer: PersonnelPerformanceSummary;
  manager: ManagerPerformanceSummary;
  admin: AdminPerformanceSummary;
}

function getDiffHours(startRaw?: string | null, endRaw?: string | null): number | null {
  if (!startRaw || !endRaw) return null;
  const startMs = new Date(startRaw).getTime();
  const endMs = new Date(endRaw).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;
  return (endMs - startMs) / 3600000;
}

/**
 * Compute role-segmented personnel workload & performance statistics without extra BE fields:
 * - SAFETY_OFFICER: field assignments + remediation SLA/MTTR
 * - SAFETY_MANAGER: triage reviews (CONFIRMED/DISMISSED) + closure acceptances (CLOSED) + site backlog
 * - ADMIN / other roles: administrative interventions (review/close + direct remediation)
 */
export function computeRoleSegmentedPersonnelStats(
  incidents: readonly IncidentItem[],
  context?: {
    usersById?: ReadonlyMap<string, ResponsiblePersonRef>;
    allUsers?: readonly UserResponseDto[];
    siteManagersBySiteId?: ReadonlyMap<string, ResponsiblePersonRef[]>;
    siteOfficersBySiteId?: ReadonlyMap<string, ResponsiblePersonRef[]>;
    selectedSiteId?: string;
    resolveSiteName?: (siteId: string, fallback?: string) => string;
  },
): RoleSegmentedPersonnelSummary {
  const selectedSiteId = context?.selectedSiteId?.trim() || "";
  const allUsers = context?.allUsers ?? [];

  const officerUsers = allUsers.filter(
    (u) => !u.deletedAt && u.isActive !== false && classifyPersonnelRoleBucket(u.role?.name) === "officer",
  );
  const officerUsersById = new Map<string, ResponsiblePersonRef>();
  if (context?.usersById) {
    for (const [id, ref] of context.usersById.entries()) {
      if (classifyPersonnelRoleBucket(ref.role) === "officer") {
        officerUsersById.set(id, ref);
      }
    }
  }
  if (context?.siteOfficersBySiteId) {
    for (const list of context.siteOfficersBySiteId.values()) {
      for (const ref of list) {
        if (ref.id && !officerUsersById.has(ref.id)) {
          officerUsersById.set(ref.id, { ...ref, role: ref.role || "SAFETY_OFFICER" });
        }
      }
    }
  }

  // Only pass incidents whose assigned/resolved owner belongs to officer (or unassigned) to Officer tab
  const roleByUserId = new Map<string, PersonnelRoleBucket>();
  for (const u of allUsers) {
    if (!u.deletedAt && u.isActive !== false) {
      roleByUserId.set(u.id, classifyPersonnelRoleBucket(u.role?.name));
    }
  }
  if (context?.usersById) {
    for (const [id, ref] of context.usersById.entries()) {
      if (!roleByUserId.has(id) && ref.role) {
        roleByUserId.set(id, classifyPersonnelRoleBucket(ref.role));
      }
    }
  }

  const officerIncidents: IncidentItem[] = [];
  for (const inc of incidents) {
    const assignments = Array.isArray(inc.assignments) ? inc.assignments : [];
    const chosenAssignment =
      assignments.find((a) => String(a.status || "").toUpperCase() !== "COMPLETED") ||
      assignments[0];
    const assigneeId =
      chosenAssignment?.assignedTo ||
      (chosenAssignment as unknown as { assignedToUserId?: string } | undefined)?.assignedToUserId;
    if (assigneeId) {
      const bucket = roleByUserId.get(assigneeId) || "officer";
      if (bucket === "officer") {
        officerIncidents.push(inc);
      }
    } else {
      officerIncidents.push(inc);
    }
  }

  const officer = computePersonnelPerformanceStats(officerIncidents, {
    usersById: officerUsersById,
    allUsers: officerUsers,
    selectedSiteId,
    resolveSiteName: context?.resolveSiteName,
  });

  // ── Manager & Admin Aggregation ────────────────────────────────────────────
  interface ManagerMutable {
    userId: string;
    name: string;
    email?: string;
    role: string;
    managedSiteIds: Set<string>;
    siteNames: Set<string>;
    confirmedReviewCount: number;
    dismissedReviewCount: number;
    closedAcceptanceCount: number;
    directResolveCount: number;
    reviewHours: number[];
  }

  interface AdminMutable {
    userId: string;
    name: string;
    email?: string;
    role: string;
    siteNames: Set<string>;
    reviewAndCloseCount: number;
    directResolveCount: number;
    responseHours: number[];
  }

  const managerMap = new Map<string, ManagerMutable>();
  const adminMap = new Map<string, AdminMutable>();

  const seedManager = (params: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    siteIds?: string[];
  }) => {
    const existing = managerMap.get(params.id);
    if (existing) {
      for (const sid of params.siteIds ?? []) {
        if (selectedSiteId && sid !== selectedSiteId) continue;
        existing.managedSiteIds.add(sid);
        const label = context?.resolveSiteName ? context.resolveSiteName(sid) : "";
        if (label) existing.siteNames.add(label);
      }
      return existing;
    }

    const managedSiteIds = new Set<string>();
    const siteNames = new Set<string>();
    for (const sid of params.siteIds ?? []) {
      if (selectedSiteId && sid !== selectedSiteId) continue;
      managedSiteIds.add(sid);
      const label = context?.resolveSiteName ? context.resolveSiteName(sid) : "";
      if (label) siteNames.add(label);
    }

    const created: ManagerMutable = {
      userId: params.id,
      name: params.name,
      email: params.email,
      role: (params.role || "SAFETY_MANAGER").toUpperCase(),
      managedSiteIds,
      siteNames,
      confirmedReviewCount: 0,
      dismissedReviewCount: 0,
      closedAcceptanceCount: 0,
      directResolveCount: 0,
      reviewHours: [],
    };
    managerMap.set(params.id, created);
    return created;
  };

  const seedAdmin = (params: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    siteIds?: string[];
  }) => {
    const existing = adminMap.get(params.id);
    if (existing) return existing;

    const siteNames = new Set<string>();
    for (const sid of params.siteIds ?? []) {
      if (selectedSiteId && sid !== selectedSiteId) continue;
      const label = context?.resolveSiteName ? context.resolveSiteName(sid) : "";
      if (label) siteNames.add(label);
    }

    const created: AdminMutable = {
      userId: params.id,
      name: params.name,
      email: params.email,
      role: (params.role || "ADMIN").toUpperCase(),
      siteNames,
      reviewAndCloseCount: 0,
      directResolveCount: 0,
      responseHours: [],
    };
    adminMap.set(params.id, created);
    return created;
  };

  for (const u of allUsers) {
    if (u.deletedAt || u.isActive === false) continue;
    const roleName = (u.role?.name || "ADMIN").toUpperCase();
    const userSiteIds = Array.isArray(u.siteIds) ? u.siteIds : [];
    const bucket = classifyPersonnelRoleBucket(roleName);

    if (
      selectedSiteId &&
      userSiteIds.length > 0 &&
      !userSiteIds.includes(selectedSiteId) &&
      roleName !== "ADMIN" &&
      roleName !== "SUPER_ADMIN"
    ) {
      continue;
    }

    if (bucket === "manager") {
      seedManager({
        id: u.id,
        name: u.fullName || u.email || `#${u.id.slice(0, 8)}`,
        email: u.email || undefined,
        role: roleName,
        siteIds: userSiteIds,
      });
    } else if (bucket === "admin") {
      seedAdmin({
        id: u.id,
        name: u.fullName || u.email || `#${u.id.slice(0, 8)}`,
        email: u.email || undefined,
        role: roleName,
        siteIds: userSiteIds,
      });
    }
  }

  if (context?.siteManagersBySiteId) {
    for (const [sid, list] of context.siteManagersBySiteId.entries()) {
      if (selectedSiteId && sid !== selectedSiteId) continue;
      for (const ref of list) {
        if (!ref.id) continue;
        const bucket = roleByUserId.get(ref.id) || classifyPersonnelRoleBucket(ref.role);
        if (bucket === "manager") {
          seedManager({
            id: ref.id,
            name: ref.name || `#${ref.id.slice(0, 8)}`,
            email: ref.email,
            role: ref.role || "SAFETY_MANAGER",
            siteIds: [sid],
          });
        }
      }
    }
  }

  // Compute site-level manager backlog counts
  const managerBacklogBySite = new Map<string, number>();
  for (const inc of incidents) {
    const resp = resolveIncidentResponsibility(inc);
    const isManagerBacklog =
      resp.phase === "AWAITING_MANAGER_REVIEW" ||
      (resp.phase === "AWAITING_MANAGER_DISPATCH" &&
        (Array.isArray(inc.assignments) || (inc._count?.assignments ?? 0) === 0)) ||
      resp.phase === "AWAITING_MANAGER_ACCEPTANCE";
    if (isManagerBacklog && inc.siteId) {
      managerBacklogBySite.set(inc.siteId, (managerBacklogBySite.get(inc.siteId) ?? 0) + 1);
    }
  }

  // Attribute governance & direct actions from statusHistory + assignments
  for (const inc of incidents) {
    const siteName =
      inc.siteName || (inc.siteId && context?.resolveSiteName ? context.resolveSiteName(inc.siteId) : "");
    const history = Array.isArray(inc.statusHistory) ? inc.statusHistory : [];

    // Deduplicate per-incident per-actor transition type so double-clicks don't double-count
    const seenReviewActors = new Set<string>();
    const seenCloseActors = new Set<string>();
    const seenResolveActors = new Set<string>();

    for (const entry of history) {
      const actorId = entry.changedBy;
      if (!actorId) continue;
      const newStatus = String(entry.newStatus || "").toUpperCase();
      const userRef = context?.usersById?.get(actorId);
      const actorName = userRef?.name || entry.changedByName || `#${actorId.slice(0, 8)}`;
      const actorRole =
        userRef?.role ||
        (roleByUserId.get(actorId) === "admin"
          ? "ADMIN"
          : roleByUserId.get(actorId) === "officer"
            ? "SAFETY_OFFICER"
            : "SAFETY_MANAGER");
      const bucket = roleByUserId.get(actorId) || classifyPersonnelRoleBucket(actorRole);
      const diffHrs = getDiffHours(inc.detectedAt || inc.createdAt, entry.changedAt);

      if (newStatus === "CONFIRMED" || newStatus === "DISMISSED") {
        if (seenReviewActors.has(`${actorId}:${newStatus}`)) continue;
        seenReviewActors.add(`${actorId}:${newStatus}`);

        if (bucket === "admin") {
          const adm = seedAdmin({ id: actorId, name: actorName, email: userRef?.email, role: actorRole });
          if (siteName) adm.siteNames.add(siteName);
          adm.reviewAndCloseCount += 1;
          if (diffHrs !== null) adm.responseHours.push(diffHrs);
        } else {
          const mgr = seedManager({
            id: actorId,
            name: actorName,
            email: userRef?.email,
            role: actorRole,
            siteIds: inc.siteId ? [inc.siteId] : [],
          });
          if (siteName) mgr.siteNames.add(siteName);
          if (newStatus === "CONFIRMED") mgr.confirmedReviewCount += 1;
          else mgr.dismissedReviewCount += 1;
          if (diffHrs !== null) mgr.reviewHours.push(diffHrs);
        }
      } else if (newStatus === "CLOSED") {
        if (seenCloseActors.has(actorId)) continue;
        seenCloseActors.add(actorId);

        if (bucket === "admin") {
          const adm = seedAdmin({ id: actorId, name: actorName, email: userRef?.email, role: actorRole });
          if (siteName) adm.siteNames.add(siteName);
          adm.reviewAndCloseCount += 1;
          if (diffHrs !== null) adm.responseHours.push(diffHrs);
        } else {
          const mgr = seedManager({
            id: actorId,
            name: actorName,
            email: userRef?.email,
            role: actorRole,
            siteIds: inc.siteId ? [inc.siteId] : [],
          });
          if (siteName) mgr.siteNames.add(siteName);
          mgr.closedAcceptanceCount += 1;
        }
      } else if (newStatus === "RESOLVED") {
        if (seenResolveActors.has(actorId)) continue;
        seenResolveActors.add(actorId);

        if (bucket === "admin") {
          const adm = seedAdmin({ id: actorId, name: actorName, email: userRef?.email, role: actorRole });
          if (siteName) adm.siteNames.add(siteName);
          adm.directResolveCount += 1;
          if (diffHrs !== null) adm.responseHours.push(diffHrs);
        } else if (bucket === "manager") {
          const mgr = seedManager({
            id: actorId,
            name: actorName,
            email: userRef?.email,
            role: actorRole,
            siteIds: inc.siteId ? [inc.siteId] : [],
          });
          if (siteName) mgr.siteNames.add(siteName);
          mgr.directResolveCount += 1;
        }
      }
    }
  }

  const managerItems: ManagerPerformanceItem[] = Array.from(managerMap.values())
    .map((m) => {
      const reviewedTotal = m.confirmedReviewCount + m.dismissedReviewCount;
      const totalActions = reviewedTotal + m.closedAcceptanceCount + m.directResolveCount;
      const avgReviewHours =
        m.reviewHours.length > 0
          ? Number((m.reviewHours.reduce((s, h) => s + h, 0) / m.reviewHours.length).toFixed(2))
          : 0;
      let siteBacklogCount = 0;
      for (const sid of m.managedSiteIds) {
        siteBacklogCount += managerBacklogBySite.get(sid) ?? 0;
      }

      return {
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        managedSiteIds: Array.from(m.managedSiteIds),
        siteNames: Array.from(m.siteNames),
        confirmedReviewCount: m.confirmedReviewCount,
        dismissedReviewCount: m.dismissedReviewCount,
        reviewedTotal,
        closedAcceptanceCount: m.closedAcceptanceCount,
        directResolveCount: m.directResolveCount,
        totalActions,
        avgReviewHours,
        siteBacklogCount,
      };
    })
    .sort((a, b) => {
      if (b.totalActions !== a.totalActions) return b.totalActions - a.totalActions;
      return a.name.localeCompare(b.name);
    });

  const adminItems: AdminPerformanceItem[] = Array.from(adminMap.values())
    .map((a) => ({
      userId: a.userId,
      name: a.name,
      email: a.email,
      role: a.role,
      siteNames: Array.from(a.siteNames),
      reviewAndCloseCount: a.reviewAndCloseCount,
      directResolveCount: a.directResolveCount,
      totalActions: a.reviewAndCloseCount + a.directResolveCount,
      avgResponseHours:
        a.responseHours.length > 0
          ? Number((a.responseHours.reduce((s, h) => s + h, 0) / a.responseHours.length).toFixed(2))
          : 0,
    }))
    .sort((a, b) => {
      if (b.totalActions !== a.totalActions) return b.totalActions - a.totalActions;
      return a.name.localeCompare(b.name);
    });

  const allManagerReviewHours = Array.from(managerMap.values()).flatMap((m) => m.reviewHours);
  const totalReviewActions = managerItems.reduce((sum, m) => sum + m.reviewedTotal, 0);
  const totalClosedActions = managerItems.reduce((sum, m) => sum + m.closedAcceptanceCount, 0);
  const totalManagerActions = managerItems.reduce((sum, m) => sum + m.totalActions, 0);
  const activeManagers = managerItems.filter((m) => m.totalActions > 0);
  const activeAdmins = adminItems.filter((a) => a.totalActions > 0);

  return {
    officer,
    manager: {
      items: managerItems,
      totalReviewActions,
      totalClosedActions,
      totalActions: totalManagerActions,
      staffCount: managerItems.length,
      activeHandlersCount: activeManagers.length,
      idleStaffCount: managerItems.length - activeManagers.length,
      avgReviewHours:
        allManagerReviewHours.length > 0
          ? Number(
              (
                allManagerReviewHours.reduce((s, h) => s + h, 0) /
                allManagerReviewHours.length
              ).toFixed(2),
            )
          : 0,
    },
    admin: {
      items: adminItems,
      totalActions: adminItems.reduce((sum, a) => sum + a.totalActions, 0),
      staffCount: adminItems.length,
      activeHandlersCount: activeAdmins.length,
      idleStaffCount: adminItems.length - activeAdmins.length,
    },
  };
}
