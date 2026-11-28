"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Cctv, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { useGenerateReport, useReportTemplates } from "@/hooks/reporting";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import {
  useBatchReviewIncidents,
  useResolveIncident,
  useReviewIncident,
} from "@/hooks/incidents";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import { aiMetricsKeys } from "@/hooks/ai-metrics/ai-metrics.query-keys";
import { maintenanceQueryKeys } from "@/hooks/maintenance/maintenance.query-keys";
import { siteKeys, useSites } from "@/hooks/sites";
import {
  useDashboardData,
  useDashboardPeriod,
} from "@/hooks/dashboard/use-dashboard-data";
import { dashboardIncidentHref } from "@/lib/dashboard-data";
import type { IncidentAggregationMode } from "@/lib/incident-cluster-engine";
import { Button } from "@/components/ui/button";
import {
  DashboardHeroHeader,
  DashboardKpiRibbon,
  DashboardLiveIncidents,
  DashboardAiStatusCard,
  DashboardQuickActions,
  DashboardOperationalSuite,
  DashboardPpeRadarChart,
  DashboardViolationTrendsChart,
  type DashboardTabKey,
  DashboardZoneRiskChart,
} from "@/components/features/dashboard";
import {
  DashboardDataState,
  DashboardPanel,
} from "@/components/features/dashboard/dashboard-data-state";
import { GenerateReportModal } from "@/components/features/reports";
import { DashboardMobileOverview } from "@/components/features/dashboard/mobile";
import { useResponsiveVariant } from "@/hooks/use-media-query";
import { ResolveIncidentModal } from "@/components/features/incidents/resolve-incident-modal";
import { ReviewIncidentModal } from "@/components/features/incidents/review-incident-modal";
import type {
  GenerateReportDto,
  IncidentItem,
  ResolveIncidentPayload,
  ReviewIncidentPayload,
} from "@/types";
import type {
  DashboardPreset,
  DashboardTrendGroupBy,
} from "@/types/dashboard.types";

const HelmetShowcase = dynamic(
  () =>
    import("@/components/features/dashboard/helmet-showcase").then(
      (mod) => mod.HelmetShowcase,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[340px] w-full animate-pulse rounded-2xl border border-border/40 bg-surface/90 sm:min-h-[440px] sm:rounded-[26px] lg:min-h-[510px]" />
    ),
  },
);

export default function DashboardContent() {
  const { user, status } = useAuth();
  const { siteId, setSiteId, isReady } = useSite();
  const { isConnected, lastAlert } = useRealtime();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  // Mobile (< 768px): bản Tổng quan gọn; bản desktop (kể cả mô hình 3D) không được mount trên điện thoại.
  const { showMobile, showDesktop } = useResponsiveVariant();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialPeriodParam = searchParams.get("period") as DashboardPreset | null;
  const rawPeriodState = useDashboardPeriod({
    preset: initialPeriodParam,
    customStart: searchParams.get("from"),
    customEnd: searchParams.get("to"),
  });

  const syncPeriodUrl = useCallback(
    (nextPreset: DashboardPreset, nextStart: string, nextEnd: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPreset === "today") {
        params.delete("period");
        params.delete("from");
        params.delete("to");
      } else {
        params.set("period", nextPreset);
        if (nextPreset === "custom") {
          params.set("from", nextStart);
          params.set("to", nextEnd);
        } else {
          params.delete("from");
          params.delete("to");
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const periodState = useMemo(
    () => ({
      ...rawPeriodState,
      setPreset: (next: DashboardPreset) => {
        rawPeriodState.setPreset(next);
        syncPeriodUrl(next, rawPeriodState.customStart, rawPeriodState.customEnd);
      },
      setCustomStart: (value: string) => {
        rawPeriodState.setCustomStart(value);
        syncPeriodUrl(rawPeriodState.preset, value, rawPeriodState.customEnd);
      },
      setCustomEnd: (value: string) => {
        rawPeriodState.setCustomEnd(value);
        syncPeriodUrl(rawPeriodState.preset, rawPeriodState.customStart, value);
      },
    }),
    [rawPeriodState, syncPeriodUrl],
  );
  const { period } = periodState;

  const initialTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(
    initialTabParam === "safety" || initialTabParam === "devices"
      ? initialTabParam
      : "overview",
  );

  const handleTabChange = useCallback(
    (tab: DashboardTabKey) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupingMode, setGroupingMode] =
    useState<IncidentAggregationMode>("clustered");
  const [trendGroupBy, setTrendGroupBy] =
    useState<DashboardTrendGroupBy>("DAY");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(
    null,
  );
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<IncidentItem | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const permissions = user?.permissions ?? [];
  const authenticated = status === "authenticated" && !!user;
  const isAdmin = user?.role === "ADMIN";

  const canViewReports =
    authenticated && (isAdmin || permissions.includes("PPE_REPORTING_READ"));
  const canExportReports =
    authenticated && (isAdmin || permissions.includes("PPE_REPORTING_EXPORT"));
  const canViewIncidents =
    authenticated && (isAdmin || permissions.includes("PPE_INCIDENT_READ"));
  const canReviewIncidents =
    canViewIncidents && (isAdmin || permissions.includes("PPE_INCIDENT_REVIEW"));
  const canResolveIncidents =
    canViewIncidents && (isAdmin || permissions.includes("PPE_INCIDENT_UPDATE"));
  const canViewCameras =
    authenticated && (isAdmin || permissions.includes("PPE_CAMERA_READ"));
  const canViewSites =
    authenticated && (isAdmin || permissions.includes("PPE_SITE_READ"));
  const canViewAiMetrics =
    authenticated && (isAdmin || permissions.includes("PPE_AI_METRICS_READ"));
  const canViewAiModels =
    authenticated && (isAdmin || permissions.includes("PPE_MODEL_READ"));
  const canViewAi = canViewAiMetrics || canViewAiModels;

  // 100% REAL queries from existing backend endpoints
  const data = useDashboardData({
    userId: user?.id,
    siteId,
    period,
    activeTab,
    ready: authenticated && isReady,
    incidents: canViewIncidents,
    analytics: canViewReports,
    cameras: canViewCameras,
    cameraCatalog: activeTab === "devices",
    model: canViewAiModels,
    aiMetrics: canViewAiMetrics,
    groupingMode,
    trendGroupBy,
  });

  const {
    periodQuery,
    pendingQuery,
    recentQuery,
    unresolvedClusters,
    cameraQuery,
    cameraCountsQuery,
    onlineQuery,
    dashboardKpiQuery,
    trendsQuery,
    trendsWindow,
    trends,
    aiPerformanceQuery,
    aiTelemetry,
    modelQuery,
    modelsQuery,
    analytics,
  } = data;

  const { data: sitesData } = useSites(
    { limit: 100 },
    { enabled: canViewSites && isReady },
  );
  const siteName =
    sitesData?.items.find((site) => site.id === siteId)?.name ??
    (siteId ? `Site #${siteId.slice(0, 8)}` : t("dashboard.data.allSites"));

  const { data: reportTemplates = [] } = useReportTemplates({
    enabled: canExportReports && reportModalOpen,
  });
  const generateReport = useGenerateReport();
  const review = useReviewIncident();
  const resolveIncident = useResolveIncident();
  const batchReview = useBatchReviewIncidents();

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: incidentKeys.statusCountsRoot(),
      }),
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: cameraKeys.statusCountsRoot(),
      }),
      queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
      queryClient.invalidateQueries({
        queryKey: aiMetricsKeys.all,
      }),
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
      queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all }),
    ]);
  }, [queryClient]);

  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastAlert || !authenticated) return;
    const relevant = /incident|violation|camera|notification:new/.test(
      lastAlert.type,
    );
    if (!relevant) return;
    if (!eventTimer.current)
      eventTimer.current = setTimeout(() => {
        eventTimer.current = null;
        void invalidate();
      }, 750);
    const payload = lastAlert.data as Record<string, unknown> | null;
    if (typeof payload?.incidentId === "string") {
      setHighlightedId(payload.incidentId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedId(null), 8000);
    }
  }, [lastAlert, authenticated, invalidate]);

  useEffect(
    () => () => {
      if (eventTimer.current) clearTimeout(eventTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const previousConnection = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !previousConnection.current && authenticated)
      void invalidate();
    previousConnection.current = isConnected;
  }, [isConnected, authenticated, invalidate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await invalidate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBatchReview = async (
    ids: string[],
    action: "CONFIRM" | "REJECT",
    resolutionNote?: string,
  ) => {
    await batchReview.mutateAsync({ ids, action, resolutionNote });
  };

  const totalHref = dashboardIncidentHref(siteId, period);
  const pendingHref = dashboardIncidentHref(siteId, null, "PENDING_REVIEW");
  const cameras = cameraQuery.data?.complete ? cameraQuery.data.items : [];
  const totalCamerasCount =
    cameraCountsQuery.data?.total ?? cameraQuery.data?.total ?? null;
  const onlineCamerasCount =
    cameraCountsQuery.data?.online ?? onlineQuery.data ?? null;
  const rawPendingCount =
    pendingQuery.data ?? dashboardKpiQuery.data?.pendingReview ?? null;
  const clusteredPendingCount = useMemo(() => {
    if (!recentQuery.data) return null;
    return unresolvedClusters.filter(
      (cl) => cl.effectiveStatus === "PENDING_REVIEW",
    ).length;
  }, [recentQuery.data, unresolvedClusters]);
  const effectivePendingCount =
    groupingMode === "clustered" &&
    clusteredPendingCount !== null &&
    (rawPendingCount === null || rawPendingCount <= 15)
      ? clusteredPendingCount
      : rawPendingCount;
  const displayPeriodTotal =
    period && canViewReports
      ? (analytics?.total ??
          periodQuery.data?.total ??
          dashboardKpiQuery.data?.totalIncidents ??
          null)
      : null;
  const displayRawPeriodTotal =
    period && canViewReports
      ? (analytics?.rawTotal ?? periodQuery.data?.total ?? null)
      : null;

  // Chỉ số PPE thực tế gắn lên Card "Mô Hình PPE 3D" (Bước 4 — phương án 4B)
  const helmetPpeStats = useMemo(() => {
    if (!canViewReports) return undefined;
    if (!analytics) return null;
    const countOf = (key: string) =>
      analytics.distribution.find((row) => row.key === key)?.count ?? 0;
    return {
      noHelmetCount: countOf("NO_HELMET"),
      noVestCount: countOf("NO_VEST"),
      complianceRate:
        typeof analytics.complianceRate === "number"
          ? analytics.complianceRate
          : null,
      periodLabel: period
        ? periodState.preset === "custom"
          ? `${period.startDate} → ${period.endDate}`
          : t(`dashboard.period.${periodState.preset}`)
        : null,
    };
  }, [canViewReports, analytics, period, periodState.preset, t]);

  const activeModelName = useMemo(() => {
    const activeVersion = modelQuery.data;
    if (!activeVersion) return null;
    const matchedModel = (modelsQuery.data ?? []).find(
      (m) => m.id === activeVersion.modelId,
    );
    return (
      activeVersion.modelName ||
      activeVersion.model?.name ||
      matchedModel?.name ||
      (typeof activeVersion.metrics?.modelName === "string"
        ? activeVersion.metrics.modelName
        : null) ||
      activeVersion.modelPath ||
      null
    );
  }, [modelQuery.data, modelsQuery.data]);

  const kpiAiSummary = useMemo(() => {
    if (!canViewAi) return undefined;
    const activeVersion = modelQuery.data;
    let modelLabel: string | null = null;
    if (activeVersion?.version) {
      const ver = activeVersion.version.replace(/^v/i, "");
      modelLabel = activeModelName ? `${activeModelName} v${ver}` : `v${ver}`;
    } else if (dashboardKpiQuery.data?.activeModel) {
      const ver = dashboardKpiQuery.data.activeModel.version.replace(
        /^v/i,
        "",
      );
      modelLabel = `${dashboardKpiQuery.data.activeModel.name} v${ver}`;
    }
    return {
      modelLabel,
      avgFps: aiTelemetry.avgFps,
      avgLatencyMs: aiTelemetry.avgLatencyMs,
    };
  }, [
    canViewAi,
    modelQuery.data,
    activeModelName,
    dashboardKpiQuery.data?.activeModel,
    aiTelemetry.avgFps,
    aiTelemetry.avgLatencyMs,
  ]);

  const recentIncidents = useMemo(
    () =>
      (recentQuery.data?.items ?? []).map((incident) => {
        const matched = cameras.find(
          (camera) => camera.id === incident.cameraId,
        );
        return {
          ...incident,
          cameraName: matched?.name ?? incident.cameraName,
          cameraCode: matched?.code ?? incident.cameraCode,
          zoneName: matched?.zoneName ?? incident.zoneName,
        };
      }),
    [recentQuery.data, cameras],
  );

  const unavailable = !canViewReports
    ? t("dashboard.data.noAccess")
    : !period
      ? t("dashboard.data.invalidPeriod")
      : periodQuery.isError
        ? t("dashboard.data.error")
        : null;

  const periodNotice = (
    <DashboardDataState
      loading={periodQuery.isFetching && !periodQuery.data}
      message={unavailable}
      stale={periodQuery.isRefetchError}
      updatedAt={periodQuery.dataUpdatedAt}
      onRetry={
        canViewReports && period && isReady
          ? () => void periodQuery.refetch()
          : undefined
      }
    />
  );
  const pendingNotice = (
    <DashboardDataState
      loading={pendingQuery.isLoading}
      message={pendingQuery.isError ? t("dashboard.data.error") : null}
      stale={pendingQuery.isRefetchError}
      updatedAt={pendingQuery.dataUpdatedAt}
      onRetry={() => void pendingQuery.refetch()}
    />
  );
  const cameraNotice = (
    <DashboardDataState
      loading={cameraCountsQuery.isLoading}
      message={
        cameraCountsQuery.isError
          ? t("dashboard.data.error")
          : onlineCamerasCount != null &&
              totalCamerasCount != null &&
              onlineCamerasCount > totalCamerasCount
            ? t("dashboard.data.changed")
            : null
      }
      stale={cameraCountsQuery.isRefetchError}
      updatedAt={cameraCountsQuery.dataUpdatedAt}
      onRetry={() => void cameraCountsQuery.refetch()}
    />
  );

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-10">
      {/* Mobile (< 768px): ô số liệu bấm được + sự cố chưa xử lý */}
      {showMobile && (
        <div className="md:hidden">
          <DashboardMobileOverview
            isOfficer={(user.role || "").toUpperCase() === "SAFETY_OFFICER"}
            canViewIncidents={canViewIncidents}
            canViewCameras={canViewCameras}
            pendingCount={effectivePendingCount}
            confirmedCount={recentQuery.data?.totalConfirmed ?? null}
            onlineCameras={onlineCamerasCount}
            totalCameras={totalCamerasCount}
            pendingHref={pendingHref}
            confirmedHref={dashboardIncidentHref(siteId, null, "CONFIRMED")}
            viewAllHref={dashboardIncidentHref(siteId)}
            incidents={recentIncidents}
            incidentsLoading={recentQuery.isLoading}
            incidentsError={recentQuery.isError && !recentQuery.data}
            onRetry={() => void recentQuery.refetch()}
            highlightedId={highlightedId}
          />
        </div>
      )}

      {/* Desktop (≥ 768px): giữ nguyên */}
      {showDesktop && (
      <div className="hidden flex-col gap-6 md:flex">
      {/* Unified Command Console Header (Identity + Tabs + Scope & Period Filter) */}
      <DashboardHeroHeader
        user={user}
        siteName={siteName}
        isRealtimeConnected={isConnected}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        pendingCount={effectivePendingCount}
        canExportReports={canExportReports}
        onOpenExportReport={() => setReportModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        onlineCameras={onlineCamerasCount}
        totalCameras={totalCamerasCount}
        canViewSafety={canViewIncidents || canViewReports}
        canViewDevices={canViewCameras || canViewAi}
        showFilterBar={canViewReports || canViewIncidents}
        sites={sitesData?.items ?? []}
        siteId={siteId}
        onSiteChange={setSiteId}
        canViewSites={canViewSites}
        periodState={periodState}
      />

      {activeTab === "overview" && (
        <DashboardKpiRibbon
          total={displayPeriodTotal}
          rawTotal={displayRawPeriodTotal}
          pendingCount={effectivePendingCount}
          rawPendingCount={rawPendingCount}
          confirmedCount={
            recentQuery.data?.totalConfirmed ??
            analytics?.trueViolations ??
            null
          }
          totalCamerasCount={totalCamerasCount}
          onlineCamerasCount={onlineCamerasCount}
          aiSummary={kpiAiSummary}
          analytics={analytics}
          canViewReports={canViewReports}
          canViewIncidents={canViewIncidents}
          canViewCameras={canViewCameras}
          periodState={periodNotice}
          pendingState={pendingNotice}
          cameraState={cameraNotice}
          onFilterPending={() => router.push(pendingHref)}
          onNavigateCameras={() => router.push("/cameras")}
          onNavigateReports={() => router.push("/reports")}
          onNavigateIncidents={period ? () => router.push(totalHref) : undefined}
        />
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Row 1: Symmetrical Hero (50% 3D Helmet + 50% Live Incidents or Quick Actions) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="h-full">
              <HelmetShowcase
                className="h-full"
                title={t("dashboard.data.model3d")}
                subtitle={t("dashboard.data.model3dDescription")}
                ppeStats={helmetPpeStats}
                ppeStatsLoading={
                  canViewReports && !analytics && periodQuery.isFetching
                }
              />
            </div>

            {canViewIncidents ? (
              <div className="flex h-full flex-col justify-between space-y-2">
                <DashboardLiveIncidents
                  incidents={recentIncidents}
                  totalPendingCount={recentQuery.data?.totalPending}
                  totalConfirmedCount={recentQuery.data?.totalConfirmed}
                  groupingMode={groupingMode}
                  onChangeGroupingMode={setGroupingMode}
                  loading={recentQuery.isLoading}
                  error={recentQuery.isError && !recentQuery.data}
                  highlightedId={highlightedId}
                  canReview={canReviewIncidents}
                  canResolve={canResolveIncidents}
                  isRealtimeConnected={isConnected}
                  batchReviewPending={batchReview.isPending}
                  dateRangeLabel={period ? `${period.startDate} → ${period.endDate}` : null}
                  onBatchReview={canReviewIncidents ? handleBatchReview : undefined}
                  viewAllHref={dashboardIncidentHref(siteId)}
                  onReview={(incident) => {
                    setSelectedIncident(incident);
                    setReviewModalOpen(true);
                  }}
                  onResolve={(incident) => {
                    setResolveTarget(incident);
                    setResolveModalOpen(true);
                  }}
                />
                <DashboardDataState
                  stale={recentQuery.isRefetchError}
                  message={recentQuery.isError ? t("dashboard.data.error") : null}
                  updatedAt={recentQuery.dataUpdatedAt}
                  onRetry={() => void recentQuery.refetch()}
                />
              </div>
            ) : (
              <div className="h-full">
                <DashboardQuickActions
                  onOpenGenerateReport={
                    canExportReports ? () => setReportModalOpen(true) : undefined
                  }
                  canExportReports={canExportReports}
                  canReviewIncidents={canReviewIncidents}
                />
              </div>
            )}
          </div>

          {/* Row 2: Full-width Violation Trends */}
          {canViewReports && (
            <DashboardViolationTrendsChart
              trends={trends}
              groupBy={trendGroupBy}
              onChangeGroupBy={setTrendGroupBy}
              trendsWindow={trendsWindow}
              loading={trendsQuery.isLoading}
              error={trendsQuery.isError && !trendsQuery.data}
              onRetry={() => void trendsQuery.refetch()}
              className="w-full"
            />
          )}

          {/* Row 3: Quick Actions Bar (4-column horizontal deck — DashboardAiStatusCard lives exclusively in Tab 3 to avoid duplication) */}
          {canViewIncidents && (
            <DashboardQuickActions
              columns={4}
              onOpenGenerateReport={
                canExportReports ? () => setReportModalOpen(true) : undefined
              }
              canExportReports={canExportReports}
              canReviewIncidents={canReviewIncidents}
            />
          )}
        </div>
      )}

      {/* TAB 2: SAFETY & INCIDENTS (DEEP-DIVE) */}
      {activeTab === "safety" && (
        <div className="space-y-6">
          {/* Operational Analytics Suite (Hourly & Severity & MTTR) */}
          {canViewReports &&
            (analytics ? (
              <div className="space-y-6">
                <DashboardOperationalSuite analytics={analytics} />
                <DashboardPpeRadarChart
                  distribution={analytics.distribution}
                  componentBreakdown={analytics.componentViolationBreakdown}
                  rawTotal={analytics.rawTotal}
                />
                <DashboardDataState
                  stale={periodQuery.isRefetchError}
                  updatedAt={periodQuery.dataUpdatedAt}
                  onRetry={() => void periodQuery.refetch()}
                />
              </div>
            ) : (
              <DashboardPanel title={t("dashboard.charts.title")}>
                {periodNotice}
              </DashboardPanel>
            ))}
        </div>
      )}

      {/* TAB 3: DEVICES & AI INTELLIGENCE */}
      {activeTab === "devices" && (
        <div className="space-y-6">
          {/* Devices Top Action & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-surface/90 p-4 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-background border border-border/40 text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-none">
                <Cctv className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isVietnamese
                    ? "Hạ tầng Camera & Trí tuệ Nhân tạo AI"
                    : "Camera Infrastructure & AI Vision"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Giám sát luồng RTSP trực tiếp và thông số mô hình thị giác máy tính"
                    : "Monitor live RTSP feeds and computer vision model metrics"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canViewCameras && (
                <>
                  <Link href="/cameras">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Cctv className="size-3.5" />
                      {isVietnamese ? "Danh sách Camera" : "Camera Fleet"}
                    </Button>
                  </Link>
                  <Link href="/cameras?view=wall">
                    <Button variant="primary" size="sm" className="gap-1.5">
                      <Cctv className="size-3.5" />
                      {isVietnamese ? "Mở Video Wall RTSP" : "Open RTSP Video Wall"}
                    </Button>
                  </Link>
                </>
              )}
              {canViewAi && (
                <Link href="/ai-metrics">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Cpu className="size-3.5" />
                    {isVietnamese ? "Quản lý Mô hình AI" : "AI Model Governance"}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Symmetrical AI Status & Camera Risk Rankings (50% - 50%) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="flex h-full flex-col justify-between space-y-2">
              <DashboardAiStatusCard
                activeVersion={modelQuery.data}
                modelName={activeModelName}
                telemetry={aiTelemetry}
                loading={modelQuery.isLoading || aiPerformanceQuery.isLoading}
                error={modelQuery.isError && !modelQuery.data}
                className="h-full"
              />
              <DashboardDataState
                stale={modelQuery.isRefetchError}
                message={modelQuery.isError ? t("dashboard.data.error") : null}
                updatedAt={modelQuery.dataUpdatedAt}
                onRetry={() => void modelQuery.refetch()}
              />
            </div>
            <div className="h-full">
              <DashboardZoneRiskChart
                cameras={cameras}
                cameraStats={analytics?.cameras ?? []}
                catalogComplete={cameraQuery.data?.complete}
                loading={
                  (canViewCameras && cameraQuery.isLoading) ||
                  (canViewReports &&
                    periodQuery.isFetching &&
                    !periodQuery.data)
                }
                incidentUnavailable={unavailable}
                catalogError={
                  !canViewCameras
                    ? t("dashboard.data.noAccess")
                    : cameraQuery.isError
                      ? t("dashboard.data.error")
                      : null
                }
                onRetry={() => {
                  if (canViewCameras) void cameraQuery.refetch();
                  if (canViewReports && period && isReady) {
                    void periodQuery.refetch();
                  }
                }}
                periodLabel={
                  period
                    ? periodState.preset === "custom"
                      ? `${period.startDate} → ${period.endDate}`
                      : t(`dashboard.period.${periodState.preset}`)
                    : undefined
                }
                preset={periodState.preset}
                onChangePreset={periodState.setPreset}
                onSelectCamera={(id) => router.push(`/cameras/${id}`)}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Modals */}
      {canReviewIncidents && (
        <ReviewIncidentModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          incident={selectedIncident}
          onSubmit={async (id: string, payload: ReviewIncidentPayload) => {
            await review.mutateAsync({ id, payload });
          }}
          loading={review.isPending}
        />
      )}
      {canResolveIncidents && (
        <ResolveIncidentModal
          open={resolveModalOpen}
          onOpenChange={setResolveModalOpen}
          incident={resolveTarget}
          onSubmit={async (id: string, payload: ResolveIncidentPayload) => {
            await resolveIncident.mutateAsync({ id, payload });
          }}
          loading={resolveIncident.isPending}
        />
      )}
      {canExportReports && (
        <GenerateReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          templates={reportTemplates}
          sites={sitesData?.items ?? []}
          defaultSiteId={siteId || undefined}
          onSubmit={async (dto: GenerateReportDto) => {
            await generateReport.mutateAsync(dto);
          }}
          loading={generateReport.isPending}
        />
      )}
    </div>
  );
}
