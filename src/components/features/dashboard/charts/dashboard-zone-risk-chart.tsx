"use client";

import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";
import type { DashboardCameraStat } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardZoneRiskChartProps {
  cameras?: CameraItem[];
  cameraStats: DashboardCameraStat[];
  catalogComplete?: boolean;
  className?: string;
  topOnly?: boolean;
  onSelectCamera?: (id: string) => void;
}
export function DashboardZoneRiskChart({
  cameras = [],
  cameraStats,
  catalogComplete = false,
  className,
  topOnly = false,
  onSelectCamera,
}: DashboardZoneRiskChartProps) {
  const { t, number } = useLocale();
  const stats = new Map(cameraStats.map((row) => [row.cameraId, row]));
  const cameraMap = new Map(cameras.map((camera) => [camera.id, camera]));
  const ids = topOnly
    ? cameraStats.slice(0, 5).map((row) => row.cameraId)
    : [
        ...new Set([
          ...cameras.map((camera) => camera.id),
          ...cameraStats.map((row) => row.cameraId),
        ]),
      ];
  return (
    <DashboardPanel
      title={t(
        topOnly ? "dashboard.charts.topCameras" : "dashboard.charts.cameras",
      )}
      description={t("dashboard.charts.cameraScope")}
      className={className}
    >
      {!ids.length && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("dashboard.charts.noIncidents")}
        </p>
      )}
      <div className="max-h-[520px] space-y-2 overflow-y-auto">
        {ids.map((id) => {
          const camera = cameraMap.get(id);
          const row = stats.get(id);
          return (
            <button
              key={id}
              type="button"
              disabled={!onSelectCamera || id === "OTHER"}
              onClick={() => onSelectCamera?.(id)}
              className="w-full rounded-xl border border-border/30 bg-background/50 p-3 text-left enabled:hover:border-primary/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {camera?.name ||
                    row?.cameraName ||
                    (id === "OTHER"
                      ? t("dashboard.type.OTHER")
                      : `Camera ${id.slice(0, 8)}`)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {camera
                    ? t(`dashboard.camera.${camera.status}`)
                    : t("dashboard.camera.unknown")}
                </span>
              </div>
              {camera?.code && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {camera.code}
                </p>
              )}
              <p className="mt-2 text-xs">
                {number.format(row?.total ?? 0)}{" "}
                {t("dashboard.charts.incidents")} ·{" "}
                {number.format(row?.pending ?? 0)}{" "}
                {t("dashboard.charts.backlog")}
              </p>
              {!row?.total && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("dashboard.charts.noneInPeriod")}
                </p>
              )}
            </button>
          );
        })}
      </div>
      {!catalogComplete && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {t("dashboard.charts.catalogUnavailable")}
        </p>
      )}
    </DashboardPanel>
  );
}
