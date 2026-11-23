"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { addCalendarDays, vietnamToday } from "@/lib/dashboard-data";
import {
  canAccessGeneratedReport,
  computeReportArchiveStats,
  computeResolutionFunnel,
  computeRoleSegmentedPersonnelStats,
  computeSiteComparisonStats,
  filterIncidentsInDateRange,
  getReportDateRange,
  getVietnamDateBoundaries,
  reconcileReportTrends,
} from "@/lib/report-analytics-data";
import {
  ReportsHeader,
  ReportsArchiveKpiSummary,
  ReportTypeOverviewStrip,
  ReportHistoryList,
  ReportInlineViewer,
  ReportKpiSummary,
  ReportFilterToolbar,
  ReportTrendChart,
  ReportViolationDonut,
  ReportResolutionFunnelCard,
  ReportPersonnelPerformanceCard,
  ReportTemplateCards,
  GenerateReportModal,
  ReportPreviewModal,
  CreateReportTemplateModal,
  type ReportsPageTab,
  type ReportArchiveKpiKey,
  type ReportStatKey,
  type TrendGroupBy,
} from "@/components/features/reports";
import {
  useReportSummary,
  useViolationTrends,
  useViolationDistribution,
  useCameraRankings,
  useReportTemplates,
  useCreateReportTemplate,
  useDeleteReportTemplate,
  useReportHistory,
  useGenerateReport,
  useEntityLookup,
  useHydratedIncidents,
} from "@/hooks";
import type {
  CameraStatDto,
  IncidentItem,
  ReportGenerationDto,
  ReportTemplateDto,
  ReportingFilterParams,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";

const STAT_TO_URL: Record<ReportStatKey, string> = {
  totalViolations: "violations",
  complianceRate: "compliance",
  mttr: "mttr",
  pendingReview: "pending",
  reportsCount: "reports",
};

const URL_TO_STAT: Record<string, ReportStatKey> = {
  violations: "totalViolations",
  "total-violations": "totalViolations",
  totalViolations: "totalViolations",
  compliance: "complianceRate",
  "compliance-rate": "complianceRate",
  complianceRate: "complianceRate",
  mttr: "mttr",
  pending: "pendingReview",
  "pending-review": "pendingReview",
  pendingReview: "pendingReview",
  reports: "reportsCount",
  "reports-count": "reportsCount",
  reportsCount: "reportsCount",
};

const MAX_DATE_RANGE_DAYS = 90;
const MAX_REPORT_INCIDENT_PAGES = 50;
const MAX_CONCURRENT_DETAIL_FETCHES = 4;
let activeDetailFetches = 0;
let detailRateLimitedUntilMs = 0;
const detailPendingQueue: Array<() => void> = [];

async function fetchIncidentDetailThrottled(
  incidentId: string,
  signal?: AbortSignal,
): Promise<IncidentItem | null> {
  if (Date.now() < detailRateLimitedUntilMs) return null;
  if (activeDetailFetches >= MAX_CONCURRENT_DETAIL_FETCHES) {
    await new Promise<void>((resolve) => {
      detailPendingQueue.push(resolve);
    });
  }
  if (signal?.aborted || Date.now() < detailRateLimitedUntilMs) {
    const next = detailPendingQueue.shift();
    if (next) next();
    return null;
  }
  activeDetailFetches += 1;
  try {
    return await incidentService.getIncidentById(incidentId, {
      signal,
      suppressToast: true,
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && Number((err as { status?: unknown }).status) === 429) {
      detailRateLimitedUntilMs = Date.now() + 20 * 1000;
      return null;
    }
    return null;
  } finally {
    activeDetailFetches = Math.max(0, activeDetailFetches - 1);
    const next = detailPendingQueue.shift();
    if (next) next();
  }
}

async function fetchAllIncidentsInRange(
  params: { siteId?: string; fromDate: string; toDate: string },
  signal?: AbortSignal,
): Promise<IncidentItem[]> {
  const firstPage = await incidentService.getIncidents(
    {
      siteId: params.siteId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: 1,
      limit: 100,
      sortBy: "detectedAt",
      sortOrder: "desc",
      includeAssignments: true,
    },
    { signal },
  );

  const byId = new Map<string, IncidentItem>();
  for (const item of firstPage.items) {
    byId.set(item.id, item);
  }

  const totalPages = Math.min(firstPage.meta?.totalPages ?? 1, MAX_REPORT_INCIDENT_PAGES);
  for (let page = 2; page <= totalPages; page += 3) {
    signal?.throwIfAborted();
    const batchPages = Array.from(
      { length: Math.min(3, totalPages - page + 1) },
      (_, offset) =>
        incidentService.getIncidents(
          {
            siteId: params.siteId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            page: page + offset,
            limit: 100,
            sortBy: "detectedAt",
            sortOrder: "desc",
            includeAssignments: true,
          },
          { signal },
        ),
    );
    const results = await Promise.all(batchPages);
    for (const res of results) {
      for (const item of res.items) {
        byId.set(item.id, item);
      }
    }
  }

  return Array.from(byId.values());
}

export default function ReportsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user } = useAuth();
  const can = useCan();
  const canExportReports = can("PPE_REPORTING_EXPORT");
  const canViewUsers = can("USER_READ");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createTemplateMutation = useCreateReportTemplate();
  const deleteTemplateMutation = useDeleteReportTemplate();
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] =
    useState<ReportTemplateDto | null>(null);

  // URL state synchronization for top-level tab & stats
  const tabParam = searchParams.get("tab");
  const activeTab: ReportsPageTab = tabParam === "reports" ? "reports" : "analytics";

  const handleTabChange = (nextTab: ReportsPageTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "reports") {
      params.set("tab", "reports");
      params.delete("stat");
    } else {
      params.delete("tab");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: ReportStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Filter States (Analytics Tab)
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [period, setPeriod] = useState("30d");
  const [customStartDate, setCustomStartDate] = useState(
    () => addCalendarDays(vietnamToday(), -29)
  );
  const [customEndDate, setCustomEndDate] = useState(
    () => vietnamToday()
  );
  const [trendGroupBy, setTrendGroupBy] = useState<TrendGroupBy>("DAY");

  // Filter & Selection States (Reports Tab)
  const [reportsSiteId, setReportsSiteId] = useState("");
  const [historyType, setHistoryType] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [archiveKpiFilter, setArchiveKpiFilter] = useState<ReportArchiveKpiKey | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const historyPageSize = 10;

  const { startDate, endDate } = useMemo(
    () => getReportDateRange(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate],
  );

  const rangeError = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (startDate > endDate) {
      return t("reports.toolbar.invalidRange");
    }
    const diffDays =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      return t("reports.toolbar.rangeExceeds90");
    }
    return null;
  }, [startDate, endDate, t]);

  const isDateRangeValid = !rangeError;

  const activeDateRangeLabel = useMemo(() => {
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return y && m && d ? `${d}/${m}/${y}` : iso;
    };
    return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  }, [startDate, endDate]);

  const filterParams: ReportingFilterParams = useMemo(
    () => ({
      siteId: selectedSiteId || undefined,
      startDate,
      endDate,
    }),
    [selectedSiteId, startDate, endDate]
  );

  // Entity Lookup (Real Sites & Cameras)
  const { sites, getCamera, getSiteName } = useEntityLookup();

  // Queries from Reporting Service
  const {
    data: rawSummary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isRefetching: isSummaryRefetching,
  } = useReportSummary(filterParams, { enabled: isDateRangeValid });

  const {
    data: rawTrends = [],
    isLoading: isTrendsLoading,
    isFetching: isTrendsFetching,
    refetch: refetchTrends,
  } = useViolationTrends(
    { ...filterParams, groupBy: trendGroupBy },
    { enabled: isDateRangeValid }
  );

  const {
    data: rawDistribution = [],
    isLoading: isDistributionLoading,
    isFetching: isDistributionFetching,
    refetch: refetchDistribution,
  } = useViolationDistribution(filterParams, { enabled: isDateRangeValid });

  const {
    data: rawCameraRankings = [],
    isFetching: isRankingsFetching,
    refetch: refetchRankings,
  } = useCameraRankings({ ...filterParams, limit: 5 }, { enabled: isDateRangeValid });

  const {
    data: templates = [],
    isFetching: isTemplatesFetching,
    refetch: refetchTemplates,
  } = useReportTemplates();

  const {
    data: historyResult,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useReportHistory({
    page: historyPage,
    limit: historyPageSize,
    reportType: historyType || undefined,
    status: historyStatus || undefined,
    siteId: reportsSiteId || undefined,
  });

  const { fromDate, toDate } = useMemo(
    () => getVietnamDateBoundaries(startDate, endDate),
    [startDate, endDate],
  );

  // Live Incidents Query (đảm bảo luôn đồng bộ đầy đủ với ppe_incident_db thực tế trong khoảng thời gian chọn)
  const {
    data: periodIncidents = [],
    isLoading: isIncidentsLoading,
    isFetching: isIncidentsFetching,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: [
      ...incidentKeys.lists(),
      "reports-period",
      { siteId: selectedSiteId || undefined, fromDate, toDate },
    ],
    enabled: isDateRangeValid,
    staleTime: 30 * 1000,
    queryFn: ({ signal }) =>
      fetchAllIncidentsInRange(
        { siteId: selectedSiteId || undefined, fromDate, toDate },
        signal,
      ),
  });

  const filteredIncidents = useMemo(
    () =>
      filterIncidentsInDateRange(
        periodIncidents,
        startDate,
        endDate,
        selectedSiteId || undefined,
      ),
    [periodIncidents, selectedSiteId, startDate, endDate],
  );

  // Hydrate assignments & directory user names for Row 2 Funnel & Personnel Performance
  const {
    incidents: hydratedIncidents,
    isHydratingAssignments,
    usersById,
    siteManagersBySiteId,
    siteOfficersBySiteId,
    allUsers,
  } = useHydratedIncidents(filteredIncidents, {
    enabled: activeTab === "analytics" && isDateRangeValid,
    includeClosed: true,
    maxHydrateCount: 60,
  });

  // Hydrate statusHistory (via throttled GET /incidents/:id) for non-PENDING incidents
  // so Safety Manager reviews/closures & Admin interventions are accurately attributed without BE changes.
  const historyFallbackIds = useMemo(() => {
    if (activeTab !== "analytics" || !isDateRangeValid || isHydratingAssignments) return [];
    const ids: string[] = [];
    for (const inc of hydratedIncidents) {
      const status = String(inc.status || "").toUpperCase();
      if (status === "PENDING_REVIEW") continue;
      if (Array.isArray(inc.statusHistory) && inc.statusHistory.length > 0) continue;
      ids.push(inc.id);
      if (ids.length >= 60) break;
    }
    return ids;
  }, [activeTab, isDateRangeValid, isHydratingAssignments, hydratedIncidents]);

  const detailHistoryQueries = useQueries({
    queries: historyFallbackIds.map((id) => ({
      queryKey: incidentKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchIncidentDetailThrottled(id, signal),
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
      enabled: activeTab === "analytics" && isDateRangeValid,
    })),
  });

  const isHydratingHistory = detailHistoryQueries.some((q) => q.isLoading);

  const enrichedIncidents = useMemo(() => {
    if (historyFallbackIds.length === 0) return hydratedIncidents;
    const detailMap = new Map<string, IncidentItem>();
    historyFallbackIds.forEach((id, idx) => {
      const detail = detailHistoryQueries[idx]?.data;
      if (detail) detailMap.set(id, detail);
    });
    if (detailMap.size === 0) return hydratedIncidents;
    return hydratedIncidents.map((inc) => {
      const detail = detailMap.get(inc.id);
      if (!detail) return inc;
      return {
        ...inc,
        assignments: detail.assignments?.length ? detail.assignments : inc.assignments,
        statusHistory: detail.statusHistory?.length ? detail.statusHistory : inc.statusHistory,
      };
    });
  }, [hydratedIncidents, historyFallbackIds, detailHistoryQueries]);

  const resolutionFunnel = useMemo(
    () => computeResolutionFunnel(enrichedIncidents),
    [enrichedIncidents],
  );

  const siteComparisonStats = useMemo(() => {
    const scopedSites = selectedSiteId
      ? sites.filter((site) => site.id === selectedSiteId)
      : sites;
    return computeSiteComparisonStats(enrichedIncidents, scopedSites, getSiteName);
  }, [enrichedIncidents, sites, selectedSiteId, getSiteName]);

  const personnelPerformance = useMemo(
    () =>
      computeRoleSegmentedPersonnelStats(enrichedIncidents, {
        usersById,
        allUsers,
        siteManagersBySiteId,
        siteOfficersBySiteId,
        selectedSiteId,
        resolveSiteName: getSiteName,
      }),
    [
      enrichedIncidents,
      usersById,
      allUsers,
      siteManagersBySiteId,
      siteOfficersBySiteId,
      selectedSiteId,
      getSiteName,
    ],
  );

  // Reconcile Summary: ưu tiên số liệu đầy đủ nhất giữa Reporting Rollup và Live Incidents
  const isRollupAuthoritative = useMemo(() => {
    return Boolean(
      rawSummary &&
      rawSummary.totalIncidents >= filteredIncidents.length &&
      rawSummary.totalIncidents > 0
    );
  }, [rawSummary, filteredIncidents.length]);

  const summary: StatisticsSummaryDto = useMemo(() => {
    // Tính MTTR bổ sung từ severityBreakdown hoặc filteredIncidents khi BE trả 0
    let fallbackMttrHours = 0;
    const sb = rawSummary?.severityBreakdown;
    if (sb) {
      let weightedMinutes = 0;
      let totalResolvedWithMttr = 0;
      for (const lvl of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
        const entry = sb[lvl];
        if (entry && entry.actualMttrMinutes > 0 && entry.resolved > 0) {
          weightedMinutes += entry.actualMttrMinutes * entry.resolved;
          totalResolvedWithMttr += entry.resolved;
        }
      }
      if (totalResolvedWithMttr > 0) {
        fallbackMttrHours = Number((weightedMinutes / totalResolvedWithMttr / 60).toFixed(2));
      }
    }

    if (fallbackMttrHours === 0 && filteredIncidents.length > 0) {
      let totalResolveHours = 0;
      let resolvedWithTimestamp = 0;
      for (const inc of filteredIncidents) {
        const st = String(inc.status || "").toUpperCase();
        if (st === "RESOLVED" || st === "CLOSED") {
          const endTs = inc.resolvedAt || inc.updatedAt;
          if (inc.detectedAt && endTs) {
            const diffHours =
              (new Date(endTs).getTime() - new Date(inc.detectedAt).getTime()) / 3600000;
            if (diffHours > 0) {
              totalResolveHours += diffHours;
              resolvedWithTimestamp++;
            }
          }
        }
      }
      if (resolvedWithTimestamp > 0) {
        fallbackMttrHours = Number((totalResolveHours / resolvedWithTimestamp).toFixed(2));
      }
    }

    if (isRollupAuthoritative && rawSummary) {
      return {
        ...rawSummary,
        meanTimeToResolveHours:
          rawSummary.meanTimeToResolveHours > 0
            ? rawSummary.meanTimeToResolveHours
            : fallbackMttrHours,
      };
    }

    const totalIncidents = filteredIncidents.length;
    let openIncidents = 0;
    let resolvedIncidents = 0;
    let falseAlarms = 0;
    let trueViolations = 0;

    for (const inc of filteredIncidents) {
      const status = String(inc.status || "").toUpperCase();
      if (status === "PENDING_REVIEW") {
        openIncidents++;
      } else if (status === "CONFIRMED") {
        trueViolations++;
      } else if (status === "DISMISSED") {
        falseAlarms++;
      } else if (status === "RESOLVED" || status === "CLOSED") {
        resolvedIncidents++;
      } else {
        openIncidents++;
      }
    }

    const reviewedCount = trueViolations + falseAlarms;
    const falseAlarmRate =
      reviewedCount > 0
        ? Number(((falseAlarms / reviewedCount) * 100).toFixed(2))
        : 0;
    // SEC-26: đồng bộ công thức tuyến tính với BE (bỏ hệ số 1.5)
    const complianceRate =
      totalIncidents > 0
        ? Number(
            Math.max(0, 100 - (trueViolations / totalIncidents) * 100).toFixed(2)
          )
        : 100;
    const meanTimeToResolveHours =
      fallbackMttrHours > 0
        ? fallbackMttrHours
        : rawSummary?.meanTimeToResolveHours ?? 0;

    return {
      totalIncidents,
      openIncidents,
      resolvedIncidents,
      trueViolations,
      falseAlarms,
      falseAlarmRate,
      complianceRate,
      meanTimeToResolveHours,
      periodStart: startDate,
      periodEnd: endDate,
      severityBreakdown: rawSummary?.severityBreakdown,
    };
  }, [isRollupAuthoritative, rawSummary, filteredIncidents, startDate, endDate]);

  // Reconcile Trends (hỗ trợ gom nhóm DAY / WEEK / MONTH đồng bộ BE, lấp đầy chuỗi thời gian liên tục)
  const trends: TrendItemDto[] = useMemo(
    () =>
      reconcileReportTrends({
        rawTrends,
        rawSummary,
        filteredIncidents,
        startDate,
        endDate,
        groupBy: trendGroupBy,
      }),
    [rawTrends, rawSummary, filteredIncidents, startDate, endDate, trendGroupBy],
  );

  // Reconcile Violation Distribution
  const distribution: ViolationTypeStatDto[] = useMemo(() => {
    if (isRollupAuthoritative && rawDistribution.length > 0) return rawDistribution;
    if (filteredIncidents.length === 0) return rawDistribution;

    const map = new Map<
      string,
      {
        count: number;
        severityBreakdown: {
          LOW: number;
          NORMAL: number;
          MEDIUM: number;
          HIGH: number;
          CRITICAL: number;
        };
      }
    >();

    for (const inc of filteredIncidents) {
      const vType = inc.violationType || "UNKNOWN";
      const item = map.get(vType) || {
        count: 0,
        severityBreakdown: {
          LOW: 0,
          NORMAL: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        },
      };
      item.count += 1;
      const sev = (inc.severity || "HIGH").toUpperCase();
      if (sev in item.severityBreakdown) {
        (item.severityBreakdown as Record<string, number>)[sev] += 1;
      }
      map.set(vType, item);
    }

    const grandTotal = filteredIncidents.length;
    return Array.from(map.entries()).map(([violationType, data]) => ({
      violationType,
      count: data.count,
      percentage: grandTotal > 0 ? Number(((data.count / grandTotal) * 100).toFixed(2)) : 0,
      severityBreakdown: data.severityBreakdown,
    }));
  }, [isRollupAuthoritative, rawDistribution, filteredIncidents]);

  // Reconcile & Enrich Camera Rankings with Real Camera Names
  const cameraRankings: CameraStatDto[] = useMemo(() => {
    const baseList: CameraStatDto[] =
      isRollupAuthoritative && rawCameraRankings.length > 0
        ? rawCameraRankings
        : filteredIncidents.length > 0
          ? (() => {
            const camMap = new Map<string, CameraStatDto>();
            for (const inc of filteredIncidents) {
              if (!inc.cameraId) continue;
              const item = camMap.get(inc.cameraId) || {
                cameraId: inc.cameraId,
                totalViolations: 0,
                confirmedCount: 0,
                falseAlarmCount: 0,
                resolvedCount: 0,
              };
              item.totalViolations += 1;
              if (inc.status === "CONFIRMED" || inc.status === "RESOLVED" || inc.status === "CLOSED") {
                item.confirmedCount += 1;
              }
              if (inc.status === "DISMISSED") {
                item.falseAlarmCount += 1;
              }
              if (inc.status === "RESOLVED" || inc.status === "CLOSED") {
                item.resolvedCount += 1;
              }
              camMap.set(inc.cameraId, item);
            }
            return Array.from(camMap.values())
              .sort((a, b) => b.totalViolations - a.totalViolations)
              .slice(0, 5);
          })()
          : rawCameraRankings;

    return baseList.map((item) => {
      const cam = getCamera(item.cameraId);
      return {
        ...item,
        cameraName:
          item.cameraName ||
          (cam ? `${cam.name} (${cam.code})` : `Camera #${item.cameraId.slice(0, 8)}`),
      };
    });
  }, [isRollupAuthoritative, rawCameraRankings, filteredIncidents, getCamera]);

  // Enrich History with Real Site Names
  const history = useMemo(() => {
    const items = historyResult?.items || [];
    return items.map((item) => ({
      ...item,
      siteName:
        item.siteName ||
        (item.siteId ? getSiteName(item.siteId, item.siteId.slice(0, 8)) : undefined),
    }));
  }, [historyResult, getSiteName]);

  // Mutations
  const generateMutation = useGenerateReport();

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateDto | null>(null);

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportGenerationDto | null>(null);

  // Auto-toast notification when queued report finishes
  const prevProcessingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const items = historyResult?.items || [];
    const currentlyProcessing = new Set(
      items
        .filter((item) => item.status === "PENDING" || item.status === "PROCESSING")
        .map((item) => item.id)
    );

    for (const id of prevProcessingIdsRef.current) {
      if (!currentlyProcessing.has(id)) {
        const finished = items.find((item) => item.id === id);
        if (finished && finished.status === "COMPLETED") {
          const toastMsg = t("reports.queue.completedToast").replace(
            "{fileName}",
            finished.fileName || (locale === "vi-VN" ? "báo cáo mới" : "new report")
          );
          toast.success(toastMsg);
        }
      }
    }

    prevProcessingIdsRef.current = currentlyProcessing;
  }, [historyResult?.items, locale, t]);

  const isAdminUser = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const archiveStats = useMemo(
    () =>
      computeReportArchiveStats(
        history,
        templates,
        historyResult?.meta?.total,
      ),
    [history, templates, historyResult?.meta?.total],
  );

  // Auto-select first accessible completed report (or first item) for inline preview
  useEffect(() => {
    if (history.length === 0) {
      if (selectedReportId !== null) setSelectedReportId(null);
      return;
    }
    const stillExists = history.some((item) => item.id === selectedReportId);
    if (stillExists) return;

    const preferred =
      history.find(
        (item) =>
          item.status === "COMPLETED" &&
          canAccessGeneratedReport(item, user?.id, isAdminUser),
      ) || history[0];
    setSelectedReportId(preferred?.id ?? null);
  }, [history, selectedReportId, user?.id, isAdminUser]);

  const selectedReport = useMemo(
    () => history.find((item) => item.id === selectedReportId) ?? null,
    [history, selectedReportId],
  );

  const handleOpenGenerate = (template?: ReportTemplateDto) => {
    setSelectedTemplate(template || null);
    setIsGenerateOpen(true);
  };

  const handleQuickGenerateForType = (reportType: string) => {
    const active = templates.filter(
      (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE",
    );
    const match = active.find((tpl) => {
      const code = tpl.code.toUpperCase();
      if (reportType === "DAILY") return code.includes("DAILY");
      if (reportType === "WEEKLY") return code.includes("WEEKLY");
      if (reportType === "MONTHLY") return code.includes("MONTHLY");
      if (reportType === "VIOLATION_SUMMARY") return code.includes("VIOLATION");
      if (reportType === "AI_PERFORMANCE") return code.includes("AI");
      return false;
    });
    handleOpenGenerate(match || active[0]);
  };

  const handleSelectArchiveKpi = (key: ReportArchiveKpiKey) => {
    setArchiveKpiFilter((prev) => (prev === key ? null : key));
    if (key === "all") {
      setHistoryType("");
      setHistoryStatus("");
      setHistoryPage(1);
    } else if (key === "periodic") {
      setHistoryType((prev) => (prev === "DAILY" ? "" : "DAILY"));
      setHistoryPage(1);
    } else if (key === "specialized") {
      setHistoryType((prev) =>
        prev === "VIOLATION_SUMMARY" ? "" : "VIOLATION_SUMMARY",
      );
      setHistoryPage(1);
    } else if (key === "templates") {
      document
        .getElementById("reports-templates-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenPreview = (report: ReportGenerationDto) => {
    setPreviewReport(report);
    setIsPreviewOpen(true);
  };

  const handleRefreshAll = () => {
    const tasks: Promise<unknown>[] = [refetchTemplates(), refetchHistory()];
    if (isDateRangeValid) {
      tasks.push(
        refetchSummary(),
        refetchTrends(),
        refetchDistribution(),
        refetchRankings(),
        refetchIncidents(),
      );
    }
    void Promise.all(tasks);
  };

  const isRefetching =
    isSummaryRefetching ||
    isTrendsFetching ||
    isDistributionFetching ||
    isRankingsFetching ||
    isTemplatesFetching ||
    isHistoryFetching ||
    isIncidentsFetching;
  const isOverallLoading = isSummaryLoading && isIncidentsLoading;

  return (
    <div className="space-y-6">
      {/* Header 2 tầng đồng bộ phong cách CameraFleetHeader */}
      <ReportsHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalIncidents={summary.totalIncidents}
        complianceRate={summary.complianceRate}
        totalReports={archiveStats.totalReports}
        activeTemplates={archiveStats.activeTemplatesCount}
        isRefreshing={isRefetching}
        canExportReports={canExportReports}
        onRefreshAll={handleRefreshAll}
        onGenerateReport={() => handleOpenGenerate()}
        onCreateTemplate={() => setIsCreateTemplateOpen(true)}
      />

      {activeTab === "analytics" ? (
        /* =================================================================== */
        /* TAB 01: THỐNG KÊ & PHÂN TÍCH AN TOÀN (Safety Analytics)             */
        /* =================================================================== */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI riêng cho Tab Thống kê (4 thẻ an toàn + Detail Panel) */}
          <ReportKpiSummary
            summary={summary}
            loading={isOverallLoading}
            selectedStat={selectedStat}
            onSelectStat={handleSelectStat}
            distribution={distribution}
            trends={trends}
            cameraRankings={cameraRankings}
            templates={templates}
            history={history}
            sites={sites}
            incidents={filteredIncidents}
            onGenerateReport={(tpl) => handleOpenGenerate(tpl)}
            onViewHistory={() => handleTabChange("reports")}
          />

          {/* Filter Toolbar (Scope & Timeframe for Analytics) */}
          <ReportFilterToolbar
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSiteChange={setSelectedSiteId}
            period={period}
            onPeriodChange={setPeriod}
            startDate={customStartDate}
            endDate={customEndDate}
            activeDateRangeLabel={activeDateRangeLabel}
            rangeError={rangeError}
            onStartDateChange={setCustomStartDate}
            onEndDateChange={setCustomEndDate}
          />

          {/* Row 1: 2-Column Analytics Charts: Trends (8 cols) & Violation Breakdown (4 cols) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col lg:col-span-8">
              <ReportTrendChart
                trends={trends}
                loading={(isTrendsLoading || isIncidentsLoading) && trends.length === 0}
                dateRangeLabel={activeDateRangeLabel}
                groupBy={trendGroupBy}
                onGroupByChange={setTrendGroupBy}
              />
            </div>
            <div className="flex flex-col lg:col-span-4">
              <ReportViolationDonut
                distribution={distribution}
                loading={(isDistributionLoading || isIncidentsLoading) && distribution.length === 0}
              />
            </div>
          </div>

          {/* Row 2: Resolution Funnel / Site Comparison (5 cols) & Personnel Performance (7 cols) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col lg:col-span-5">
              <ReportResolutionFunnelCard
                funnel={resolutionFunnel}
                siteStats={siteComparisonStats}
                selectedSiteId={selectedSiteId}
                onSelectSite={setSelectedSiteId}
                loading={isIncidentsLoading && filteredIncidents.length === 0}
              />
            </div>
            <div className="flex flex-col lg:col-span-7">
              <ReportPersonnelPerformanceCard
                summary={personnelPerformance}
                loading={isIncidentsLoading && filteredIncidents.length === 0}
                hydrating={isHydratingAssignments || isHydratingHistory}
                canViewUsers={canViewUsers}
              />
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* TAB 02: BÁO CÁO & XEM TÀI LIỆU TRỰC TIẾP (Reports & Inline View)   */
        /* =================================================================== */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI riêng cho Tab Báo cáo */}
          <ReportsArchiveKpiSummary
            stats={archiveStats}
            loading={isHistoryLoading}
            activeFilter={archiveKpiFilter}
            onSelectCard={handleSelectArchiveKpi}
          />

          {/* Danh mục 5 Loại Báo cáo Hệ thống */}
          <ReportTypeOverviewStrip
            selectedType={historyType}
            onSelectType={(nextType) => {
              setHistoryType(nextType);
              setHistoryPage(1);
            }}
            countsByType={archiveStats.byType}
            totalCount={archiveStats.totalReports}
            templates={templates}
            canExportReports={canExportReports}
            onQuickGenerateForType={handleQuickGenerateForType}
          />

          {/* Master-Detail Workspace: Danh sách Hồ sơ (4 cols) + Trình xem Trực tiếp (8 cols) */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-stretch">
            <div className="xl:col-span-4">
              <ReportHistoryList
                history={history}
                selectedReportId={selectedReport?.id ?? null}
                onSelectReport={(report) => setSelectedReportId(report.id)}
                loading={isHistoryLoading}
                fetching={isHistoryFetching}
                onRefresh={() => {
                  void refetchHistory();
                }}
                sites={sites}
                selectedSiteId={reportsSiteId}
                onSiteChange={(siteId) => {
                  setReportsSiteId(siteId);
                  setHistoryPage(1);
                }}
                selectedType={historyType}
                onTypeChange={(type) => {
                  setHistoryType(type);
                  setHistoryPage(1);
                }}
                selectedStatus={historyStatus}
                onStatusChange={(status) => {
                  setHistoryStatus(status);
                  setHistoryPage(1);
                }}
                page={historyPage}
                pageCount={Math.max(1, historyResult?.meta?.totalPages ?? 1)}
                total={historyResult?.meta?.total ?? history.length}
                onPageChange={setHistoryPage}
                currentUserId={user?.id}
                isAdmin={isAdminUser}
              />
            </div>

            <div className="xl:col-span-8">
              <ReportInlineViewer
                report={selectedReport}
                currentUserId={user?.id}
                isAdmin={isAdminUser}
                onOpenModalPreview={handleOpenPreview}
              />
            </div>
          </div>

          {/* Danh mục Mẫu Báo cáo Tiêu chuẩn */}
          <section
            id="reports-templates-section"
            className="border-t border-border/40 pt-6"
          >
            <ReportTemplateCards
              templates={templates}
              canExport={canExportReports}
              onSelectTemplate={(tpl) => handleOpenGenerate(tpl)}
              onCreateTemplate={
                canExportReports ? () => setIsCreateTemplateOpen(true) : undefined
              }
              onDeleteTemplate={
                canExportReports ? (tpl) => setDeleteTemplateTarget(tpl) : undefined
              }
            />
          </section>
        </div>
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        templates={templates}
        sites={sites}
        selectedTemplate={selectedTemplate}
        defaultSiteId={activeTab === "reports" ? reportsSiteId || selectedSiteId : selectedSiteId}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        loading={generateMutation.isPending}
        onSubmit={async (dto) => {
          const createdReport = await generateMutation.mutateAsync(dto);
          setIsGenerateOpen(false);
          if (createdReport) {
            setSelectedReportId(createdReport.id);
            handleTabChange("reports");
            try {
              // Tự động tải file về máy tính ngay lập tức
              await reportingService.downloadReportFile(createdReport);
            } catch (err: any) {
              console.error("Auto-download failed:", err);
            }
          }
        }}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        report={previewReport}
        onDownload={(report) => reportingService.downloadReportFile(report)}
      />

      <CreateReportTemplateModal
        open={isCreateTemplateOpen}
        onOpenChange={setIsCreateTemplateOpen}
        loading={createTemplateMutation.isPending}
        onSubmit={(dto) => createTemplateMutation.mutateAsync(dto)}
      />

      <ConfirmDialog
        open={Boolean(deleteTemplateTarget)}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={async () => {
          if (!deleteTemplateTarget) return;
          await deleteTemplateMutation.mutateAsync(deleteTemplateTarget.id);
          setDeleteTemplateTarget(null);
        }}
        variant="danger"
        loading={deleteTemplateMutation.isPending}
        title={isVietnamese ? "Xóa mẫu báo cáo?" : "Delete report template?"}
        description={deleteTemplateTarget?.name || ""}
        confirmText={t("common.delete")}
      />
    </div>
  );
}
