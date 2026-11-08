"use client";

import React from "react";
import { ArrowUpRight, Camera, Clock, ShieldAlert } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface DashboardKpiRibbonProps {
  total: number | null;
  pendingCount: number | null;
  totalCamerasCount: number | null;
  onlineCamerasCount: number | null;
  analytics: import("@/types/dashboard.types").DashboardAnalytics | null;
  canViewReports: boolean;
  canViewIncidents: boolean;
  canViewCameras: boolean;
  periodState?: React.ReactNode;
  pendingState?: React.ReactNode;
  cameraState?: React.ReactNode;
  className?: string;
  onFilterPending?: () => void;
  onNavigateCameras?: () => void;
  onNavigateReports?: () => void;
  onNavigateIncidents?: () => void;
}

interface KpiTileProps {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "danger";
  progress?: number;
  progressLabel?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const TONE_STYLES = {
  primary: {
    iconBg: "bg-primary/10 text-primary border-primary/20",
    progressFill: "bg-primary",
    borderHover: "hover:border-primary/50",
  },
  success: {
    iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    progressFill: "bg-emerald-500",
    borderHover: "hover:border-emerald-500/50",
  },
  warning: {
    iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    progressFill: "bg-amber-500",
    borderHover: "hover:border-amber-500/50",
  },
  danger: {
    iconBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    progressFill: "bg-rose-500",
    borderHover: "hover:border-rose-500/50",
  },
} as const;

function KpiTile({
  title,
  value,
  icon: Icon,
  tone = "primary",
  progress,
  progressLabel,
  footer,
  onClick,
  loading = false,
}: KpiTileProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        "group relative flex flex-col justify-between rounded-2xl",
        "border border-border/40 bg-surface/75 p-3 sm:p-3.5 text-left transition-all duration-200",
        "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
        onClick
          ? "cursor-pointer hover:bg-surface hover:shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
          : "",
        toneStyle.borderHover,
      ].join(" ")}
    >
      {/* Top: Icon + Hover Link Arrow */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105",
            "shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
            toneStyle.iconBg,
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        {onClick && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 pt-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Middle: Title + Main KPI Value */}
      <div className="my-1.5">
        <span className="block text-[11px] font-semibold text-muted-foreground line-clamp-1">
          {title}
        </span>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {loading ? "..." : value}
          </span>
        </div>
      </div>

      {/* Bottom: Progress Bar or Status Badge */}
      <div className="mt-1">
        {typeof progress === "number" ? (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/80 border border-border/20 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${toneStyle.progressFill}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>{progressLabel}</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
          </div>
        ) : footer ? (
          <div className="text-[10px] font-medium">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardKpiRibbon({
  total,
  pendingCount,
  totalCamerasCount,
  onlineCamerasCount,
  analytics,
  canViewReports,
  canViewIncidents,
  canViewCameras,
  periodState,
  pendingState,
  cameraState,
  className = "",
  onFilterPending,
  onNavigateCameras,
  onNavigateReports,
  onNavigateIncidents,
}: DashboardKpiRibbonProps) {
  const { t, number } = useLocale();
  const cameraRatio =
    onlineCamerasCount !== null &&
    totalCamerasCount !== null &&
    onlineCamerasCount <= totalCamerasCount
      ? `${number.format(onlineCamerasCount)}/${number.format(totalCamerasCount)}`
      : "—";
  return (
    <section
      className={`relative rounded-[30px] border border-border/40 bg-surface p-3 sm:p-4 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] ${className}`}
    >
      <div className="flex h-full min-h-[410px] flex-col rounded-[23px] border border-border/30 bg-background/60 p-4 sm:p-5 shadow-[inset_4px_4px_12px_var(--shadow-dark),inset_-4px_-4px_12px_var(--shadow-light)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {t("dashboard.kpi.operational")}
        </p>
        <h3 className="mt-2 text-xl font-bold sm:text-2xl">
          {t("dashboard.kpi.overview")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("dashboard.kpi.scope")}
        </p>
        <div className="my-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {canViewReports && (
            <div className="space-y-2">
              <KpiTile
                title={t("dashboard.kpi.periodTotal")}
                value={total === null ? "—" : number.format(total)}
                icon={ShieldAlert}
                footer={t("dashboard.kpi.allStatuses")}
                onClick={canViewIncidents ? onNavigateIncidents : undefined}
              />
              {periodState}
            </div>
          )}
          {canViewIncidents && (
            <div className="space-y-2">
              <KpiTile
                title={t("dashboard.kpi.pending")}
                value={
                  pendingCount === null ? "—" : number.format(pendingCount)
                }
                icon={Clock}
                tone={pendingCount ? "warning" : "primary"}
                footer={t("dashboard.kpi.currentAllDays")}
                onClick={onFilterPending}
              />
              {pendingState}
            </div>
          )}
          {canViewCameras && (
            <div className="space-y-2">
              <KpiTile
                title={t("dashboard.kpi.onlineCameras")}
                value={cameraRatio}
                icon={Camera}
                footer={t("dashboard.kpi.cameraScope")}
                onClick={onNavigateCameras}
              />
              {cameraState}
            </div>
          )}
          {canViewReports && (
            <div className="space-y-2">
              <KpiTile
                title={t("dashboard.kpi.dismissedRate")}
                value={
                  analytics?.dismissedRate == null
                    ? "—"
                    : `${number.format(Math.round(analytics.dismissedRate * 10) / 10)}%`
                }
                icon={ShieldAlert}
                footer={
                  analytics && analytics.reviewed > 0
                    ? `${number.format(analytics.dismissed)} / ${number.format(analytics.reviewed)} · ${t("dashboard.kpi.reviewedInPeriod")}`
                    : t(
                        analytics
                          ? "dashboard.kpi.noReviews"
                          : "dashboard.kpi.noData",
                      )
                }
              />
              {periodState}
            </div>
          )}
        </div>
        {!canViewReports && !canViewIncidents && !canViewCameras && (
          <p className="my-8 text-sm text-muted-foreground">
            {t("dashboard.data.noAccess")}
          </p>
        )}
        {onNavigateReports && canViewReports && (
          <button
            type="button"
            onClick={onNavigateReports}
            className="border-t border-border/30 pt-3 text-left text-xs font-semibold text-primary"
          >
            {t("dashboard.kpi.reportsSeparate")} →
          </button>
        )}
      </div>
    </section>
  );
}
