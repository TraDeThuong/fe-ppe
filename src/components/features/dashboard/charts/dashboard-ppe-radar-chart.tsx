"use client";

import { useLocale } from "@/providers/locale-provider";
import type { DashboardGroup } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardPpeRadarChartProps {
  distribution: DashboardGroup[];
  className?: string;
  compact?: boolean;
}
export function DashboardPpeRadarChart({
  distribution,
  className,
  compact = false,
}: DashboardPpeRadarChartProps) {
  const { t, number } = useLocale();
  const max = Math.max(1, ...distribution.map((row) => row.count));
  const total = distribution.reduce((sum, row) => sum + row.count, 0);
  const radius = 76;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / distribution.length;
    return [120 + Math.cos(angle) * value, 108 + Math.sin(angle) * value];
  };
  return (
    <DashboardPanel
      title={t(
        compact ? "dashboard.charts.distribution" : "dashboard.charts.radar",
      )}
      description={t("dashboard.charts.allStatuses")}
      className={className}
    >
      {!compact && total > 0 && (
        <svg
          viewBox="0 0 240 220"
          role="img"
          aria-label={t("dashboard.charts.radar")}
          className="mx-auto h-52 w-full text-primary"
        >
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <polygon
              key={ring}
              points={distribution
                .map((_, index) => point(index, radius * ring).join(","))
                .join(" ")}
              fill="none"
              stroke="currentColor"
              opacity="0.15"
            />
          ))}
          {distribution.map((row, index) => {
            const [x, y] = point(index, radius + 13);
            return (
              <g key={row.key}>
                <line
                  x1="120"
                  y1="108"
                  x2={point(index, radius)[0]}
                  y2={point(index, radius)[1]}
                  stroke="currentColor"
                  opacity="0.2"
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className="fill-current text-[9px]"
                >
                  {t(`dashboard.type.${row.key}`)}
                </text>
              </g>
            );
          })}
          <polygon
            points={distribution
              .map((row, index) =>
                point(index, (row.count / max) * radius).join(","),
              )
              .join(" ")}
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="120"
            y="214"
            textAnchor="middle"
            className="fill-current text-[10px]"
          >
            {t("dashboard.charts.scale")} 0–{number.format(max)}
          </text>
        </svg>
      )}
      {total === 0 && (
        <p className="my-8 text-center text-sm text-muted-foreground">
          {t("dashboard.charts.noIncidents")}
        </p>
      )}
      <div className="space-y-3">
        {distribution.map((row) => (
          <div key={row.key}>
            <div className="flex justify-between gap-2 text-xs">
              <span>{t(`dashboard.type.${row.key}`)}</span>
              <span className="font-semibold tabular-nums">
                {number.format(row.count)} {t("dashboard.charts.incidents")}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
        {t("dashboard.charts.total")} {number.format(total)}
      </p>
    </DashboardPanel>
  );
}
