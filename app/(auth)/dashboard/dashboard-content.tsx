"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Cctv,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  PieChart,
  RefreshCw,
  Shield,
  ShieldAlert,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useSite } from "@/contexts/SiteContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { soundService } from "@/services/sound.service";

import {
  useCameraRankings,
  useGenerateReport,
  useReportSummary,
  useReportTemplates,
  useViolationDistribution,
} from "@/hooks/reporting";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { useIncidents, useReviewIncident } from "@/hooks/incidents";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { useCameras } from "@/hooks/cameras";
import { useSites, useSiteZones } from "@/hooks/sites";
import { useActiveModelVersion } from "@/hooks/ai-metrics";

import { PageHeader } from "@/components/features/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DashboardKpiRibbon,
  DashboardLiveIncidents,
  DashboardAiStatusCard,
  DashboardOperationalSuite,
  HelmetShowcase,
} from "@/components/features/dashboard";

import {
  ReportViolationDonut,
  ReportCameraRanking,
  GenerateReportModal,
} from "@/components/features/reports";

import { ReviewIncidentModal } from "@/components/features/incidents/review-incident-modal";
import { Loader } from "@/components/ui/loader";
import type { GenerateReportDto, IncidentItem, ReviewIncidentPayload } from "@/types";

export default function DashboardContent() {
  const { user, status } = useAuth();
  const { siteId } = useSite();
  const { isConnected, lastAlert } = useRealtime();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const queryClient = useQueryClient();

  // State for Realtime Highlight & Modals
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedIncidentForReview, setSelectedIncidentForReview] = useState<IncidentItem | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"donut" | "rankings">("donut");

  // RBAC permissions checks
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const canViewReports = permissions.includes("PPE_REPORTING_READ");
  const canExportReports = permissions.includes("PPE_REPORTING_EXPORT");
  const canViewIncidents = permissions.includes("PPE_INCIDENT_READ");
  const canReviewIncidents = permissions.includes("PPE_INCIDENT_REVIEW");
  const canViewCameras = permissions.includes("PPE_CAMERA_READ");
  const canViewSites = permissions.includes("PPE_SITE_READ");
  const canViewAiMetrics =
    permissions.includes("PPE_AI_METRICS_READ") || permissions.includes("PPE_MODEL_READ");

  // Fetch Sites (for site name indicator & report modal)
  const { data: sitesData } = useSites(
    { limit: 100 },
    { enabled: canViewSites }
  );
  const sites = useMemo(() => sitesData?.items ?? [], [sitesData]);
  const currentSite = useMemo(
    () => sites.find((s) => s.id === siteId) || null,
    [sites, siteId]
  );
  const siteDisplayName = currentSite?.name ?? (siteId ? `Site #${siteId.slice(0, 8)}` : null);

  const { data: zonesData } = useSiteZones(siteId || "", Boolean(siteId && canViewSites));

  // 1. Executive Reporting Data
  const reportingFilter = useMemo(
    () => ({ siteId: siteId || undefined }),
    [siteId]
  );

  const { data: summaryData, isLoading: summaryLoading } = useReportSummary(
    canViewReports ? reportingFilter : undefined
  );

  const { data: distributionData, isLoading: distributionLoading } = useViolationDistribution(
    canViewReports ? reportingFilter : undefined
  );

  const { data: cameraRankingsData, isLoading: rankingsLoading } = useCameraRankings(
    canViewReports ? { ...reportingFilter, limit: 5 } : undefined
  );

  // 2. Incident Operations Data
  const { data: pendingIncidentsData, isLoading: pendingLoading } = useIncidents(
    canViewIncidents ? { siteId: siteId || undefined, status: "PENDING_REVIEW", limit: 100 } : undefined,
    { enabled: canViewIncidents }
  );
  const pendingCount = pendingIncidentsData?.items?.length ?? summaryData?.openIncidents ?? 0;

  const { data: recentIncidentsData, isLoading: recentLoading } = useIncidents(
    canViewIncidents
      ? { siteId: siteId || undefined, limit: 5, sortBy: "detectedAt", sortOrder: "desc" }
      : undefined,
    { enabled: canViewIncidents }
  );
  const recentIncidents = useMemo(
    () => recentIncidentsData?.items ?? [],
    [recentIncidentsData]
  );

  // 3. Cameras Data
  const { data: camerasData, isLoading: camerasLoading } = useCameras(
    canViewCameras ? { siteId: siteId || undefined, limit: 100 } : undefined,
    { enabled: canViewCameras }
  );
  const totalCamerasCount = camerasData?.items?.length ?? 0;
  const onlineCamerasCount =
    camerasData?.items?.filter((c) => c.status === "ONLINE").length ?? 0;

  // 4. AI Engine Active Model Data
  const { data: activeModelData, isLoading: modelLoading } = useActiveModelVersion();

  // 5. Report Templates for Modal
  const { data: reportTemplates = [] } = useReportTemplates();
  const generateReportMutation = useGenerateReport();

  // 6. Review Incident Mutation
  const reviewMutation = useReviewIncident();

  // Real-Time SSE Event Handling
  useEffect(() => {
    if (!lastAlert) return;

    if (
      lastAlert.type === "notification:ppe_violation" ||
      lastAlert.type === "notification:new"
    ) {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportingKeys.summary() });
      queryClient.invalidateQueries({ queryKey: reportingKeys.trends() });
      queryClient.invalidateQueries({ queryKey: reportingKeys.distribution() });

      const alertData = lastAlert.data as Record<string, unknown> | undefined;
      const incidentId =
        (alertData?.incidentId as string) || (alertData?.id as string);

      try {
        const severity = (alertData?.severity as string) || "HIGH";
        soundService.playAlertSound(severity);
      } catch {
        // Best effort
      }

      if (incidentId) {
        setHighlightedIncidentId(incidentId);
        const timer = setTimeout(() => {
          setHighlightedIncidentId(null);
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastAlert, queryClient]);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: reportingKeys.all }),
      queryClient.invalidateQueries({ queryKey: incidentKeys.all }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Review Incident Handler
  const handleOpenReview = (incident: IncidentItem) => {
    setSelectedIncidentForReview(incident);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (id: string, payload: ReviewIncidentPayload) => {
    await reviewMutation.mutateAsync({ id, payload });
  };

  // Generate Report Handler
  const handleSubmitGenerateReport = async (dto: GenerateReportDto) => {
    await generateReportMutation.mutateAsync(dto);
  };

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        <Loader showLabel />
      </div>
    );
  }

  const kpiLoading = summaryLoading || pendingLoading || camerasLoading;

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Standardized AppShell header with unified actions & live status) */}
      <PageHeader
        icon={LayoutDashboard}
        title={t("nav.dashboard")}
        description={`${t("dashboard.welcome")}, ${user.fullName ?? user.email}`}
        badge={
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            <span>{isConnected ? t("dashboard.connected") : t("dashboard.disconnected")}</span>
            {siteDisplayName && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-semibold text-foreground">{siteDisplayName}</span>
              </>
            )}
          </div>
        }
        badgeIcon={Shield}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isVietnamese ? "Làm mới" : "Refresh"}</span>
            </Button>

            {canReviewIncidents && (
              <Link href="/incidents?status=PENDING_REVIEW">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ShieldAlert className="size-3.5 text-amber-500" />
                  <span>{isVietnamese ? "Duyệt vi phạm" : "Review"}</span>
                  {pendingCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {canViewCameras && (
              <Link href="/cameras?view=wall">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Cctv className="size-3.5 text-primary" />
                  <span>Video Wall</span>
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
                <span>{isVietnamese ? "Xuất báo cáo" : "Export Report"}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Executive Split Section: Key Stats (Left) & PPE 3D Model (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (7 cols): Single card containing the 4 key stats */}
        <div className="lg:col-span-7 flex flex-col">
          <DashboardKpiRibbon
            summary={summaryData}
            pendingCount={pendingCount}
            userAssignedCount={pendingCount}
            totalCamerasCount={totalCamerasCount}
            onlineCamerasCount={onlineCamerasCount}
            loading={kpiLoading}
            canViewReports={canViewReports}
            onFilterPending={() => router.push("/incidents?status=PENDING_REVIEW")}
            onNavigateCameras={() => router.push("/cameras")}
            onNavigateReports={() => router.push("/reports")}
            onNavigateIncidents={() => router.push("/incidents")}
            className="h-full"
          />
        </div>

        {/* Right Column (5 cols): PPE 3D Model Card */}
        <div className="lg:col-span-5 flex flex-col">
          <HelmetShowcase
            className="h-full"
            title={isVietnamese ? "Mô Hình PPE 3D" : "PPE 3D Model"}
            subtitle={isVietnamese ? "Mũ bảo hộ tiêu chuẩn ANSI Z89.1" : "Safety Helmet ANSI Z89.1"}
          />
        </div>
      </div>

      {/* 3. Real-Time Operations Bento Grid (Balanced 7 / 5 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Live Real-Time Incidents Feed */}
        <div className="lg:col-span-7">
          {canViewIncidents ? (
            <DashboardLiveIncidents
              incidents={recentIncidents}
              loading={recentLoading}
              highlightedId={highlightedIncidentId}
              onReview={handleOpenReview}
              canReview={canReviewIncidents}
            />
          ) : (
            <div className="rounded-2xl bg-surface p-6 shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)] border border-border/20 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">
                {isVietnamese ? "Hệ thống giám sát Smart PPE" : "Smart PPE Monitoring"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isVietnamese
                  ? "Tất cả các khu vực thi công đang được bảo vệ an toàn."
                  : "All construction zones are operating under safety surveillance."}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Risk Analysis & AI Telemetry */}
        <div className="lg:col-span-5 space-y-5">
          {/* Analytical Toggle: Donut Breakdown vs Camera Hotspots */}
          {canViewReports && (
            <div className="space-y-3">
              {/* Tab Switcher Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-xl bg-surface-elevated/80 p-1 border border-border/30 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                  <button
                    type="button"
                    onClick={() => setAnalyticsTab("donut")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      analyticsTab === "donut"
                        ? "bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PieChart className="h-3.5 w-3.5" />
                    <span>{isVietnamese ? "Phân bổ PPE" : "PPE Breakdown"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnalyticsTab("rankings")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      analyticsTab === "rankings"
                        ? "bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>{isVietnamese ? "Điểm nóng Camera" : "Hotspots"}</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {analyticsTab === "donut" ? (
                <ReportViolationDonut
                  distribution={distributionData || []}
                  loading={distributionLoading}
                />
              ) : (
                <ReportCameraRanking
                  rankings={cameraRankingsData || []}
                  loading={rankingsLoading}
                />
              )}
            </div>
          )}

          {/* AI Engine Telemetry Card */}
          {canViewAiMetrics && (
            <DashboardAiStatusCard
              activeVersion={activeModelData}
              loading={modelLoading}
            />
          )}
        </div>
      </div>

      {/* 4. Safety Operational Analytics Suite (4 Core Operational Charts - Real Backend Data) */}
      {canViewReports && (
        <DashboardOperationalSuite
          distribution={distributionData || []}
          summary={summaryData}
          incidents={pendingIncidentsData?.items?.length ? pendingIncidentsData.items : recentIncidents}
          cameras={camerasData?.items || []}
          cameraRankings={cameraRankingsData || []}
          zones={zonesData || []}
          onSelectCamera={(id) => router.push(`/cameras/${id}`)}
          loading={summaryLoading || distributionLoading || recentLoading || camerasLoading}
        />
      )}

      {/* Review Incident Modal */}
      {canReviewIncidents && (
        <ReviewIncidentModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          incident={selectedIncidentForReview}
          onSubmit={handleSubmitReview}
          loading={reviewMutation.isPending}
        />
      )}

      {/* Generate Report Modal */}
      {canExportReports && (
        <GenerateReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          templates={reportTemplates}
          sites={sites}
          defaultSiteId={siteId || undefined}
          onSubmit={handleSubmitGenerateReport}
          loading={generateReportMutation.isPending}
        />
      )}
    </div>
  );
}
