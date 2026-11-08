"use client";

import { useState } from "react";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardPpeRadarChart } from "./charts/dashboard-ppe-radar-chart";
import { DashboardHourlyRiskChart } from "./charts/dashboard-hourly-risk-chart";
import { DashboardSeveritySlaChart } from "./charts/dashboard-severity-sla-chart";
import { DashboardZoneRiskChart } from "./charts/dashboard-zone-risk-chart";

export type OperationalViewMode =
  | "grid"
  | "radar"
  | "hourly"
  | "severity"
  | "cameras";
export interface DashboardOperationalSuiteProps {
  analytics: DashboardAnalytics;
  cameras?: CameraItem[];
  catalogComplete?: boolean;
  className?: string;
  canViewCameras?: boolean;
  onSelectCamera?: (id: string) => void;
}
export function DashboardOperationalSuite({
  analytics,
  cameras,
  catalogComplete,
  className = "",
  canViewCameras = true,
  onSelectCamera,
}: DashboardOperationalSuiteProps) {
  const { t } = useLocale();
  const [view, setView] = useState<OperationalViewMode>("grid");
  const activeView = !canViewCameras && view === "cameras" ? "grid" : view;
  const tabs: OperationalViewMode[] = canViewCameras
    ? ["grid", "radar", "hourly", "severity", "cameras"]
    : ["grid", "radar", "hourly", "severity"];
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{t("dashboard.charts.title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("dashboard.charts.periodScope")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border/30 bg-surface p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeView === tab}
              onClick={() => setView(tab)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${activeView === tab ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {t(`dashboard.view.${tab}`)}
            </button>
          ))}
        </div>
      </div>
      <div
        className={
          activeView === "grid"
            ? "grid grid-cols-1 items-start gap-5 lg:grid-cols-2"
            : "grid grid-cols-1"
        }
      >
        {(activeView === "grid" || activeView === "radar") && (
          <DashboardPpeRadarChart distribution={analytics.distribution} />
        )}
        {(activeView === "grid" || activeView === "hourly") && (
          <DashboardHourlyRiskChart analytics={analytics} />
        )}
        {(activeView === "grid" || activeView === "severity") && (
          <DashboardSeveritySlaChart analytics={analytics} />
        )}
        {canViewCameras &&
          (activeView === "grid" || activeView === "cameras") && (
            <DashboardZoneRiskChart
              cameras={cameras}
              cameraStats={analytics.cameras}
              catalogComplete={catalogComplete}
              onSelectCamera={onSelectCamera}
            />
          )}
      </div>
    </section>
  );
}
