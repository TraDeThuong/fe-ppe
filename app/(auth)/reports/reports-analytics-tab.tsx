import { useEffect, useMemo, useState } from "react";
import { ReportCameraRanking } from "@/components/features/reports/report-camera-ranking";
import { ReportFilterToolbar } from "@/components/features/reports/report-filter-toolbar";
import { ReportKpiSummary } from "@/components/features/reports/report-kpi-summary";
import { ReportResolutionFunnelCard } from "@/components/features/reports/report-resolution-funnel-card";
import type { ReportStatKey } from "@/components/features/reports/report-stats-detail-panel";
import { ReportTrendChart, type TrendGroupBy } from "@/components/features/reports/report-trend-chart";
import { ReportViolationDonut } from "@/components/features/reports/report-violation-donut";
import {
  useCameraRankings,
  useReportSummary,
  useViolationDistribution,
  useViolationTrends,
} from "@/hooks/reporting/use-report-statistics";
import { addCalendarDays, vietnamToday } from "@/lib/dashboard-data";
import {
  computeResolutionFunnelFromSummary,
  getReportDateRange,
  reconcileReportTrends,
  type SiteComparisonStat,
} from "@/lib/report-analytics-data";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem, StatisticsSummaryDto, TrendItemDto } from "@/types";

const MAX_DATE_RANGE_DAYS = 90;
const EMPTY_TRENDS: TrendItemDto[] = [];

function normalizeSummary(summary?: StatisticsSummaryDto) {
  if (!summary || summary.meanTimeToResolveHours > 0 || !summary.severityBreakdown) {
    return summary;
  }

  let weightedMinutes = 0;
  let resolvedWithMttr = 0;
  for (const entry of Object.values(summary.severityBreakdown)) {
    if (entry && entry.actualMttrMinutes > 0 && entry.resolved > 0) {
      weightedMinutes += entry.actualMttrMinutes * entry.resolved;
      resolvedWithMttr += entry.resolved;
    }
  }

  return {
    ...summary,
    meanTimeToResolveHours: resolvedWithMttr
      ? Number((weightedMinutes / resolvedWithMttr / 60).toFixed(2))
      : 0,
  };
}

export function useReportsAnalytics({
  enabled,
  siteIdParam,
  sites,
}: {
  enabled: boolean;
  siteIdParam: string;
  sites: SiteItem[];
}) {
  const { t } = useLocale();
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdParam);
  const [period, setPeriod] = useState("30d");
  const [customStartDate, setCustomStartDate] = useState(
    () => addCalendarDays(vietnamToday(), -29),
  );
  const [customEndDate, setCustomEndDate] = useState(() => vietnamToday());
  const [trendGroupBy, setTrendGroupBy] = useState<TrendGroupBy>("DAY");

  useEffect(() => {
    setSelectedSiteId(siteIdParam);
  }, [siteIdParam]);

  const { startDate, endDate } = useMemo(
    () => getReportDateRange(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate],
  );

  const diffDays = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000;
  const rangeError = startDate > endDate
    ? t("reports.toolbar.invalidRange")
    : diffDays > MAX_DATE_RANGE_DAYS
      ? t("reports.toolbar.rangeExceeds90")
      : null;

  const filterParams = { siteId: selectedSiteId || undefined, startDate, endDate };
  const queryOptions = { enabled: enabled && !rangeError };
  const summaryQuery = useReportSummary(filterParams, queryOptions);
  const trendsQuery = useViolationTrends(
    { ...filterParams, groupBy: trendGroupBy },
    queryOptions,
  );
  const distributionQuery = useViolationDistribution(filterParams, queryOptions);
  const rankingsQuery = useCameraRankings({ ...filterParams, limit: 5 }, queryOptions);

  const rawSummary = summaryQuery.data;
  const rawTrends = trendsQuery.data ?? EMPTY_TRENDS;
  const summary = useMemo(() => normalizeSummary(rawSummary), [rawSummary]);
  const trends = useMemo(
    () =>
      reconcileReportTrends({
        rawTrends,
        rawSummary,
        filteredIncidents: [],
        startDate,
        endDate,
        groupBy: trendGroupBy,
      }),
    [rawTrends, rawSummary, startDate, endDate, trendGroupBy],
  );
  const distribution = useMemo(
    () => distributionQuery.data?.filter((item) => item.violationType !== "TOTAL_AGGREGATED") ?? [],
    [distributionQuery.data],
  );
  const resolutionFunnel = useMemo(() => computeResolutionFunnelFromSummary(summary), [summary]);

  const unknownSiteName = t("reports.charts.unknownSite");
  const siteComparisonStats = useMemo(() => {
    if (!summary) return [];

    const sitesById = new Map(sites.map((site) => [site.id, site]));
    const bySite = new Map(summary.siteBreakdown?.map((item) => [item.siteId, item]));
    const siteIds = selectedSiteId
      ? [selectedSiteId]
      : summary.siteBreakdown
        ? Array.from(bySite.keys())
        : sites.length === 1
          ? [sites[0].id]
          : [];

    return siteIds.map<SiteComparisonStat>((siteId) => {
      const site = sitesById.get(siteId);
      const stats = bySite.get(siteId) ?? summary;
      const trueViolationsTotal = stats.trueViolations + stats.resolvedIncidents;
      return {
        siteId,
        siteName: site?.name ?? unknownSiteName,
        siteCode: site?.code ?? siteId.slice(-8),
        canSelect: Boolean(site),
        totalIncidents: stats.totalIncidents,
        pendingReview: stats.openIncidents,
        confirmedActive: stats.trueViolations,
        resolvedCount: stats.resolvedIncidents,
        falseAlarms: stats.falseAlarms,
        complianceRate: stats.complianceRate,
        resolutionRate: trueViolationsTotal
          ? Math.round((stats.resolvedIncidents / trueViolationsTotal) * 100)
          : 100,
        meanTimeToResolveHours: stats.meanTimeToResolveHours,
      };
    }).sort((a, b) => b.totalIncidents - a.totalIncidents || a.complianceRate - b.complianceRate);
  }, [sites, selectedSiteId, summary, unknownSiteName]);

  const activeDateRangeLabel = startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;

  function refresh() {
    if (rangeError) return;
    void Promise.all([
      summaryQuery.refetch(),
      trendsQuery.refetch(),
      distributionQuery.refetch(),
      rankingsQuery.refetch(),
    ]);
  }

  return {
    sites,
    selectedSiteId,
    setSelectedSiteId,
    period,
    setPeriod,
    startDate,
    endDate,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    activeDateRangeLabel,
    rangeError,
    trendGroupBy,
    setTrendGroupBy,
    summary,
    trends,
    distribution,
    rankings: rankingsQuery.data,
    resolutionFunnel,
    siteComparisonStats,
    isSummaryLoading: summaryQuery.isLoading,
    isTrendsLoading: trendsQuery.isLoading,
    isDistributionLoading: distributionQuery.isLoading,
    isRankingsLoading: rankingsQuery.isLoading,
    isStatsUnavailable: [summaryQuery, trendsQuery, distributionQuery, rankingsQuery].some(
      (query) => query.isError && query.data === undefined,
    ),
    isRefreshing:
      summaryQuery.isRefetching ||
      trendsQuery.isFetching ||
      distributionQuery.isFetching ||
      rankingsQuery.isFetching,
    refresh,
  };
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export function ReportsAnalyticsTab({
  analytics,
  selectedStat,
  onSelectStat,
  onViewHistory,
}: {
  analytics: ReturnType<typeof useReportsAnalytics>;
  selectedStat: ReportStatKey | null;
  onSelectStat: (stat: ReportStatKey | null) => void;
  onViewHistory: () => void;
}) {
  const { t } = useLocale();
  const showStats = !analytics.rangeError && !analytics.isStatsUnavailable;
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {showStats ? (
        <ReportKpiSummary
          summary={analytics.summary}
          loading={analytics.isSummaryLoading}
          selectedStat={selectedStat}
          onSelectStat={onSelectStat}
          onViewHistory={onViewHistory}
        />
      ) : null}

      <ReportFilterToolbar
        sites={analytics.sites}
        selectedSiteId={analytics.selectedSiteId}
        onSiteChange={analytics.setSelectedSiteId}
        period={analytics.period}
        onPeriodChange={analytics.setPeriod}
        startDate={analytics.customStartDate}
        endDate={analytics.customEndDate}
        activeDateRangeLabel={analytics.activeDateRangeLabel}
        rangeError={analytics.rangeError}
        onStartDateChange={analytics.setCustomStartDate}
        onEndDateChange={analytics.setCustomEndDate}
      />

      {analytics.isStatsUnavailable ? (
        <p role="alert" className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          {t("reports.analytics.statsUnavailable")}
        </p>
      ) : null}

      {showStats ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col lg:col-span-8">
              <ReportTrendChart
                trends={analytics.trends}
                loading={analytics.isTrendsLoading && analytics.trends.length === 0}
                dateRangeLabel={analytics.activeDateRangeLabel}
                groupBy={analytics.trendGroupBy}
                onGroupByChange={analytics.setTrendGroupBy}
              />
            </div>
            <div className="flex flex-col lg:col-span-4">
              <ReportViolationDonut
                distribution={analytics.distribution}
                loading={analytics.isDistributionLoading && analytics.distribution.length === 0}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col lg:col-span-5">
              <ReportResolutionFunnelCard
                funnel={analytics.resolutionFunnel}
                siteStats={analytics.siteComparisonStats}
                selectedSiteId={analytics.selectedSiteId}
                onSelectSite={analytics.setSelectedSiteId}
                loading={analytics.isSummaryLoading}
              />
            </div>
            <div className="flex flex-col lg:col-span-7">
              <ReportCameraRanking
                rankings={analytics.rankings}
                loading={analytics.isRankingsLoading}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
