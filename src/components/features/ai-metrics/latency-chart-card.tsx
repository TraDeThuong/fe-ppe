"use client";

import { Activity, BellRing, Clock, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { useId } from "react";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
import type { LatencyDataPoint } from "@/types";
import { AiCardHelpButton } from "./ai-metrics-guide-modal";

export interface LatencyChartCardProps {
  latencyHistory?: LatencyDataPoint[];
  avgLatencyMs?: number | null;
  p95LatencyMs?: number | null;
  e2eAlertLatencyMs?: number | null;
  avgFps?: number | null;
  loading?: boolean;
  onOpenGuide?: () => void;
}

/** SLA cho độ trễ suy luận (Avg / P95 / Min): mỗi khung hình < 100 ms. */
export const INFERENCE_LATENCY_SLA_MS = 100;
/** SLA cho độ trễ cảnh báo đầu-cuối (E2E Alert): < 2000 ms. */
export const E2E_ALERT_LATENCY_SLA_MS = 2000;
/** Mốc FPS dùng làm 100% cho thanh tiến độ thông lượng. */
export const THROUGHPUT_TARGET_FPS = 60;

/**
 * Cách tính độ rộng thanh tiến độ của từng thẻ KPI:
 * - "inference": giá trị / SLA suy luận 100 ms
 * - "peak": đỉnh độ trễ so với trục cao nhất của biểu đồ
 * - "e2e": giá trị / SLA cảnh báo đầu-cuối 2000 ms
 * - "fps": giá trị / 60 FPS
 */
export type LatencyStatBarKind = "inference" | "peak" | "e2e" | "fps";

export function computeLatencyStatBarWidth(
  kind: LatencyStatBarKind,
  value: number | null,
  chart: { highestLatency: number; maxVal: number },
): number {
  if (value === null || !Number.isFinite(value)) return 0;

  let ratio: number;
  switch (kind) {
    case "peak":
      ratio = chart.highestLatency / Math.max(chart.maxVal, 1);
      break;
    case "e2e":
      ratio = value / E2E_ALERT_LATENCY_SLA_MS;
      break;
    case "fps":
      ratio = value / THROUGHPUT_TARGET_FPS;
      break;
    case "inference":
    default:
      ratio = value / INFERENCE_LATENCY_SLA_MS;
      break;
  }

  return Math.max(0, Math.min(100, ratio * 100));
}

export function LatencyChartCard({
  latencyHistory = [],
  avgLatencyMs = null,
  p95LatencyMs = null,
  e2eAlertLatencyMs = null,
  avgFps = null,
  loading = false,
  onOpenGuide,
}: LatencyChartCardProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
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

  const minVal = hasData ? Math.max(0, Math.floor(observedMin - 4)) : 0;
  const maxVal = hasData
    ? Math.max(Math.ceil(observedMax + 6), minVal + 10)
    : 50;

  const observedFpsMin = hasData
    ? Math.min(...history.map((point) => point.fps))
    : 0;
  const observedFpsMax = hasData
    ? Math.max(...history.map((point) => point.fps))
    : 30;

  const minFpsVal = hasData ? Math.max(0, Math.floor(observedFpsMin - 4)) : 0;
  const maxFpsVal = hasData
    ? Math.max(Math.ceil(observedFpsMax + 4), minFpsVal + 10)
    : 40;

  const width = 600;
  const height = 220;
  const paddingX = 44;
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
      ((point.latencyMs - minVal) / (maxVal - minVal || 1)) * chartHeight;

    const fpsY =
      paddingY +
      chartHeight -
      ((point.fps - minFpsVal) / (maxFpsVal - minFpsVal || 1)) * chartHeight;

    return { ...point, x, y, fpsY };
  });

  const pathD = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const fpsPathD = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.fpsY}`
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

  const xLabelStep = points.length > 8 ? Math.ceil(points.length / 8) : 1;
  const barSweep = useAnimatedProgress(100, { enabled: !loading && hasData });

  const shellShadow =
    "shadow-[0_2px_0_rgba(255,255,255,0.8)_inset,0_-2px_0_rgba(0,0,0,0.025)_inset,8px_10px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)]";

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading latency and FPS chart"
        className={`relative isolate overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 sm:p-5 ${shellShadow}`}
      >
        <div className="space-y-5 animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-[15px] bg-muted/70" />
              <div className="space-y-2">
                <div className="h-4 w-48 rounded-full bg-muted/70" />
                <div className="h-3 w-32 rounded-full bg-muted/50" />
              </div>
            </div>
            <div className="hidden sm:block h-8 w-56 rounded-xl bg-muted/40" />
          </div>

          <div className="h-[260px] rounded-[20px] bg-muted/40 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="h-28 rounded-[17px] bg-muted/40" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const stats = [
    {
      label: t("aiMetrics.latencyChart.avgLatency"),
      value: avgLatencyMs,
      unit: "ms",
      icon: Clock,
      accent: false,
      bar: "inference" as LatencyStatBarKind,
      note: isVi ? "Độ trễ trung bình" : "Average latency",
    },
    {
      label: t("aiMetrics.latencyChart.p95Latency"),
      value: p95LatencyMs,
      unit: "ms",
      icon: Gauge,
      accent: false,
      bar: "inference" as LatencyStatBarKind,
      note: isVi ? "Phân vị P95 (< 100 ms)" : "95th percentile (< 100 ms)",
    },
    {
      label: t("aiMetrics.latencyChart.e2eAlertLatency"),
      value: e2eAlertLatencyMs,
      unit: "ms",
      icon: BellRing,
      accent: true,
      bar: "e2e" as LatencyStatBarKind,
      note: isVi ? "Cảnh báo đầu-cuối (< 2000 ms)" : "End-to-End Alert (< 2000 ms)",
    },
    {
      label: t("aiMetrics.latencyChart.minLatency"),
      value: hasData ? lowestLatency : null,
      unit: "ms",
      icon: TrendingDown,
      accent: false,
      bar: "inference" as LatencyStatBarKind,
      note: isVi ? "Mức thấp nhất trong kỳ" : "Minimum latency",
    },
    {
      label: t("aiMetrics.latencyChart.maxLatency"),
      value: hasData ? highestLatency : null,
      unit: "ms",
      icon: TrendingUp,
      accent: true,
      bar: "peak" as LatencyStatBarKind,
      note: isVi ? "Đỉnh độ trễ trong kỳ" : "Peak latency",
    },
    {
      label: t("aiMetrics.latencyChart.throughput"),
      value: avgFps,
      unit: "FPS",
      icon: Gauge,
      accent: false,
      bar: "fps" as LatencyStatBarKind,
      note: hasData
        ? `${observedFpsMin.toFixed(1)}–${observedFpsMax.toFixed(1)} FPS`
        : isVi
          ? "Thông lượng trung bình"
          : "Average throughput",
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
                INFERENCE TELEMETRY
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:flex w-fit items-center gap-2 rounded-xl border border-border/40 bg-surface px-3 py-2 shadow-[2px_3px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-bold text-foreground">
                {t("aiMetrics.latencyChart.description")}
              </span>
            </div>
            {onOpenGuide && <AiCardHelpButton onClick={onOpenGuide} />}
          </div>
        </header>

        {/* Chart inset chamber */}
        <div className="relative overflow-hidden rounded-[20px] border border-border/30 bg-background/30 p-3 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-extrabold text-foreground">
                {isVi ? "Biến thiên Độ trễ (ms) & Tốc độ khung hình (FPS)" : "Inference latency (ms) & Throughput (FPS)"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {isVi ? "Trục trái: ms · Trục phải: FPS" : "Left axis: ms · Right axis: FPS"}
              </p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.08] px-2.5 py-1.5 text-[10px] font-extrabold text-primary shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,2px_2px_4px_var(--shadow-dark)] tabular-nums">
              {hasData ? (
                <>
                  <AnimatedNumber value={history.length} /> {isVi ? "ngày" : "days"}
                </>
              ) : (
                isVi ? "Chưa có dữ liệu" : "No data"
              )}
            </div>
          </div>

          <div className="w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Latency and FPS history chart"
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

              {/* Recessed grid + dual Y axes */}
              {[0, 0.5, 1].map((ratio) => {
                const y = paddingY + chartHeight * ratio;
                const value = maxVal - (maxVal - minVal) * ratio;
                const fpsAxisVal = maxFpsVal - (maxFpsVal - minFpsVal) * ratio;

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
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="currentColor"
                      className="text-[9px] text-muted-foreground"
                    >
                      {value.toFixed(0)}ms
                    </text>
                    {hasData && (
                      <text
                        x={width - paddingX + 8}
                        y={y + 3}
                        textAnchor="start"
                        fill="#10b981"
                        className="text-[9px] font-semibold"
                      >
                        {fpsAxisVal.toFixed(0)}fps
                      </text>
                    )}
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
                  {/* Soft area for latency */}
                  <path
                    d={areaD}
                    fill={`url(#${gradientId}-area)`}
                  />

                  {/* Raised latency line */}
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
                    className="animate-svg-draw"
                  />

                  {/* Secondary FPS line */}
                  <path
                    d={fpsPathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {points.map((point, index) => {
                    const showXLabel =
                      index % xLabelStep === 0 || index === points.length - 1;
                    const showPointLabels = points.length <= 12;

                    return (
                      <g key={`${point.timestamp}-${index}`}>
                        <title>
                          {`${point.timestamp}: ${point.latencyMs.toFixed(1)} ms | ${point.fps.toFixed(1)} FPS`}
                        </title>

                        {/* FPS dot */}
                        <circle
                          cx={point.x}
                          cy={point.fpsY}
                          r="4"
                          fill="var(--surface)"
                          stroke="#10b981"
                          strokeWidth="2"
                        />

                        {showPointLabels && (
                          <text
                            x={point.x}
                            y={Math.max(12, point.fpsY - 9)}
                            textAnchor="middle"
                            fill="#10b981"
                            className="text-[9px] font-bold"
                          >
                            {point.fps.toFixed(1)}
                          </text>
                        )}

                        {/* Latency dot */}
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

                        {showPointLabels && (
                          <text
                            x={point.x}
                            y={
                              Math.abs(point.y - point.fpsY) < 18 && point.y >= point.fpsY
                                ? Math.min(baselineY - 6, point.y + 16)
                                : Math.max(15, point.y - 12)
                            }
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-[10px] font-bold text-foreground"
                          >
                            {point.latencyMs.toFixed(1)}
                          </text>
                        )}

                        {showXLabel && (
                          <text
                            x={point.x}
                            y={baselineY + 17}
                            textAnchor="middle"
                            fill="currentColor"
                            className="text-[10px] font-medium text-muted-foreground"
                          >
                            {point.timestamp}
                          </text>
                        )}
                      </g>
                    );
                  })}
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded-full bg-primary shadow-[0_1px_2px_var(--shadow-dark)]" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {isVi ? "Độ trễ (ms)" : "Latency (ms)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-emerald-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {isVi ? "Tốc độ (FPS)" : "Throughput (FPS)"}
                </span>
              </div>
            </div>

            <span className="text-[10px] font-medium text-muted-foreground">
              {isVi ? "Đơn vị: ms & FPS" : "Unit: ms & FPS"}
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat, statIdx) => {
            const Icon = stat.icon;
            const numericStat = stat.value;
            const targetWidth = computeLatencyStatBarWidth(stat.bar, numericStat, {
              highestLatency,
              maxVal,
            });

            return (
              <div
                key={stat.label}
                style={{
                  animationDelay: `${statIdx * 60}ms`,
                  boxShadow:
                    "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.02) inset, 4px 5px 10px var(--shadow-dark), -4px -4px 10px var(--shadow-light)",
                }}
                className="animate-stat-enter group relative overflow-hidden rounded-[17px] border border-border/40 bg-surface p-3 transition-transform duration-200 hover:-translate-y-0.5 sm:p-3.5"
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
                    {numericStat === null ? "—" : (
                      <AnimatedNumber value={numericStat} decimals={1} delay={statIdx * 60} />
                    )}
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
                    className={`h-full rounded-full transition-all duration-700 animate-live-shimmer ${
                      stat.accent ? "bg-accent" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, targetWidth * (barSweep / 100)))}%`,
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
                {isVi ? "Ngưỡng SLA độ trễ mục tiêu" : "SLA latency threshold"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {isVi ? "Thời gian phản hồi cho xử lý thời gian thực" : "Target response time"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-right">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-primary tabular-nums">
                P95 &lt; 100 ms
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Inference SLA
              </p>
            </div>
            <div className="border-l border-border/40 pl-4">
              <p className="text-lg font-extrabold tracking-tight text-accent tabular-nums">
                E2E &lt; 2000 ms
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Service level objective
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
