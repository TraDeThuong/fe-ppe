"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, FilePlus2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  ReportKpiSummary,
  ReportFilterToolbar,
  ReportTrendChart,
  ReportViolationDonut,
  ReportCameraRanking,
  ReportTemplateCards,
  ReportHistoryTable,
  GenerateReportModal,
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
} from "@/hooks";
import type {
  CameraStatDto,
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

  const { startDate, endDate } = useMemo(() => computeDateRange(period), [period]);

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
    refetch: refetchHistory,
  } = useReportHistory({
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
  const summary: StatisticsSummaryDto = useMemo(() => {
    if (rawSummary && rawSummary.totalIncidents >= filteredIncidents.length && rawSummary.totalIncidents > 0) {
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
  }, [rawSummary, filteredIncidents, startDate, endDate]);

  // Reconcile Trends
  const trends: TrendItemDto[] = useMemo(() => {
    if (rawTrends.length > 0) return rawTrends;
    if (filteredIncidents.length === 0) return [];

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
  }, [rawTrends, filteredIncidents]);

  // Reconcile Violation Distribution
  const distribution: ViolationTypeStatDto[] = useMemo(() => {
    if (rawDistribution.length > 0) return rawDistribution;
    if (filteredIncidents.length === 0) return [];

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
        severityBreakdown: { LOW: 0, NORMAL: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
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
  }, [rawDistribution, filteredIncidents]);

  // Reconcile & Enrich Camera Rankings with Real Camera Names
  const cameraRankings: CameraStatDto[] = useMemo(() => {
    const baseList: CameraStatDto[] =
      rawCameraRankings.length > 0
        ? rawCameraRankings
        : (() => {
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
          })();

    return baseList.map((item) => {
      const cam = getCamera(item.cameraId);
      return {
        ...item,
        cameraName:
          item.cameraName ||
          (cam ? `${cam.name} (${cam.code})` : `Camera #${item.cameraId.slice(0, 8)}`),
      };
    });
  }, [rawCameraRankings, filteredIncidents, getCamera]);

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

  const handleOpenGenerate = (template?: ReportTemplateDto) => {
    setSelectedTemplate(template || null);
    setIsGenerateOpen(true);
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

      {/* Filter Toolbar */}
      <ReportFilterToolbar
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSiteChange={setSelectedSiteId}
        period={period}
        onPeriodChange={setPeriod}
        onGenerateClick={() => handleOpenGenerate()}
        onRefresh={handleRefreshAll}
        loading={isRefetching}
      />

      {/* 2-Column: Trends Line Chart (Left: 8 cols) & Violation Donut (Right: 4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ReportTrendChart trends={trends} loading={isTrendsLoading && isIncidentsLoading} />
        </div>
        <div className="lg:col-span-4">
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

      {/* Export History & Queue Table */}
      <div id="reports-history-section">
        <ReportHistoryTable history={history} loading={isHistoryLoading} />
      </div>

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        templates={templates}
        sites={sites}
        selectedTemplate={selectedTemplate}
        defaultSiteId={selectedSiteId}
        loading={generateMutation.isPending}
        onSubmit={async (dto) => {
          await generateMutation.mutateAsync(dto);
        }}
      />
    </div>
  );
}
