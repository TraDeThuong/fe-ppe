"use client";

import { BarChart3 } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardHourlyRiskChart } from "./charts/dashboard-hourly-risk-chart";
import { DashboardSeveritySlaChart } from "./charts/dashboard-severity-sla-chart";

export interface DashboardOperationalSuiteProps {
  analytics: DashboardAnalytics;
  className?: string;
}

export function DashboardOperationalSuite({
  analytics,
  className = "",
}: DashboardOperationalSuiteProps) {
  const { t } = useLocale();

  return (
    <section className={`space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="relative overflow-hidden rounded-[22px] border border-border/40 bg-surface/90 p-4 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:px-5 sm:py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
        />

        <div className="flex min-w-0 items-center gap-3.5">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-primary ${NM.extruded}`}
          >
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg">
              {t("dashboard.charts.title")}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {t("dashboard.charts.periodScope")}
            </p>
          </div>
        </div>
      </div>

      {/* Streamlined 2-Chart Stage: Hourly + Severity & MTTR */}
      <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2">
        <DashboardHourlyRiskChart
          analytics={analytics}
          variant="grid"
          className="h-full"
        />
        <DashboardSeveritySlaChart
          analytics={analytics}
          variant="grid"
          className="h-full"
        />
      </div>
    </section>
  );
}
