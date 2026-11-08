
"use client";

import { useMemo } from "react";
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  ShieldCheck,
  ArrowUpRight,
  Timer,
  Activity,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserDetailTabKey } from "./user-detail-tabs";

export interface UserDetailKpiBarProps {
  assignedSitesCount: number;
  totalIncidents: number;
  resolvedIncidents: number;
  pendingIncidents: number;
  resolutionRate: number;
  mttrHours: number;
  slaComplianceRate: number;
  performanceTier:
    | "EXCELLENT"
    | "GOOD"
    | "AVERAGE"
    | "NEEDS_IMPROVEMENT"
    | "UNRATED";
  onSelectTab: (tab: UserDetailTabKey) => void;
  loading?: boolean;
  className?: string;
}

export function UserDetailKpiBar({
  assignedSitesCount,
  totalIncidents,
  resolvedIncidents,
  pendingIncidents,
  resolutionRate,
  mttrHours,
  slaComplianceRate,
  performanceTier,
  onSelectTab,
  loading = false,
  className = "",
}: UserDetailKpiBarProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const rating = useMemo(() => {
    switch (performanceTier) {
      case "EXCELLENT":
        return isVietnamese ? "Xuất sắc" : "Excellent";
      case "GOOD":
        return isVietnamese ? "Tốt" : "Good";
      case "UNRATED":
        return isVietnamese ? "Chưa đánh giá" : "Unrated";
      case "AVERAGE":
      case "NEEDS_IMPROVEMENT":
        return isVietnamese ? "Cần cải thiện" : "Needs Improvement";
      default:
        return isVietnamese ? "Chưa đánh giá" : "Unrated";
    }
  }, [performanceTier, isVietnamese]);

  const ratingTone =
    performanceTier === "EXCELLENT" || performanceTier === "GOOD"
      ? "text-primary bg-primary/10 border-primary/20"
      : performanceTier === "UNRATED"
        ? "text-muted-foreground bg-muted/40 border-border/60"
        : "text-warning bg-warning/10 border-warning/20";

  const mttrValue =
    mttrHours <= 0
      ? "—"
      : mttrHours < 1
        ? `${Math.round(mttrHours * 60)}`
        : `${mttrHours}`;

  const mttrUnit =
    mttrHours <= 0
      ? ""
      : mttrHours < 1
        ? isVietnamese
          ? "phút"
          : "min"
        : isVietnamese
          ? "giờ"
          : "hrs";

  const progress = Math.min(100, Math.max(0, resolutionRate));

  const neumorphicCard = [
    "group relative min-w-0 overflow-hidden",
    "rounded-[26px] p-[6px]",
    "border border-white/90 dark:border-white/[0.07]",
    "bg-background dark:bg-card",
    "shadow-[9px_9px_20px_var(--shadow-dark),-8px_-8px_20px_rgba(255,255,255,0.95)]",
    "dark:shadow-[9px_9px_20px_rgba(0,0,0,0.42),-6px_-6px_14px_rgba(255,255,255,0.045)]",
    "hover:-translate-y-1",
    "hover:shadow-[12px_14px_25px_var(--shadow-dark),-10px_-10px_22px_rgba(255,255,255,0.95)]",
    "dark:hover:shadow-[12px_14px_25px_rgba(0,0,0,0.48),-8px_-8px_17px_rgba(255,255,255,0.055)]",
    "transition-all duration-300 ease-out",
  ].join(" ");

  const innerSurface = [
    "relative flex h-full min-w-0 flex-col",
    "rounded-[21px] p-4 sm:p-5",
    "border border-white/70 dark:border-white/[0.04]",
    "bg-background/80 dark:bg-card/80",
  ].join(" ");

  const insetSurface = [
    "rounded-[16px]",
    "border border-black/[0.025] dark:border-white/[0.035]",
    "bg-background/70 dark:bg-background/30",
    "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.95)]",
    "dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.35),inset_-2px_-2px_6px_rgba(255,255,255,0.035)]",
  ].join(" ");

  const iconWell = [
    "flex size-11 shrink-0 items-center justify-center",
    "rounded-[14px]",
    "bg-primary/10 text-primary",
    "border border-primary/10",
    "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_rgba(255,255,255,0.95)]",
    "dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.04)]",
  ].join(" ");

  const sectionLabel =
    "text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground";

  const metricLabel =
    "text-[10px] sm:text-[11px] font-semibold text-muted-foreground";

  const metricValue =
    "font-mono text-xl sm:text-2xl font-black leading-none tracking-tight text-foreground";

  const cardHeader = (
    icon: React.ElementType,
    title: string,
    subtitle: string,
  ) => {
    const Icon = icon;

    return (
      <div className="flex items-center gap-3">
        <div className={iconWell}>
          <Icon size={21} strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={sectionLabel}>{title}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <ArrowUpRight
          size={16}
          className="shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {/* =========================================
          CARD 01: SUPERVISION SCOPE
      ========================================= */}
      <button
        type="button"
        onClick={() => onSelectTab("sites")}
        className={`${neumorphicCard} text-left`}
      >
        <div className={innerSurface}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

          {cardHeader(
            Building2,
            isVietnamese ? "Phạm vi giám sát" : "Supervision Scope",
            isVietnamese
              ? "Quản lý công trường được phân công"
              : "Assigned construction sites",
          )}

          <div className="mt-6">
            <div className={`${insetSurface} relative overflow-hidden p-4`}>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className={metricLabel}>
                    {isVietnamese
                      ? "Tổng công trường phụ trách"
                      : "Total Assigned Sites"}
                  </p>

                  <div className="mt-2 flex items-baseline gap-2">
                    {loading ? (
                      <Skeleton className="my-1 h-9 w-16 rounded-lg" />
                    ) : (
                      <span className="font-mono text-4xl font-black tracking-[-0.06em] text-primary">
                        {assignedSitesCount}
                      </span>
                    )}

                    <span className="text-xs font-bold text-muted-foreground">
                      {isVietnamese ? "công trường" : "sites"}
                    </span>
                  </div>
                </div>

                <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 size={23} strokeWidth={1.8} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-border/30 pt-3">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {isVietnamese
                    ? "Phạm vi giám sát an toàn lao động"
                    : "Occupational safety supervision"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between rounded-xl bg-primary/[0.06] px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground">
                {isVietnamese ? "Chi tiết công trường" : "Site details"}
              </span>
              <span className="text-[10px] font-extrabold text-primary">
                {isVietnamese ? "Xem chi tiết" : "View details"} →
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* =========================================
          CARD 02: INCIDENT MANAGEMENT
      ========================================= */}
      <button
        type="button"
        onClick={() => onSelectTab("incidents")}
        className={`${neumorphicCard} text-left`}
      >
        <div className={innerSurface}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

          {cardHeader(
            AlertTriangle,
            isVietnamese ? "Hiệu quả xử lý sự cố" : "Incident Management",
            isVietnamese
              ? "Tình hình tiếp nhận và xử lý"
              : "Incident handling overview",
          )}

          {/* Main KPI */}
          <div className={`${insetSurface} mt-6 p-3.5`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={metricLabel}>
                  {isVietnamese ? "Tổng sự cố tiếp nhận" : "Total Assigned Cases"}
                </p>

                <div className="mt-1.5 flex items-baseline gap-2">
                  {loading ? (
                    <Skeleton className="my-1 h-9 w-16 rounded-lg" />
                  ) : (
                    <span className="font-mono text-4xl font-black tracking-[-0.06em] text-warning">
                      {totalIncidents}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {isVietnamese ? "vụ việc" : "cases"}
                  </span>
                </div>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <AlertTriangle size={21} />
              </div>
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className={`${insetSurface} p-3`}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-primary" />
                <span className={metricLabel}>
                  {isVietnamese ? "Đã xử lý" : "Resolved"}
                </span>
              </div>

              {loading ? (
                <Skeleton className="my-1.5 h-6 w-12 rounded" />
              ) : (
                <p className={`${metricValue} mt-2 text-primary`}>
                  {resolvedIncidents}
                </p>
              )}

              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "Vụ hoàn tất" : "Completed"}
              </p>
            </div>

            <div className={`${insetSurface} p-3`}>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-warning" />
                <span className={metricLabel}>
                  {isVietnamese ? "Đang xử lý" : "Pending"}
                </span>
              </div>

              {loading ? (
                <Skeleton className="my-1.5 h-6 w-12 rounded" />
              ) : (
                <p className={`${metricValue} mt-2 text-warning`}>
                  {pendingIncidents}
                </p>
              )}

              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "Vụ đang mở" : "Open cases"}
              </p>
            </div>
          </div>

          {/* Resolution progress */}
          <div className="mt-auto pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity size={13} className="text-primary" />
                <span className={metricLabel}>
                  {isVietnamese ? "Tỷ lệ xử lý" : "Resolution Rate"}
                </span>
              </div>

              <span className="font-mono text-sm font-black text-primary">
                {totalIncidents === 0 ? 0 : resolutionRate}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-muted/50 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_rgba(255,255,255,0.8)] dark:bg-background/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_8px_rgba(103,142,52,0.3)] transition-all duration-500"
                style={{
                  width: `${totalIncidents === 0 ? 0 : progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[9px] font-medium text-muted-foreground">
              {totalIncidents === 0
                ? isVietnamese
                  ? "Chưa có sự cố được phân công"
                  : "No assigned incidents yet"
                : pendingIncidents > 0
                  ? isVietnamese
                    ? `${pendingIncidents} vụ việc cần tiếp tục theo dõi`
                    : `${pendingIncidents} cases require follow-up`
                  : isVietnamese
                    ? "Tất cả sự cố đã được xử lý"
                    : "All incidents resolved"}
            </p>
          </div>
        </div>
      </button>

      {/* =========================================
          CARD 03: PERFORMANCE
      ========================================= */}
      <button
        type="button"
        onClick={() => onSelectTab("performance")}
        className={`${neumorphicCard} text-left md:col-span-2 xl:col-span-1`}
      >
        <div className={innerSurface}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/10" />

          {cardHeader(
            Award,
            isVietnamese ? "Hiệu suất & đánh giá" : "Performance & Rating",
            isVietnamese
              ? "Chất lượng và tốc độ xử lý công việc"
              : "Work quality and resolution speed",
          )}

          {/* Performance metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className={`${insetSurface} p-3.5`}>
              <div className="flex items-center gap-1.5">
                <Timer size={13} className="text-accent" />
                <span className={metricLabel}>MTTR</span>
              </div>

              {loading ? (
                <Skeleton className="my-1.5 h-6 w-16 rounded" />
              ) : (
                <p className="mt-2 flex items-baseline gap-1">
                  <span className={`${metricValue} text-accent`}>
                    {mttrValue}
                  </span>
                </p>
              )}

              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {mttrUnit
                  ? isVietnamese
                    ? `Thời gian trung bình (${mttrUnit})`
                    : `Average resolution (${mttrUnit})`
                  : isVietnamese
                    ? "Chưa có dữ liệu"
                    : "No resolution data"}
              </p>
            </div>

            <div className={`${insetSurface} p-3.5`}>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-primary" />
                <span className={metricLabel}>SLA</span>
              </div>

              {loading ? (
                <Skeleton className="my-1.5 h-6 w-16 rounded" />
              ) : (
                <p className="mt-2 flex items-baseline gap-1">
                  <span className={`${metricValue} text-primary`}>
                    {slaComplianceRate}%
                  </span>
                </p>
              )}

              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "Tỷ lệ tuân thủ" : "Compliance rate"}
              </p>
            </div>
          </div>

          {/* Rating summary */}
          <div className={`${insetSurface} mt-auto mt-4 p-3.5`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Award size={18} />
                </div>

                <div>
                  <p className={metricLabel}>
                    {isVietnamese
                      ? "Xếp loại hiệu suất"
                      : "Performance Rating"}
                  </p>
                  <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                    {isVietnamese
                      ? "Đánh giá tổng thể"
                      : "Overall assessment"}
                  </p>
                </div>
              </div>

              {loading ? (
                <Skeleton className="h-8 w-24 rounded-xl" />
              ) : (
                <span
                  className={`shrink-0 rounded-xl border px-3 py-2 text-[10px] font-extrabold ${ratingTone}`}
                >
                  {rating}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
