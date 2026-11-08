
"use client";

import { useLocale } from "@/providers/locale-provider";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardSeveritySlaChartProps {
  analytics: DashboardAnalytics;
  className?: string;
}

export function DashboardSeveritySlaChart({
  analytics,
  className,
}: DashboardSeveritySlaChartProps) {
  const { t, number } = useLocale();

  const mttr = (value: number | null) =>
    value === null
      ? "—"
      : `${number.format(Math.round(value * 10) / 10)} ${t("dashboard.charts.minutes")}`;

  const statuses = [
    { field: "pending", label: "pending", color: "bg-primary/35" },
    { field: "confirmed", label: "confirmed", color: "bg-accent" },
    { field: "resolved", label: "resolved", color: "bg-primary" },
    {
      field: "dismissed",
      label: "dismissed",
      color: "bg-muted-foreground/30",
    },
  ] as const;

  return (
    <DashboardPanel
      title={t("dashboard.charts.severity")}
      description={t("dashboard.charts.resolutionScope")}
      className={className}
    >
      <div className="space-y-3">
        {/* Compact MTTR KPI */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-3.5 py-2.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 dark:border-primary/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                MTTR
              </p>
              <p className="text-base font-bold leading-tight tabular-nums text-foreground">
                {mttr(analytics.mttrMinutes)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-base font-bold tabular-nums text-primary">
              {number.format(analytics.resolutionSamples)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("dashboard.charts.samples")}
            </p>
          </div>
        </div>

        {/* Severity rows */}
        <div className="space-y-2">
          {analytics.severities.map((row) => {
            const total =
              row.pending +
              row.confirmed +
              row.resolved +
              row.dismissed +
              row.other;

            const percent = (value: number) =>
              total > 0 ? (value / total) * 100 : 0;

            return (
              <div
                key={row.key}
                className="rounded-xl border border-border/40 bg-card/50 px-3 py-2.5 shadow-[2px_2px_6px_rgba(0,0,0,0.03)] transition-all duration-200 dark:border-white/[0.06] dark:bg-card/40 dark:shadow-none hover:border-primary/40 dark:hover:border-white/20"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/10" />
                    <span className="text-xs font-bold text-foreground">
                      {t(`dashboard.severity.${row.key}`)}
                    </span>
                  </div>

                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {number.format(row.count)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      {t("dashboard.charts.incidents")}
                    </span>
                  </span>
                </div>

                {/* Distribution bar */}
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/70 shadow-inner">
                  {statuses.map(({ field, color }) => (
                    <div
                      key={field}
                      className={color}
                      style={{ width: `${percent(row[field])}%` }}
                    />
                  ))}
                  {row.other > 0 && (
                    <div
                      className="bg-muted-foreground/40"
                      style={{ width: `${percent(row.other)}%` }}
                    />
                  )}
                </div>

                {/* Status grid */}
                <div className="mt-2.5 grid grid-cols-4 gap-1">
                  {statuses.map(({ field, label, color }) => (
                    <div key={field} className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`size-1.5 shrink-0 rounded-full ${color}`} />
                        <span className="truncate text-[9px] text-muted-foreground">
                          {t(`dashboard.status.${label}`)}
                        </span>
                      </div>
                      <p className="mt-0.5 pl-2.5 text-xs font-bold tabular-nums text-foreground">
                        {number.format(row[field])}
                      </p>
                    </div>
                  ))}
                </div>

                {/* MTTR footer */}
                <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {t("dashboard.status.other")}: {number.format(row.other)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    MTTR{" "}
                    <strong className="text-foreground">
                      {mttr(row.mttrMinutes)}
                    </strong>
                    {" · "}
                    {number.format(row.resolutionSamples)}{" "}
                    {t("dashboard.charts.samples")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}
