
"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  List,
  HardHat,
  Shirt,
  MapPinOff,
  Layers3,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { ViolationTypeStatDto } from "@/types";

export interface ReportViolationDonutProps {
  distribution?: ViolationTypeStatDto[];
  loading?: boolean;
}

const CHART_SIZE = 176;
const CENTER = CHART_SIZE / 2;
const RADIUS = 64;
const STROKE_WIDTH = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Chỉ sử dụng primary và accent, phân biệt bằng opacity.
const SEGMENT_STYLES = [
  {
    color: "var(--primary)",
    opacity: 1,
    bar: "bg-primary",
    icon: "text-primary",
    surface: "bg-primary/10",
  },
  {
    color: "var(--accent)",
    opacity: 1,
    bar: "bg-accent",
    icon: "text-accent",
    surface: "bg-accent/10",
  },
  {
    color: "var(--primary)",
    opacity: 0.55,
    bar: "bg-primary/55",
    icon: "text-primary",
    surface: "bg-primary/10",
  },
  {
    color: "var(--accent)",
    opacity: 0.55,
    bar: "bg-accent/55",
    icon: "text-accent",
    surface: "bg-accent/10",
  },
];

export function ReportViolationDonut({
  distribution = [],
  loading = false,
}: ReportViolationDonutProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [activeType, setActiveType] = useState<string | null>(null);

  const labels: Record<string, { vi: string; en: string }> = {
    NO_HELMET: {
      vi: "Không đội mũ bảo hộ",
      en: "No Safety Helmet",
    },
    NO_VEST: {
      vi: "Không mặc áo phản quang",
      en: "No High-Vis Vest",
    },
    RESTRICTED_AREA: {
      vi: "Xâm nhập vùng cấm",
      en: "Restricted Zone Intrusion",
    },
    MULTI_VIOLATION: {
      vi: "Đa vi phạm PPE",
      en: "Multiple PPE Violations",
    },
  };

  const total = useMemo(
    () => distribution.reduce((sum, item) => sum + item.count, 0),
    [distribution],
  );

  const getLabel = (type: string) =>
    labels[type]
      ? isVietnamese
        ? labels[type].vi
        : labels[type].en
      : type;

  const getIcon = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return HardHat;
      case "NO_VEST":
        return Shirt;
      case "RESTRICTED_AREA":
        return MapPinOff;
      case "MULTI_VIOLATION":
        return Layers3;
      default:
        return ShieldAlert;
    }
  };

  const items = useMemo(() => {
    let accumulated = 0;

    return distribution.map((item, index) => {
      const percentage = total > 0 ? (item.count / total) * 100 : 0;
      const segmentLength = (percentage / 100) * CIRCUMFERENCE;

      const result = {
        ...item,
        percentage,
        color: SEGMENT_STYLES[index % SEGMENT_STYLES.length],
        strokeDasharray: `${segmentLength} ${CIRCUMFERENCE}`,
        strokeDashoffset: -accumulated,
      };

      accumulated += segmentLength;

      return result;
    });
  }, [distribution, total]);

  const activeItem = items.find(
    (item) => item.violationType === activeType,
  );

  const displayPercentage = activeItem
    ? activeItem.percentage
    : 100;

  if (loading) {
    return (
      <div className="flex h-full min-h-[480px] w-full flex-col justify-between rounded-2xl bg-surface p-5 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
        <div className="animate-pulse space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-36 rounded-lg bg-muted" />
              <div className="h-3 w-48 rounded-lg bg-muted/70" />
            </div>
            <div className="h-10 w-16 rounded-xl bg-muted" />
          </div>

          <div className="flex justify-center py-4">
            <div className="h-[176px] w-[176px] rounded-full bg-muted" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 w-full rounded-xl bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl bg-surface p-4 sm:p-5
      shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)]
    ">
      {/* Subtle decorative light */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-accent/5 blur-3xl" />

      {/* ───────────────── HEADER ───────────────── */}
      <div className="relative flex items-center justify-between gap-3 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary
            shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
          ">
            <PieChart size={20} strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-extrabold text-foreground">
              {isVietnamese ? "Báo cáo vi phạm" : "Violation Report"}
            </h3>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Cơ cấu phân loại vi phạm PPE"
                : "PPE violation distribution"}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-surface px-3 py-1.5 text-right
          shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]
        ">
          <p className="text-base font-extrabold leading-none tabular-nums text-primary">
            {total.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
            {isVietnamese ? "Vi phạm" : "Violations"}
          </p>
        </div>
      </div>

      {/* ───────────────── DONUT CHART ───────────────── */}
      <div className="relative flex flex-col items-center py-2.5 sm:py-3 shrink-0">
        {total > 0 ? (
          <div className="relative flex items-center justify-center">
            {/* Outer sculpted surface */}
            <div className="absolute inset-[-10px] rounded-full bg-surface
              shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
            " />

            <svg
              width={CHART_SIZE}
              height={CHART_SIZE}
              viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
              className="relative overflow-visible"
            >
              {/* Track */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE_WIDTH}
                className="text-muted/50"
              />

              {/* Segments */}
              {items.map((item) => {
                const isActive = activeType === item.violationType;

                return (
                  <circle
                    key={item.violationType}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={item.color.color}
                    strokeOpacity={item.color.opacity}
                    strokeWidth={isActive ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                    strokeDasharray={item.strokeDasharray}
                    strokeDashoffset={item.strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${CENTER} ${CENTER})`}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      filter: isActive
                        ? "drop-shadow(0 3px 5px var(--shadow-dark))"
                        : "none",
                    }}
                    onMouseEnter={() => setActiveType(item.violationType)}
                    onMouseLeave={() => setActiveType(null)}
                    onClick={() =>
                      setActiveType((current) =>
                        current === item.violationType
                          ? null
                          : item.violationType,
                      )
                    }
                  />
                );
              })}
            </svg>

            {/* Center */}
            <div className="absolute flex h-[96px] w-[96px] flex-col items-center justify-center rounded-full bg-surface
              shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]
            ">
              <Activity size={15} className="mb-0.5 text-accent" />

              <span className="text-2xl font-black leading-none tabular-nums text-primary">
                {activeItem
                  ? activeItem.count.toLocaleString()
                  : total.toLocaleString()}
              </span>

              <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                {activeItem
                  ? isVietnamese
                    ? "Số vụ"
                    : "Cases"
                  : isVietnamese
                    ? "Tổng vụ"
                    : "Violations"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-[176px] w-[176px] items-center justify-center rounded-full bg-surface
            shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)]
          ">
            <div className="text-center">
              <PieChart size={26} className="mx-auto mb-1 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {isVietnamese ? "Chưa có dữ liệu" : "No data available"}
              </p>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="mt-2.5 flex items-center gap-2 rounded-full bg-surface px-3 py-1
            shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
          ">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-semibold text-muted-foreground">
              {activeItem
                ? `${getLabel(activeItem.violationType)}: ${displayPercentage.toFixed(1)}%`
                : isVietnamese
                  ? "Tỷ trọng tổng thể 100%"
                  : "Total share 100%"}
            </span>
          </div>
        )}
      </div>

      {/* ───────────────── DIVIDER ───────────────── */}
      <div className="my-1.5 h-px w-full bg-gradient-to-r from-transparent via-border/70 to-transparent shrink-0" />

      {/* ───────────────── BREAKDOWN ───────────────── */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-start">
        <div className="mb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <List size={13} className="text-accent" />
            <h4 className="text-xs font-bold text-foreground">
              {isVietnamese ? "Chi tiết phân loại" : "Category Breakdown"}
            </h4>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {items.length} {isVietnamese ? "nhóm" : "categories"}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-0.5">
            {items.map((item, index) => {
              const Icon = getIcon(item.violationType);
              const isActive = activeType === item.violationType;

              return (
                <button
                  key={item.violationType}
                  type="button"
                  onMouseEnter={() => setActiveType(item.violationType)}
                  onMouseLeave={() => setActiveType(null)}
                  onClick={() =>
                    setActiveType((current) =>
                      current === item.violationType
                        ? null
                        : item.violationType,
                    )
                  }
                  className={`group w-full rounded-xl p-2 text-left transition-all duration-200
                    ${
                      isActive
                        ? "bg-surface shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
                        : "bg-surface shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:-translate-y-0.5"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {/* Category icon */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color.surface} ${item.color.icon}`}
                    >
                      <Icon size={14} strokeWidth={2.2} />
                    </div>

                    {/* Label + progress */}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-1.5">
                        <span className="truncate text-[11px] font-semibold text-foreground">
                          {getLabel(item.violationType)}
                        </span>

                        <div className="flex shrink-0 items-baseline gap-1">
                          <span
                            className={`text-[11px] font-black tabular-nums ${
                              index % 2 === 0 ? "text-primary" : "text-accent"
                            }`}
                          >
                            {item.percentage.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            ({item.count.toLocaleString()} {isVietnamese ? "vụ" : "cases"})
                          </span>
                        </div>
                      </div>

                      {/* Progress track */}
                      <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-muted/60
                        shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]
                      ">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${item.color.bar}`}
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
            <ShieldAlert
              size={22}
              className="mb-1 text-muted-foreground/50"
            />
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Chưa có dữ liệu phân loại"
                : "No category data"}
            </p>
          </div>
        )}
      </div>

      {/* ───────────────── FOOTER ───────────────── */}
      {items.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {items.length} {isVietnamese ? "nhóm vi phạm" : "categories"}
            </span>
          </div>

          <span className="text-[10px] font-semibold text-muted-foreground">
            {isVietnamese ? "Tổng cộng" : "Total"}:{" "}
            <span className="font-bold text-primary">
              {total.toLocaleString()}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
