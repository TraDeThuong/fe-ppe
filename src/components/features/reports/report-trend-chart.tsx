"use client";

import { LineChart, TrendingUp } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { TrendItemDto } from "@/types";

export interface ReportTrendChartProps {
  trends?: TrendItemDto[];
  loading?: boolean;
}

export function ReportTrendChart({
  trends = [
    { date: "22/10", totalIncidents: 18, trueViolations: 17, falseAlarms: 1, resolvedCount: 16 },
    { date: "23/10", totalIncidents: 24, trueViolations: 22, falseAlarms: 2, resolvedCount: 21 },
    { date: "24/10", totalIncidents: 15, trueViolations: 14, falseAlarms: 1, resolvedCount: 15 },
    { date: "25/10", totalIncidents: 32, trueViolations: 30, falseAlarms: 2, resolvedCount: 29 },
    { date: "26/10", totalIncidents: 28, trueViolations: 26, falseAlarms: 2, resolvedCount: 25 },
    { date: "27/10", totalIncidents: 19, trueViolations: 18, falseAlarms: 1, resolvedCount: 18 },
    { date: "28/10", totalIncidents: 14, trueViolations: 13, falseAlarms: 1, resolvedCount: 12 },
  ],
  loading = false,
}: ReportTrendChartProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const maxVal = Math.max(...trends.map((t) => Math.max(t.totalIncidents, t.resolvedCount)), 35);
  const minVal = 0;

  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Violation Points
  const violationPoints = trends.map((d, idx) => {
    const x = paddingX + (idx / (trends.length - 1 || 1)) * chartWidth;
    const y =
      paddingY +
      chartHeight -
      ((d.trueViolations - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return { x, y, ...d };
  });

  // Resolved Points
  const resolvedPoints = trends.map((d, idx) => {
    const x = paddingX + (idx / (trends.length - 1 || 1)) * chartWidth;
    const y =
      paddingY +
      chartHeight -
      ((d.resolvedCount - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return { x, y, ...d };
  });

  const violationPathD = violationPoints.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
    ""
  );

  const resolvedPathD = resolvedPoints.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
    ""
  );

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("reports.charts.trendsTitle")}
          </h4>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">
              {isVietnamese ? "Vi phạm thực tế" : "True Violations"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">
              {isVietnamese ? "Đã giải quyết" : "Resolved Incidents"}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
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

          {/* Violation Line */}
          <path
            d={violationPathD}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Resolved Line */}
          <path
            d={resolvedPathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {violationPoints.map((pt, idx) => (
            <g key={`v-${idx}`}>
              <circle cx={pt.x} cy={pt.y} r="4" className="fill-surface stroke-rose-500" strokeWidth="2" />
              <text
                x={pt.x}
                y={height - paddingY + 16}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-medium"
              >
                {pt.date}
              </text>
            </g>
          ))}

          {resolvedPoints.map((pt, idx) => (
            <circle
              key={`r-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r="4"
              className="fill-surface stroke-emerald-500"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
