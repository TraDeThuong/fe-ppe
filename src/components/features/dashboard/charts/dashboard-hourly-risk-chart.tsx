
"use client";

import { useLocale } from "@/providers/locale-provider";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardHourlyRiskChartProps {
  analytics: DashboardAnalytics;
  className?: string;
}

export function DashboardHourlyRiskChart({
  analytics,
  className,
}: DashboardHourlyRiskChartProps) {
  const { t, number } = useLocale();

  const max = Math.max(1, ...analytics.hours);
  const peakHour = analytics.hours.findIndex(
    (value) => value > 0 && value === max,
  );

  const shifts = [
    { key: "morning", time: "06–14h", value: analytics.shifts.morning },
    { key: "afternoon", time: "14–22h", value: analytics.shifts.afternoon },
    { key: "night", time: "22–06h", value: analytics.shifts.night },
  ] as const;

  const maxShift = Math.max(1, ...shifts.map((s) => s.value));

  return (
    <DashboardPanel
      title={t("dashboard.charts.hourly")}
      description={t("dashboard.charts.hourScope")}
      className={className}
    >
      <div className="space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/40 bg-background/50 p-4 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("dashboard.charts.total")}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {number.format(analytics.total)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t("dashboard.charts.incidents")}
            </p>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-[2px_2px_6px_rgba(0,0,0,0.03)] dark:border-accent/30 dark:bg-accent/10 dark:shadow-none">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("dashboard.charts.peakHour")}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-accent tabular-nums">
              {peakHour >= 0
                ? `${String(peakHour).padStart(2, "0")}:00`
                : "--:--"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {number.format(peakHour >= 0 ? max : 0)}{" "}
              {t("dashboard.charts.incidents")}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-border/40 bg-background/40 p-3 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-background/30 dark:shadow-none sm:p-4">

          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {t("dashboard.charts.hourly")}
            </span>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {t("dashboard.charts.incidents")}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {t("dashboard.charts.peakHour")}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid h-[190px] min-w-[480px] grid-cols-[repeat(24,minmax(0,1fr))] gap-1">

              {analytics.hours.map((count, hour) => {
                const isPeak = hour === peakHour;
                const barHeight = count > 0
                  ? Math.max(3, (count / max) * 125)
                  : 0;

                return (
                  <div
                    key={hour}
                    className="grid h-full grid-rows-[20px_minmax(0,1fr)_20px] justify-items-center"
                  >
                    {/* Value */}
                    <span
                      className={`flex items-center text-[9px] font-semibold tabular-nums ${
                        isPeak
                          ? "text-accent"
                          : "text-muted-foreground"
                      }`}
                    >
                      {count > 0 ? number.format(count) : ""}
                    </span>

                    {/* Bar area */}
                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        role="img"
                        aria-label={`${String(hour).padStart(2, "0")}:00: ${count}`}
                        className={`w-full max-w-[22px] rounded-t-md transition-all duration-300 ${
                          isPeak
                            ? "bg-accent shadow-[2px_2px_5px_rgba(0,0,0,0.15)]"
                            : "bg-primary/75 shadow-[2px_2px_5px_rgba(0,0,0,0.08)]"
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                    </div>

                    {/* Hour */}
                    <span
                      className={`flex items-center text-[9px] tabular-nums ${
                        hour % 3 === 0
                          ? "font-semibold text-foreground/70"
                          : "text-transparent"
                      }`}
                    >
                      {hour % 3 === 0
                        ? `${String(hour).padStart(2, "0")}h`
                        : "00h"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shift distribution */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground">
              {t("dashboard.charts.shiftDistribution")}
            </h4>
            <span className="text-[10px] text-muted-foreground">
              3 shifts
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {shifts.map((shift) => {
              const percentage = analytics.total > 0
                ? Math.round((shift.value / analytics.total) * 100)
                : 0;

              const isHighest =
                shift.value === maxShift && shift.value > 0;

              return (
                <div
                  key={shift.key}
                  className="min-w-0 rounded-2xl border border-border/40 bg-background/50 p-3 shadow-[2px_2px_6px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none"
                >
                  <p className="truncate text-[10px] font-medium text-muted-foreground">
                    {t(`dashboard.shift.${shift.key}`)}
                  </p>

                  <p className={`mt-2 text-xl font-bold tabular-nums tracking-tight ${
                    isHighest ? "text-accent" : "text-foreground"
                  }`}>
                    {number.format(shift.value)}
                  </p>

                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {shift.time}
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHighest ? "bg-accent" : "bg-primary/75"
                      }`}
                      style={{
                        width: `${(shift.value / maxShift) * 100}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {percentage}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}
