
"use client";

import React from "react";
import {
  ArrowUpRight,
  Camera,
  Clock,
  ShieldAlert,
  Activity,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";

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
  index?: string;
}

const TONE_STYLES = {
  primary: {
    icon: "text-primary",
    iconBg: "bg-primary/10",
    value: "text-foreground",
    indicator: "bg-primary",
    glow: "group-hover:bg-primary/10",
  },
  success: {
    icon: "text-primary",
    iconBg: "bg-primary/10",
    value: "text-primary",
    indicator: "bg-primary",
    glow: "group-hover:bg-primary/10",
  },
  warning: {
    icon: "text-warning",
    iconBg: "bg-warning/10",
    value: "text-warning",
    indicator: "bg-warning",
    glow: "group-hover:bg-warning/10",
  },
  danger: {
    icon: "text-danger",
    iconBg: "bg-danger/10",
    value: "text-danger",
    indicator: "bg-danger",
    glow: "group-hover:bg-danger/10",
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
  index,
}: KpiTileProps) {
  const style = TONE_STYLES[tone];

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
        "group relative flex min-w-0 flex-col",
        "rounded-[20px] p-3.5 sm:p-4",
        "border border-white/80 dark:border-white/[0.06]",
        "bg-background dark:bg-card/70",
        "shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]",
        "dark:shadow-[5px_5px_12px_rgba(0,0,0,0.32),-3px_-3px_8px_rgba(255,255,255,0.035)]",
        onClick
          ? [
            "cursor-pointer",
            "hover:-translate-y-1",
            "hover:shadow-[8px_10px_17px_var(--shadow-dark),-7px_-7px_15px_var(--shadow-light)]",
            "dark:hover:shadow-[8px_10px_17px_rgba(0,0,0,0.4),-5px_-5px_11px_rgba(255,255,255,0.05)]",
            "active:translate-y-0 active:scale-[0.99]",
          ].join(" ")
          : "",
        "transition-all duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
      ].join(" ")}
    >
      {/* Top light reflection */}
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center",
            "rounded-[13px]",
            "border border-black/[0.025] dark:border-white/[0.04]",
            style.iconBg,
            "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]",
            "dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.035)]",
            "transition-transform duration-300 group-hover:scale-105",
          ].join(" ")}
        >
          <Icon className={`size-[19px] ${style.icon}`} />
        </div>

        <div className="flex items-center gap-2">
          {index && (
            <span className="font-mono text-[9px] font-bold tracking-widest text-muted-foreground/40">
              {index}
            </span>
          )}

          {onClick && (
            <span className="flex size-7 items-center justify-center rounded-full text-muted-foreground/50 transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
              <ArrowUpRight
                size={15}
                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </span>
          )}
        </div>
      </div>

      {/* KPI title and value */}
      <div className="mt-4 min-w-0">
        <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>

        <div className="mt-1.5 flex min-w-0 items-baseline gap-1.5">
          {loading ? (
            <Skeleton className="my-1 h-7 sm:h-8 w-20 rounded-lg" />
          ) : (
            <span
              className={[
                "min-w-0 truncate font-mono",
                "text-[27px] font-black leading-none tracking-[-0.055em]",
                "sm:text-[30px]",
                style.value,
              ].join(" ")}
            >
              {value}
            </span>
          )}
        </div>
      </div>

      {/* Bottom information */}
      <div className="mt-auto pt-4">
        {typeof progress === "number" ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] dark:bg-black/30">
              <div
                className={`h-full rounded-full ${style.indicator} transition-all duration-700`}
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
              <span className="truncate">{progressLabel}</span>
              <span className="font-mono font-bold text-foreground">
                {progress}%
              </span>
            </div>
          </div>
        ) : footer ? (
          <div className="flex min-h-[28px] items-center gap-1.5 border-t border-border/30 pt-2.5 text-[10px] font-medium text-muted-foreground">
            <span
              className={`size-1.5 shrink-0 rounded-full ${style.indicator}`}
            />
            <span className="line-clamp-1">{footer}</span>
          </div>
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

  const dismissedRate =
    analytics?.dismissedRate == null
      ? "—"
      : `${number.format(Math.round(analytics.dismissedRate * 10) / 10)}%`;

  const hasAccess =
    canViewReports || canViewIncidents || canViewCameras;

  return (
    <section
      className={[
        "relative overflow-hidden transition-all duration-300",
        // Khung vỏ ngoài lồi khối 3D
        "rounded-[24px] sm:rounded-[28px] p-3 sm:p-4",
        "bg-gradient-to-br from-background via-background to-muted/40 dark:from-card dark:via-card dark:to-background/90",
        "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
        "dark:border-t-white/[0.12] dark:border-l-white/[0.08] dark:border-b-black/60 dark:border-r-black/40",
        "shadow-[12px_12px_26px_var(--shadow-dark),-12px_-12px_26px_var(--shadow-light)]",
        "dark:shadow-[14px_14px_30px_rgba(0,0,0,0.55),-8px_-8px_20px_rgba(255,255,255,0.03)]",
        className,
      ].join(" ")}
    >
      {/* Ambient Glow tinh tế */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-primary/[0.07] blur-3xl"
      />

      {/* BỐ CỤC CHIA 2 CỘT NGANG: Cột trái (Điều khiển nổi) | Cột phải (Khay KPI lõm) */}
      <div className="relative flex flex-col gap-3.5 lg:flex-row lg:items-stretch lg:gap-4">

        {/* 1. CỘT TRÁI: Cụm nhận diện & Nút điều hướng (Dạng khối nổi - Embossed Control Pod) */}
        <div
          className={[
            "flex flex-col justify-between gap-3 rounded-[18px] p-3.5 sm:p-4 lg:w-[270px] xl:w-[290px] shrink-0",
            "bg-gradient-to-br from-background to-muted/30 dark:from-card/90 dark:to-background/80",
            "border-t border-l border-white/90 border-b border-r border-black/[0.05]",
            "dark:border-t-white/[0.1] dark:border-l-white/[0.06] dark:border-b-black/45 dark:border-r-black/35",
            "shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]",
            "dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45),-3px_-3px_8px_rgba(255,255,255,0.03)]",
          ].join(" ")}
        >
          {/* Hàng trên: Icon lồi + Đèn báo trạng thái khắc chìm */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={[
                "flex size-9 items-center justify-center rounded-[11px] text-primary",
                "bg-background dark:bg-card",
                "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
                "dark:border-t-white/[0.12] dark:border-l-white/[0.08] dark:border-b-black/50",
                "shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]",
                "dark:shadow-[3px_3px_8px_rgba(0,0,0,0.45)]",
              ].join(" ")}
            >
              <Activity size={17} strokeWidth={2.4} />
            </div>

            {hasAccess && (
              <div
                className={[
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  "bg-background/80 dark:bg-background/50",
                  "border-t border-l border-black/[0.06] border-b border-r border-white/80",
                  "dark:border-t-black/45 dark:border-b-white/[0.05]",
                  "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                  "dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)]",
                ].join(" ")}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-40" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary">
                  {t("dashboard.kpi.operational")}
                </span>
              </div>
            )}
          </div>

          {/* Hàng giữa: Tiêu đề & Mô tả ngắn */}
          <div className="my-auto py-0.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-primary/80">
              Overview
            </p>
            <h3 className="mt-0.5 text-base font-black leading-snug tracking-tight text-foreground sm:text-lg">
              {t("dashboard.kpi.overview")}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {t("dashboard.kpi.scope")}
            </p>
          </div>

          {/* Hàng dưới: Nút bấm vật lý mở rộng toàn chiều ngang cột trái */}
          {onNavigateReports && canViewReports && (
            <button
              type="button"
              onClick={onNavigateReports}
              className={[
                "group flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-[11px] font-bold text-primary transition-all duration-200",
                "bg-gradient-to-r from-primary/[0.06] to-transparent dark:from-primary/[0.12] dark:to-transparent",
                "border-t border-l border-white/95 border-b border-r border-black/[0.06]",
                "dark:border-t-white/[0.12] dark:border-l-white/[0.08] dark:border-b-black/45 dark:border-r-black/35",
                "shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]",
                "dark:shadow-[3px_3px_8px_rgba(0,0,0,0.45),-2px_-2px_5px_rgba(255,255,255,0.03)]",
                "hover:-translate-y-0.5 hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]",
                "active:translate-y-0 active:border-t-black/[0.06] active:border-l-black/[0.06] active:border-b-white/80 active:border-r-white/80",
                "active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={14} strokeWidth={2.4} />
                <span className="truncate">{t("dashboard.kpi.reportsSeparate")}</span>
              </span>
              <ArrowUpRight
                size={14}
                strokeWidth={2.4}
                className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          )}
        </div>

        {/* 2. CỘT PHẢI: Khay lõm sâu chứa các thẻ KPI (Recessed Instrument Deck) */}
        <div
          className={[
            "relative flex flex-1 flex-col justify-center rounded-[18px] p-3 sm:p-3.5",
            "bg-background/85 dark:bg-background/60",
            "border-t border-l border-black/[0.08] border-b border-r border-white/85",
            "dark:border-t-black/55 dark:border-l-black/45 dark:border-b-white/[0.07] dark:border-r-white/[0.04]",
            "shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]",
            "dark:shadow-[inset_5px_5px_12px_rgba(0,0,0,0.5),inset_-3px_-3px_8px_rgba(255,255,255,0.03)]",
          ].join(" ")}
        >
          {hasAccess ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {canViewReports && (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <KpiTile
                    index="01"
                    title={t("dashboard.kpi.periodTotal")}
                    value={total === null ? "—" : number.format(total)}
                    icon={ShieldAlert}
                    tone="primary"
                    footer={t("dashboard.kpi.allStatuses")}
                    onClick={canViewIncidents ? onNavigateIncidents : undefined}
                  />
                  {periodState}
                </div>
              )}

              {canViewIncidents && (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <KpiTile
                    index="02"
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
                <div className="flex min-w-0 flex-col gap-1.5">
                  <KpiTile
                    index="03"
                    title={t("dashboard.kpi.onlineCameras")}
                    value={cameraRatio}
                    icon={Camera}
                    tone="success"
                    footer={t("dashboard.kpi.cameraScope")}
                    onClick={onNavigateCameras}
                  />
                  {cameraState}
                </div>
              )}

              {canViewReports && (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <KpiTile
                    index="04"
                    title={t("dashboard.kpi.dismissedRate")}
                    value={dismissedRate}
                    icon={CheckCircle2}
                    tone="primary"
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
          ) : (
            <div className="flex min-h-[110px] items-center justify-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("dashboard.data.noAccess")}
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
