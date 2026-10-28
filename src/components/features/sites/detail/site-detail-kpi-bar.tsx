"use client";

import { AlertOctagon, Camera, CheckCircle2, Layers, ShieldCheck } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteDetailKpiBarProps {
  site: SiteItem;
  cameraCount?: number;
  onlineCameraCount?: number;
  pendingIncidentsCount?: number;
  complianceRate?: number;
}

export function SiteDetailKpiBar({
  site,
  cameraCount = 0,
  onlineCameraCount = 0,
  pendingIncidentsCount = 0,
  complianceRate,
}: SiteDetailKpiBarProps) {
  const { t } = useLocale();

  const zoneCount = site.zones?.length || site.zoneCount || 0;
  const restrictedCount = site.restrictedAreas?.length || site.restrictedAreaCount || 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* 1. Điểm tuân thủ an toàn */}
      <div className="rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.detail.kpi.compliance")}
          </span>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <ShieldCheck className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {complianceRate !== undefined ? `${complianceRate}%` : "--"}
          </span>
        </div>
        <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
          {t("sites.detail.kpi.complianceSub")}
        </p>
      </div>

      {/* 2. Camera đang trực */}
      <div className="rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.detail.kpi.cameras")}
          </span>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Camera className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {onlineCameraCount}
            <span className="text-sm font-normal text-muted-foreground">/{cameraCount || site.cameraCount || 0}</span>
          </span>
        </div>
        <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
          {t("sites.detail.kpi.camerasSub")}
        </p>
      </div>

      {/* 3. Sự cố chờ thẩm duyệt */}
      <div className="rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.detail.kpi.incidents")}
          </span>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
            <AlertOctagon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {pendingIncidentsCount}
          </span>
          {pendingIncidentsCount > 0 && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
              Cần xử lý
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
          {t("sites.detail.kpi.incidentsSub")}
        </p>
      </div>

      {/* 4. Quy mô không gian (Phân khu & Vùng cấm) */}
      <div className="rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sites.detail.kpi.spatial")}
          </span>
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Layers className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {zoneCount}
            <span className="text-xs font-normal text-muted-foreground ml-1">Zones</span>
          </span>
          {restrictedCount > 0 && (
            <span className="text-xs font-semibold text-accent font-mono">
              / {restrictedCount} Vùng cấm
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
          {t("sites.detail.kpi.spatialSub")}
        </p>
      </div>
    </div>
  );
}
