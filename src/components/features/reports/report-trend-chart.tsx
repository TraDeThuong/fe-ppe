
"use client";

import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  LineChart,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
import type { TrendItemDto } from "@/types";

export type TrendGroupBy = "DAY" | "WEEK" | "MONTH";

export interface ReportTrendChartProps {
  trends?: TrendItemDto[];
  loading?: boolean;
  dateRangeLabel?: string;
  groupBy?: TrendGroupBy;
  onGroupByChange?: (groupBy: TrendGroupBy) => void;
  /** Site analytics has no resolution-rate denominator when no violation is confirmed. */
  nullableResolutionRate?: boolean;
  style?: CSSProperties;
}

function formatTrendDate(dateStr: string, locale: string) {
  // BE SEC-37 weekly format: YYYY-Www (e.g., 2026-W44)
  const weekMatch = dateStr.match(/^(\d{4})-W(\d{2})$/);
  if (weekMatch) {
    return locale === "vi-VN" ? `T${weekMatch[2]}` : `W${weekMatch[2]}`;
  }

  // BE monthly format: YYYY-MM
  const monthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return `${monthMatch[2]}/${monthMatch[1].slice(-2)}`;
  }

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
  dateRangeLabel,
  groupBy = "DAY",
  onGroupByChange,
  nullableResolutionRate = false,
  style,
}: ReportTrendChartProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const chartStageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [pointerPos, setPointerPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const groupOptions: { value: TrendGroupBy; label: string }[] = [
    { value: "DAY", label: t("reports.charts.groupDay") },
    { value: "WEEK", label: t("reports.charts.groupWeek") },
    { value: "MONTH", label: t("reports.charts.groupMonth") },
  ];

  const filteredTrends = useMemo(
    () => [...trends].sort((a, b) => a.date.localeCompare(b.date)),
    [trends]
  );

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
  const animatedResolutionRate = useAnimatedProgress(resolutionRate, {
    enabled: !loading,
  });

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

    return `${createPath(points)} L ${points[points.length - 1].x} ${paddingTop + plotHeight
      } L ${points[0].x} ${paddingTop + plotHeight} Z`;
  };

  const labelInterval = getLabelInterval(filteredTrends.length);

  const yAxisLabels = Array.from({ length: 5 }, (_, index) =>
    Math.round((maxVal * (4 - index)) / 4)
  );

  const activeData =
    activePoint !== null ? filteredTrends[activePoint] : null;

  const updatePointerPos = (clientX: number, clientY: number) => {
    const stageRect = chartStageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    setPointerPos({
      x: clientX - stageRect.left,
      y: clientY - stageRect.top,
      width: stageRect.width,
      height: stageRect.height,
    });
  };

  const handleSvgMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    updatePointerPos(event.clientX, event.clientY);
    if (filteredTrends.length === 0) return;
    const svgRect = event.currentTarget.getBoundingClientRect();
    if (svgRect.width <= 0) return;
    const svgX = ((event.clientX - svgRect.left) / svgRect.width) * chartWidth;
    if (filteredTrends.length === 1) {
      setActivePoint(0);
      return;
    }
    const ratio = (svgX - paddingX) / plotWidth;
    const clampedIndex = Math.max(
      0,
      Math.min(
        filteredTrends.length - 1,
        Math.round(ratio * (filteredTrends.length - 1)),
      ),
    );
    setActivePoint(clampedIndex);
  };

  const handleSvgMouseLeave = () => {
    setActivePoint(null);
    setPointerPos(null);
  };

  const tooltipPlacement = useMemo(() => {
    if (!activeData || activePoint === null) return null;

    let pos = pointerPos;
    if (!pos) {
      const stageRect = chartStageRef.current?.getBoundingClientRect();
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!stageRect || !svgRect || svgRect.width <= 0 || svgRect.height <= 0) {
        return null;
      }
      const nodeX = (getX(activePoint) / chartWidth) * svgRect.width;
      const nodeY = (violationPoints[activePoint].y / chartHeight) * svgRect.height;
      pos = {
        x: svgRect.left - stageRect.left + nodeX,
        y: svgRect.top - stageRect.top + nodeY,
        width: stageRect.width,
        height: stageRect.height,
      };
    }

    const placeLeft = pos.width > 200 && pos.x > pos.width - 175;
    const placeAbove = pos.height > 130 && pos.y > pos.height - 110;
    const left = placeLeft
      ? Math.max(8, pos.x - 14)
      : Math.min(Math.max(8, pos.x + 14), Math.max(8, pos.width - 170));
    const top = placeAbove
      ? Math.max(8, pos.y - 14)
      : Math.min(Math.max(8, pos.y + 14), Math.max(8, pos.height - 105));

    return {
      left,
      top,
      transform: `${placeLeft ? "translateX(-100%)" : "translateX(0)"} ${placeAbove ? "translateY(-100%)" : "translateY(0)"}`,
    };
  }, [activeData, activePoint, pointerPos, chartWidth, chartHeight, violationPoints]);

  return (
    <section
      style={style}
      className="
        relative isolate flex h-full w-full flex-col justify-between overflow-hidden
        rounded-[24px] sm:rounded-[30px]
        border border-white/80 bg-background p-1.5
        shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]
        dark:border-white/10
      "
    >
      {/* INNER MACHINED BEZEL SHELL */}
      <div className="relative flex flex-1 flex-col justify-between gap-4 overflow-hidden rounded-[20px] sm:rounded-[25px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-5">
        {/* 1. Tactical Micro-Grid Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top_right,black_30%,transparent_80%)]"
        />

        {/* 2. Top Specular Laser Rim (Primary -> Accent) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-80"
        />

        {/* 3. Ambient Plasma Orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
        />

        {/* ================= HEADER DECK ================= */}
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 border-b border-[var(--shadow-dark)]/20 pb-3.5">
          <div className="flex items-center gap-3.5">
            {/* Dual-tier Neumorphic Icon Pod */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-background shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] dark:border-white/10">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                <LineChart size={18} strokeWidth={2.3} />
              </div>
              {/* Live Pulse Dot */}
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-background bg-gradient-to-r from-primary to-accent" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground">
                  {t("reports.charts.trendsTitle")}
                </h3>
                <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                  TELEMETRY
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                {t("reports.charts.trendsDesc")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGroupByChange && (
              <div className="flex items-center gap-1 rounded-full border border-white/50 bg-background/80 p-1 shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)] dark:border-white/5">
                {groupOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onGroupByChange(opt.value);
                      setActivePoint(null);
                    }}
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${groupBy === opt.value
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {dateRangeLabel && (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/70 bg-background px-3 py-1.5 text-[10px] font-bold text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/10">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono tabular-nums">{dateRangeLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= KPI TELEMETRY CAPSULES ================= */}
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-3 shrink-0">
          {/* 1. Violations */}
          <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-background/80 p-3.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5">
            <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]" />
            <div className="flex items-center justify-between pl-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Tổng vi phạm" : "Total violations"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-background text-rose-500 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                <AlertTriangle size={14} strokeWidth={2.3} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 pl-1.5">
              <span className="font-mono text-2xl font-black tabular-nums text-rose-500">
                <AnimatedNumber value={totalViolations} />
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">
                {isVietnamese ? "vi phạm" : "incidents"}
              </span>
            </div>
          </div>

          {/* 2. Resolved */}
          <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-background/80 p-3.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5">
            <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]" />
            <div className="flex items-center justify-between pl-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Đã giải quyết" : "Resolved"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-background text-emerald-500 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                <CheckCircle2 size={14} strokeWidth={2.3} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 pl-1.5">
              <span className="font-mono text-2xl font-black tabular-nums text-emerald-500">
                <AnimatedNumber value={totalResolved} />
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">
                {isVietnamese ? "sự cố" : "incidents"}
              </span>
            </div>
          </div>

          {/* 3. Resolution rate */}
          <div className="relative col-span-2 overflow-hidden rounded-2xl border border-white/50 bg-background/80 p-3.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] lg:col-span-1 dark:border-white/5">
            <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_8px_hsl(var(--primary)/0.45)]" />
            <div className="flex items-center justify-between pl-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isVietnamese ? "Tỷ lệ xử lý" : "Resolution rate"}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                <TrendingUp size={14} strokeWidth={2.3} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 pl-1.5">
              <span className="font-mono text-2xl font-black tabular-nums text-primary">
                {nullableResolutionRate && totalViolations === 0 ? (
                  "—"
                ) : (
                  <>
                    <AnimatedNumber value={resolutionRate} />%
                  </>
                )}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-background p-0.5 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_8px_hsl(var(--primary)/0.45)] transition-all duration-700 animate-live-shimmer"
                  style={{ width: `${animatedResolutionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RECESSED NEUMORPHIC CHART STAGE ================= */}
        <div
          ref={chartStageRef}
          className="
            relative flex-1 min-h-[265px] flex flex-col justify-between overflow-hidden rounded-[22px]
            border border-white/45 bg-background/75
            p-3.5 sm:p-4
            shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]
            dark:border-white/5 dark:bg-background/40
          "
        >
          {/* Chart Legend & Mode Bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground/85">
                {groupBy === "WEEK"
                  ? isVietnamese
                    ? "Diễn biến theo tuần"
                    : "Weekly trend"
                  : groupBy === "MONTH"
                    ? isVietnamese
                      ? "Diễn biến theo tháng"
                      : "Monthly trend"
                    : isVietnamese
                      ? "Diễn biến theo ngày"
                      : "Daily trend"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                <span className="text-[10px] font-bold text-foreground/80">
                  {isVietnamese ? "Vi phạm" : "Violations"}
                </span>
              </div>
              <span className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-[10px] font-bold text-foreground/80">
                  {isVietnamese ? "Đã xử lý" : "Resolved"}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
                  <Activity className="h-6 w-6 animate-pulse text-primary" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">
                  {t("common.loading")}
                </span>
              </div>
            </div>
          ) : filteredTrends.length === 0 ? (
            <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/70 bg-background text-muted-foreground shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] dark:border-white/10">
                <LineChart size={22} />
              </div>
              <div className="text-center">
                <p className="text-xs font-extrabold text-foreground">
                  {isVietnamese ? "Chưa có dữ liệu" : "No data available"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  {isVietnamese
                    ? "Không có dữ liệu trong khoảng thời gian này."
                    : "No data for this selected period."}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 w-full overflow-x-auto flex items-center">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="block h-[245px] w-full"
                style={{
                  minWidth: filteredTrends.length > 20 ? `${Math.min(chartWidth, 1400)}px` : "0",
                }}
                preserveAspectRatio="none"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
              >
                <defs>
                  {/* Rich Multi-Stop Area Gradients */}
                  <linearGradient id="reportViolationArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.26" />
                    <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="reportResolvedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="65%" stopColor="#10b981" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>

                  {/* 3D Luminous Line Glow Filters */}
                  <filter id="glowViolation" x="-10%" y="-20%" width="120%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.35" />
                  </filter>

                  <filter id="glowResolved" x="-10%" y="-20%" width="120%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
                  </filter>
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
                        strokeWidth={index === 4 ? "1.2" : "1"}
                        strokeDasharray={index === 4 ? "0" : "3 6"}
                        className={index === 4 ? "text-border/80" : "text-border/45"}
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fontWeight="700"
                        fill="currentColor"
                        className="font-mono text-muted-foreground"
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

                {/* Luminous Lines */}
                {filteredTrends.length > 1 && (
                  <>
                    <path
                      d={violationPath}
                      pathLength={2400}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glowViolation)"
                      className="animate-svg-draw"
                    />
                    <path
                      d={resolvedPath}
                      pathLength={2400}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glowResolved)"
                      className="animate-svg-draw"
                    />
                  </>
                )}

                {/* Single data point */}
                {filteredTrends.length === 1 && (
                  <>
                    <circle
                      cx={violationPoints[0].x}
                      cy={violationPoints[0].y}
                      r="6"
                      fill="#f43f5e"
                      filter="url(#glowViolation)"
                    />
                    <circle
                      cx={resolvedPoints[0].x}
                      cy={resolvedPoints[0].y}
                      r="6"
                      fill="#10b981"
                      filter="url(#glowResolved)"
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
                      onMouseEnter={(event) => {
                        setActivePoint(index);
                        updatePointerPos(event.clientX, event.clientY);
                      }}
                      onClick={(event) => {
                        updatePointerPos(event.clientX, event.clientY);
                        setActivePoint((current) =>
                          current === index ? null : index
                        );
                      }}
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
                        <>
                          {/* Vertical Laser Crosshair */}
                          <line
                            x1={x}
                            y1={paddingTop}
                            x2={x}
                            y2={paddingTop + plotHeight}
                            stroke="hsl(var(--primary))"
                            strokeDasharray="3 4"
                            strokeWidth="1.5"
                            strokeOpacity="0.65"
                          />

                          {/* Radar Halo Rings around Active Nodes */}
                          <circle
                            cx={x}
                            cy={violationPoints[index].y}
                            r="12"
                            fill="#f43f5e"
                            fillOpacity="0.16"
                          />
                          <circle
                            cx={x}
                            cy={resolvedPoints[index].y}
                            r="12"
                            fill="#10b981"
                            fillOpacity="0.16"
                          />
                        </>
                      )}

                      <circle
                        cx={x}
                        cy={violationPoints[index].y}
                        r={isActive ? 6.5 : 3.8}
                        fill="#f43f5e"
                        stroke="hsl(var(--background))"
                        strokeWidth="2.2"
                      />

                      <circle
                        cx={x}
                        cy={resolvedPoints[index].y}
                        r={isActive ? 6.5 : 3.8}
                        fill="#10b981"
                        stroke="hsl(var(--background))"
                        strokeWidth="2.2"
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

                  const isActive = activePoint === index;

                  return (
                    <text
                      key={`date-${item.date}`}
                      x={getX(index)}
                      y={chartHeight - 7}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isActive ? "800" : "600"}
                      fill="currentColor"
                      className={`font-mono transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                    >
                      {formatTrendDate(item.date, locale)}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Floating VIP Tactile Tooltip (tracks cursor near hovered point) */}
          {activeData && tooltipPlacement && (
            <div
              style={{
                left: tooltipPlacement.left,
                top: tooltipPlacement.top,
                transform: tooltipPlacement.transform,
              }}
              className="pointer-events-none absolute z-20 min-w-[148px] overflow-hidden rounded-2xl border border-white/80 bg-background/95 px-4 py-3 backdrop-blur-md shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] dark:border-white/15"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-accent"
              />
              <div className="mb-2 flex items-center justify-between gap-4 border-b border-[var(--shadow-dark)]/15 pb-1.5">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-foreground">
                  {formatTrendDate(activeData.date, locale)}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-6">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                    {isVietnamese ? "Vi phạm" : "Violations"}
                  </span>
                  <strong className="font-mono text-xs font-black tabular-nums text-rose-500">
                    {activeData.trueViolations}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                    {isVietnamese ? "Đã xử lý" : "Resolved"}
                  </span>
                  <strong className="font-mono text-xs font-black tabular-nums text-emerald-500">
                    {activeData.resolvedCount}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER TELEMETRY BAR ================= */}
        {!loading && filteredTrends.length > 0 && (
          <div className="relative flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-background px-3 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:border-white/10">
              <Activity size={13} className="text-primary" />
              <span className="text-[10px] font-bold text-foreground/85">
                {groupBy === "WEEK"
                  ? isVietnamese
                    ? `${filteredTrends.length} tuần thống kê`
                    : `${filteredTrends.length} weeks`
                  : groupBy === "MONTH"
                    ? isVietnamese
                      ? `${filteredTrends.length} tháng thống kê`
                      : `${filteredTrends.length} months`
                    : isVietnamese
                      ? `${filteredTrends.length} ngày thống kê`
                      : `${filteredTrends.length} data points`}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {groupBy === "WEEK"
                ? isVietnamese
                  ? "Dữ liệu theo tuần ISO"
                  : "ISO weekly data"
                : groupBy === "MONTH"
                  ? isVietnamese
                    ? "Dữ liệu theo tháng"
                    : "Monthly data"
                  : isVietnamese
                    ? "Dữ liệu theo ngày"
                    : "Daily data"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
