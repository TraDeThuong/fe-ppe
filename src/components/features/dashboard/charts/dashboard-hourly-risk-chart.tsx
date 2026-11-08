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
  return (
    <DashboardPanel
      title={t("dashboard.charts.hourly")}
      description={t("dashboard.charts.hourScope")}
      className={className}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex h-52 min-w-[460px] items-end gap-1 border-b border-border/40">
          {analytics.hours.map((count, hour) => (
            <div
              key={hour}
              className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
            >
              <span className="mb-1 text-[10px] tabular-nums text-muted-foreground">
                {number.format(count)}
              </span>
              <div
                role="img"
                aria-label={`${String(hour).padStart(2, "0")}:00: ${count} ${t("dashboard.charts.incidents")}`}
                className={`mx-auto w-full rounded-t-md ${count === max ? "bg-amber-500" : "bg-primary/70"}`}
                style={{
                  height: `${(count / max) * 145}px`,
                  minHeight: count > 0 ? 3 : 0,
                }}
              />
              <span className="mt-2 text-[9px] text-muted-foreground">
                {String(hour).padStart(2, "0")}h
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {(
          [
            ["morning", "06–14h"],
            ["afternoon", "14–22h"],
            ["night", "22–06h"],
          ] as const
        ).map(([shift, time]) => (
          <div
            key={shift}
            className="rounded-xl border border-border/30 bg-background/50 p-3"
          >
            <p className="text-xs text-muted-foreground">
              {t(`dashboard.shift.${shift}`)}
            </p>
            <p className="my-1 text-lg font-bold">
              {number.format(analytics.shifts[shift])}
            </p>
            <p className="text-[10px] text-muted-foreground">{time}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {t("dashboard.charts.total")} {number.format(analytics.total)}
      </p>
    </DashboardPanel>
  );
}
