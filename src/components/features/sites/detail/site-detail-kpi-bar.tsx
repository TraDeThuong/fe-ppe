"use client";

import { useMemo } from "react";
import { AlertOctagon, Camera, Layers, ShieldCheck } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface SiteDetailKpiBarProps {
  site: SiteItem;
  cameraCount?: number;
  onlineCameraCount?: number;
  pendingIncidentsCount?: number;
  complianceRate?: number;
  zoneCount?: number;
  restrictedCount?: number;
  variant?: "classic" | "soft-extruded" | "deep-elevation";
  size?: "sm" | "md" | "lg";
  onSelectTab?: (tab: string) => void;
  className?: string;
}

export function SiteDetailKpiBar({
  site,
  cameraCount = 0,
  onlineCameraCount = 0,
  pendingIncidentsCount = 0,
  complianceRate,
  zoneCount: propZoneCount,
  restrictedCount: propRestrictedCount,
  onSelectTab,
  className = "",
}: SiteDetailKpiBarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const zoneCount =
    propZoneCount ?? site.zoneCount ?? site.zones?.length ?? site._count?.zones ?? 0;
  const restrictedCount =
    propRestrictedCount ??
    site.restrictedAreaCount ??
    site.restrictedAreas?.length ??
    site._count?.restrictedAreas ??
    0;

  const totalCameras = cameraCount || site.cameraCount || 0;
  const isComplianceWarning = complianceRate !== undefined && complianceRate < 80;

  const cards = useMemo(
    () => [
      {
        id: "compliance",
        tab: "safety-rules",
        icon: ShieldCheck,
        title: t("sites.detail.kpi.complianceShort"),
        subtitle: t("sites.detail.kpi.complianceSub"),
        toneIcon: isComplianceWarning
          ? "bg-danger/10 text-danger border border-danger/20"
          : "bg-primary/10 text-primary border border-primary/20",
        valueRender: (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {complianceRate !== undefined ? complianceRate.toFixed(1) : "100.0"}%
            </span>
          </div>
        ),
        badgeRender: (
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              isComplianceWarning
                ? "bg-danger/15 text-danger border border-danger/25"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {isComplianceWarning
              ? isVietnamese
                ? "Cần chú ý"
                : "Warning"
              : isVietnamese
              ? "Tối ưu"
              : "Optimal"}
          </span>
        ),
      },
      {
        id: "cameras",
        tab: "cameras",
        icon: Camera,
        title: t("sites.detail.kpi.camerasShort"),
        subtitle: t("sites.detail.kpi.camerasSub"),
        toneIcon:
          onlineCameraCount > 0
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-danger/10 text-danger border border-danger/20",
        valueRender: (
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {onlineCameraCount}
            </span>
            <span className="ml-1 text-xs sm:text-sm font-semibold text-muted-foreground/80 tabular-nums">
              /{totalCameras}
            </span>
          </div>
        ),
        badgeRender: (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
            {totalCameras > 0
              ? `${Math.round((onlineCameraCount / totalCameras) * 100)}%`
              : "0%"}
          </span>
        ),
      },
      {
        id: "incidents",
        tab: "incidents",
        icon: AlertOctagon,
        title: t("sites.detail.kpi.incidentsShort"),
        subtitle: t("sites.detail.kpi.incidentsSub"),
        toneIcon:
          pendingIncidentsCount > 0
            ? "bg-danger/10 text-danger border border-danger/20"
            : "bg-primary/10 text-primary border border-primary/20",
        valueRender: (
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                pendingIncidentsCount > 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {pendingIncidentsCount}
            </span>
          </div>
        ),
        badgeRender: (
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              pendingIncidentsCount > 0
                ? "bg-danger/15 text-danger border border-danger/25"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {pendingIncidentsCount > 0
              ? isVietnamese
                ? "Cần xử lý"
                : "Action"
              : isVietnamese
              ? "Ổn định"
              : "Clear"}
          </span>
        ),
      },
      {
        id: "spatial",
        tab: "zones",
        icon: Layers,
        title: t("sites.detail.kpi.spatialShort"),
        subtitle: t("sites.detail.kpi.spatialSub"),
        toneIcon: "bg-accent/15 text-accent border border-accent/25",
        valueRender: (
          <div className="flex flex-wrap items-baseline gap-1 text-sm sm:text-base font-semibold text-foreground">
            <span className="text-xl sm:text-2xl font-black tracking-tight tabular-nums">
              {zoneCount}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
              {t("sites.detail.kpi.zonesUnit")}
            </span>
            <span className="text-muted-foreground/40 px-0.5">•</span>
            <span
              className={`text-base sm:text-lg font-black tabular-nums ${
                restrictedCount > 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {restrictedCount}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
              {t("sites.detail.kpi.restrictedUnit")}
            </span>
          </div>
        ),
        badgeRender: null,
      },
    ],
    [
      t,
      isVietnamese,
      complianceRate,
      isComplianceWarning,
      onlineCameraCount,
      totalCameras,
      pendingIncidentsCount,
      zoneCount,
      restrictedCount,
    ]
  );

  return (
    <section
      aria-label={isVietnamese ? "Chỉ số hoạt động công trường" : "Site KPI Metrics"}
      className={`grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4 ${className}`}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = Boolean(onSelectTab);

        return (
          <button
            key={card.id}
            type="button"
            disabled={!isClickable}
            onClick={isClickable ? () => onSelectTab?.(card.tab) : undefined}
            className="
              group relative flex flex-col justify-between overflow-hidden text-left
              rounded-xl sm:rounded-2xl p-3 sm:p-4
              border border-white/80 bg-surface
              shadow-[4px_4px_10px_var(--shadow-dark),-3px_-3px_9px_rgba(255,255,255,0.85)]
              transition-all duration-200
              hover:-translate-y-0.5 hover:shadow-[6px_6px_14px_var(--shadow-dark),-4px_-4px_12px_rgba(255,255,255,0.95)]
              active:translate-y-px active:shadow-[inset_2px_2px_5px_var(--shadow-dark)]
              dark:border-white/[0.06] dark:bg-card
              dark:shadow-[4px_4px_10px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.025)]
              dark:hover:shadow-[6px_6px_14px_rgba(0,0,0,0.45)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            "
          >
            {/* Ambient light gradient on top border */}
            <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10" />

            {/* Card Header: Icon + Title + Optional Badge */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`
                    flex size-7 shrink-0 items-center justify-center rounded-lg
                    border border-black/[0.04] shadow-sm dark:border-white/[0.05]
                    ${card.toneIcon}
                  `}
                >
                  <Icon className="size-3.5 sm:size-4 stroke-[2]" />
                </span>
                <span className="truncate text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.title}
                </span>
              </div>

              {card.badgeRender}
            </div>

            {/* Card Body: Metric Value */}
            <div className="mt-2.5 sm:mt-3">
              {card.valueRender}

              {/* Subtitle helper (compact & hidden on very small screens to maintain clean density) */}
              <p className="mt-1 hidden sm:block truncate text-[10px] text-muted-foreground/75">
                {card.subtitle}
              </p>
            </div>
          </button>
        );
      })}
    </section>
  );
}