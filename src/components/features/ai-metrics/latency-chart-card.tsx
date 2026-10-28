
"use client";

import { Activity, Clock, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { useId } from "react";
import { useLocale } from "@/providers/locale-provider";
import type { LatencyDataPoint } from "@/types";

export interface LatencyChartCardProps {
  latencyHistory?: LatencyDataPoint[];
  avgLatencyMs?: number;
  avgFps?: number;
}

export function LatencyChartCard({
  latencyHistory = [
    { timestamp: "00:00", latencyMs: 31.2, fps: 30.5 },
    { timestamp: "04:00", latencyMs: 29.8, fps: 31.0 },
    { timestamp: "08:00", latencyMs: 35.6, fps: 28.5 },
    { timestamp: "12:00", latencyMs: 38.2, fps: 27.2 },
    { timestamp: "16:00", latencyMs: 34.0, fps: 29.8 },
    { timestamp: "20:00", latencyMs: 32.4, fps: 30.2 },
  ],
  avgLatencyMs = 32.4,
  avgFps = 30.2,
}: LatencyChartCardProps) {
  const { t } = useLocale();
  const gradientId = useId().replace(/:/g, "");

  const history = latencyHistory.filter(
    (point) =>
      Number.isFinite(point.latencyMs) &&
      Number.isFinite(point.fps)
  );

  const hasData = history.length > 0;

  const observedMin = hasData
    ? Math.min(...history.map((point) => point.latencyMs))
    : 0;

  const observedMax = hasData
    ? Math.max(...history.map((point) => point.latencyMs))
    : 100;

  const minVal = Math.min(observedMin, 20);
  const maxVal = Math.max(observedMax, 50);

  const width = 600;
  const height = 220;
  const paddingX = 42;
  const paddingY = 32;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const baselineY = height - paddingY;

  const points = history.map((point, index) => {
    const x =
      history.length === 1
        ? width / 2
        : paddingX + (index / (history.length - 1)) * chartWidth;

    const y =
      paddingY +
      chartHeight -
      ((point.latencyMs - minVal) / (maxVal - minVal || 1)) *
        chartHeight;

    return { ...point, x, y };
  });

  const pathD = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : "";

  const lowestLatency = hasData
    ? Math.min(...history.map((point) => point.latencyMs))
    : 0;

  const highestLatency = hasData
    ? Math.max(...history.map((point) => point.latencyMs))
    : 0;

  const shellShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.8)_inset,0_-2px_0_rgba(0,0,0,0.025)_inset,8px_10px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]";

  const stats = [
    {
      label: t("aiMetrics.latencyChart.avgLatency"),
      value: avgLatencyMs.toFixed(1),
      unit: "ms",
      icon: Clock,
      accent: false,
      note: "Average latency",
    },
    {
      label: t("aiMetrics.latencyChart.minLatency"),
      value: lowestLatency.toFixed(1),
      unit: "ms",
      icon: TrendingDown,
      accent: false,
      note: "Minimum latency",
    },
    {
      label: t("aiMetrics.latencyChart.maxLatency"),
      value: highestLatency.toFixed(1),
      unit: "ms",
      icon: TrendingUp,
      accent: true,
      note: "Peak latency",
    },
    {
      label: t("aiMetrics.latencyChart.throughput"),
      value: avgFps.toFixed(1),
      unit: "FPS",
      icon: Gauge,
      accent: false,
      note: "Average throughput",
    },
  ];

  return (
    <section
      className={`relative isolate overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 ${shellShadow}`}
    >
      {/* Highlighted top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90 dark:bg-white/15"
      />

      <div className="relative space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-border/40 bg-surface text-primary shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,4px_5px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <Activity className="h-5 w-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-sm font-extrabold tracking-[-0.025em] text-foreground sm:text-[15px]">
                {t("aiMetrics.latencyChart.title")}
              </h4>
              <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground">
                REAL-TIME PERFORMANCE
              </p>
            </div>
          </div>

          <div className="hidden sm:flex w-fit items-center gap-2 rounded-xl border border-border/40 bg-surface px-3 py-2 shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold text-foreground">
              {t("aiMetrics.latencyChart.description")}
            </span>
          </div>
        </header>

        {/* Chart inset chamber */}
        <div className="relative overflow-hidden rounded-[20px] border border-border/30 bg-background/30 p-3 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-extrabold text-foreground">
                Inference latency
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Response time · milliseconds
              </p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.08] px-2.5 py-1.5 text-[10px] font-extrabold text-primary shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,2px_2px_4px_var(--shadow-dark)]">
              {hasData ? `${history.length} samples` : "No data"}
            </div>
          </div>

          <div className="w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Latency history chart"
              className="h-auto max-h-[260px] w-full overflow-visible"
            >
              <defs>
                <linearGradient
                  id={`${gradientId}-area`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.24"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.015"
                  />
                </linearGradient>

                <filter
                  id={`${gradientId}-shadow`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="180%"
                >
                  <feDropShadow
                    dx="1.5"
                    dy="3"
                    stdDeviation="2"
                    floodColor="var(--shadow-dark)"
                    floodOpacity="0.55"
                  />
                </filter>
              </defs>

              {/* Recessed grid */}
              {[0, 0.5, 1].map((ratio) => {
                const y = paddingY + chartHeight * ratio;
                const value = maxVal - (maxVal - minVal) * ratio;

                return (
                  <g key={ratio}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="currentColor"
                      className="text-border/45"
                      strokeDasharray="3 6"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 9}
                      y={y + 3}
                      textAnchor="end"
                      fill="currentColor"
                      className="text-[9px] text-muted-foreground"
                    >
                      {value.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={paddingX}
                y1={baselineY}
                x2={width - paddingX}
                y2={baselineY}
                stroke="currentColor"
                className="text-border/60"
              />

              {hasData && (
                <>
                  {/* Soft area */}
                  <path
                    d={areaD}
                    fill={`url(#${gradientId}-area)`}
                  />

                  {/* Raised data line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.12"
                    transform="translate(0 2)"
                  />

                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#${gradientId}-shadow)`}
                  />

                  {/* Raised data points */}
                  {points.map((point, index) => (
                    <g key={`${point.timestamp}-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="7"
                        fill="var(--shadow-dark)"
                        opacity="0.15"
                      />

                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="var(--surface)"
                        stroke="var(--primary)"
                        strokeWidth="2.5"
                      />

                      <circle
                        cx={point.x - 1}
                        cy={point.y - 1}
                        r="1.5"
                        fill="var(--primary)"
                      />

                      <text
                        x={point.x}
                        y={Math.max(15, point.y - 13)}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-[10px] font-bold text-foreground"
                      >
                        {point.latencyMs.toFixed(1)}
                      </text>

                      <text
                        x={point.x}
                        y={baselineY + 17}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-[10px] font-medium text-muted-foreground"
                      >
                        {point.timestamp}
                      </text>
                    </g>
                  ))}
                </>
              )}

              {!hasData && (
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-sm text-muted-foreground"
                >
                  {t("aiMetrics.latencyChart.noData")}
                </text>
              )}
            </svg>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 px-1 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-5 rounded-full bg-primary shadow-[0_1px_2px_var(--shadow-dark)]" />
              <span className="text-[10px] font-semibold text-muted-foreground">
                Latency
              </span>
            </div>

            <span className="text-[10px] font-medium text-muted-foreground">
              Unit: ms
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-[17px] border border-border/40 bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3.5"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.02) inset, 4px 5px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light)",
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-0 h-px bg-white/90 dark:bg-white/15"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold leading-relaxed text-muted-foreground sm:text-[11px]">
                    {stat.label}
                  </span>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-border/40 bg-surface shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] ${
                      stat.accent ? "text-accent" : "text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[22px] font-extrabold leading-none tracking-[-0.055em] text-foreground tabular-nums sm:text-[25px]">
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {stat.unit}
                  </span>
                </div>

                <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/80">
                  {stat.note}
                </p>

                <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-background/80 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                  <div
                    className={`h-full rounded-full ${
                      stat.accent ? "bg-accent" : "bg-primary"
                    }`}
                    style={{
                      width: stat.accent
                        ? `${(highestLatency / Math.max(maxVal, 1)) * 100}%`
                        : stat.unit === "FPS"
                          ? `${Math.min(100, (avgFps / 60) * 100)}%`
                          : `${Math.min(100, (Number(stat.value) / 100) * 100)}%`,
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.5) inset",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SLA footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/30 bg-surface/60 px-3.5 py-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Gauge className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[11px] font-extrabold text-foreground">
                SLA latency threshold
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Target response time
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-extrabold tracking-tight text-primary tabular-nums">
              &lt; 100 ms
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Service level objective
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
