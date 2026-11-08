
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

  const centerX = 120;
  const centerY = 108;
  const radius = 73;

  const points = distribution.map((row, index) => {
    const angle =
      -Math.PI / 2 + (index * Math.PI * 2) / distribution.length;

    const value = (row.count / max) * radius;

    return {
      ...row,
      x: centerX + Math.cos(angle) * value,
      y: centerY + Math.sin(angle) * value,
      axisX: centerX + Math.cos(angle) * radius,
      axisY: centerY + Math.sin(angle) * radius,
      labelX: centerX + Math.cos(angle) * (radius + 17),
      labelY: centerY + Math.sin(angle) * (radius + 17),
    };
  });

  const gridPoints = (scale: number) =>
    distribution
      .map((_, index) => {
        const angle =
          -Math.PI / 2 + (index * Math.PI * 2) / distribution.length;

        return `${centerX + Math.cos(angle) * radius * scale},${
          centerY + Math.sin(angle) * radius * scale
        }`;
      })
      .join(" ");

  return (
    <DashboardPanel
      title={t(
        compact ? "dashboard.charts.distribution" : "dashboard.charts.radar",
      )}
      description={t("dashboard.charts.allStatuses")}
      className={className}
    >
      {/* RADAR */}
      {!compact && total > 0 && distribution.length >= 3 && (
        <div className="mx-auto mb-6 w-full max-w-[310px]">
          <div className="rounded-[24px] bg-background/80 p-3 shadow-[4px_4px_12px_rgba(0,0,0,0.04),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
            <svg
              viewBox="0 0 240 220"
              role="img"
              aria-label={t("dashboard.charts.radar")}
              className="w-full overflow-visible"
            >
              <defs>
                <linearGradient
                  id="ppeRadarFill"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Grid */}
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={gridPoints(scale)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  opacity="0.13"
                />
              ))}

              {/* Axis */}
              {points.map((point) => (
                <line
                  key={point.key}
                  x1={centerX}
                  y1={centerY}
                  x2={point.axisX}
                  y2={point.axisY}
                  stroke="currentColor"
                  strokeWidth="0.8"
                  opacity="0.13"
                />
              ))}

              {/* Data */}
              <polygon
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="url(#ppeRadarFill)"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Points */}
              {points.map((point) => (
                <g key={point.key}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="var(--background)"
                    stroke="var(--primary)"
                    strokeWidth="2"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="2"
                    fill="var(--accent)"
                  />
                </g>
              ))}

              {/* Center */}
              <circle
                cx={centerX}
                cy={centerY}
                r="19"
                fill="var(--background)"
                stroke="currentColor"
                strokeOpacity="0.08"
                filter="drop-shadow(2px 2px 3px rgba(0,0,0,0.12))"
              />

              <text
                x={centerX}
                y={centerY + 5}
                textAnchor="middle"
                fill="currentColor"
                className="text-[14px] font-bold"
              >
                {number.format(total)}
              </text>

              {/* Labels */}
              {points.map((point) => (
                <text
                  key={point.key}
                  x={point.labelX}
                  y={point.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[8px] font-medium"
                  opacity="0.7"
                >
                  {t(`dashboard.type.${point.key}`)}
                </text>
              ))}
            </svg>
          </div>

          <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground">
            {t("dashboard.charts.scale")} · 0–{number.format(max)}
          </p>
        </div>
      )}

      {/* EMPTY STATE */}
      {total === 0 && (
        <div className="my-8 rounded-2xl bg-background/50 p-7 text-center shadow-[inset_2px_2px_6px_rgba(0,0,0,0.03)] dark:border dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
          <p className="text-sm font-medium text-muted-foreground">
            {t("dashboard.charts.noIncidents")}
          </p>
        </div>
      )}

      {/* DISTRIBUTION */}
      <div className="space-y-5">
        {distribution.map((row, index) => {
          const percentage = (row.count / max) * 100;

          return (
            <div key={row.key}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  {t(`dashboard.type.${row.key}`)}
                </span>

                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {number.format(row.count)}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    {t("dashboard.charts.incidents")}
                  </span>
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-background/80 border border-border/20 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.05] dark:bg-background/60 dark:shadow-none">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background:
                      index % 2 === 0
                        ? "var(--primary)"
                        : "var(--accent)",
                    boxShadow:
                      "inset 0 1px 1px rgba(255,255,255,0.3), 1px 1px 3px rgba(0,0,0,0.12)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* TOTAL */}
      <div className="mt-6 border-t border-border/30 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t("dashboard.charts.total")}
          </span>

          <span className="text-xl font-bold tabular-nums text-accent">
            {number.format(total)}
          </span>
        </div>
      </div>
    </DashboardPanel>
  );
}
