"use client";

import { useState } from "react";
import {
  AlertCircle,
  HardHat,
  Layers,
  Radar,
  ShieldBan,
  Shirt,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { DashboardGroup } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";

export interface DashboardPpeRadarChartProps {
  distribution: DashboardGroup[];
  className?: string;
  compact?: boolean;
  variant?: "full" | "grid";
}

const VIOLATION_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    dotClass: string;
    barColor: string;
  }
> = {
  NO_HELMET: {
    icon: HardHat,
    dotClass: "bg-primary text-primary",
    barColor: "var(--primary)",
  },
  NO_VEST: {
    icon: Shirt,
    dotClass: "bg-accent text-accent",
    barColor: "var(--accent)",
  },
  RESTRICTED_AREA: {
    icon: ShieldBan,
    dotClass: "bg-danger text-danger",
    barColor: "var(--danger)",
  },
  MULTI_VIOLATION: {
    icon: Layers,
    dotClass: "bg-warning text-warning",
    barColor: "var(--warning)",
  },
  OTHER: {
    icon: AlertCircle,
    dotClass: "bg-muted-foreground text-muted-foreground",
    barColor: "var(--muted-foreground)",
  },
};

export function DashboardPpeRadarChart({
  distribution,
  className,
  compact = false,
  variant = "full",
}: DashboardPpeRadarChartProps) {
  const { t, number } = useLocale();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const max = Math.max(1, ...distribution.map((row) => row.count));
  const total = distribution.reduce((sum, row) => sum + row.count, 0);

  const centerX = 150;
  const centerY = 128;
  const radius = 74;
  const labelRadius = radius + 20;

  const points = distribution.map((row, index) => {
    const angle =
      -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, distribution.length);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const value = (row.count / max) * radius;

    const textAnchor: "start" | "middle" | "end" =
      cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
    const dominantBaseline: "auto" | "central" | "hanging" =
      sin < -0.55 ? "auto" : sin > 0.55 ? "hanging" : "central";

    return {
      ...row,
      x: centerX + cos * value,
      y: centerY + sin * value,
      axisX: centerX + cos * radius,
      axisY: centerY + sin * radius,
      labelX: centerX + cos * labelRadius,
      labelY: centerY + sin * labelRadius,
      textAnchor,
      dominantBaseline,
    };
  });

  const gridPoints = (scale: number) =>
    distribution
      .map((_, index) => {
        const angle =
          -Math.PI / 2 +
          (index * Math.PI * 2) / Math.max(1, distribution.length);

        return `${centerX + Math.cos(angle) * radius * scale},${
          centerY + Math.sin(angle) * radius * scale
        }`;
      })
      .join(" ");

  const showRadar = !compact && total > 0 && distribution.length >= 3;
  const isSplit = variant === "full" && showRadar;

  return (
    <DashboardPanel
      title={t(
        compact ? "dashboard.charts.distribution" : "dashboard.charts.radar",
      )}
      description={t("dashboard.charts.allStatuses")}
      icon={<Radar className="size-4" />}
      headerAction={
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/70 px-3 py-1.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
          <span className="size-2 rounded-full bg-primary" />
          <span className="text-xs font-extrabold tabular-nums text-foreground">
            {number.format(total)}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("dashboard.charts.incidents")}
          </span>
        </div>
      }
      className={className}
      bodyClassName="flex flex-col justify-between"
    >
      <div
        className={
          isSplit
            ? "grid grid-cols-1 items-center gap-6 lg:grid-cols-12"
            : "flex flex-col gap-5"
        }
      >
        {/* RADAR STAGE */}
        {showRadar && (
          <div className={isSplit ? "lg:col-span-5" : "mx-auto w-full max-w-[300px]"}>
            <div className="relative overflow-hidden rounded-[22px] border border-border/40 bg-background/75 p-3 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/45 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45)]">
              <svg
                viewBox="0 0 300 256"
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
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.32"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity="0.22"
                    />
                  </linearGradient>
                </defs>

                {/* Concentric Rings */}
                {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
                  <polygon
                    key={scale}
                    points={gridPoints(scale)}
                    fill={idx % 2 === 0 ? "currentColor" : "none"}
                    fillOpacity={idx % 2 === 0 ? "0.02" : "0"}
                    stroke="currentColor"
                    strokeWidth={scale === 1 ? "1.1" : "0.75"}
                    strokeDasharray={scale < 1 ? "3 3" : undefined}
                    opacity={scale === 1 ? "0.2" : "0.14"}
                  />
                ))}

                {/* Axis Spokes */}
                {points.map((point) => {
                  const isActive = hoveredKey === point.key;
                  return (
                    <line
                      key={point.key}
                      x1={centerX}
                      y1={centerY}
                      x2={point.axisX}
                      y2={point.axisY}
                      stroke={isActive ? "var(--primary)" : "currentColor"}
                      strokeWidth={isActive ? "1.4" : "0.8"}
                      opacity={isActive ? "0.7" : "0.14"}
                    />
                  );
                })}

                {/* Data Polygon */}
                <polygon
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="url(#ppeRadarFill)"
                  stroke="var(--primary)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />

                {/* Vertex Markers */}
                {points.map((point) => {
                  const isActive = hoveredKey === point.key;
                  return (
                    <g
                      key={point.key}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredKey(point.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                    >
                      {isActive && (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="9"
                          fill="var(--primary)"
                          opacity="0.18"
                        />
                      )}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? "5.5" : "4.5"}
                        fill="var(--background)"
                        stroke="var(--primary)"
                        strokeWidth="2.2"
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="2"
                        fill="var(--accent)"
                      />
                    </g>
                  );
                })}

                {/* Center Hub */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="20"
                  fill="var(--background)"
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.14))"
                />

                <text
                  x={centerX}
                  y={centerY + 4.5}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[13px] font-extrabold tabular-nums"
                >
                  {number.format(total)}
                </text>

                {/* Axis Labels */}
                {points.map((point) => {
                  const isActive = hoveredKey === point.key;
                  return (
                    <text
                      key={point.key}
                      x={point.labelX}
                      y={point.labelY}
                      textAnchor={point.textAnchor}
                      dominantBaseline={point.dominantBaseline}
                      fill={isActive ? "var(--primary)" : "currentColor"}
                      className="text-[10px] font-semibold transition-opacity"
                      opacity={isActive ? "1" : "0.78"}
                    >
                      {t(`dashboard.type.${point.key}`)}
                    </text>
                  );
                })}
              </svg>

              <div className="mt-1 flex items-center justify-center gap-2 text-[10px] font-medium text-muted-foreground">
                <span>{t("dashboard.charts.scale")}</span>
                <span className="rounded-md bg-surface/90 px-2 py-0.5 font-mono font-bold text-foreground shadow-xs dark:bg-card/70">
                  0–{number.format(max)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {total === 0 && (
          <div className="rounded-2xl border border-border/30 bg-background/50 p-8 text-center shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
            <p className="text-sm font-medium text-muted-foreground">
              {t("dashboard.charts.noIncidents")}
            </p>
          </div>
        )}

        {/* DISTRIBUTION BREAKDOWN */}
        {total > 0 && (
          <div
            className={
              isSplit ? "flex flex-col gap-3 lg:col-span-7" : "flex flex-col gap-2.5"
            }
          >
            <div className="space-y-2.5">
              {distribution.map((row, index) => {
                const ratioWidth = (row.count / max) * 100;
                const meta = VIOLATION_META[row.key] ?? {
                  icon: AlertCircle,
                  dotClass:
                    index % 2 === 0
                      ? "bg-primary text-primary"
                      : "bg-accent text-accent",
                  barColor: index % 2 === 0 ? "var(--primary)" : "var(--accent)",
                };
                const RowIcon = meta.icon;
                const isActive = hoveredKey === row.key;

                return (
                  <div
                    key={row.key}
                    onMouseEnter={() => setHoveredKey(row.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className={`rounded-2xl border px-3.5 py-2.5 transition-all duration-200 ${
                      isActive
                        ? "border-primary/40 bg-background/90 shadow-[3px_4px_10px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] dark:border-primary/35 dark:bg-background/60 dark:shadow-none"
                        : "border-border/30 bg-background/55 dark:border-white/[0.05] dark:bg-background/30"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface/90 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] dark:bg-card/70 dark:shadow-none ${meta.dotClass.split(" ")[1] ?? "text-primary"}`}
                        >
                          <RowIcon className="size-3.5" />
                        </span>
                        <span className="truncate text-xs font-bold text-foreground">
                          {t(`dashboard.type.${row.key}`)}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-foreground">
                        {number.format(row.count)}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                          {t("dashboard.charts.incidents")}
                        </span>
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full border border-border/25 bg-background/90 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:border-white/[0.05] dark:bg-background/60 dark:shadow-none">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${ratioWidth}%`,
                          background: meta.barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOTAL FOOTER */}
            <div className="mt-1 flex items-center justify-between rounded-2xl border border-border/35 bg-background/65 px-4 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("dashboard.charts.total")}
              </span>
              <span className="text-lg font-black tabular-nums text-primary">
                {number.format(total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
