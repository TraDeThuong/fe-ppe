"use client";

import { AlertOctagon, Building2, MapPin, ShieldCheck } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteKpiSummaryProps {
  sites: SiteItem[];
  loading?: boolean;
}

export function SiteKpiSummary({ sites, loading = false }: SiteKpiSummaryProps) {
  const { t } = useLocale();

  const totalSites = sites.length;
  const totalZones = sites.reduce((acc, s) => acc + (s.zones?.length || s.zoneCount || 0), 0);
  const totalRestricted = sites.reduce(
    (acc, s) => acc + (s.restrictedAreas?.length || s.restrictedAreaCount || 0),
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("sites.kpi.totalSites")}
        value={loading ? "..." : totalSites}
        icon={Building2}
        variant="soft-extruded"
        tone="primary"
        description="Active construction sites"
      />

      <StatsCard
        title={t("sites.kpi.totalZones")}
        value={loading ? "..." : totalZones}
        icon={MapPin}
        variant="soft-extruded"
        tone="info"
        description="Monitored workspaces"
      />

      <StatsCard
        title={t("sites.kpi.restrictedAreas")}
        value={loading ? "..." : totalRestricted}
        icon={AlertOctagon}
        variant="soft-extruded"
        tone="danger"
        description="Critical danger perimeters"
      />

      <StatsCard
        title={t("sites.kpi.complianceRate")}
        value={loading ? "..." : "95.4%"}
        icon={ShieldCheck}
        variant="soft-extruded"
        tone="success"
        description="PPE spatial adherence"
      />
    </div>
  );
}
