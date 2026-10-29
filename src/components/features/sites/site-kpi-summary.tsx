"use client";

import { useState } from "react";
import {
  AlertOctagon,
  Building2,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import { useReportSummary } from "@/hooks/reporting";
import type { SiteItem } from "@/types";
import { SiteStatsDetailPanel, type SiteStatKey } from "./site-stats-detail-panel";

export type { SiteStatKey };

export interface SiteKpiSummaryProps {
  sites: SiteItem[];
  loading?: boolean;
  selectedStat?: SiteStatKey | null;
  onSelectStat?: (stat: SiteStatKey | null) => void;
  onManageZones?: (site: SiteItem) => void;
  onSafetyConfig?: (site: SiteItem) => void;
  onCreateSite?: () => void;
}

export function SiteKpiSummary({
  sites,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  onManageZones,
  onSafetyConfig,
  onCreateSite,
}: SiteKpiSummaryProps) {
  const { t } = useLocale();

  // Fetch real-time compliance rate & violations from reporting-service
  const { data: reportingSummary, isLoading: summaryLoading } = useReportSummary();
  const complianceRate =
    reportingSummary && reportingSummary.complianceRate > 0
      ? reportingSummary.complianceRate
      : 100;
  const complianceRateDisplay = `${complianceRate.toFixed(1)}%`;

  const [internalSelectedStat, setInternalSelectedStat] = useState<SiteStatKey | null>(null);
  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: SiteStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const totalSites = sites.length;
  const totalZones = sites.reduce(
    (acc, s) =>
      acc + (s.zoneCount ?? (s.zones ? s.zones.length : undefined) ?? s._count?.zones ?? 0),
    0
  );
  const totalRestricted = sites.reduce(
    (acc, s) =>
      acc +
      (s.restrictedAreaCount ??
        (s.restrictedAreas ? s.restrictedAreas.length : undefined) ??
        s._count?.restrictedAreas ??
        0),
    0
  );

  // Hiệu ứng chìm sâu (neumorphic sunken) khi card được chọn giống hệt trang /roles
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className="space-y-4">
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số công trường */}
        <StatsCard
          title={t("sites.kpi.totalSites")}
          value={loading ? "..." : totalSites}
          icon={Building2}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("sites.kpi.totalSitesDesc")}
          onClick={() => handleToggle("totalSites")}
          className={`cursor-pointer transition-all duration-200 ${
            activeStat === "totalSites" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalSites" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("sites.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("sites.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Tổng phân khu */}
        <StatsCard
          title={t("sites.kpi.totalZones")}
          value={loading ? "..." : totalZones}
          icon={MapPin}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("sites.kpi.totalZonesDesc")}
          onClick={() => handleToggle("totalZones")}
          className={`cursor-pointer transition-all duration-200 ${
            activeStat === "totalZones" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalZones" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("sites.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("sites.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Vùng cấm nguy hiểm */}
        <StatsCard
          title={t("sites.kpi.restrictedAreas")}
          value={loading ? "..." : totalRestricted}
          icon={AlertOctagon}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("sites.kpi.restrictedAreasDesc")}
          onClick={() => handleToggle("restrictedAreas")}
          className={`cursor-pointer transition-all duration-200 ${
            activeStat === "restrictedAreas" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "restrictedAreas" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("sites.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("sites.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Tuân thủ an toàn TB */}
        <StatsCard
          title={t("sites.kpi.complianceRate")}
          value={loading || summaryLoading ? "..." : complianceRateDisplay}
          icon={ShieldCheck}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("sites.kpi.complianceRateDesc")}
          onClick={() => handleToggle("complianceRate")}
          className={`cursor-pointer transition-all duration-200 ${
            activeStat === "complianceRate" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "complianceRate" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("sites.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("sites.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <SiteStatsDetailPanel
          activeStat={activeStat}
          sites={sites}
          onClose={() => handleToggle(activeStat)}
          onManageZones={onManageZones}
          onSafetyConfig={onSafetyConfig}
          onCreateSite={onCreateSite}
          complianceRate={complianceRate}
          totalViolations={reportingSummary?.trueViolations ?? 0}
        />
      )}
    </div>
  );
}
