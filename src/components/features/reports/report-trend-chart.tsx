
"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  LineChart,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { TrendItemDto } from "@/types";

export interface ReportTrendChartProps {
  trends?: TrendItemDto[];
  loading?: boolean;
}

type Period = "7" | "30" | "90" | "all";

function formatTrendDate(dateStr: string, locale: string) {
  const date = new Date(`${dateStr}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat(
    locale === "vi-VN" ? "vi-VN" : "en-US",
    {
      day: "2-digit",
      month: "2-digit",
    }
  ).format(date);
}

function getLabelInterval(total: number) {
  if (total <= 10) return 1;
  if (total <= 30) return 5;
  if (total <= 60) return 10;
  if (total <= 90) return 15;
  return Math.ceil(total / 7);
}

export function ReportTrendChart({
  trends = [],
  loading = false,
}: ReportTrendChartProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [period, setPeriod] = useState<Period>("30");
  const [activePoint, setActivePoint] = useState<number | null>(null);

  const periodOptions: {
    value: Period;
    label: string;
  }[] = [
    { value: "7", label: isVietnamese ? "7 ngày" : "7 days" },
    { value: "30", label: isVietnamese ? "30 ngày" : "30 days" },
    { value: "90", label: isVietnamese ? "90 ngày" : "90 days" },
    { value: "all", label: isVietnamese ? "Tất cả" : "All time" },
  ];

  const filteredTrends = useMemo(() => {
    const sorted = [...trends].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (period === "all") return sorted;

    return sorted.slice(-Number(period));
  }, [trends, period]);

  const totalViolations = filteredTrends.reduce(
    (sum, item) => sum + item.trueViolations,
    0
  );

  const totalResolved = filteredTrends.reduce(
    (sum, item) => sum + item.resolvedCount,
    0
  );

  const resolutionRate =
    totalViolations > 0
      ? Math.min(100, Math.round((totalResolved / totalViolations) * 100))
      : 0;

  const maxVal = Math.max(
    ...filteredTrends.map((item) =>
      Math.max(
        item.totalIncidents,
        item.trueViolations,
        item.resolvedCount
      )
    ),
    5
  );

  const chartWidth = Math.max(680, filteredTrends.length * 36);
  const chartHeight = 260;
  const paddingX = 48;
  const paddingTop = 30;
  const paddingBottom = 35;

  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) =>
    filteredTrends.length <= 1
      ? chartWidth / 2
      : paddingX +
        (index / (filteredTrends.length - 1)) * plotWidth;

  const getY = (value: number) =>
    paddingTop + plotHeight - (value / maxVal) * plotHeight;

  const violationPoints = filteredTrends.map((item, index) => ({
    x: getX(index),
    y: getY(item.trueViolations),
    value: item.trueViolations,
  }));

  const resolvedPoints = filteredTrends.map((item, index) => ({
    x: getX(index),
    y: getY(item.resolvedCount),
    value: item.resolvedCount,
  }));

  const createPath = (points: { x: number; y: number }[]) =>
    points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");

  const violationPath = createPath(violationPoints);
  const resolvedPath = createPath(resolvedPoints);

  const createAreaPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";

    return `${createPath(points)} L ${points[points.length - 1].x} ${
      paddingTop + plotHeight
    } L ${points[0].x} ${paddingTop + plotHeight} Z`;
  };

  const labelInterval = getLabelInterval(filteredTrends.length);

  const yAxisLabels = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxVal * (4 - index)) / 4)
  );

  const activeData =
    activePoint !== null ? filteredTrends[activePoint] : null;

  return (
    <section
      className="
        relative isolate flex h-full w-full flex-col justify-between overflow-hidden
        rounded-2xl
        bg-surface
        p-4 sm:p-5
        shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)]
      "
    >
      {/* Ambient light */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/[0.045] blur-3xl" />

      <div className="relative flex flex-1 flex-col justify-between gap-3.5 sm:gap-4">

        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-xl bg-surface text-primary
                shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
              "
            >
              <LineChart size={20} strokeWidth={2.2} />
            </div>

            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                {t("reports.charts.trendsTitle")}
              </h3>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {isVietnamese
                  ? "Phân tích xu hướng vi phạm và xử lý"
                  : "Violation and resolution analytics"}
              </p>
            </div>
          </div>

          {/* PERIOD FILTER */}
          <div
            className="
              flex w-full items-center gap-1 rounded-xl p-1
              bg-background/70
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
              sm:w-fit
            "
          >
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPeriod(option.value);
                  setActivePoint(null);
                }}
                className={`
                  flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5
                  text-[10px] font-bold transition-all duration-200
                  sm:flex-none
                  ${
                    period === option.value
                      ? `
                        bg-surface text-primary
                        shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
                      `
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI SUMMARY */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 shrink-0">

          {/* Violations */}
          <div
            className="
              relative overflow-hidden rounded-2xl p-3
              bg-surface
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
            "
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Tổng vi phạm" : "Total violations"}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                <AlertTriangle size={13} />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums text-rose-500">
                {totalViolations}
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground">
                {isVietnamese ? "vi phạm" : "incidents"}
              </span>
            </div>
          </div>

          {/* Resolved */}
          <div
            className="
              relative overflow-hidden rounded-2xl p-3
              bg-surface
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
            "
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Đã giải quyết" : "Resolved"}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={13} />
              </div>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums text-emerald-500">
                {totalResolved}
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground">
                {isVietnamese ? "sự cố" : "incidents"}
              </span>
            </div>
          </div>

          {/* Resolution rate */}
          <div
            className="
              relative col-span-2 overflow-hidden rounded-2xl p-3
              bg-surface
              shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]
              lg:col-span-1
            "
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {isVietnamese ? "Tỷ lệ xử lý" : "Resolution rate"}
              </span>
              <TrendingUp size={14} className="text-primary" />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-xl font-black tabular-nums text-primary">
                {resolutionRate}%
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CHART */}
        <div
          className="
            relative flex-1 min-h-[250px] flex flex-col justify-between overflow-hidden rounded-2xl
            bg-background/60
            p-3 sm:p-3.5
            shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]
            dark:bg-background/30
          "
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground">
                {isVietnamese ? "Diễn biến theo ngày" : "Daily trend"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[9px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Vi phạm" : "Violations"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Đã xử lý" : "Resolved"}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Activity className="h-7 w-7 animate-pulse text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("common.loading")}
                </span>
              </div>
            </div>
          ) : filteredTrends.length === 0 ? (
            <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                <LineChart size={22} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Chưa có dữ liệu" : "No data available"}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {isVietnamese
                    ? "Không có dữ liệu trong khoảng thời gian này."
                    : "No data for this selected period."}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 w-full overflow-x-auto flex items-center">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="block h-[240px] w-full"
                style={{
                  minWidth: filteredTrends.length > 20 ? `${Math.min(chartWidth, 1400)}px` : "0",
                }}
                preserveAspectRatio="none"
                onMouseLeave={() => setActivePoint(null)}
              >
                <defs>
                  <linearGradient id="reportViolationArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="reportResolvedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.13" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Y axis grid */}
                {yAxisLabels.map((value, index) => {
                  const y = getY(value);

                  return (
                    <g key={index}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray={index === 4 ? "0" : "3 5"}
                        className="text-border/60"
                      />
                      <text
                        x={paddingX - 9}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="600"
                        fill="currentColor"
                        className="text-muted-foreground"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* Area fills */}
                {filteredTrends.length > 1 && (
                  <>
                    <path d={createAreaPath(violationPoints)} fill="url(#reportViolationArea)" />
                    <path d={createAreaPath(resolvedPoints)} fill="url(#reportResolvedArea)" />
                  </>
                )}

                {/* Lines */}
                {filteredTrends.length > 1 && (
                  <>
                    <path
                      d={violationPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={resolvedPath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Single data point */}
                {filteredTrends.length === 1 && (
                  <>
                    <circle
                      cx={violationPoints[0].x}
                      cy={violationPoints[0].y}
                      r="5"
                      fill="#f43f5e"
                    />
                    <circle
                      cx={resolvedPoints[0].x}
                      cy={resolvedPoints[0].y}
                      r="5"
                      fill="#10b981"
                    />
                  </>
                )}

                {/* Data point interaction zones */}
                {filteredTrends.map((item, index) => {
                  const x = getX(index);
                  const isActive = activePoint === index;

                  return (
                    <g
                      key={`point-${item.date}`}
                      onMouseEnter={() => setActivePoint(index)}
                      onClick={() =>
                        setActivePoint((current) =>
                          current === index ? null : index
                        )
                      }
                      className="cursor-pointer"
                    >
                      <rect
                        x={x - Math.max(12, plotWidth / filteredTrends.length / 2)}
                        y={paddingTop}
                        width={Math.max(24, plotWidth / filteredTrends.length)}
                        height={plotHeight}
                        fill="transparent"
                      />

                      {isActive && (
                        <line
                          x1={x}
                          y1={paddingTop}
                          x2={x}
                          y2={paddingTop + plotHeight}
                          stroke="currentColor"
                          strokeDasharray="3 4"
                          strokeWidth="1"
                          className="text-muted-foreground/50"
                        />
                      )}

                      <circle
                        cx={x}
                        cy={violationPoints[index].y}
                        r={isActive ? 7 : 4}
                        fill="#f43f5e"
                        stroke="var(--surface, #f5f2eb)"
                        strokeWidth="2"
                      />

                      <circle
                        cx={x}
                        cy={resolvedPoints[index].y}
                        r={isActive ? 7 : 4}
                        fill="#10b981"
                        stroke="var(--surface, #f5f2eb)"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}

                {/* X axis labels */}
                {filteredTrends.map((item, index) => {
                  const shouldShow =
                    index % labelInterval === 0 ||
                    index === filteredTrends.length - 1;

                  if (!shouldShow) return null;

                  return (
                    <text
                      key={`date-${item.date}`}
                      x={getX(index)}
                      y={chartHeight - 7}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="currentColor"
                      className="text-muted-foreground"
                    >
                      {formatTrendDate(item.date, locale)}
                    </text>
                  );
                })}
              </svg>

              {/* Tooltip */}
              {activeData && (
                <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-xl bg-surface px-4 py-3 shadow-[5px_5px_12px_rgba(163,155,140,0.28),-5px_-5px_12px_rgba(255,255,255,0.8)] dark:shadow-[5px_5px_12px_rgba(0,0,0,0.45),-3px_-3px_8px_rgba(255,255,255,0.04)]">
                  <p className="mb-2 text-[10px] font-extrabold text-foreground">
                    {formatTrendDate(activeData.date, locale)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        {isVietnamese ? "Vi phạm" : "Violations"}
                      </span>
                      <strong className="text-xs tabular-nums text-rose-500">
                        {activeData.trueViolations}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {isVietnamese ? "Đã xử lý" : "Resolved"}
                      </span>
                      <strong className="text-xs tabular-nums text-emerald-500">
                        {activeData.resolvedCount}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        {!loading && filteredTrends.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {isVietnamese
                  ? `${filteredTrends.length} ngày thống kê`
                  : `${filteredTrends.length} data points`}
              </span>
            </div>

            <span className="text-[10px] font-semibold text-muted-foreground">
              {isVietnamese ? "Dữ liệu theo ngày" : "Daily data"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
