
"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Clock,
  Flame,
  Moon,
  ShieldCheck,
  Sun,
  Sunrise,
  TrendingUp,
} from "lucide-react";

import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface DashboardHourlyRiskChartProps {
  incidents?: IncidentItem[];
  className?: string;
  loading?: boolean;
}

type ShiftType = "MORNING" | "AFTERNOON" | "NIGHT";

interface HourlyPoint {
  hourStr: string;
  hourNumber: number;
  count: number;
  shift: ShiftType;
  primaryViolation: string;
  isPeak: boolean;
}

const SHIFT_CONFIG: Record<
  ShiftType,
  {
    icon: typeof Sunrise;
    labelVi: string;
    labelEn: string;
    time: string;
  }
> = {
  MORNING: {
    icon: Sunrise,
    labelVi: "Ca sáng",
    labelEn: "Morning",
    time: "06–14h",
  },
  AFTERNOON: {
    icon: Sun,
    labelVi: "Ca chiều",
    labelEn: "Afternoon",
    time: "14–22h",
  },
  NIGHT: {
    icon: Moon,
    labelVi: "Ca đêm",
    labelEn: "Night",
    time: "22–06h",
  },
};

export function DashboardHourlyRiskChart({
  incidents = [],
  className = "",
  loading = false,
}: DashboardHourlyRiskChartProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [hoveredHour, setHoveredHour] =
    useState<HourlyPoint | null>(null);

  // --------------------------------------------------
  // HOURLY DATA
  // --------------------------------------------------

  const hourlyData = useMemo(() => {
    const buckets: Record<
      number,
      {
        count: number;
        types: Record<string, number>;
      }
    > = {};

    for (let hour = 6; hour <= 18; hour++) {
      buckets[hour] = {
        count: 0,
        types: {},
      };
    }

    incidents.forEach((item) => {
      const date = new Date(item.detectedAt);

      if (Number.isNaN(date.getTime())) return;

      const hour = date.getHours();

      if (hour < 6 || hour > 18) return;

      buckets[hour].count += 1;

      const type = item.violationType || "OTHER";

      buckets[hour].types[type] =
        (buckets[hour].types[type] || 0) + 1;
    });

    const maxValue = Math.max(
      ...Object.values(buckets).map((item) => item.count),
      0,
    );

    return Array.from({ length: 13 }, (_, index) => {
      const hour = index + 6;
      const bucket = buckets[hour];

      const shift: ShiftType =
        hour < 14
          ? "MORNING"
          : hour < 22
            ? "AFTERNOON"
            : "NIGHT";

      const primaryViolation =
        Object.entries(bucket.types).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0] ?? "—";

      return {
        hourStr: `${String(hour).padStart(2, "0")}:00`,
        hourNumber: hour,
        count: bucket.count,
        shift,
        primaryViolation,
        isPeak: maxValue > 0 && bucket.count === maxValue,
      };
    });
  }, [incidents]);

  const totalViolations = useMemo(
    () => hourlyData.reduce((sum, item) => sum + item.count, 0),
    [hourlyData],
  );

  const maxCount = useMemo(
    () => Math.max(...hourlyData.map((item) => item.count), 1),
    [hourlyData],
  );

  const peakPoint = useMemo(() => {
    if (!totalViolations) return null;

    return [...hourlyData].sort(
      (a, b) => b.count - a.count,
    )[0];
  }, [hourlyData, totalViolations]);

  // --------------------------------------------------
  // SHIFT STATISTICS
  // --------------------------------------------------

  const shiftStats = useMemo(
    () => ({
      morning: hourlyData
        .filter((item) => item.shift === "MORNING")
        .reduce((sum, item) => sum + item.count, 0),

      afternoon: hourlyData
        .filter((item) => item.shift === "AFTERNOON")
        .reduce((sum, item) => sum + item.count, 0),

      night: hourlyData
        .filter((item) => item.shift === "NIGHT")
        .reduce((sum, item) => sum + item.count, 0),
    }),
    [hourlyData],
  );

  const shifts = [
    {
      key: "morning",
      type: "MORNING" as const,
      count: shiftStats.morning,
    },
    {
      key: "afternoon",
      type: "AFTERNOON" as const,
      count: shiftStats.afternoon,
    },
    {
      key: "night",
      type: "NIGHT" as const,
      count: shiftStats.night,
    },
  ];

  const activeShift = useMemo(() => {
    const entries = Object.entries(shiftStats);

    return entries.sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [shiftStats]);

  // --------------------------------------------------
  // RESPONSIVE BAR WIDTH
  // --------------------------------------------------

  const barWidth =
    hourlyData.length <= 24
      ? 30
      : hourlyData.length <= 48
        ? 24
        : hourlyData.length <= 96
          ? 18
          : 14;

  const barGap = hourlyData.length <= 24 ? 9 : 6;

  const chartContentWidth =
    hourlyData.length * (barWidth + barGap);

  const selectedHour = hoveredHour;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section
      className={[
        "relative isolate flex h-full min-h-0 w-full flex-col",
        "overflow-hidden rounded-[30px]",
        "border border-border/30 bg-surface p-4 sm:p-5",
        "shadow-[12px_12px_28px_var(--shadow-dark),-12px_-12px_28px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      {/* Ambient light */}
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-primary/[0.06] blur-3xl" />

      <div className="pointer-events-none absolute inset-[1px] rounded-[29px] border border-white/40 dark:border-white/[0.04]" />

      {/* HEADER */}
      <header className="relative z-10 flex shrink-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "relative flex h-11 w-11 shrink-0 items-center justify-center",
              "rounded-[15px] bg-surface",
              "shadow-[5px_5px_11px_var(--shadow-dark),-5px_-5px_11px_var(--shadow-light)]",
            ].join(" ")}
          >
            <Clock className="h-5 w-5 text-primary" />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_7px_var(--accent)]" />
          </div>

          <div className="min-w-0 pt-0.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />

              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                HOURLY RISK ANALYTICS
              </span>
            </div>

            <h3 className="text-[15px] font-extrabold tracking-tight text-foreground sm:text-lg">
              {isVietnamese
                ? "Phân tích rủi ro theo giờ"
                : "Hourly Risk Analysis"}
            </h3>

            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
              {isVietnamese
                ? "Mật độ vi phạm theo thời gian phát hiện"
                : "Incident density by detection time"}
            </p>
          </div>
        </div>

        {/* Peak KPI */}
        <div
          className={[
            "relative shrink-0 rounded-[17px] bg-surface px-3 py-2.5",
            "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-1.5">
            {peakPoint ? (
              <Flame className="h-3 w-3 text-accent" />
            ) : (
              <ShieldCheck className="h-3 w-3 text-primary" />
            )}

            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Giờ cao điểm" : "Peak hour"}
            </span>
          </div>

          <div className="mt-1 text-xl font-black leading-none tracking-tight tabular-nums text-primary sm:text-2xl">
            {loading ? "—" : peakPoint?.hourStr ?? "--:--"}
          </div>
        </div>
      </header>

      {/* CHART */}
      <div className="relative z-10 my-4 flex min-h-0 flex-1 flex-col">
        <div
          className={[
            "relative flex min-h-0 flex-1 flex-col overflow-hidden",
            "rounded-[25px] border border-border/20 bg-background/40 p-3 sm:p-4",
            "shadow-[inset_8px_8px_18px_var(--shadow-dark),inset_-8px_-8px_18px_var(--shadow-light)]",
          ].join(" ")}
        >
          {/* Chart title */}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                {isVietnamese ? "Mật độ sự cố" : "Incident density"}
              </p>

              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                06:00 — 18:00
              </p>
            </div>

            <div className="rounded-full bg-surface px-2.5 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
              <span className="text-[9px] font-bold text-muted-foreground">
                {hourlyData.length} {isVietnamese ? "khung giờ" : "slots"}
              </span>
            </div>
          </div>

          {/* Selected hour information */}
          <div className="mt-3 flex h-[42px] shrink-0 items-center justify-between gap-2 rounded-[13px] bg-surface px-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            {selectedHour ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                  {selectedHour.hourStr}
                </span>

                <span className="truncate text-[10px] font-bold text-foreground">
                  {selectedHour.primaryViolation}
                </span>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />

                <span className="truncate text-[10px] font-medium text-muted-foreground">
                  {isVietnamese
                    ? "Chọn cột để xem chi tiết"
                    : "Select a bar to inspect"}
                </span>
              </div>
            )}

            <div className="flex shrink-0 items-baseline gap-1">
              <span className="text-base font-black tabular-nums text-primary">
                {selectedHour ? selectedHour.count : totalViolations}
              </span>

              <span className="text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "vụ" : "cases"}
              </span>
            </div>
          </div>

          {/* SCROLLABLE CHART AREA */}
          <div className="relative mt-3 min-h-[145px] min-w-0 flex-1">
            <div className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
              <div
                className="relative h-full"
                style={{
                  width: `${chartContentWidth}px`,
                  minWidth: "100%",
                }}
              >
                {/* Grid lines */}
                <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[25px] flex flex-col justify-between">
                  {[0, 1, 2, 3].map((line) => (
                    <div
                      key={line}
                      className="w-full border-t border-dashed border-border/40"
                    />
                  ))}
                </div>

                {/* Bar plotting region
                    Absolute top/bottom creates a definite height.
                    Percentage bar heights now scale correctly. */}
                <div
                  className="absolute inset-x-0 top-0 bottom-[25px] flex items-end"
                  style={{
                    gap: `${barGap}px`,
                  }}
                >
                  {hourlyData.map((point) => {
                    const barHeight =
                      totalViolations === 0
                        ? 3
                        : point.count === 0
                          ? 3
                          : Math.max(
                              7,
                              (point.count / maxCount) * 100,
                            );

                    const isSelected =
                      selectedHour?.hourStr === point.hourStr;

                    const isPeak =
                      point.isPeak && point.count > 0;

                    return (
                      <button
                        key={point.hourStr}
                        type="button"
                        aria-label={`${point.hourStr}: ${point.count} incidents`}
                        onMouseEnter={() => setHoveredHour(point)}
                        onMouseLeave={() => setHoveredHour(null)}
                        onFocus={() => setHoveredHour(point)}
                        onBlur={() => setHoveredHour(null)}
                        onClick={() =>
                          setHoveredHour((current) =>
                            current?.hourStr === point.hourStr
                              ? null
                              : point,
                          )
                        }
                        className="group relative flex h-full shrink-0 items-end justify-center rounded-t-lg outline-none"
                        style={{
                          width: `${barWidth}px`,
                        }}
                      >
                        {/* Bar */}
                        <div
                          className={[
                            "relative w-full overflow-hidden rounded-t-[8px]",
                            "transition-[height,filter,box-shadow] duration-300 ease-out",
                            "group-focus-visible:ring-2 group-focus-visible:ring-primary",
                            isPeak
                              ? "bg-accent shadow-[inset_2px_2px_4px_rgba(255,255,255,0.35),3px_3px_7px_var(--shadow-dark),-2px_0_5px_var(--shadow-light)]"
                              : point.count > 0
                                ? "bg-primary/75 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),3px_3px_7px_var(--shadow-dark),-2px_0_5px_var(--shadow-light)]"
                                : "bg-muted-foreground/15 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                            isSelected
                              ? "brightness-110 ring-2 ring-primary/30"
                              : "group-hover:brightness-110",
                          ].join(" ")}
                          style={{
                            height: `${barHeight}%`,
                            minHeight: point.count > 0 ? "9px" : "4px",
                          }}
                        >
                          {point.count > 0 && (
                            <div className="absolute inset-x-0 top-0 h-[3px] rounded-full bg-white/35" />
                          )}
                        </div>

                        {/* Peak indicator */}
                        {isPeak && (
                          <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2">
                            <Flame className="h-3 w-3 text-accent" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Hour labels */}
                <div
                  className="absolute inset-x-0 bottom-0 flex h-[20px] items-center"
                  style={{
                    gap: `${barGap}px`,
                  }}
                >
                  {hourlyData.map((point) => (
                    <div
                      key={point.hourStr}
                      className="shrink-0 text-center"
                      style={{
                        width: `${barWidth}px`,
                      }}
                    >
                      <span className="whitespace-nowrap text-[8px] font-bold tabular-nums text-muted-foreground">
                        {point.hourNumber % 2 === 0
                          ? `${String(point.hourNumber).padStart(2, "0")}h`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 flex shrink-0 items-center justify-between border-t border-border/20 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />

              <span className="text-[9px] text-muted-foreground">
                {isVietnamese ? "Vi phạm thông thường" : "Incidents"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />

              <span className="text-[9px] text-muted-foreground">
                {isVietnamese ? "Giờ cao điểm" : "Peak hour"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SHIFT DISTRIBUTION */}
      <div className="relative z-10 shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />

            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {isVietnamese ? "Phân bổ theo ca trực" : "Shift distribution"}
            </span>
          </div>

          <span className="text-[9px] font-semibold text-muted-foreground">
            {totalViolations} {isVietnamese ? "sự cố" : "incidents"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {shifts.map(({ key, type, count }) => {
            const config = SHIFT_CONFIG[type];
            const Icon = config.icon;

            const percentage =
              totalViolations > 0
                ? Math.round((count / totalViolations) * 100)
                : 0;

            const isDominant =
              activeShift === key && totalViolations > 0;

            return (
              <div
                key={key}
                className={[
                  "min-w-0 rounded-[16px] bg-surface p-2.5",
                  "border border-border/15",
                  "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={[
                      "h-3.5 w-3.5 shrink-0",
                      isDominant
                        ? "text-primary"
                        : "text-muted-foreground",
                    ].join(" ")}
                  />

                  <span className="truncate text-[9px] font-bold text-muted-foreground">
                    {isVietnamese ? config.labelVi : config.labelEn}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-base font-black leading-none tabular-nums text-foreground">
                    {count}
                  </span>

                  <span className="text-[9px] font-bold text-primary">
                    {percentage}%
                  </span>
                </div>

                <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      isDominant ? "bg-primary" : "bg-primary/45",
                    ].join(" ")}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <p className="mt-1.5 truncate text-[8px] text-muted-foreground/70">
                  {config.time}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
