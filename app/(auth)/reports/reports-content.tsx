"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calculator,
  FilePlus2,
  FileText,
  History,
  LayoutTemplate,
  RefreshCw,
} from "lucide-react";
import { useTableState } from "@/hooks/use-table-state";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import {
  ReportKpiSummary,
  ReportFilterToolbar,
  ReportTrendChart,
  ReportViolationDonut,
  ReportCameraRanking,
  ReportTemplateCards,
  ReportHistoryTable,
  GenerateReportModal,
  ReportPreviewModal,
  CreateReportTemplateModal,
  AggregateDailyModal,
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
  useAggregateDaily,
  useReportHistory,
  useGenerateReport,
  useIncidents,
  useEntityLookup,
} from "@/hooks";
import type {
  CameraStatDto,
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
  reports: "reportsCount",
  "reports-count": "reportsCount",
  reportsCount: "reportsCount",
};

const MAX_DATE_RANGE_DAYS = 90;

function getIsoWeekKey(dateStr: string): string {
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

function computeDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);

  const daysBack = period === "today" ? 0 : period === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - daysBack * 86400000);
  const startDate = start.toISOString().slice(0, 10);

  return { startDate, endDate };
}

export default function ReportsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user } = useAuth();
  const canExportReports = useCan()("PPE_REPORTING_EXPORT");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createTemplateMutation = useCreateReportTemplate();
  const deleteTemplateMutation = useDeleteReportTemplate();
  const aggregateDailyMutation = useAggregateDaily();
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAggregateOpen, setIsAggregateOpen] = useState(false);
  const [deleteTemplateTarget, setDeleteTemplateTarget] =
    useState<ReportTemplateDto | null>(null);

  // URL state synchronization for stats
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

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [period, setPeriod] = useState("30d");
  const [customStartDate, setCustomStartDate] = useState(
    () => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const [historyType, setHistoryType] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [exportsView, setExportsView] = useState<"history" | "templates">("history");
  const [trendGroupBy, setTrendGroupBy] = useState<TrendGroupBy>("DAY");
  const historyTable = useTableState([], `${selectedSiteId}:${historyType}:${historyStatus}`);

  const { startDate, endDate } = useMemo(() => {
    if (period === "custom") {
      return {
        startDate: customStartDate || computeDateRange("30d").startDate,
        endDate: customEndDate || computeDateRange("30d").endDate,
      };
    }
    return computeDateRange(period);
  }, [period, customStartDate, customEndDate]);

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
    refetch: refetchTrends,
  } = useViolationTrends(
    { ...filterParams, groupBy: trendGroupBy },
    { enabled: isDateRangeValid }
  );

  const {
    data: rawDistribution = [],
    isLoading: isDistributionLoading,
    refetch: refetchDistribution,
  } = useViolationDistribution(filterParams, { enabled: isDateRangeValid });

  const {
    data: rawCameraRankings = [],
    refetch: refetchRankings,
  } = useCameraRankings({ ...filterParams, limit: 5 }, { enabled: isDateRangeValid });

  const {
    data: templates = [],
    refetch: refetchTemplates,
  } = useReportTemplates();

  const {
    data: historyResult,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    error: historyError,
    refetch: refetchHistory,
  } = useReportHistory({
    page: historyTable.pagination.pageIndex + 1,
    limit: historyTable.pagination.pageSize,
    reportType: historyType || undefined,
    status: historyStatus || undefined,
    siteId: selectedSiteId || undefined,
  });

  // Live Incidents Query (đảm bảo luôn đồng bộ với ppe_incident_db thực tế)
  const {
    data: incidentsData,
    isLoading: isIncidentsLoading,
    refetch: refetchIncidents,
  } = useIncidents({
    siteId: selectedSiteId || undefined,
    limit: 100,
  });

  const filteredIncidents = useMemo(() => {
    const all = incidentsData?.items ?? [];
    return all.filter((inc) => {
      if (selectedSiteId && inc.siteId !== selectedSiteId) return false;
      const d = (inc.detectedAt || inc.createdAt || "").slice(0, 10);
      if (!d) return true;
      return d >= startDate && d <= endDate;
    });
  }, [incidentsData, selectedSiteId, startDate, endDate]);

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

  // Reconcile Trends (hỗ trợ gom nhóm DAY / WEEK / MONTH đồng bộ BE)
  const trends: TrendItemDto[] = useMemo(() => {
    if (isRollupAuthoritative && rawTrends.length > 0) return rawTrends;
    if (filteredIncidents.length === 0) return rawTrends;

    const map = new Map<string, TrendItemDto>();
    for (const inc of filteredIncidents) {
      const rawDateKey = (inc.detectedAt || inc.createdAt || "").slice(0, 10);
      if (!rawDateKey) continue;
      const dateKey =
        trendGroupBy === "WEEK"
          ? getIsoWeekKey(rawDateKey)
          : trendGroupBy === "MONTH"
            ? rawDateKey.slice(0, 7)
            : rawDateKey;
      const existing = map.get(dateKey) || {
        date: dateKey,
        totalIncidents: 0,
        trueViolations: 0,
        falseAlarms: 0,
        resolvedCount: 0,
      };
      existing.totalIncidents += 1;
      if (inc.status === "DISMISSED") {
        existing.falseAlarms += 1;
      } else {
        existing.trueViolations += 1;
      }
      if (inc.status === "RESOLVED" || inc.status === "CLOSED") {
        existing.resolvedCount += 1;
      }
      map.set(dateKey, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [isRollupAuthoritative, rawTrends, filteredIncidents, trendGroupBy]);

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

  const handleOpenGenerate = (template?: ReportTemplateDto) => {
    setSelectedTemplate(template || null);
    setIsGenerateOpen(true);
  };

  const handleOpenPreview = (report: ReportGenerationDto) => {
    setPreviewReport(report);
    setIsPreviewOpen(true);
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchTrends();
    refetchDistribution();
    refetchRankings();
    refetchTemplates();
    refetchHistory();
    refetchIncidents();
  };

  const isRefetching = isSummaryRefetching;
  const isOverallLoading = isSummaryLoading && isIncidentsLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={BarChart3}
        title={t("reports.title")}
        description={t("reports.description")}
        badge="Analytics & Exports"
        badgeIcon={BarChart3}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleRefreshAll}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>

            {canExportReports && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAggregateOpen(true)}
                  className="gap-1.5"
                >
                  <Calculator className="h-4 w-4 text-primary" />
                  <span>{isVietnamese ? "Tổng hợp ngày" : "Aggregate Daily"}</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenGenerate()}
                  className="gap-1.5"
                >
                  <FilePlus2 className="h-4 w-4" />
                  <span>{t("reports.toolbar.generateBtn")}</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Bento Console KPI Summary with Interactive Detail Panel */}
      <ReportKpiSummary
        summary={summary}
        reportsCount={historyResult?.meta?.total ?? history.length}
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
        onViewHistory={() => setExportsView("history")}
      />

      {/* ===================================================================== */}
      {/* SECTION 1: THỐNG KÊ & PHÂN TÍCH AN TOÀN (Safety Analytics)            */}
      {/* ===================================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {t("reports.sections.analyticsTitle")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {t("reports.sections.analyticsDesc")}
              </p>
            </div>
          </div>
        </div>

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

        {/* 2-Column Analytics Charts: Trends (8 cols) & Violation Breakdown (4 cols) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col lg:col-span-8">
            <ReportTrendChart
              trends={trends}
              loading={isTrendsLoading && isIncidentsLoading}
              dateRangeLabel={activeDateRangeLabel}
              groupBy={trendGroupBy}
              onGroupByChange={setTrendGroupBy}
            />
          </div>
          <div className="flex flex-col lg:col-span-4">
            <ReportViolationDonut
              distribution={distribution}
              loading={isDistributionLoading && isIncidentsLoading}
            />
          </div>
        </div>

        {/* Camera Violations Ranking */}
        <ReportCameraRanking
          rankings={cameraRankings}
          loading={isOverallLoading}
        />
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: BÁO CÁO & XUẤT TÀI LIỆU (Reports & Exports)               */}
      {/* ===================================================================== */}
      <section
        id="reports-history-section"
        className="space-y-4 border-t border-border/40 pt-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-foreground sm:text-base">
                {t("reports.sections.exportsTitle")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {t("reports.sections.exportsDesc")}
              </p>
            </div>
          </div>

          {/* Segmented Switch: Lịch sử Xuất Báo cáo | Mẫu Báo cáo Tiêu chuẩn */}
          <div className="flex w-full items-center gap-1 rounded-xl bg-background/75 p-1 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:w-fit">
            <button
              type="button"
              onClick={() => setExportsView("history")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 sm:flex-none ${
                exportsView === "history"
                  ? "bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>{t("reports.sections.tabHistory")}</span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-primary">
                {historyResult?.meta?.total ?? history.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExportsView("templates")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 sm:flex-none ${
                exportsView === "templates"
                  ? "bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span>{t("reports.sections.tabTemplates")}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-muted-foreground">
                {templates.length}
              </span>
            </button>
          </div>
        </div>

        {exportsView === "history" ? (
          <ReportHistoryTable
            history={history}
            loading={isHistoryLoading}
            onPreview={handleOpenPreview}
            currentUserId={user?.id}
            isAdmin={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
            toolbarFilters={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value)}
                  aria-label={t("reports.history.type")}
                  className="h-9 rounded-xl border border-border/40 bg-background px-2.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] focus:border-primary focus:outline-none"
                >
                  <option value="">
                    {t("reports.history.type")}: {t("table.all")}
                  </option>
                  {[
                    "DAILY",
                    "WEEKLY",
                    "MONTHLY",
                    "VIOLATION_SUMMARY",
                    "AI_PERFORMANCE",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>

                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  aria-label={t("reports.history.status")}
                  className="h-9 rounded-xl border border-border/40 bg-background px-2.5 text-xs font-semibold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] focus:border-primary focus:outline-none"
                >
                  <option value="">
                    {t("reports.history.status")}: {t("table.all")}
                  </option>
                  {["PENDING", "PROCESSING", "COMPLETED", "FAILED"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    )
                  )}
                </select>
              </div>
            }
            tableState={{
              ...historyTable,
              rowCount: historyResult?.meta?.total ?? history.length,
              pageCount: historyResult?.meta?.totalPages ?? 1,
              fetching: isHistoryFetching,
              error: historyError,
              onRetry: () => {
                void refetchHistory();
              },
            }}
          />
        ) : (
          <ReportTemplateCards
            templates={templates}
            hideHeader
            canExport={canExportReports}
            onSelectTemplate={(tpl) => handleOpenGenerate(tpl)}
            onCreateTemplate={
              canExportReports ? () => setIsCreateTemplateOpen(true) : undefined
            }
            onDeleteTemplate={
              canExportReports ? (tpl) => setDeleteTemplateTarget(tpl) : undefined
            }
          />
        )}
      </section>

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        templates={templates}
        sites={sites}
        selectedTemplate={selectedTemplate}
        defaultSiteId={selectedSiteId}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        loading={generateMutation.isPending}
        onSubmit={async (dto) => {
          const createdReport = await generateMutation.mutateAsync(dto);
          setIsGenerateOpen(false);
          if (createdReport) {
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

      <AggregateDailyModal
        open={isAggregateOpen}
        onOpenChange={setIsAggregateOpen}
        sites={sites}
        defaultSiteId={selectedSiteId}
        loading={aggregateDailyMutation.isPending}
        onSubmit={(payload) => aggregateDailyMutation.mutateAsync(payload)}
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
