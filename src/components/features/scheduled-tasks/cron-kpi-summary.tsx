"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CirclePause,
  CirclePlay,
} from "lucide-react";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem, CronScheduleFilter } from "@/types/cron.types";
import {
  CronStatsDetailPanel,
  type CronStatKey,
} from "./cron-stats-detail-panel";

export type { CronStatKey };

export interface CronKpiSummaryProps {
  jobs: CronJobItem[];
  loading?: boolean;
  hasData?: boolean;
  selectedStat?: CronStatKey | null;
  onSelectStat?: (stat: CronStatKey | null) => void;
  onFilterChange?: (filter: CronScheduleFilter) => void;
  className?: string;
}

export function CronKpiSummary({
  jobs,
  loading = false,
  hasData = true,
  selectedStat: propSelectedStat,
  onSelectStat,
  onFilterChange,
  className = "",
}: CronKpiSummaryProps) {
  const { t, number, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] =
    useState<CronStatKey | null>(null);

  const activeStat =
    propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: CronStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
    // Mở thẻ KPI → lọc bảng/lưới chính theo trạng thái tương ứng; đóng thẻ → bỏ lọc.
    onFilterChange?.(next === "enabled" || next === "disabled" ? next : "all");
  };

  const {
    total,
    enabledCount,
    disabledCount,
    enabledRate,
    disabledRate,
    cleanupCount,
    digestCount,
  } = useMemo(() => {
    const tot = jobs.length;
    const enabled = jobs.filter((j) => j.isEnabled).length;
    const disabled = tot - enabled;
    const eRate = tot > 0 ? Math.round((enabled / tot) * 100) : 0;
    const dRate = tot > 0 ? 100 - eRate : 0;
    const cleanup = jobs.filter((j) => j.name.startsWith("cleanup-")).length;
    const digest = jobs.filter(
      (j) => j.name.includes("digest") || j.name.includes("summary"),
    ).length;

    return {
      total: tot,
      enabledCount: enabled,
      disabledCount: disabled,
      enabledRate: eRate,
      disabledRate: dRate,
      cleanupCount: cleanup,
      digestCount: digest,
    };
  }, [jobs]);

  const animatedRate = useAnimatedProgress(enabledRate, {
    enabled: !loading && hasData,
  });

  const allEnabled = total > 0 && disabledCount === 0;
  const noneEnabled = total > 0 && enabledCount === 0;

  const formatMetric = (count: number) => {
    if (loading) return "...";
    if (!hasData) return "—";
    return <AnimatedNumber value={count} format={(val) => number.format(val)} />;
  };

  const statItems = [
    {
      key: "total" as const,
      testId: "cron-kpi-total",
      title: t("cron.kpi.total"),
      value: total,
      Icon: CalendarClock,
      iconTone: "text-primary",
      valueTone: "text-foreground",
      accentBar: "bg-primary",
      badgeText:
        hasData && !loading
          ? isVietnamese
            ? `${cleanupCount} dọn dẹp · ${digestCount} báo cáo`
            : `${cleanupCount} cleanup · ${digestCount} digest`
          : null,
      badgeClass:
        "border-primary/25 text-primary",
      description: isVietnamese
        ? "Tác vụ định kỳ hệ thống"
        : t("cron.kpi.totalDesc"),
    },
    {
      key: "enabled" as const,
      testId: "cron-kpi-enabled",
      title: t("cron.kpi.enabled"),
      value: enabledCount,
      Icon: CirclePlay,
      iconTone: "text-emerald-600 dark:text-emerald-400",
      valueTone: "text-emerald-600 dark:text-emerald-400",
      accentBar: "bg-emerald-500",
      badgeText: hasData && !loading ? `${enabledRate}%` : null,
      badgeClass:
        "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      hasLiveDot: enabledCount > 0,
      description: isVietnamese
        ? `${enabledRate}% tự động kích hoạt`
        : `${enabledRate}% automated`,
    },
    {
      key: "disabled" as const,
      testId: "cron-kpi-disabled",
      title: t("cron.kpi.disabled"),
      value: disabledCount,
      Icon: CirclePause,
      iconTone:
        disabledCount > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
      valueTone:
        disabledCount > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground",
      accentBar: disabledCount > 0 ? "bg-amber-500" : "bg-muted-foreground/40",
      badgeText:
        hasData && !loading
          ? disabledCount > 0
            ? `${disabledRate}%`
            : isVietnamese
              ? "Tối ưu"
              : "Optimal"
          : null,
      badgeClass:
        disabledCount > 0
          ? "border-amber-500/35 text-amber-600 dark:text-amber-400"
          : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      description:
        disabledCount > 0
          ? isVietnamese
            ? `${disabledCount} tác vụ tạm ngưng`
            : `${disabledCount} tasks paused`
          : isVietnamese
            ? "Tất cả đang hoạt động"
            : "All tasks active",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Asymmetric Split Radial Telemetry Console */}
      <section
        aria-label={
          isVietnamese
            ? "Tổng quan trạng thái tác vụ định kỳ"
            : "Scheduled tasks KPI summary"
        }
        className="relative overflow-hidden rounded-[26px] sm:rounded-[30px] border border-white/80 bg-background p-1.5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-300 dark:border-white/10"
      >
        <div className="relative overflow-hidden rounded-[22px] sm:rounded-[25px] border border-[var(--shadow-dark)]/15 bg-background p-4 sm:p-5">
          {/* Top Specular Laser Rim (Primary -> Accent) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-85"
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
            {/* ================= LEFT COLUMN: 3D RADIAL GAUGE DIAL (4 COLS) ================= */}
            <div className="relative flex flex-col items-center justify-between gap-3 rounded-[22px] border border-white/50 bg-background p-4 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] dark:border-white/5 lg:col-span-4">
              {/* Top Pill Label */}
              <div className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese ? "Tự động hóa" : "Automation"}
                </span>

                {!loading && total > 0 && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${noneEnabled
                        ? "border-accent/45 text-accent"
                        : "border-primary/35 text-primary"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${noneEnabled
                          ? "bg-accent"
                          : "bg-primary animate-pulse"
                        }`}
                    />
                    {hasData
                      ? isVietnamese
                        ? `${enabledCount}/${total} bật`
                        : `${enabledCount}/${total} on`
                      : "—"}
                  </span>
                )}
              </div>

              {/* 3D Sculpted Circular Gauge */}
              <div className="relative my-1 flex h-[142px] w-[142px] items-center justify-center">
                {/* Outer Extruded Ring */}
                <div className="absolute inset-0 rounded-full border border-white/80 bg-background shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10" />

                {/* Recessed Track Groove */}
                <div className="absolute inset-[10px] rounded-full bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]" />

                {/* SVG Progress Ring using native currentColor (Never turns black!) */}
                {(() => {
                  const size = 142;
                  const strokeWidth = 11;
                  const radius = (size - strokeWidth * 2 - 8) / 2;
                  const circumference = 2 * Math.PI * radius;
                  const safeRate =
                    loading || !hasData ? 0 : Math.min(100, Math.max(0, animatedRate));
                  const dashOffset = circumference - (safeRate / 100) * circumference;

                  return (
                    <svg
                      width={size}
                      height={size}
                      viewBox={`0 0 ${size} ${size}`}
                      className="relative overflow-visible"
                    >
                      {/* Base Track (Subtle Primary Tint) */}
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-primary/15"
                      />

                      {/* Secondary Accent Under-Arc (Adds two-tone Primary + Accent depth) */}
                      {safeRate > 0 && (
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          transform={`rotate(-90 ${size / 2} ${size / 2})`}
                          className="text-accent opacity-45 transition-all duration-700 ease-out"
                        />
                      )}

                      {/* Primary Main Progress Arc */}
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        className={`transition-all duration-700 ease-out ${noneEnabled ? "text-accent" : "text-primary"
                          }`}
                      />
                    </svg>
                  );
                })()}

                {/* Center Recessed Core */}
                <div className="absolute flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full border border-white/60 bg-background shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)] dark:border-white/5">
                  {loading ? (
                    <Skeleton className="h-6 w-11 rounded-md" />
                  ) : (
                    <span
                      className={`font-mono text-xl font-black leading-none tracking-tight tabular-nums ${noneEnabled ? "text-accent" : "text-primary"
                        }`}
                    >
                      {hasData ? `${enabledRate}%` : "—"}
                    </span>
                  )}
                  <span className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {isVietnamese ? "Sẵn sàng" : "Readiness"}
                  </span>
                </div>
              </div>

              {/* Bottom Caption inside Gauge Card */}
              <p className="text-center text-[11px] font-semibold text-muted-foreground">
                {allEnabled
                  ? isVietnamese
                    ? "Toàn bộ lịch trình đang vận hành"
                    : "All scheduled tasks operational"
                  : noneEnabled
                    ? isVietnamese
                      ? "Tất cả tác vụ đang tạm dừng"
                      : "All scheduled tasks paused"
                    : isVietnamese
                      ? "Hệ thống đang chạy theo lịch cấu hình"
                      : "Running per configured schedule"}
              </p>
            </div>

            {/* ================= RIGHT COLUMN: HEADER + 3 INTERACTIVE MODULES (8 COLS) ================= */}
            <div className="flex flex-col justify-between gap-4 lg:col-span-8">
              {/* Top Identity Header */}
              <div className="flex items-start sm:items-center justify-between gap-3 border-b border-[var(--shadow-dark)]/15 pb-3.5">
                <div className="flex min-w-0 items-center gap-3.5">
                  {/* Dual-tier Neumorphic Icon Pod */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/85 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                      <CalendarClock className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    {!loading && total > 0 && !noneEnabled && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background bg-gradient-to-tr from-primary to-accent" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                      {isVietnamese
                        ? "Tổng quan vận hành định kỳ"
                        : "Scheduled Operations Summary"}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground">
                      {isVietnamese
                        ? "Chọn một thẻ chỉ số bên dưới để mở bảng điều phối chi tiết."
                        : "Select a metric card below to inspect breakdown & quick actions."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recessed Tray containing 3 Tactile Stat Cards */}
              <div className="flex-1 rounded-[22px] border border-white/45 bg-background p-2.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/5">
                <div className="grid h-full grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {statItems.map((item, idx) => {
                    const Icon = item.Icon;
                    const isSelected = activeStat === item.key;
                    const isPrimaryTone = idx !== 1;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleToggle(item.key)}
                        aria-pressed={isSelected}
                        className={`group relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border bg-background p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer ${isSelected
                            ? "translate-y-0.5 border-primary/45 shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)]"
                            : "border-white/75 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:-translate-y-0.5 hover:border-primary/35 dark:border-white/10"
                          }`}
                      >
                        {/* Top Accent Laser Line */}
                        <span
                          aria-hidden="true"
                          className={`absolute inset-x-5 top-0 h-[2px] rounded-full transition-opacity duration-200 ${isPrimaryTone ? "bg-primary" : "bg-accent"
                            } ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-75"}`}
                        />

                        {/* Card Top: Icon + Expand Chevron */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${isPrimaryTone ? "text-primary" : "text-accent"
                              }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={2.2} />
                          </span>

                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] group-hover:text-foreground"
                              }`}
                          >
                            <span className="hidden xl:inline">
                              {isSelected ? t("cron.kpi.collapse") : t("cron.kpi.viewDetail")}
                            </span>
                            {isSelected ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </span>
                        </div>

                        {/* Card Middle: Label + Hero Metric */}
                        <div className="space-y-1.5">
                          <span className="block truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            {item.title}
                          </span>

                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              data-testid={item.testId}
                              className={`font-mono text-2xl sm:text-[28px] font-black leading-none tracking-tight tabular-nums ${isPrimaryTone ? "text-primary" : "text-accent"
                                }`}
                            >
                              {formatMetric(item.value)}
                            </span>

                            {item.badgeText && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 font-mono text-[10px] font-bold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] ${isPrimaryTone
                                    ? "border-primary/30 text-primary"
                                    : "border-accent/35 text-accent"
                                  }`}
                              >
                                {item.hasLiveDot && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                                )}
                                {item.badgeText}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Bottom: Description */}
                        <p className="line-clamp-1 border-t border-[var(--shadow-dark)]/15 pt-2 text-[11px] font-medium text-muted-foreground">
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expandable Detail Panel */}
      {activeStat && (
        <div className="pt-1 sm:pt-2 animate-in fade-in-50 slide-in-from-top-3 duration-300">
          <CronStatsDetailPanel
            activeStat={activeStat}
            jobs={jobs}
            onClose={() => handleToggle(activeStat)}
            onFilterChange={onFilterChange}
          />
        </div>
      )}
    </div>
  );
}
