"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSite } from "@/contexts/SiteContext";
import { useCameras } from "@/hooks/cameras";
import { useIncidents } from "@/hooks/incidents";
import {
  useSiteDetail,
  useUpdateSite,
  useSiteZones,
  useRestrictedAreas,
} from "@/hooks/sites";
import { useReportSummary } from "@/hooks/reporting";
import { useLocale } from "@/providers/locale-provider";
import { EditSiteModal } from "../edit-site-modal";
import { SiteZonesDrawer } from "../site-zones-drawer";
import { SiteSafetyConfigModal } from "../site-safety-config-modal";
import { SiteDetailHero } from "./site-detail-hero";
import { SiteDetailKpiBar } from "./site-detail-kpi-bar";
import { SiteDetailTabs, type SiteDetailTabKey } from "./site-detail-tabs";
import { SiteLiveCamerasTab } from "./tabs/site-live-cameras-tab";
import { SiteIncidentsTab } from "./tabs/site-incidents-tab";
import { SiteSpatialZonesTab } from "./tabs/site-spatial-zones-tab";
import { SiteSafetyRulesTab } from "./tabs/site-safety-rules-tab";
import { SiteAnalyticsTab } from "./tabs/site-analytics-tab";
import { SitePersonnelTab } from "./tabs/site-personnel-tab";
import type { UpdateSitePayload } from "@/types";

export type { SiteDetailTabKey };

export interface SiteDetailContentProps {
  siteId: string;
}

export function SiteDetailContent({ siteId }: SiteDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { setSiteId } = useSite();

  const resolveTab = (tabStr: string | null): SiteDetailTabKey => {
    if (!tabStr) return "cameras";
    if (tabStr === "live-cameras" || tabStr === "cameras") return "cameras";
    if (tabStr === "incidents") return "incidents";
    if (tabStr === "zones") return "zones";
    if (tabStr === "safety-rules" || tabStr === "rules") return "safety-rules";
    if (tabStr === "analytics") return "analytics";
    if (tabStr === "personnel") return "personnel";
    return "cameras";
  };

  // Active Tab synchronized with URL
  const [activeTab, setActiveTab] = useState<SiteDetailTabKey>(resolveTab(searchParams.get("tab")));

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) {
      setActiveTab(resolveTab(t));
    }
  }, [searchParams]);

  // Modals / Drawers state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [zonesDrawerOpen, setZonesDrawerOpen] = useState(false);
  const [safetyDrawerOpen, setSafetyDrawerOpen] = useState(false);

  // Fetch Site Detail
  const { data: site, isLoading, error } = useSiteDetail(siteId);

  // Live Zones and Danger Areas
  const { data: zonesData = [] } = useSiteZones(siteId);
  const { data: restrictedAreasData = [] } = useRestrictedAreas(siteId);

  const zoneCount =
    zonesData.length || site?.zoneCount || site?.zones?.length || site?._count?.zones || 0;
  const restrictedCount =
    restrictedAreasData.length ||
    site?.restrictedAreaCount ||
    site?.restrictedAreas?.length ||
    site?._count?.restrictedAreas ||
    0;

  // Fetch cameras for KPI
  const { data: camerasData } = useCameras({ siteId, limit: 100 });
  const cameraCount =
    camerasData?.meta?.total ?? camerasData?.items?.length ?? site?.cameraCount ?? 0;
  const onlineCameraCount =
    camerasData?.items?.filter((c) => c.status === "ONLINE").length || 0;

  // Fetch incidents for KPI
  const { data: incidentsData } = useIncidents({ siteId, status: "PENDING_REVIEW", limit: 50 });
  const pendingIncidentsCount = incidentsData?.meta?.total ?? incidentsData?.items?.length ?? 0;

  // Fetch site-specific safety report summary for Compliance Rate
  const { data: reportSummary } = useReportSummary({ siteId });
  const complianceRate =
    reportSummary && reportSummary.complianceRate > 0
      ? reportSummary.complianceRate
      : 100;

  // Safely compute officers count for Tab badge
  const officersCount = useMemo(() => {
    if (!site?.contactOfficers) return site?.contactPerson ? 1 : 0;
    if (Array.isArray(site.contactOfficers)) return site.contactOfficers.length;
    if (typeof site.contactOfficers === "string") {
      try {
        const parsed = JSON.parse(site.contactOfficers);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return site?.contactPerson ? 1 : 0;
      }
    }
    return site?.contactPerson ? 1 : 0;
  }, [site?.contactOfficers, site?.contactPerson]);

  // Update site mutation
  const updateSiteMutation = useUpdateSite();

  // Synchronize Global Site Context when viewing this site
  useEffect(() => {
    if (siteId) {
      setSiteId(siteId);
    }
  }, [siteId, setSiteId]);

  const handleUpdateSite = async (id: string, payload: UpdateSitePayload) => {
    await updateSiteMutation.mutateAsync({ id, payload });
    setEditModalOpen(false);
  };

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

  const handleTabChange = (nextTab: SiteDetailTabKey) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/sites/${siteId}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Hero Overview Banner */}
      <SiteDetailHero
        site={site}
        onEdit={() => setEditModalOpen(true)}
        onManageZones={() => setZonesDrawerOpen(true)}
        onSafetyConfig={() => setSafetyDrawerOpen(true)}
        onViewPersonnel={() => handleTabChange("personnel")}
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
        onSelectTab={(tab) => handleTabChange(tab as SiteDetailTabKey)}
      />

      {/* 3. Neumorphic Segmented Control Navigation */}
      <SiteDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cameraCount={cameraCount}
        pendingIncidentsCount={pendingIncidentsCount}
        zoneCount={zoneCount}
        officersCount={officersCount}
      />

      {/* 4. Active Tab Content Pane */}
      <div className="transition-all duration-200">
        {activeTab === "cameras" && <SiteLiveCamerasTab site={site} />}
        {activeTab === "incidents" && <SiteIncidentsTab site={site} />}
        {activeTab === "zones" && <SiteSpatialZonesTab site={site} />}
        {activeTab === "safety-rules" && <SiteSafetyRulesTab site={site} />}
        {activeTab === "analytics" && <SiteAnalyticsTab site={site} />}
        {activeTab === "personnel" && <SitePersonnelTab site={site} />}
      </div>

      {/* Modals & Drawers */}
      <EditSiteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        site={site}
        onSubmit={handleUpdateSite}
        loading={updateSiteMutation.isPending}
      />

      <SiteZonesDrawer
        open={zonesDrawerOpen}
        onOpenChange={setZonesDrawerOpen}
        site={site}
      />

      <SiteSafetyConfigModal
        open={safetyDrawerOpen}
        onOpenChange={setSafetyDrawerOpen}
        site={site}
      />
    </div>
  );
}
