"use client";

import { LineChart } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { TrendItemDto } from "@/types";

export interface ReportTrendChartProps {
  trends?: TrendItemDto[];
  loading?: boolean;
}

function formatTrendDate(dateStr: string): string {
  // YYYY-MM-DD -> DD/MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  }
  return dateStr;
}

export function ReportTrendChart({
  trends = [],
  loading = false,
}: ReportTrendChartProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const maxVal = Math.max(
    ...trends.map((item) => Math.max(item.totalIncidents, item.trueViolations, item.resolvedCount)),
    5
  );
  const minVal = 0;

  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const getX = (idx: number, total: number) => {
    if (total <= 1) return paddingX + chartWidth / 2;
    return paddingX + (idx / (total - 1)) * chartWidth;
  };

  // Violation Points
  const violationPoints = trends.map((d, idx) => {
    const x = getX(idx, trends.length);
    const y =
      paddingY +
      chartHeight -
      ((d.trueViolations - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return { x, y, ...d };
  });

  // Resolved Points
  const resolvedPoints = trends.map((d, idx) => {
    const x = getX(idx, trends.length);
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

      {/* SVG Chart or Empty State */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : trends.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <LineChart className="h-6 w-6 opacity-40" />
          <span>
            {isVietnamese
              ? "Chưa có dữ liệu xu hướng vi phạm trong khoảng thời gian đã chọn."
              : "No violation trend data for the selected period."}
          </span>
        </div>
      ) : (
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

            {/* Y-axis labels */}
            <text
              x={paddingX - 8}
              y={paddingY + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground font-mono"
            >
              {maxVal}
            </text>
            <text
              x={paddingX - 8}
              y={paddingY + chartHeight / 2 + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground font-mono"
            >
              {Math.round(maxVal / 2)}
            </text>
            <text
              x={paddingX - 8}
              y={height - paddingY + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground font-mono"
            >
              0
            </text>

            {/* Violation Line */}
            {violationPoints.length > 1 && (
              <path
                d={violationPathD}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Resolved Line */}
            {resolvedPoints.length > 1 && (
              <path
                d={resolvedPathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points */}
            {violationPoints.map((pt, idx) => (
              <g key={`v-${idx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  className="fill-surface stroke-rose-500"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={pt.y - 8}
                  textAnchor="middle"
                  className="text-[10px] fill-rose-600 dark:fill-rose-400 font-bold"
                >
                  {pt.trueViolations}
                </text>
                <text
                  x={pt.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground font-medium"
                >
                  {formatTrendDate(pt.date)}
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
      )}
    </div>
  );
}
