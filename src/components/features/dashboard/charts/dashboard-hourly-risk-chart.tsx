"use client";

import { useState } from "react";
import { Clock, Flame, Moon, ShieldCheck, Sunrise, Sunset } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";
import {
  DashboardChartExplainButton,
  type ChartExplainContent,
} from "./dashboard-chart-explain-modal";

export interface DashboardHourlyRiskChartProps {
  analytics: DashboardAnalytics;
  className?: string;
  variant?: "full" | "grid";
}

export function DashboardHourlyRiskChart({
  analytics,
  className,
  variant = "full",
}: DashboardHourlyRiskChartProps) {
  const { t, number, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const max = Math.max(1, ...analytics.hours);
  const peakHour = analytics.hours.findIndex(
    (value) => value > 0 && value === max,
  );

  const shifts = [
    {
      key: "morning",
      time: "06–14h",
      value: analytics.shifts.morning,
      icon: Sunrise,
    },
    {
      key: "afternoon",
      time: "14–22h",
      value: analytics.shifts.afternoon,
      icon: Sunset,
    },
    {
      key: "night",
      time: "22–06h",
      value: analytics.shifts.night,
      icon: Moon,
    },
  ] as const;

  const maxShift = Math.max(1, ...shifts.map((s) => s.value));
  const isFull = variant === "full";

  const activeHour = hoveredHour;
  const activeHourCount =
    activeHour !== null ? (analytics.hours[activeHour] ?? 0) : null;

  const topShift = [...shifts].sort((a, b) => b.value - a.value)[0];
  const peakHourLabel =
    peakHour >= 0
      ? `${String(peakHour).padStart(2, "0")}:00 – ${String(peakHour).padStart(2, "0")}:59`
      : "--:--";
  const peakHourShare =
    analytics.total > 0 && peakHour >= 0
      ? Math.round((max / analytics.total) * 100)
      : 0;
  const topShiftShare =
    analytics.total > 0 && topShift
      ? Math.round((topShift.value / analytics.total) * 100)
      : 0;

  const explainContent: ChartExplainContent = {
    title: t("dashboard.charts.hourly"),
    subtitle: t("dashboard.charts.hourScope"),
    highlights: [
      {
        label: isVi ? "Tổng trong kỳ" : "Total in period",
        value: `${number.format(analytics.total)} ${t("dashboard.charts.incidents")}`,
        tone: "primary",
      },
      {
        label: t("dashboard.charts.peakHour"),
        value:
          peakHour >= 0
            ? `${String(peakHour).padStart(2, "0")}:00 (${number.format(max)})`
            : "--:--",
        tone: peakHour >= 0 ? "warning" : "default",
      },
      {
        label: isVi ? "Ca nhiều nhất" : "Top shift",
        value:
          analytics.total > 0 && topShift && topShift.value > 0
            ? `${t(`dashboard.shift.${topShift.key}`)} · ${topShiftShare}%`
            : "—",
        tone: "default",
      },
    ],
    summary:
      analytics.total === 0
        ? isVi
          ? "Trong kỳ thống kê đang chọn, hệ thống chưa ghi nhận sự cố vi phạm PPE nào ở cả 24 khung giờ (00:00 – 23:00)."
          : "During the selected period, no PPE violation incidents were recorded across any of the 24 hours (00:00 – 23:00)."
        : isVi
          ? `Trong kỳ có tổng cộng ${number.format(analytics.total)} sự cố. Khung giờ phát sinh nhiều vi phạm nhất là ${peakHourLabel} với ${number.format(max)} sự cố (${peakHourShare}% tổng số).`
          : `There are ${number.format(analytics.total)} incidents in the period. Violations peaked during ${peakHourLabel} with ${number.format(max)} incidents (${peakHourShare}% of total).`,
    details:
      analytics.total === 0
        ? []
        : isVi
          ? [
              `Ca trực ghi nhận nhiều sự cố nhất là ${t(`dashboard.shift.${topShift.key}`)} (${topShift.time}) với ${number.format(topShift.value)} sự cố (${topShiftShare}%).`,
              `Phân bổ theo 3 ca: Ca sáng ${number.format(analytics.shifts.morning)}, Ca chiều ${number.format(analytics.shifts.afternoon)}, Ca đêm ${number.format(analytics.shifts.night)} sự cố.`,
              "Nếu một khung giờ lặp lại vi phạm cao liên tục, bạn nên ưu tiên nhắc nhở an toàn hoặc tăng kiểm tra đầu ca tại khung giờ đó.",
            ]
          : [
              `The busiest shift is ${t(`dashboard.shift.${topShift.key}`)} (${topShift.time}) with ${number.format(topShift.value)} incidents (${topShiftShare}%).`,
              `Breakdown by shift: Morning ${number.format(analytics.shifts.morning)}, Afternoon ${number.format(analytics.shifts.afternoon)}, Night ${number.format(analytics.shifts.night)}.`,
              "If a specific hour repeatedly spikes, consider targeted safety briefings or extra supervision during that window.",
            ],
    meaning: isVi
      ? "Card này tổng hợp toàn bộ sự cố trong kỳ đã chọn theo 24 khung giờ Việt Nam (UTC+7) và gom thành 3 ca trực (Sáng 06–14h, Chiều 14–22h, Đêm 22–06h), giúp bạn nhận diện khung giờ cao điểm vi phạm."
      : "This card groups all incidents in the selected period across 24 Vietnam-time hours (UTC+7) and 3 shifts (Morning 06–14h, Afternoon 14–22h, Night 22–06h) to highlight peak violation windows.",
  };

  return (
    <DashboardPanel
      title={t("dashboard.charts.hourly")}
      description={t("dashboard.charts.hourScope")}
      icon={<Clock className="size-4" />}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-3 py-1.5 dark:border-accent/30 dark:bg-accent/15">
            <Flame className="size-3.5 text-accent" />
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("dashboard.charts.peakHour")}:
            </span>
            <span className="font-mono text-xs font-extrabold tabular-nums text-foreground">
              {peakHour >= 0 ? `${String(peakHour).padStart(2, "0")}:00` : "--:--"}
            </span>
          </div>
          <DashboardChartExplainButton
            content={explainContent}
            icon={<Clock className="size-5 text-primary" />}
          />
        </div>
      }
      className={className}
      bodyClassName="flex flex-col justify-between"
    >
      {analytics.total === 0 ? (
        <div
          className={`flex min-h-[280px] flex-1 flex-col items-center justify-center gap-4 rounded-[20px] bg-background/70 px-5 py-8 text-center ${NM.recessed}`}
        >
          <div
            className={`flex size-14 items-center justify-center rounded-2xl bg-background text-primary ${NM.extruded}`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-xl bg-background ${NM.recessed}`}
            >
              <ShieldCheck className="size-5" strokeWidth={2.2} />
            </div>
          </div>

          <div className="max-w-md space-y-1.5">
            <h4 className="text-sm font-black text-foreground">
              {t("dashboard.charts.hourlyEmptyTitle")}
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("dashboard.charts.hourlyEmptyDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {shifts.map((shift) => {
              const ShiftIcon = shift.icon;
              return (
                <span
                  key={shift.key}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground ${NM.extruded}`}
                >
                  <ShiftIcon className="size-3.5 text-primary" />
                  <span>{t(`dashboard.shift.${shift.key}`)}</span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({shift.time}):
                  </span>
                  <strong className="font-mono font-extrabold text-foreground">
                    0
                  </strong>
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={
            isFull
              ? "grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12"
              : "flex flex-col gap-4"
          }
        >
        {/* 24-HOUR BAR CHART */}
        <div
          className={`${
            isFull ? "xl:col-span-8" : ""
          } flex flex-col justify-between rounded-[20px] border border-border/40 bg-background/65 p-3.5 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/35 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45)] sm:p-4`}
        >
          {/* Chart Top Legend + Interactive Hover Readout */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" />
                {t("dashboard.charts.incidents")}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="size-2 rounded-full bg-accent" />
                {t("dashboard.charts.peakHour")}
              </span>
            </div>

            {activeHour !== null && activeHourCount !== null ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-surface px-2.5 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-xs dark:bg-card">
                <span>{String(activeHour).padStart(2, "0")}:00</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-primary">
                  {number.format(activeHourCount)}{" "}
                  {t("dashboard.charts.incidents")}
                </span>
              </span>
            ) : (
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                00:00 – 23:00
              </span>
            )}
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="relative min-w-[460px]">
              {/* Subtle horizontal guides */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-[22px] top-[20px] flex flex-col justify-between"
              >
                <div className="border-t border-dashed border-border/40 dark:border-white/[0.07]" />
                <div className="border-t border-dashed border-border/35 dark:border-white/[0.06]" />
                <div className="border-t border-border/50 dark:border-white/[0.1]" />
              </div>

              <div
                className={`relative grid ${
                  isFull ? "h-[210px]" : "h-[180px]"
                } grid-cols-[repeat(24,minmax(0,1fr))] gap-1`}
              >
                {analytics.hours.map((count, hour) => {
                  const isPeak = hour === peakHour;
                  const isHovered = hour === hoveredHour;
                  const maxBarPx = isFull ? 148 : 118;
                  const barHeight =
                    count > 0 ? Math.max(4, (count / max) * maxBarPx) : 0;

                  return (
                    <div
                      key={hour}
                      onMouseEnter={() => setHoveredHour(hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className="group grid h-full cursor-pointer grid-rows-[20px_minmax(0,1fr)_22px] justify-items-center"
                    >
                      {/* Count label */}
                      <span
                        className={`flex items-center text-[9px] font-bold tabular-nums transition-opacity ${
                          isPeak
                            ? "text-accent"
                            : isHovered
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {count > 0 ? number.format(count) : ""}
                      </span>

                      {/* Bar track + column */}
                      <div className="relative flex h-full w-full items-end justify-center px-[2px]">
                        <div
                          aria-hidden="true"
                          className={`absolute inset-y-0 w-full max-w-[20px] rounded-t-md transition-colors ${
                            isHovered
                              ? "bg-primary/[0.08]"
                              : "bg-foreground/[0.025] dark:bg-white/[0.02]"
                          }`}
                        />
                        <div
                          role="img"
                          aria-label={`${String(hour).padStart(2, "0")}:00: ${count}`}
                          className={`relative w-full max-w-[20px] rounded-t-md transition-all duration-300 ${
                            isPeak
                              ? "bg-gradient-to-t from-accent/80 to-accent shadow-[0_2px_8px_rgba(255,177,98,0.35)]"
                              : isHovered
                                ? "bg-gradient-to-t from-primary/80 to-primary shadow-[0_2px_8px_rgba(163,81,57,0.3)]"
                                : "bg-gradient-to-t from-primary/65 to-primary/90"
                          }`}
                          style={{ height: `${barHeight}px` }}
                        />
                      </div>

                      {/* Hour axis */}
                      <span
                        className={`flex items-center font-mono text-[9px] tabular-nums ${
                          hour % 3 === 0 || isHovered
                            ? "font-bold text-foreground/80"
                            : "text-transparent"
                        }`}
                      >
                        {hour % 3 === 0 || isHovered
                          ? `${String(hour).padStart(2, "0")}h`
                          : "00h"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY + SHIFT BREAKDOWN */}
        <div
          className={`${
            isFull ? "xl:col-span-4" : ""
          } flex flex-col justify-between gap-3.5`}
        >
          {/* Compact KPI Pair */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/35 bg-background/60 p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("dashboard.charts.total")}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight tabular-nums text-foreground">
                {number.format(analytics.total)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {t("dashboard.charts.incidents")}
              </p>
            </div>

            <div className="rounded-2xl border border-accent/35 bg-accent/[0.08] p-3.5 dark:border-accent/30 dark:bg-accent/15">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {t("dashboard.charts.peakHour")}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight tabular-nums text-accent">
                {peakHour >= 0
                  ? `${String(peakHour).padStart(2, "0")}:00`
                  : "--:--"}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {number.format(peakHour >= 0 ? max : 0)}{" "}
                {t("dashboard.charts.incidents")}
              </p>
            </div>
          </div>

          {/* Shift distribution */}
          <div className="flex flex-1 flex-col justify-between rounded-2xl border border-border/35 bg-background/55 p-3.5 dark:border-white/[0.06] dark:bg-background/35">
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground">
                {t("dashboard.charts.shiftDistribution")}
              </h4>
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                24h · 3 shifts
              </span>
            </div>

            <div
              className={
                isFull ? "space-y-2.5" : "grid grid-cols-3 gap-2.5"
              }
            >
              {shifts.map((shift) => {
                const percentage =
                  analytics.total > 0
                    ? Math.round((shift.value / analytics.total) * 100)
                    : 0;
                const isHighest =
                  shift.value === maxShift && shift.value > 0;
                const ShiftIcon = shift.icon;

                if (isFull) {
                  return (
                    <div
                      key={shift.key}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        isHighest
                          ? "border-accent/35 bg-accent/[0.06] dark:bg-accent/10"
                          : "border-border/30 bg-surface/80 dark:border-white/[0.05] dark:bg-card/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                              isHighest
                                ? "bg-accent/15 text-accent"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            <ShiftIcon className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">
                              {t(`dashboard.shift.${shift.key}`)}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {shift.time}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-sm font-black tabular-nums ${
                              isHighest ? "text-accent" : "text-foreground"
                            }`}
                          >
                            {number.format(shift.value)}
                          </span>
                          <span className="ml-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] dark:bg-background/60">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighest ? "bg-accent" : "bg-primary/75"
                          }`}
                          style={{
                            width: `${(shift.value / maxShift) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={shift.key}
                    className={`min-w-0 rounded-xl border p-2.5 ${
                      isHighest
                        ? "border-accent/35 bg-accent/[0.06] dark:bg-accent/10"
                        : "border-border/30 bg-surface/80 dark:border-white/[0.05] dark:bg-card/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <ShiftIcon
                        className={`size-3.5 shrink-0 ${
                          isHighest ? "text-accent" : "text-primary"
                        }`}
                      />
                      <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>

                    <p className="mt-1.5 truncate text-[11px] font-bold text-foreground">
                      {t(`dashboard.shift.${shift.key}`)}
                    </p>

                    <div className="mt-1 flex items-baseline justify-between gap-1">
                      <span
                        className={`text-lg font-black tabular-nums ${
                          isHighest ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {number.format(shift.value)}
                      </span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {shift.time}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] dark:bg-background/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighest ? "bg-accent" : "bg-primary/75"
                        }`}
                        style={{
                          width: `${(shift.value / maxShift) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </DashboardPanel>
  );
}
