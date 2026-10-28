"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  Camera,
  Layers,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSite } from "@/contexts/SiteContext";
import { useCameras } from "@/hooks/cameras";
import { useIncidents } from "@/hooks/incidents";
import { useSiteDetail, useUpdateSite } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import { EditSiteModal } from "../edit-site-modal";
import { SiteZonesDrawer } from "../site-zones-drawer";
import { SiteSafetyConfigModal } from "../site-safety-config-modal";
import { SiteDetailHero } from "./site-detail-hero";
import { SiteDetailKpiBar } from "./site-detail-kpi-bar";
import { SiteLiveCamerasTab } from "./tabs/site-live-cameras-tab";
import { SiteIncidentsTab } from "./tabs/site-incidents-tab";
import { SiteSpatialZonesTab } from "./tabs/site-spatial-zones-tab";
import { SiteSafetyRulesTab } from "./tabs/site-safety-rules-tab";
import { SiteAnalyticsTab } from "./tabs/site-analytics-tab";
import { SitePersonnelTab } from "./tabs/site-personnel-tab";
import type { UpdateSitePayload } from "@/types";

export type SiteDetailTabKey =
  | "cameras"
  | "incidents"
  | "zones"
  | "safety-rules"
  | "analytics"
  | "personnel";

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

  // Fetch cameras for KPI
  const { data: camerasData } = useCameras({ siteId, limit: 100 });
  const cameraCount = camerasData?.items?.length || 0;
  const onlineCameraCount =
    camerasData?.items?.filter((c) => c.status === "ONLINE").length || 0;

  // Fetch incidents for KPI
  const { data: incidentsData } = useIncidents({ siteId, status: "PENDING", limit: 50 });
  const pendingIncidentsCount = incidentsData?.items?.length || 0;

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

  const tabItems = [
    {
      key: "cameras" as const,
      label: t("sites.detail.tabs.cameras"),
      icon: <Camera className="h-4 w-4" />,
      badge: cameraCount > 0 ? cameraCount : undefined,
    },
    {
      key: "incidents" as const,
      label: t("sites.detail.tabs.incidents"),
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined,
      badgeColor: "bg-accent/20 text-accent",
    },
    {
      key: "zones" as const,
      label: t("sites.detail.tabs.zones"),
      icon: <Layers className="h-4 w-4" />,
      badge: site.zones?.length || site.zoneCount,
    },
    {
      key: "safety-rules" as const,
      label: t("sites.detail.tabs.safetyRules"),
      icon: <Shield className="h-4 w-4" />,
    },
    {
      key: "analytics" as const,
      label: t("sites.detail.tabs.analytics"),
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      key: "personnel" as const,
      label: t("sites.detail.tabs.personnel"),
      icon: <Users className="h-4 w-4" />,
      badge: site.contactOfficers?.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Hero Overview Banner */}
      <SiteDetailHero
        site={site}
        onEdit={() => setEditModalOpen(true)}
        onManageZones={() => setZonesDrawerOpen(true)}
        onSafetyConfig={() => setSafetyDrawerOpen(true)}
      />

      {/* 2. Bento Quick KPI Console */}
      <SiteDetailKpiBar
        site={site}
        cameraCount={cameraCount}
        onlineCameraCount={onlineCameraCount}
        pendingIncidentsCount={pendingIncidentsCount}
      />

      {/* 3. Neumorphic Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/30 dark:border-black/50">
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                isActive
                  ? "bg-primary text-white shadow-md dark:shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.badgeColor || "bg-primary/10 text-primary"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

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
