"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Cpu,
  FilePlus2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useTableState } from "@/hooks/use-table-state";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
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
  ReportAiPerformance,
  type ReportStatKey,
} from "@/components/features/reports";
import {
  useReportSummary,
  useViolationTrends,
  useViolationDistribution,
  useCameraRankings,
  useReportTemplates,
  useReportHistory,
  useGenerateReport,
  useIncidents,
  useEntityLookup,
  useAiPerformanceStats,
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

function computeDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);

  const daysBack = period === "today" ? 0 : period === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - daysBack * 86400000);
  const startDate = start.toISOString().slice(0, 10);

  return { startDate, endDate };
}

export default function ReportsContent() {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Tab State: "violations" | "aiPerformance"
  const [activeTab, setActiveTab] = useState<"violations" | "aiPerformance">("violations");

  const [historyType, setHistoryType] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
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
  } = useReportSummary(filterParams);

  const {
    data: rawTrends = [],
    isLoading: isTrendsLoading,
    refetch: refetchTrends,
  } = useViolationTrends(filterParams);

  const {
    data: rawDistribution = [],
    isLoading: isDistributionLoading,
    refetch: refetchDistribution,
  } = useViolationDistribution(filterParams);

  const {
    data: rawCameraRankings = [],
    isLoading: isRankingsLoading,
    refetch: refetchRankings,
  } = useCameraRankings({ ...filterParams, limit: 5 });

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

  // AI Performance Telemetry Query
  const {
    data: aiStats = [],
    isLoading: isAiStatsLoading,
    refetch: refetchAiStats,
  } = useAiPerformanceStats(filterParams);

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
    if (isRollupAuthoritative && rawSummary) {
      return rawSummary;
    }

    const totalIncidents = filteredIncidents.length;
    let openIncidents = 0;
    let resolvedIncidents = 0;
    let falseAlarms = 0;
    let trueViolations = 0;
    let totalResolveHours = 0;
    let resolvedWithTimestamp = 0;

    for (const inc of filteredIncidents) {
      if (inc.status === "RESOLVED" || inc.status === "CLOSED") {
        resolvedIncidents++;
        trueViolations++;
        if (inc.detectedAt && inc.resolvedAt) {
          const diffHours =
            (new Date(inc.resolvedAt).getTime() - new Date(inc.detectedAt).getTime()) /
            3600000;
          if (diffHours > 0) {
            totalResolveHours += diffHours;
            resolvedWithTimestamp++;
          }
        }
      } else if (inc.status === "DISMISSED") {
        falseAlarms++;
      } else {
        openIncidents++;
        trueViolations++;
      }
    }

    const reviewedCount = trueViolations + falseAlarms;
    const falseAlarmRate =
      reviewedCount > 0
        ? Number(((falseAlarms / reviewedCount) * 100).toFixed(2))
        : 0;
    const complianceRate =
      totalIncidents > 0
        ? Number(
          Math.max(
            0,
            100 - (trueViolations / (totalIncidents * 1.5 || 1)) * 100
          ).toFixed(2)
        )
        : 100;
    const meanTimeToResolveHours =
      resolvedWithTimestamp > 0
        ? Number((totalResolveHours / resolvedWithTimestamp).toFixed(1))
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
    };
  }, [isRollupAuthoritative, rawSummary, filteredIncidents, startDate, endDate]);

  // Reconcile Trends
  const trends: TrendItemDto[] = useMemo(() => {
    if (isRollupAuthoritative && rawTrends.length > 0) return rawTrends;
    if (filteredIncidents.length === 0) return rawTrends;

    const map = new Map<string, TrendItemDto>();
    for (const inc of filteredIncidents) {
      const dateKey = (inc.detectedAt || inc.createdAt || "").slice(0, 10);
      if (!dateKey) continue;
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
  }, [isRollupAuthoritative, rawTrends, filteredIncidents]);

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
            finished.fileName || "báo cáo mới"
          );
          toast.success(toastMsg);
        }
      }
    }

    prevProcessingIdsRef.current = currentlyProcessing;
  }, [historyResult?.items, t]);

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
    refetchAiStats();
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleRefreshAll}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => handleOpenGenerate()}
              className="gap-1.5"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>{t("reports.toolbar.generateBtn")}</span>
            </Button>
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
      />

      {/* Filter Toolbar with Custom Date Range */}
      <ReportFilterToolbar
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSiteChange={setSelectedSiteId}
        period={period}
        onPeriodChange={setPeriod}
        startDate={customStartDate}
        endDate={customEndDate}
        onStartDateChange={setCustomStartDate}
        onEndDateChange={setCustomEndDate}
        onGenerateClick={() => handleOpenGenerate()}
        onRefresh={handleRefreshAll}
        loading={isRefetching}
      />

      {/* Neumorphic Navigation Tabs: Safety Violations vs AI Model Performance */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("violations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "violations"
              ? "bg-primary text-primary-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)]"
              : "bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>{t("reports.tabs.violations")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("aiPerformance")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "aiPerformance"
              ? "bg-primary text-primary-foreground shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)]"
              : "bg-surface text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>{t("reports.tabs.aiPerformance")}</span>
        </button>
      </div>

      {/* Tab 1: Safety Violations Analytics */}
      {activeTab === "violations" && (
        <div className="space-y-6">
          {/* 2-Column: Trends Line Chart (Left: 8 cols) & Violation Donut (Right: 4 cols) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col lg:col-span-8">
              <ReportTrendChart
                trends={trends}
                loading={isTrendsLoading && isIncidentsLoading}
              />
            </div>
            <div className="flex flex-col lg:col-span-4">
              <ReportViolationDonut
                distribution={distribution}
                loading={isDistributionLoading && isIncidentsLoading}
              />
            </div>
          </div>

          {/* Camera Hotspot Risk Rankings */}
          <ReportCameraRanking
            rankings={cameraRankings}
            loading={isRankingsLoading && isIncidentsLoading}
          />

          {/* Standardized Report Templates Cards */}
          <ReportTemplateCards
            templates={templates}
            onSelectTemplate={(tpl) => handleOpenGenerate(tpl)}
          />
        </div>
      )}

      {/* Tab 2: AI Model Performance & Telemetry */}
      {activeTab === "aiPerformance" && (
        <ReportAiPerformance stats={aiStats} loading={isAiStatsLoading} />
      )}

      {/* Export History & Queue Table with Preview Action */}
      <div id="reports-history-section">
        <ReportHistoryTable
          history={history}
          loading={isHistoryLoading}
          onPreview={handleOpenPreview}
          tableState={{
            ...historyTable,
            rowCount: historyResult?.meta?.total ?? history.length,
            pageCount: historyResult?.meta?.totalPages ?? 1,
            fetching: isHistoryFetching,
            error: historyError,
            onRetry: () => {
              void refetchHistory();
            },
            toolbar: (
              <div className="flex flex-wrap gap-3">
                <label className="text-xs">
                  {t("reports.history.type")}
                  <select
                    value={historyType}
                    onChange={(e) => setHistoryType(e.target.value)}
                    className="ml-2 rounded-xl border border-border bg-background p-2"
                  >
                    <option value="">{t("table.all")}</option>
                    {[
                      "DAILY",
                      "WEEKLY",
                      "MONTHLY",
                      "VIOLATION_SUMMARY",
                      "AI_PERFORMANCE",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  {t("reports.history.status")}
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                    className="ml-2 rounded-xl border border-border bg-background p-2"
                  >
                    <option value="">{t("table.all")}</option>
                    {["PENDING", "PROCESSING", "COMPLETED", "FAILED"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      )
                    )}
                  </select>
                </label>
              </div>
            ),
          }}
        />
      </div>

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
    </div>
  );
}
