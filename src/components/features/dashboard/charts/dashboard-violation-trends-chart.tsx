"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import type { TrendItemDto } from "@/types";
import type {
  DashboardTrendGroupBy,
  DashboardTrendsWindow,
} from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";
import {
  DashboardChartExplainButton,
  type ChartExplainContent,
} from "./dashboard-chart-explain-modal";

export interface DashboardViolationTrendsChartProps {
  trends: TrendItemDto[];
  groupBy: DashboardTrendGroupBy;
  onChangeGroupBy: (next: DashboardTrendGroupBy) => void;
  trendsWindow?: DashboardTrendsWindow | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}

function formatTrendAxisLabel(dateKey: string, locale: string): string {
  const weekMatch = dateKey.match(/^(\d{4})-W(\d{2})$/);
  if (weekMatch) {
    return locale === "vi-VN" ? `T${weekMatch[2]}` : `W${weekMatch[2]}`;
  }

  const monthMatch = dateKey.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return `${monthMatch[2]}/${monthMatch[1].slice(-2)}`;
  }

  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat(locale === "vi-VN" ? "vi-VN" : "en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(parsed);
}

function formatTrendTooltipTitle(dateKey: string, locale: string): string {
  const weekMatch = dateKey.match(/^(\d{4})-W(\d{2})$/);
  if (weekMatch) {
    return locale === "vi-VN"
      ? `Tuần ${weekMatch[2]} · ${weekMatch[1]}`
      : `Week ${weekMatch[2]}, ${weekMatch[1]}`;
  }

  const monthMatch = dateKey.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return locale === "vi-VN"
      ? `Tháng ${monthMatch[2]}/${monthMatch[1]}`
      : `${monthMatch[1]}-${monthMatch[2]}`;
  }

  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat(locale === "vi-VN" ? "vi-VN" : "en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function axisTickStep(count: number): number {
  if (count <= 10) return 1;
  if (count <= 21) return 3;
  if (count <= 45) return 6;
  return Math.max(7, Math.ceil(count / 8));
}

export function DashboardViolationTrendsChart({
  trends,
  groupBy,
  onChangeGroupBy,
  trendsWindow,
  loading = false,
  error = false,
  onRetry,
  className = "",
}: DashboardViolationTrendsChartProps) {
  const { t, number, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...trends].sort((a, b) => a.date.localeCompare(b.date)),
    [trends],
  );

  const totals = useMemo(() => {
    let totalDetected = 0;
    let trueViolations = 0;
    let resolved = 0;
    let falseAlarms = 0;
    let peakIndex = -1;
    let peakCount = 0;

    sorted.forEach((row, idx) => {
      const detected = Number(row.totalIncidents ?? 0);
      totalDetected += detected;
      trueViolations += Number(row.trueViolations ?? 0);
      resolved += Number(row.resolvedCount ?? 0);
      falseAlarms += Number(row.falseAlarms ?? 0);
      if (detected > peakCount) {
        peakCount = detected;
        peakIndex = idx;
      }
    });

    return {
      totalDetected,
      trueViolations,
      resolved,
      falseAlarms,
      peakItem: peakIndex >= 0 ? sorted[peakIndex] : null,
    };
  }, [sorted]);

  const groupOptions: { value: DashboardTrendGroupBy; label: string }[] = [
    { value: "DAY", label: t("dashboard.trends.groupDay") },
    { value: "WEEK", label: t("dashboard.trends.groupWeek") },
    { value: "MONTH", label: t("dashboard.trends.groupMonth") },
  ];

  const windowLabel = trendsWindow
    ? `${trendsWindow.startDate} → ${trendsWindow.endDate}`
    : null;

  const explainContent: ChartExplainContent = {
    title: t("dashboard.trends.title"),
    subtitle: t("dashboard.trends.subtitle"),
    highlights: [
      {
        label: t("dashboard.trends.totalDetected"),
        value: number.format(totals.totalDetected),
        tone: "primary",
      },
      {
        label: t("dashboard.trends.trueViolations"),
        value: number.format(totals.trueViolations),
        tone: totals.trueViolations > 0 ? "warning" : "default",
      },
      {
        label: t("dashboard.trends.resolved"),
        value: number.format(totals.resolved),
        tone: "default",
      },
    ],
    summary:
      totals.totalDetected === 0
        ? isVi
          ? `Trong khoảng ${windowLabel ?? "đang chọn"}, hệ thống chưa ghi nhận sự cố vi phạm PPE nào theo mốc ${groupBy === "DAY" ? "ngày" : groupBy === "WEEK" ? "tuần" : "tháng"}.`
          : `During ${windowLabel ?? "the selected window"}, zero PPE incidents were recorded across ${groupBy.toLowerCase()} buckets.`
        : isVi
          ? `Trong khoảng ${windowLabel ?? "đang chọn"}, hệ thống ghi nhận ${number.format(totals.totalDetected)} phát hiện (${number.format(totals.trueViolations)} vi phạm thực đã xác nhận, ${number.format(totals.resolved)} ca đã xử lý và ${number.format(totals.falseAlarms)} cảnh báo sai).`
          : `Across ${windowLabel ?? "the selected window"}, ${number.format(totals.totalDetected)} detections were recorded (${number.format(totals.trueViolations)} confirmed true violations, ${number.format(totals.resolved)} resolved, and ${number.format(totals.falseAlarms)} false alarms).`,
    details:
      totals.totalDetected === 0
        ? []
        : isVi
          ? [
              totals.peakItem
                ? `Mốc cao điểm nhất: ${formatTrendTooltipTitle(totals.peakItem.date, locale)} với ${number.format(totals.peakItem.totalIncidents)} sự cố phát hiện.`
                : "Chưa có mốc cao điểm nổi trội.",
              "Bạn có thể chuyển đổi nhanh giữa Ngày, Tuần và Tháng ngay góc phải biểu đồ để đánh giá hiệu quả chấn chỉnh an toàn theo thời gian.",
            ]
          : [
              totals.peakItem
                ? `Peak bucket: ${formatTrendTooltipTitle(totals.peakItem.date, locale)} with ${number.format(totals.peakItem.totalIncidents)} detected incidents.`
                : "No standout peak bucket recorded.",
              "Toggle between Day, Week, and Month in the header to evaluate safety compliance trends over time.",
            ],
    meaning: isVi
      ? "Biểu đồ này lấy dữ liệu trực tiếp từ API /api/v1/statistics/trends của dịch vụ Báo cáo & Thống kê (bám sát Mục 1 & 4.5 đề cương D08), giúp theo dõi xu hướng tăng/giảm vi phạm PPE theo Ngày, Tuần, Tháng."
      : "Powered directly by GET /api/v1/statistics/trends, this chart tracks PPE violation volume and resolution trajectory across Day, Week, and Month intervals.",
  };

  const chartWidth = Math.max(620, sorted.length * 42);
  const chartHeight = 228;
  const padLeft = 40;
  const padRight = 22;
  const padTop = 22;
  const padBottom = 34;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const maxY = useMemo(() => {
    const rawMax = sorted.reduce(
      (acc, item) =>
        Math.max(
          acc,
          item.totalIncidents ?? 0,
          item.trueViolations ?? 0,
          item.resolvedCount ?? 0,
        ),
      0,
    );
    return Math.max(4, Math.ceil(rawMax * 1.15));
  }, [sorted]);

  const getX = (index: number) =>
    sorted.length <= 1
      ? padLeft + plotWidth / 2
      : padLeft + (index / (sorted.length - 1)) * plotWidth;

  const getY = (val: number) =>
    padTop + plotHeight - (Math.max(0, val) / maxY) * plotHeight;

  const buildPath = (selector: (item: TrendItemDto) => number) =>
    sorted
      .map(
        (item, idx) =>
          `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)} ${getY(selector(item)).toFixed(1)}`,
      )
      .join(" ");

  const buildArea = (selector: (item: TrendItemDto) => number) => {
    if (sorted.length === 0) return "";
    const line = buildPath(selector);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(sorted.length - 1).toFixed(1);
    const baseY = (padTop + plotHeight).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const detectedPath = buildPath((i) => i.totalIncidents);
  const detectedArea = buildArea((i) => i.totalIncidents);
  const resolvedPath = buildPath((i) => i.resolvedCount);

  const activeRow =
    hoveredIndex !== null && sorted[hoveredIndex] ? sorted[hoveredIndex] : null;
  const step = axisTickStep(sorted.length);
  const yTicks = [maxY, Math.round(maxY / 2), 0];

  return (
<DashboardPanel
      title={t("dashboard.trends.title")}
      description={t("dashboard.trends.subtitle")}
      icon={
        <div className="flex size-8 items-center justify-center rounded-xl bg-background text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.04)]">
          <TrendingUp className="size-4" />
        </div>
      }
      headerAction={
        <div className="flex flex-wrap items-center gap-2.5">
          {windowLabel && (
            <div
              title={
                trendsWindow?.autoExpanded
                  ? t("dashboard.trends.autoExpandedHint")
                  : undefined
              }
              className="inline-flex items-center gap-1.5 rounded-2xl bg-background px-3 py-1.5 font-mono text-[11px] font-bold text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:bg-background/60 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.55),inset_-1px_-1px_3px_rgba(255,255,255,0.05)]"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
              <CalendarRange className="size-3 shrink-0 opacity-80" />
              <span>{windowLabel}</span>
            </div>
          )}

          {/* Tactile Neumorphic Segmented Control */}
          <div
            role="group"
            aria-label={t("dashboard.trends.title")}
            className="inline-flex items-center gap-1 rounded-2xl bg-background p-1.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:bg-background/60 dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.6),inset_-2px_-2px_5px_rgba(255,255,255,0.04)]"
          >
            {groupOptions.map((opt) => {
              const active = groupBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeGroupBy(opt.value)}
                  className={`cursor-pointer rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wide transition-all duration-200 ${
                    active
                      ? "bg-surface text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:bg-card dark:shadow-[3px_3px_6px_rgba(0,0,0,0.55),-2px_-2px_4px_rgba(255,255,255,0.06)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <DashboardChartExplainButton
            content={explainContent}
            icon={<TrendingUp className="size-5 text-primary" />}
          />
        </div>
      }
      className={className}
      bodyClassName="flex flex-col justify-between gap-5"
    >
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-[22px] bg-background p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:bg-background/40 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]"
              >
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="mt-3 h-7 w-16 rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[250px] w-full rounded-[26px]" />
        </div>
      ) : error ? (
        <div
          className={`flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-[26px] bg-background px-6 py-8 text-center ${NM.recessed}`}
        >
          <p className="text-sm font-bold text-muted-foreground">
            {t("dashboard.data.error")}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-2xl bg-surface px-4 py-2 text-xs font-extrabold text-primary shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:bg-card dark:shadow-[4px_4px_8px_rgba(0,0,0,0.5)]"
            >
              {t("dashboard.data.retry")}
            </button>
          )}
        </div>
      ) : totals.totalDetected === 0 ? (
        <div
          className={`flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 rounded-[26px] bg-background px-6 py-9 text-center ${NM.recessed}`}
        >
          {/* Double-layered Tactile Badge */}
          <div
            className={`flex size-16 items-center justify-center rounded-[22px] bg-background text-primary ${NM.extruded}`}
          >
            <div
              className={`flex size-11 items-center justify-center rounded-2xl bg-background ${NM.recessed}`}
            >
              <ShieldCheck className="size-6 drop-shadow-[0_0_8px_var(--primary)]" strokeWidth={2.2} />
            </div>
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-sm font-black tracking-tight text-foreground">
              {t("dashboard.trends.emptyTitle")}
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("dashboard.trends.emptyDesc")}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 4-Card Tactile Extruded KPI Strip */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {/* 1. Total Detected */}
            <div className="group relative overflow-hidden rounded-[22px] bg-background p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 dark:bg-background/50 dark:shadow-[5px_5px_12px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.trends.totalDetected")}
                </p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-background text-foreground/80 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                  <TrendingUp className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-black tracking-tight tabular-nums text-foreground">
                <AnimatedNumber
                  value={totals.totalDetected}
                  format={(v) => number.format(v)}
                />
              </p>
            </div>

            {/* 2. True Violations (Primary Highlight) */}
            <div className="group relative overflow-hidden rounded-[22px] bg-background p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 dark:bg-background/50 dark:shadow-[5px_5px_12px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold uppercase tracking-wider text-primary/90">
                  {t("dashboard.trends.trueViolations")}
                </p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                  <ShieldAlert className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-black tracking-tight tabular-nums text-primary drop-shadow-[0_1px_8px_rgba(var(--primary-rgb,99,102,241),0.2)]">
                <AnimatedNumber
                  value={totals.trueViolations}
                  format={(v) => number.format(v)}
                />
              </p>
            </div>

            {/* 3. Resolved (Accent Highlight + Mini Neumorphic Progress Bar) */}
            <div className="group relative overflow-hidden rounded-[22px] bg-background p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 dark:bg-background/50 dark:shadow-[5px_5px_12px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold uppercase tracking-wider text-accent">
                  {t("dashboard.trends.resolved")}
                </p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                  <CheckCircle2 className="size-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p className="font-mono text-2xl font-black tracking-tight tabular-nums text-foreground">
                  <AnimatedNumber
                    value={totals.resolved}
                    format={(v) => number.format(v)}
                  />
                </p>
                {totals.trueViolations > 0 && (
                  <span className="font-mono text-[10px] font-extrabold text-accent">
                    {Math.min(
                      100,
                      Math.round((totals.resolved / totals.trueViolations) * 100)
                    )}
                    %
                  </span>
                )}
              </div>
              {/* Recessed Micro Progress Track */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background p-[1px] shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.7)]">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{
                    width: `${
                      totals.trueViolations > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (totals.resolved / totals.trueViolations) * 100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 4. False Alarms */}
            <div className="group relative overflow-hidden rounded-[22px] bg-background p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.45)] transition-transform duration-200 hover:-translate-y-0.5 dark:bg-background/50 dark:shadow-[5px_5px_12px_rgba(0,0,0,0.55),-3px_-3px_8px_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.trends.falseAlarms")}
                </p>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                  <ShieldCheck className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-black tracking-tight tabular-nums text-muted-foreground">
                <AnimatedNumber
                  value={totals.falseAlarms}
                  format={(v) => number.format(v)}
                />
              </p>
            </div>
          </div>

          {/* Deep Recessed Neumorphic Chart Well */}
          <div className="rounded-[26px] bg-background p-4 shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)] dark:bg-background/40 dark:shadow-[inset_5px_5px_14px_rgba(0,0,0,0.65),inset_-3px_-3px_8px_rgba(255,255,255,0.04)] sm:p-5">
            {/* Top Bar: Legend Pills + Floating Glass/Neumorphic Readout */}
            <div className="mb-3 flex min-h-[32px] flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-xl bg-background px-2.5 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card/70 dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                  <span className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                  {t("dashboard.trends.totalDetected")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-background px-2.5 py-1 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card/70 dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                  <span className="size-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                  {t("dashboard.trends.resolved")}
                </span>
              </div>

              {activeRow ? (
                <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-surface px-3.5 py-1.5 font-mono text-[11px] font-extrabold text-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light),inset_1px_1px_1px_rgba(255,255,255,0.4)] transition-all dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_5px_rgba(255,255,255,0.05)]">
                  <span className="text-foreground">
                    {formatTrendTooltipTitle(activeRow.date, locale)}
                  </span>
                  <span className="opacity-30">|</span>
                  <span className="text-primary">
                    {t("dashboard.trends.totalDetected")}:{" "}
                    {number.format(activeRow.totalIncidents)}
                  </span>
                  <span className="opacity-30">·</span>
                  <span>
                    {t("dashboard.trends.trueViolations")}:{" "}
                    {number.format(activeRow.trueViolations)}
                  </span>
                  <span className="opacity-30">·</span>
                  <span className="text-accent">
                    {t("dashboard.trends.resolved")}:{" "}
                    {number.format(activeRow.resolvedCount)}
                  </span>
                  {activeRow.falseAlarms > 0 && (
                    <>
                      <span className="opacity-30">·</span>
                      <span className="text-muted-foreground">
                        {t("dashboard.trends.falseAlarms")}:{" "}
                        {number.format(activeRow.falseAlarms)}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="rounded-xl bg-background px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] dark:bg-card/50 dark:shadow-none">
                  {sorted.length}{" "}
                  {groupBy === "DAY"
                    ? isVi
                      ? "ngày"
                      : "days"
                    : groupBy === "WEEK"
                      ? isVi
                        ? "tuần"
                        : "weeks"
                      : isVi
                        ? "tháng"
                        : "months"}
                </span>
              )}
            </div>

            <div className="overflow-x-auto pb-1">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={t("dashboard.trends.title")}
                className="h-[236px] w-full min-w-[560px]"
              >
                <defs>
                  <linearGradient
                    id="dashboardTrendsArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.34"
                    />
                    <stop
                      offset="65%"
                      stopColor="var(--primary)"
                      stopOpacity="0.08"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity="0.0"
                    />
                  </linearGradient>

                  {/* Soft Glow Filter for Primary Curve */}
                  <filter
                    id="nmLineGlow"
                    x="-10%"
                    y="-10%"
                    width="120%"
                    height="130%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="3"
                      stdDeviation="3"
                      floodColor="var(--primary)"
                      floodOpacity="0.35"
                    />
                  </filter>
                </defs>

                {/* Y-Axis Gridlines */}
                {yTicks.map((val, idx) => {
                  const y = getY(val);
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={val === 0 ? "0.18" : "0.08"}
                        strokeDasharray={val === 0 ? undefined : "4 4"}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="currentColor"
                        opacity="0.5"
                        className="font-mono text-[10px] font-bold tabular-nums"
                      >
                        {number.format(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Area & Glowing Curves */}
                {detectedArea && (
                  <path d={detectedArea} fill="url(#dashboardTrendsArea)" />
                )}
                {detectedPath && (
                  <path
                    d={detectedPath}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#nmLineGlow)"
                  />
                )}
                {resolvedPath && (
                  <path
                    d={resolvedPath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.2"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Buckets & Tactile Nodes */}
                {sorted.map((item, idx) => {
                  const x = getX(idx);
                  const yDetected = getY(item.totalIncidents);
                  const yResolved = getY(item.resolvedCount);
                  const isHovered = hoveredIndex === idx;
                  const showLabel =
                    idx === 0 ||
                    idx === sorted.length - 1 ||
                    idx % step === 0 ||
                    isHovered;
                  const sliceWidth =
                    sorted.length <= 1
                      ? plotWidth
                      : Math.max(18, plotWidth / sorted.length);

                  return (
                    <g
                      key={item.date}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {isHovered && (
                        <>
                          {/* Subtle Vertical Spotlight Band */}
                          <rect
                            x={x - 14}
                            y={padTop}
                            width={28}
                            height={plotHeight}
                            rx={8}
                            fill="var(--primary)"
                            fillOpacity="0.06"
                          />
                          <line
                            x1={x}
                            y1={padTop}
                            x2={x}
                            y2={padTop + plotHeight}
                            stroke="var(--primary)"
                            strokeOpacity="0.45"
                            strokeDasharray="3 3"
                          />
                          {/* Outer Halo Ring */}
                          <circle
                            cx={x}
                            cy={yDetected}
                            r={10}
                            fill="var(--primary)"
                            fillOpacity="0.16"
                          />
                        </>
                      )}

                      <circle
                        cx={x}
                        cy={yDetected}
                        r={isHovered ? 5.5 : 3.8}
                        fill="var(--background)"
                        stroke="var(--primary)"
                        strokeWidth={isHovered ? "2.8" : "2.2"}
                      />

                      {item.resolvedCount > 0 && (
                        <circle
                          cx={x}
                          cy={yResolved}
                          r={isHovered ? 4.5 : 3}
                          fill="var(--background)"
                          stroke="var(--accent)"
                          strokeWidth="2.2"
                        />
                      )}

                      {showLabel && (
                        <text
                          x={x}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          fill={isHovered ? "var(--primary)" : "currentColor"}
                          opacity={isHovered ? "1" : "0.62"}
                          className="font-mono text-[10px] font-extrabold tabular-nums"
                        >
                          {formatTrendAxisLabel(item.date, locale)}
                        </text>
                      )}

                      {/* Invisible wide hit target for smooth hover */}
                      <rect
                        x={x - sliceWidth / 2}
                        y={padTop}
                        width={sliceWidth}
                        height={plotHeight + padBottom}
                        fill="transparent"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </>
      )}
    </DashboardPanel>
  );
}
