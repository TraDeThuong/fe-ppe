"use client";

import { Activity, Clock, Gauge, TrendingDown } from "lucide-react";
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

  const maxVal = Math.max(...latencyHistory.map((d) => d.latencyMs), 50);
  const minVal = Math.min(...latencyHistory.map((d) => d.latencyMs), 20);

  // SVG dimensions
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate points
  const points = latencyHistory.map((d, idx) => {
    const x = paddingX + (idx / (latencyHistory.length - 1)) * chartWidth;
    const y =
      paddingY +
      chartHeight -
      ((d.latencyMs - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${height - paddingY} L ${
    points[0]?.x
  } ${height - paddingY} Z`;

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("aiMetrics.latencyChart.title")}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("aiMetrics.latencyChart.description")}
        </p>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="currentColor"
            className="text-border/30"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={paddingY + chartHeight / 2}
            x2={width - paddingX}
            y2={paddingY + chartHeight / 2}
            stroke="currentColor"
            className="text-border/30"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-border/40"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#latencyGradient)" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                className="fill-surface stroke-primary"
                strokeWidth="2"
              />
              {/* Timestamp label */}
              <text
                x={pt.x}
                y={height - paddingY + 16}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-medium"
              >
                {pt.timestamp}
              </text>
              {/* Latency badge */}
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="text-[10px] fill-foreground font-bold"
              >
                {pt.latencyMs.toFixed(1)}ms
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="rounded-xl border border-border/30 bg-surface/60 p-2.5 text-center">
          <span className="text-muted-foreground block text-[11px]">Độ trễ trung bình</span>
          <span className="font-bold text-foreground text-sm">{avgLatencyMs.toFixed(1)} ms</span>
        </div>
        <div className="rounded-xl border border-border/30 bg-surface/60 p-2.5 text-center">
          <span className="text-muted-foreground block text-[11px]">Độ trễ thấp nhất</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            {minVal.toFixed(1)} ms
          </span>
        </div>
        <div className="rounded-xl border border-border/30 bg-surface/60 p-2.5 text-center">
          <span className="text-muted-foreground block text-[11px]">Độ trễ cao nhất</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
            {maxVal.toFixed(1)} ms
          </span>
        </div>
        <div className="rounded-xl border border-border/30 bg-surface/60 p-2.5 text-center">
          <span className="text-muted-foreground block text-[11px]">SLA Giới hạn</span>
          <span className="font-bold text-primary text-sm">&lt; 100.0 ms</span>
        </div>
      </div>
    </div>
  );
}
