"use client";

import { PieChart } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { ViolationTypeStatDto } from "@/types";

export interface ReportViolationDonutProps {
  distribution?: ViolationTypeStatDto[];
  loading?: boolean;
}

export function ReportViolationDonut({
  distribution = [],
  loading = false,
}: ReportViolationDonutProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const total = distribution.reduce((acc, cur) => acc + cur.count, 0);

  const getLabel = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return isVietnamese ? "Không đội mũ bảo hộ" : "No Safety Helmet";
      case "NO_VEST":
        return isVietnamese ? "Không mặc áo phản quang" : "No High-Vis Vest";
      case "RESTRICTED_AREA":
        return isVietnamese ? "Xâm nhập vùng cấm" : "Restricted Zone Intrusion";
      case "MULTI_VIOLATION":
        return isVietnamese ? "Đa vi phạm PPE" : "Multiple PPE Violations";
      default:
        return type;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return "#f43f5e"; // Rose
      case "NO_VEST":
        return "#f59e0b"; // Amber
      case "RESTRICTED_AREA":
        return "#8b5cf6"; // Purple
      default:
        return "#3b82f6"; // Blue
    }
  };

  // Calculate SVG Donut strokeDasharray and strokeDashoffset
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = distribution.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      color: getColor(item.violationType),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("reports.charts.donutTitle")}
          </h4>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {total} {isVietnamese ? "vi phạm" : "violations"}
        </span>
      </div>

      {/* Donut Chart & Legend Row */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : distribution.length === 0 || total === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <PieChart className="h-6 w-6 opacity-40" />
          <span>
            {isVietnamese
              ? "Chưa có dữ liệu phân loại vi phạm trong khoảng thời gian đã chọn."
              : "No violation breakdown data for the selected period."}
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
          {/* SVG Donut */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
              {/* Background Circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                className="text-border/30"
                strokeWidth="16"
              />

              {/* Slices */}
              {slices.map((slice) => (
                <circle
                  key={slice.violationType}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="16"
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              ))}
            </svg>

            {/* Centered Total */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-foreground">{total}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                {isVietnamese ? "Vi phạm" : "Violations"}
              </span>
            </div>
          </div>

          {/* Legend & Breakdown List */}
          <div className="w-full space-y-2.5 text-xs">
            {slices.map((slice) => (
              <div key={slice.violationType} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    {getLabel(slice.violationType)}
                  </span>
                  <span className="font-bold text-foreground">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground pl-4.5">
                  {slice.count} {isVietnamese ? "vụ vi phạm" : "violations"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
