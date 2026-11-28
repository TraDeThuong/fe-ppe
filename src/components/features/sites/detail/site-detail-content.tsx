"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateReportModal } from "@/components/features/reports";
import { ResourceAuditTrailCard } from "@/components/features/audit-logs";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useSite } from "@/contexts/SiteContext";
import { useCameraStatusCounts } from "@/hooks/cameras";
import { incidentKeys, useIncidentStatusCounts } from "@/hooks/incidents";
import {
  reportingKeys,
  useGenerateReport,
  useReportTemplates,
} from "@/hooks/reporting";
import {
  siteKeys,
  useArchiveSite,
  useDeleteSite,
  useRestrictedAreas,
  useSiteComplianceSummary,
  useSiteDetail,
  useSiteZones,
  useUpdateSite,
} from "@/hooks/sites";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import { DeleteSiteDialog } from "../delete-site-dialog";
import { EditSiteModal } from "../edit-site-modal";
import {
  canSyncSiteOfficers,
  parseSiteContactOfficers,
  resolveDisplayOfficers,
  resolveSiteCameraCounts,
  syncSiteOfficersAccess,
} from "../site-helpers";
import { SiteDetailHero } from "./site-detail-hero";
import { SiteDetailKpiBar } from "./site-detail-kpi-bar";
import { SiteDetailTabs, type SiteDetailTabKey } from "./site-detail-tabs";
import { SiteAnalyticsTab } from "./tabs/site-analytics-tab";
import { SiteIncidentsTab } from "./tabs/site-incidents-tab";
import { SiteLiveCamerasTab } from "./tabs/site-live-cameras-tab";
import { SitePersonnelTab } from "./tabs/site-personnel-tab";
import { SiteSafetyRulesTab } from "./tabs/site-safety-rules-tab";
import { SiteSpatialZonesTab } from "./tabs/site-spatial-zones-tab";
import type { GenerateReportDto, UpdateSitePayload } from "@/types";

export type { SiteDetailTabKey };

export interface SiteDetailContentProps {
  siteId: string;
}

function resolveTab(tabStr: string | null): SiteDetailTabKey {
  if (!tabStr) return "cameras";
  if (tabStr === "live-cameras" || tabStr === "cameras") return "cameras";
  if (tabStr === "incidents") return "incidents";
  if (tabStr === "zones") return "zones";
  if (tabStr === "safety-rules" || tabStr === "rules") return "safety-rules";
  if (tabStr === "analytics") return "analytics";
  if (tabStr === "personnel") return "personnel";
  return "cameras";
}

export function SiteDetailContent({ siteId }: SiteDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user: currentUser } = useAuth();
  const { lastAlert } = useRealtime();
  const { setSiteId } = useSite();
  const can = useCan();

  const canReadZones = can("PPE_ZONE_READ");
  const canReadRestricted = can("PPE_RESTRICTED_AREA_READ");
  const canReadCameras = can("PPE_CAMERA_READ");
  const canReadIncidents = can("PPE_INCIDENT_READ");
  const canReadReporting = can("PPE_REPORTING_READ");
  const canReadSafety =
    can("PPE_SAFETY_CONFIG_READ") || can("PPE_SAFETY_CONFIG_MANAGE");
  const canReadUsers = can("USER_READ");
  const canUpdateUsers = can("USER_UPDATE");
  const canManageSite = can("PPE_SITE_MANAGE");
  const canExportReport = can("PPE_REPORTING_EXPORT");
  const canSyncUsers = canSyncSiteOfficers(
    currentUser?.role,
    canReadUsers && canUpdateUsers,
  );

  const permittedTabs = useMemo<SiteDetailTabKey[]>(() => {
    const list: SiteDetailTabKey[] = [];
    if (canReadCameras) list.push("cameras");
    if (canReadIncidents) list.push("incidents");
    if (canReadZones || canReadRestricted) list.push("zones");
    if (canReadSafety) list.push("safety-rules");
    if (canReadReporting) list.push("analytics");
    if (canReadUsers) list.push("personnel");
    return list;
  }, [
    canReadCameras,
    canReadIncidents,
    canReadZones,
    canReadRestricted,
    canReadSafety,
    canReadReporting,
    canReadUsers,
  ]);

  // Active Tab synchronized with URL (including back-navigation to no ?tab=)
  const [activeTab, setActiveTab] = useState<SiteDetailTabKey>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

  const effectiveActiveTab: SiteDetailTabKey | null = useMemo(() => {
    if (permittedTabs.includes(activeTab)) return activeTab;
    return permittedTabs[0] ?? null;
  }, [activeTab, permittedTabs]);

  // Modals / Drawers state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fetch Site Detail
  const { data: site, isLoading, error } = useSiteDetail(siteId);

  // Live Zones & Danger Areas (gated by RBAC)
  const zonesQuery = useSiteZones(siteId, canReadZones);
  const restrictedQuery = useRestrictedAreas(siteId, canReadRestricted);
  const zonesData = zonesQuery.data ?? [];
  const restrictedAreasData = restrictedQuery.data ?? [];

  const zoneCount = zonesQuery.isSuccess
    ? zonesData.length
    : (site?.zoneCount ?? site?.zones?.length ?? site?._count?.zones ?? 0);
  const restrictedCount = restrictedQuery.isSuccess
    ? restrictedAreasData.length
    : (site?.restrictedAreaCount ??
      site?.restrictedAreas?.length ??
      site?._count?.restrictedAreas ??
      0);

  // Fetch camera counts via lightweight status-counts endpoint
  const cameraStatus = useCameraStatusCounts(siteId, {
    enabled: canReadCameras,
  });
  const { cameraCount, onlineCameraCount } = resolveSiteCameraCounts(
    site?.cameraCount,
    canReadCameras,
    cameraStatus,
  );

  // Fetch pending incident count via lightweight status-counts endpoint
  const { data: incidentCounts } = useIncidentStatusCounts(
    { siteId },
    { enabled: canReadIncidents },
  );
  const pendingIncidentsCount = incidentCounts?.pendingReview ?? 0;

  // Fetch site-specific safety compliance summary (reconciled with live incidents)
  const { data: complianceSummary } = useSiteComplianceSummary(
    siteId ? [siteId] : [],
    {
      enabled: Boolean(siteId),
      canReadReporting,
      canReadIncidents,
    },
  );
  const complianceRate = complianceSummary?.complianceRate ?? 100;

  // Templates & report generation for Hero "Export Report"
  const { data: reportTemplates = [] } = useReportTemplates({
    enabled: canExportReport && exportModalOpen,
  });
  const generateReportMutation = useGenerateReport();

  // Safely compute officers count matching Hero & Personnel tab
  const officersCount = useMemo(() => {
    if (!site) return 0;
    return resolveDisplayOfficers(
      site,
      isVietnamese ? "Cán bộ phụ trách" : "Officer in Charge",
    ).length;
  }, [site, isVietnamese]);

  // Mutations
  const updateSiteMutation = useUpdateSite();
  const archiveSiteMutation = useArchiveSite();
  const deleteSiteMutation = useDeleteSite();

  // Synchronize Global Site Context when viewing this site
  useEffect(() => {
    if (siteId) {
      setSiteId(siteId);
    }
  }, [siteId, setSiteId]);

  // Real-time SSE invalidation for incidents & KPI summary on this site
  useEffect(() => {
    if (!lastAlert) return;
    if (
      lastAlert.type !== "notification:ppe_violation" &&
      lastAlert.type !== "notification:new"
    ) {
      return;
    }
    const payload = lastAlert.data as Record<string, unknown> | null;
    const alertSiteId = payload?.siteId as string | undefined;
    if (alertSiteId && alertSiteId !== siteId) return;

    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
    void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
    void queryClient.invalidateQueries({ queryKey: siteKeys.complianceSummaryRoot() });
  }, [lastAlert, siteId, queryClient]);

  const handleUpdateSite = async (id: string, payload: UpdateSitePayload) => {
    const previousOfficers = parseSiteContactOfficers(site?.contactOfficers);
    await updateSiteMutation.mutateAsync({ id, payload });
    await syncSiteOfficersAccess(id, payload.contactOfficers, canSyncUsers, previousOfficers);
    setEditModalOpen(false);
  };

  const handleArchiveSite = async () => {
    if (!site) return;
    await archiveSiteMutation.mutateAsync({ id: site.id, name: site.name });
  };

  const handleDeleteSite = async (id: string, name?: string) => {
    await deleteSiteMutation.mutateAsync({ id, name });
    router.push("/sites");
  };

  const handleExportSubmit = async (dto: GenerateReportDto) => {
    const generated = await generateReportMutation.mutateAsync(dto);
    try {
      await reportingService.downloadReportFile(generated);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã tạo báo cáo nhưng chưa thể tự tải file xuống."
            : "Report generated, but file download failed.",
      );
    }
  };

  const handleNavigateTab = useCallback(
    (
      nextTab: SiteDetailTabKey,
      extraParams?: { zoneId?: string | null; cameraId?: string | null },
    ) => {
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      if (extraParams && "zoneId" in extraParams) {
        if (extraParams.zoneId) params.set("zoneId", extraParams.zoneId);
        else params.delete("zoneId");
      } else if (nextTab !== "cameras" && nextTab !== "incidents") {
        params.delete("zoneId");
      }
      if (extraParams && "cameraId" in extraParams) {
        if (extraParams.cameraId) params.set("cameraId", extraParams.cameraId);
        else params.delete("cameraId");
      } else if (nextTab !== "incidents") {
        params.delete("cameraId");
      }
      router.replace(`/sites/${siteId}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, siteId],
  );

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-surface-elevated/40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-elevated/40" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-surface-elevated/40" />
      </div>
    );
  }

  // Not Found or Error State
  if (error || !site) {
    return (
      <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center max-w-lg mx-auto my-12 dark:border-black/60 dark:bg-card/90">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-bold text-foreground">
          {t("sites.detail.notFound")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sites.detail.notFoundDesc")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/sites")}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("sites.detail.back")}</span>
          </Button>
        </div>
      </div>
    );
  }

  const urlZoneId = searchParams.get("zoneId") || undefined;
  const urlCameraId = searchParams.get("cameraId") || undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Hero Overview Banner */}
      <SiteDetailHero
        site={site}
        onEdit={() => setEditModalOpen(true)}
        onExportReport={() => setExportModalOpen(true)}
        onViewPersonnel={
          canReadUsers ? () => handleNavigateTab("personnel") : undefined
        }
        onArchive={handleArchiveSite}
        onDelete={() => setDeleteDialogOpen(true)}
        canEdit={canManageSite}
        canExportReport={canExportReport}
        canArchive={canManageSite}
        canDelete={canManageSite}
        archivePending={archiveSiteMutation.isPending}
      />

      {/* 2. Bento Quick KPI Console */}
      <SiteDetailKpiBar
        site={site}
        cameraCount={cameraCount}
        onlineCameraCount={onlineCameraCount}
        pendingIncidentsCount={pendingIncidentsCount}
        complianceRate={complianceRate}
        zoneCount={zoneCount}
        restrictedCount={restrictedCount}
        onSelectTab={(tab) => {
          if (permittedTabs.includes(tab as SiteDetailTabKey)) {
            handleNavigateTab(tab as SiteDetailTabKey);
          }
        }}
      />

      {/* 3. Neumorphic Segmented Control Navigation */}
      {effectiveActiveTab && (
        <SiteDetailTabs
          activeTab={effectiveActiveTab}
          onTabChange={(tab) => handleNavigateTab(tab)}
          cameraCount={cameraCount}
          pendingIncidentsCount={pendingIncidentsCount}
          zoneCount={zoneCount}
          officersCount={officersCount}
          visibleTabs={permittedTabs}
        />
      )}

      {/* 4. Active Tab Content Pane */}
      <div className="transition-all duration-200">
        {effectiveActiveTab === "cameras" && (
          <SiteLiveCamerasTab site={site} initialZoneId={urlZoneId} />
        )}
        {effectiveActiveTab === "incidents" && (
          <SiteIncidentsTab
            site={site}
            initialZoneId={urlZoneId}
            initialCameraId={urlCameraId}
          />
        )}
        {effectiveActiveTab === "zones" && (
          <SiteSpatialZonesTab
            site={site}
            onViewZoneCameras={(zoneId) =>
              handleNavigateTab("cameras", { zoneId })
            }
            onViewZoneIncidents={(zoneId) =>
              handleNavigateTab("incidents", { zoneId })
            }
          />
        )}
        {effectiveActiveTab === "safety-rules" && (
          <SiteSafetyRulesTab site={site} />
        )}
        {effectiveActiveTab === "analytics" && <SiteAnalyticsTab site={site} />}
        {effectiveActiveTab === "personnel" && (
          <SitePersonnelTab
            site={site}
            onEditSite={canManageSite ? () => setEditModalOpen(true) : undefined}
          />
        )}
      </div>

      <ResourceAuditTrailCard
        targetType="PPE_SITE"
        targetId={site.id}
        title={isVietnamese ? "Nhật ký Tác động Công trường" : "Site Audit Trail"}
      />

      {/* Modals & Drawers */}
      <EditSiteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        site={site}
        onSubmit={handleUpdateSite}
        loading={updateSiteMutation.isPending}
      />

      <DeleteSiteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        site={site}
        onConfirm={handleDeleteSite}
        loading={deleteSiteMutation.isPending}
      />

      <GenerateReportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        templates={reportTemplates}
        sites={[site]}
        defaultSiteId={site.id}
        onSubmit={handleExportSubmit}
        loading={generateReportMutation.isPending}
      />
    </div>
  );
}
