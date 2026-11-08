"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Cctv,
  FileSpreadsheet,
  LayoutDashboard,
  RefreshCw,
  Shield,
  ShieldAlert,
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
  DashboardOperationalSuite,
  HelmetShowcase,
  DashboardPpeRadarChart,
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
  const { siteId, isReady } = useSite();
  const { isConnected, lastAlert } = useRealtime();
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const periodState = useDashboardPeriod();
  const { period } = periodState;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(
    null,
  );
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<"distribution" | "cameras">(
    "distribution",
  );
  const permissions = user?.permissions ?? [];
  const authenticated = status === "authenticated" && !!user;
  const canViewReports =
    authenticated && permissions.includes("PPE_REPORTING_READ");
  const canExportReports =
    authenticated && permissions.includes("PPE_REPORTING_EXPORT");
  const canViewIncidents =
    authenticated && permissions.includes("PPE_INCIDENT_READ");
  const canReviewIncidents =
    canViewIncidents && permissions.includes("PPE_INCIDENT_REVIEW");
  const canViewCameras =
    authenticated && permissions.includes("PPE_CAMERA_READ");
  const canViewSites = authenticated && permissions.includes("PPE_SITE_READ");
  const canViewAi =
    authenticated &&
    (permissions.includes("PPE_AI_METRICS_READ") ||
      permissions.includes("PPE_MODEL_READ"));
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

  if (!authenticated)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader showLabel />
      </div>
    );
  return (
    <div className="space-y-6">
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
      {canViewReports && (
        <section
          className="space-y-3 rounded-2xl border border-border/30 bg-surface p-4"
          aria-label={t("dashboard.period.title")}
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs font-semibold">
              <span className="block">{t("dashboard.period.title")}</span>
              <select
                aria-label={t("dashboard.period.title")}
                value={periodState.preset}
                onChange={(event) =>
                  periodState.setPreset(event.target.value as DashboardPreset)
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {(["today", "7d", "month", "custom"] as const).map((key) => (
                  <option key={key} value={key}>
                    {t(`dashboard.period.${key}`)}
                  </option>
                ))}
              </select>
            </label>
            {periodState.preset === "custom" && (
              <>
                <label className="space-y-1 text-xs">
                  <span className="block">{t("dashboard.period.from")}</span>
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
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="block">{t("dashboard.period.to")}</span>
                  <input
                    type="date"
                    aria-label={t("dashboard.period.to")}
                    value={periodState.customEnd}
                    min={periodState.customStart}
                    max={periodState.today}
                    onChange={(event) =>
                      periodState.setCustomEnd(event.target.value)
                    }
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  />
                </label>
              </>
            )}
            <p className="pb-2 text-xs text-muted-foreground">
              {siteName} ·{" "}
              {period
                ? `${period.startDate} → ${period.endDate}`
                : t("dashboard.data.invalidPeriod")}{" "}
              · Asia/Ho_Chi_Minh (UTC+7)
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.period.scope")}
          </p>
        </section>
      )}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
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
            className="h-full"
          />
        </div>
        <div className="lg:col-span-5">
          <HelmetShowcase
            className="h-full"
            title={t("dashboard.data.model3d")}
            subtitle={t("dashboard.data.model3dDescription")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
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
        <div className="space-y-5 lg:col-span-5">
          {canViewReports && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["distribution", "cameras"] as const)
                  .filter((tab) => tab !== "cameras" || canViewCameras)
                  .map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      aria-pressed={analyticsTab === tab}
                      onClick={() => setAnalyticsTab(tab)}
                      className={`rounded-xl border border-border/30 px-3 py-2 text-xs font-semibold ${analyticsTab === tab ? "bg-surface text-primary" : "text-muted-foreground"}`}
                    >
                      {t(`dashboard.view.${tab}`)}
                    </button>
                  ))}
              </div>
              {analytics ? (
                analyticsTab === "cameras" && canViewCameras ? (
                  <DashboardZoneRiskChart
                    cameras={cameras}
                    cameraStats={analytics.cameras}
                    catalogComplete={cameraQuery.data?.complete}
                    topOnly
                    onSelectCamera={(id) => router.push(`/cameras/${id}`)}
                  />
                ) : (
                  <DashboardPpeRadarChart
                    distribution={analytics.distribution}
                    compact
                  />
                )
              ) : (
                <DashboardPanel title={t("dashboard.charts.distribution")}>
                  {periodNotice}
                </DashboardPanel>
              )}
            </div>
          )}
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
        </div>
      </div>
      {canViewReports &&
        (analytics ? (
          <div className="space-y-3">
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
        <>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.data.exportScope")}
          </p>
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
        </>
      )}
    </div>
  );
}
