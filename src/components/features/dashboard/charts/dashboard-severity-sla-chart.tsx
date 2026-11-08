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
  return (
    <DashboardPanel
      title={t("dashboard.charts.severity")}
      description={t("dashboard.charts.resolutionScope")}
      className={className}
    >
      <div className="mb-4 rounded-xl border border-border/30 bg-background/50 p-3">
        <span className="text-xs text-muted-foreground">MTTR · </span>
        <strong>{mttr(analytics.mttrMinutes)}</strong>
        <span className="ml-2 text-xs text-muted-foreground">
          ({number.format(analytics.resolutionSamples)}{" "}
          {t("dashboard.charts.samples")})
        </span>
      </div>
      <div className="space-y-3">
        {analytics.severities.map((row) => (
          <div key={row.key} className="rounded-xl border border-border/30 p-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <h4 className="font-semibold">
                {t(`dashboard.severity.${row.key}`)}
              </h4>
              <span>
                {number.format(row.count)} {t("dashboard.charts.incidents")}
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
              {(
                [
                  ["pending", "pending"],
                  ["confirmed", "confirmed"],
                  ["resolved", "resolved"],
                  ["dismissed", "dismissed"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="flex justify-between gap-2">
                  <dt>{t(`dashboard.status.${label}`)}</dt>
                  <dd className="font-semibold text-foreground">
                    {number.format(row[field])}
                  </dd>
                </div>
              ))}
            </dl>
            {row.other > 0 && (
              <p className="mt-1 text-xs">
                {t("dashboard.status.other")}: {number.format(row.other)}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              MTTR {mttr(row.mttrMinutes)} ·{" "}
              {number.format(row.resolutionSamples)}{" "}
              {t("dashboard.charts.samples")}
            </p>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}
