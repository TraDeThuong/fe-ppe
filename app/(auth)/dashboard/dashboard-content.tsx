"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Cctv,
  FileSpreadsheet,
  LayoutDashboard,
  RefreshCw,
  Shield,
  ShieldAlert,
  Server,
  Users,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { useGenerateReport, useReportTemplates } from "@/hooks/reporting";
import { useReviewIncident } from "@/hooks/incidents";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import { aiMetricsKeys } from "@/hooks/ai-metrics/ai-metrics.query-keys";
import { useSites } from "@/hooks/sites";
import { useUserSummary } from "@/hooks/users";
import { useSystemHealth } from "@/hooks/system/use-system-health";
import {
  useDashboardData,
  useDashboardPeriod,
} from "@/hooks/dashboard/use-dashboard-data";
import { dashboardIncidentHref } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  DashboardKpiRibbon,
  DashboardLiveIncidents,
  DashboardAiStatusCard,
  DashboardQuickActions,
  DashboardOperationalSuite,
  HelmetShowcase,
  DashboardNavTabs,
  type DashboardTabKey,
  DashboardExecutiveKpi,
  DashboardSystemStatusCard,
  DashboardUsersOverviewCard,
  DashboardAuditMiniFeed,
  DashboardCronMiniCard,
  DashboardZoneRiskChart,
} from "@/components/features/dashboard";
import {
  DashboardDataState,
  DashboardPanel,
} from "@/components/features/dashboard/dashboard-data-state";
import { GenerateReportModal } from "@/components/features/reports";
import { ReviewIncidentModal } from "@/components/features/incidents/review-incident-modal";
import type {
  GenerateReportDto,
  IncidentItem,
  ReviewIncidentPayload,
} from "@/types";
import type { DashboardPreset } from "@/types/dashboard.types";

export default function DashboardContent() {
  const { user, status } = useAuth();
  const { siteId, setSiteId, isReady } = useSite();
  const { isConnected, lastAlert } = useRealtime();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const periodState = useDashboardPeriod();
  const { period } = periodState;

  // Tab navigation state synced with URL query (?tab=overview|safety|devices|system)
  const initialTabParam = searchParams.get("tab") as DashboardTabKey | null;
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(
    initialTabParam &&
      ["overview", "safety", "devices", "system"].includes(initialTabParam)
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
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(
    null,
  );
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
  const canViewCameras =
    authenticated && (isAdmin || permissions.includes("PPE_CAMERA_READ"));
  const canViewSites =
    authenticated && (isAdmin || permissions.includes("PPE_SITE_READ"));
  const canViewAi =
    authenticated &&
    (isAdmin ||
      permissions.includes("PPE_AI_METRICS_READ") ||
      permissions.includes("PPE_MODEL_READ"));
  const canViewUsers =
    authenticated && (isAdmin || permissions.includes("USER_READ"));
  const canViewSystem =
    authenticated &&
    (isAdmin ||
      permissions.includes("SYSTEM_CONFIG_READ") ||
      permissions.includes("SYSTEM_CONFIG_UPDATE"));

  // 100% REAL queries from existing backend endpoints
  const data = useDashboardData({
    userId: user?.id,
    siteId,
    period,
    ready: authenticated && isReady,
    incidents: canViewIncidents,
    analytics: canViewReports,
    cameras: canViewCameras,
    model: canViewAi,
  });

  const {
    periodQuery,
    pendingQuery,
    recentQuery,
    cameraQuery,
    onlineQuery,
    modelQuery,
    analytics,
  } = data;

  // Real microservices health and user summaries
  const { data: userSummary } = useUserSummary();
  const { data: systemHealth } = useSystemHealth(30000);

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

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: aiMetricsKeys.activeVersion(),
      }),
      queryClient.invalidateQueries({ queryKey: ["users", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["system", "health"] }),
      queryClient.invalidateQueries({ queryKey: ["audit", "summary"] }),
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

  const totalHref = dashboardIncidentHref(siteId, period);
  const pendingHref = dashboardIncidentHref(siteId, null, "PENDING_REVIEW");
  const cameras = cameraQuery.data?.complete ? cameraQuery.data.items : [];
  const recentIncidents = useMemo(
    () =>
      (recentQuery.data?.items ?? []).map((incident) => ({
        ...incident,
        cameraName:
          cameras.find((camera) => camera.id === incident.cameraId)?.name ??
          incident.cameraName,
      })),
    [recentQuery.data, cameras],
  );

  const unavailable = !canViewIncidents
    ? t("dashboard.data.incidentPermission")
    : !period
      ? t("dashboard.data.invalidPeriod")
      : periodQuery.isError
        ? t("dashboard.data.error")
        : periodQuery.data?.issue
          ? t(`dashboard.data.${periodQuery.data.issue}`)
          : null;

  const periodNotice = (
    <DashboardDataState
      loading={periodQuery.isFetching && !periodQuery.data}
      message={unavailable}
      stale={periodQuery.isRefetchError}
      updatedAt={periodQuery.dataUpdatedAt}
      onRetry={
        canViewReports && canViewIncidents && period && isReady
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
      loading={cameraQuery.isLoading || onlineQuery.isLoading}
      message={
        cameraQuery.isError || onlineQuery.isError
          ? t("dashboard.data.error")
          : cameraQuery.data?.issue
            ? t(`dashboard.data.${cameraQuery.data.issue}`)
            : onlineQuery.data != null &&
                cameraQuery.data?.total != null &&
                onlineQuery.data > cameraQuery.data.total
              ? t("dashboard.data.changed")
              : null
      }
      stale={cameraQuery.isRefetchError || onlineQuery.isRefetchError}
      updatedAt={Math.min(cameraQuery.dataUpdatedAt, onlineQuery.dataUpdatedAt)}
      onRetry={() => {
        void cameraQuery.refetch();
        void onlineQuery.refetch();
      }}
    />
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        icon={LayoutDashboard}
        title={t("nav.dashboard")}
        description={`${t("dashboard.welcome")}, ${user.fullName ?? user.email}`}
        badge={`${isConnected ? t("dashboard.connected") : t("dashboard.disconnected")} · ${siteName}`}
        badgeIcon={Shield}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {t("dashboard.data.refresh")}
            </Button>
            {canReviewIncidents && (
              <Link href={pendingHref}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ShieldAlert className="size-3.5" />
                  {t("dashboard.data.review")} {pendingQuery.data ?? ""}
                </Button>
              </Link>
            )}
            {canViewCameras && (
              <Link href="/cameras?view=wall">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Cctv className="size-3.5" />
                  Video Wall
                </Button>
              </Link>
            )}
            {canExportReports && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReportModalOpen(true)}
                className="gap-1.5"
              >
                <FileSpreadsheet className="size-3.5" />
                {t("dashboard.data.export")}
              </Button>
            )}
          </div>
        }
      />

      {/* Domain Navigation Tabs */}
      <div className="flex items-center justify-between gap-4">
        <DashboardNavTabs
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          pendingCount={pendingQuery.data}
          onlineCameras={onlineQuery.data}
          totalCameras={cameraQuery.data?.total}
          healthyServices={systemHealth?.healthyCount}
          totalServices={systemHealth?.totalServices}
          canViewSafety={canViewIncidents || canViewReports}
          canViewDevices={canViewCameras || canViewAi}
          canViewSystem={canViewUsers || canViewSystem}
        />
      </div>

      {/* Scope & Period Filter Bar (Công trường & Thời gian) */}
      {canViewReports && (
        <section
          className="space-y-3 rounded-2xl border border-border/40 bg-surface/90 p-4 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
          aria-label={t("dashboard.period.title")}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Site Selector Dropdown */}
              {canViewSites && (
                <label className="space-y-1 text-xs font-semibold">
                  <span className="block text-muted-foreground">
                    {t("dashboard.activeSite")}
                  </span>
                  <select
                    aria-label={t("dashboard.activeSite")}
                    value={siteId || ""}
                    onChange={(event) =>
                      setSiteId(event.target.value || null)
                    }
                    className="rounded-xl border border-border/40 bg-background/80 px-3 py-2 text-sm font-medium transition-colors focus:border-primary focus:outline-none dark:border-white/[0.08] dark:bg-background/40 text-foreground"
                  >
                    <option value="">
                      {t("dashboard.data.allSites")} (Toàn hệ thống)
                    </option>
                    {sitesData?.items.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Period Preset Dropdown */}
              <label className="space-y-1 text-xs font-semibold">
                <span className="block text-muted-foreground">
                  {t("dashboard.period.title")}
                </span>
                <select
                  aria-label={t("dashboard.period.title")}
                  value={periodState.preset}
                  onChange={(event) =>
                    periodState.setPreset(
                      event.target.value as DashboardPreset,
                    )
                  }
                  className="rounded-xl border border-border/40 bg-background/80 px-3 py-2 text-sm font-medium transition-colors focus:border-primary focus:outline-none dark:border-white/[0.08] dark:bg-background/40 text-foreground"
                >
                  {(["today", "7d", "month", "custom"] as const).map(
                    (key) => (
                      <option key={key} value={key}>
                        {t(`dashboard.period.${key}`)}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {/* Custom Date Inputs if preset === 'custom' */}
              {periodState.preset === "custom" && (
                <>
                  <label className="space-y-1 text-xs font-semibold">
                    <span className="block text-muted-foreground">
                      {t("dashboard.period.from")}
                    </span>
                    <input
                      type="date"
                      aria-label={t("dashboard.period.from")}
                      value={periodState.customStart}
                      max={
                        periodState.customEnd < periodState.today
                          ? periodState.customEnd
                          : periodState.today
                      }
                      onChange={(event) =>
                        periodState.setCustomStart(event.target.value)
                      }
                      className="rounded-xl border border-border/40 bg-background/80 px-3 py-1.5 text-sm dark:border-white/[0.08] dark:bg-background/40 text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-semibold">
                    <span className="block text-muted-foreground">
                      {t("dashboard.period.to")}
                    </span>
                    <input
                      type="date"
                      aria-label={t("dashboard.period.to")}
                      value={periodState.customEnd}
                      min={periodState.customStart}
                      max={periodState.today}
                      onChange={(event) =>
                        periodState.setCustomEnd(event.target.value)
                      }
                      className="rounded-xl border border-border/40 bg-background/80 px-3 py-1.5 text-sm dark:border-white/[0.08] dark:bg-background/40 text-foreground"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Scope Summary Indicator */}
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-foreground">
                <span className="font-bold text-foreground">{siteName}</span> ·{" "}
                <span className="font-mono font-semibold text-primary">
                  {period
                    ? `${period.startDate} → ${period.endDate}`
                    : t("dashboard.data.invalidPeriod")}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("dashboard.period.scope")} · Asia/Ho_Chi_Minh (UTC+7)
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 1: EXECUTIVE OVERVIEW (CROSS-DOMAIN) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive 4-Pillar Metric Ribbon */}
          <DashboardExecutiveKpi
            totalIncidents={
              period && canViewIncidents ? (periodQuery.data?.total ?? null) : null
            }
            pendingCount={pendingQuery.data ?? null}
            onlineCameras={onlineQuery.data ?? null}
            totalCameras={cameraQuery.data?.total ?? null}
            aiModelVersion={
              modelQuery.data?.version
                ? `YOLO ${modelQuery.data.version}`
                : "YOLO11x active"
            }
            totalUsers={userSummary?.total ?? null}
            activeUsers={userSummary?.active ?? null}
            twoFactorCount={userSummary?.twoFactor ?? null}
            healthyServices={systemHealth?.healthyCount ?? null}
            totalServices={systemHealth?.totalServices ?? null}
            avgLatencyMs={systemHealth?.averageLatencyMs ?? null}
            systemStatus={systemHealth?.overallStatus ?? "HEALTHY"}
            onSelectPillar={handleTabChange}
          />

          {/* Row 1: Symmetrical Hero (50% 3D Helmet + 50% Live System Status Card) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="h-full">
              <HelmetShowcase
                className="h-full"
                title={t("dashboard.data.model3d")}
                subtitle={t("dashboard.data.model3dDescription")}
              />
            </div>
            <div className="h-full">
              <DashboardSystemStatusCard className="h-full" />
            </div>
          </div>

          {/* Row 2: Symmetrical Real-time Activity & Quick Intelligence (50% - 50%) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            {canViewIncidents && (
              <div className="flex h-full flex-col justify-between space-y-2">
                <DashboardLiveIncidents
                  incidents={recentIncidents}
                  loading={recentQuery.isLoading}
                  error={recentQuery.isError && !recentQuery.data}
                  highlightedId={highlightedId}
                  canReview={canReviewIncidents}
                  viewAllHref={dashboardIncidentHref(siteId)}
                  onReview={(incident) => {
                    setSelectedIncident(incident);
                    setReviewModalOpen(true);
                  }}
                />
                <DashboardDataState
                  stale={recentQuery.isRefetchError}
                  message={recentQuery.isError ? t("dashboard.data.error") : null}
                  updatedAt={recentQuery.dataUpdatedAt}
                  onRetry={() => void recentQuery.refetch()}
                />
              </div>
            )}

            <div className="flex h-full flex-col justify-between space-y-6">
              {canViewAi && (
                <div className="space-y-2">
                  <DashboardAiStatusCard
                    activeVersion={modelQuery.data}
                    loading={modelQuery.isLoading}
                    error={modelQuery.isError && !modelQuery.data}
                  />
                  <DashboardDataState
                    stale={modelQuery.isRefetchError}
                    message={modelQuery.isError ? t("dashboard.data.error") : null}
                    updatedAt={modelQuery.dataUpdatedAt}
                    onRetry={() => void modelQuery.refetch()}
                  />
                </div>
              )}

              <DashboardQuickActions
                onOpenGenerateReport={
                  canExportReports ? () => setReportModalOpen(true) : undefined
                }
                canExportReports={canExportReports}
                canReviewIncidents={canReviewIncidents}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAFETY & INCIDENTS (DEEP-DIVE) */}
      {activeTab === "safety" && (
        <div className="space-y-6">
          {/* Safety KPI Ribbon */}
          <DashboardKpiRibbon
            total={
              period && canViewIncidents
                ? (periodQuery.data?.total ?? null)
                : null
            }
            pendingCount={pendingQuery.data ?? null}
            totalCamerasCount={cameraQuery.data?.total ?? null}
            onlineCamerasCount={onlineQuery.data ?? null}
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
            onNavigateIncidents={
              period ? () => router.push(totalHref) : undefined
            }
          />

          {/* Operational Analytics Suite (Radar, Hourly, Severity SLA, Zone Risk) */}
          {canViewReports &&
            (analytics ? (
              <div className="space-y-4">
                <DashboardDataState
                  stale={periodQuery.isRefetchError}
                  updatedAt={periodQuery.dataUpdatedAt}
                  onRetry={() => void periodQuery.refetch()}
                />
                <DashboardOperationalSuite
                  analytics={analytics}
                  cameras={cameras}
                  catalogComplete={cameraQuery.data?.complete}
                  canViewCameras={canViewCameras}
                  onSelectCamera={(id) => router.push(`/cameras/${id}`)}
                />
              </div>
            ) : (
              <DashboardPanel title={t("dashboard.charts.title")}>
                {periodNotice}
              </DashboardPanel>
            ))}

          {/* Live Incidents Review List */}
          {canViewIncidents && (
            <div className="space-y-2">
              <DashboardLiveIncidents
                incidents={recentIncidents}
                loading={recentQuery.isLoading}
                error={recentQuery.isError && !recentQuery.data}
                highlightedId={highlightedId}
                canReview={canReviewIncidents}
                viewAllHref={dashboardIncidentHref(siteId)}
                onReview={(incident) => {
                  setSelectedIncident(incident);
                  setReviewModalOpen(true);
                }}
              />
              <DashboardDataState
                stale={recentQuery.isRefetchError}
                message={recentQuery.isError ? t("dashboard.data.error") : null}
                updatedAt={recentQuery.dataUpdatedAt}
                onRetry={() => void recentQuery.refetch()}
              />
            </div>
          )}
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
                  Hạ tầng Camera & Trí tuệ Nhân tạo AI
                </h3>
                <p className="text-xs text-muted-foreground">
                  Giám sát luồng RTSP trực tiếp và thông số mô hình thị giác máy tính
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canViewCameras && (
                <>
                  <Link href="/cameras">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Cctv className="size-3.5" />
                      Danh sách Camera
                    </Button>
                  </Link>
                  <Link href="/cameras?view=wall">
                    <Button variant="primary" size="sm" className="gap-1.5">
                      <Cctv className="size-3.5" />
                      Mở Video Wall RTSP
                    </Button>
                  </Link>
                </>
              )}
              {canViewAi && (
                <Link href="/ai-metrics">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Cpu className="size-3.5" />
                    Quản lý Mô hình AI
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Symmetrical AI Status & Camera Risk Rankings (50% - 50%) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="h-full">
              <DashboardAiStatusCard
                activeVersion={modelQuery.data}
                loading={modelQuery.isLoading}
                error={modelQuery.isError && !modelQuery.data}
                className="h-full"
              />
            </div>
            <div className="h-full">
              <DashboardZoneRiskChart
                cameras={cameras}
                cameraStats={analytics?.cameras ?? []}
                catalogComplete={cameraQuery.data?.complete}
                onSelectCamera={(id) => router.push(`/cameras/${id}`)}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & SYSTEM INFRASTRUCTURE */}
      {activeTab === "system" && (
        <div className="space-y-6">
          {/* Row 1: Users Overview & System Health Status (50% - 50%) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="h-full">
              <DashboardUsersOverviewCard className="h-full" />
            </div>
            <div className="h-full">
              <DashboardSystemStatusCard className="h-full" />
            </div>
          </div>

          {/* Row 2: Recent Audit Activity Feed & Scheduled Cron Jobs (50% - 50%) */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <div className="h-full">
              <DashboardAuditMiniFeed className="h-full" />
            </div>
            <div className="h-full">
              <DashboardCronMiniCard className="h-full" />
            </div>
          </div>
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
