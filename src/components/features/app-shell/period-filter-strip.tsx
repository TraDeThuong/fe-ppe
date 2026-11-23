"use client";

import React, { useMemo } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { vietnamToday } from "@/lib/dashboard-data";
import {
  createDefaultIncidentPeriodFilter,
  formatIncidentPeriodLabel,
  formatIncidentPeriodRangeSummary,
  isIncidentPeriodCurrent,
  resolveIncidentPeriod,
  shiftIncidentPeriodAnchor,
  type IncidentPeriodFilter,
  type IncidentPeriodMode,
  type ResolvedIncidentPeriod,
} from "@/lib/incident-period";
import { useLocale } from "@/providers/locale-provider";

export interface PeriodFilterStripProps {
  periodFilter?: IncidentPeriodFilter;
  resolvedPeriod?: ResolvedIncidentPeriod;
  today?: string;
  onPeriodFilterChange: (next: IncidentPeriodFilter) => void;
  ariaLabel?: string;
  allScopeCaption?: string;
  className?: string;
}

const PERIOD_MODE_ORDER: readonly IncidentPeriodMode[] = [
  "all",
  "day",
  "week",
  "month",
  "year",
  "custom",
];

export function PeriodFilterStrip({
  periodFilter,
  resolvedPeriod,
  today,
  onPeriodFilterChange,
  ariaLabel,
  allScopeCaption,
  className = "",
}: PeriodFilterStripProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const effectiveToday = today || vietnamToday();
  const activeFilter = useMemo(
    () => periodFilter ?? createDefaultIncidentPeriodFilter(effectiveToday),
    [periodFilter, effectiveToday],
  );
  const activeResolved = useMemo(
    () => resolvedPeriod ?? resolveIncidentPeriod(activeFilter),
    [resolvedPeriod, activeFilter],
  );
  const isCurrentAnchor = useMemo(
    () => isIncidentPeriodCurrent(activeFilter, effectiveToday),
    [activeFilter, effectiveToday],
  );
  const periodLabel = useMemo(
    () => formatIncidentPeriodLabel(activeResolved, locale),
    [activeResolved, locale],
  );
  const periodRangeSummary = useMemo(
    () => formatIncidentPeriodRangeSummary(activeResolved, locale),
    [activeResolved, locale],
  );

  const selectedYear =
    Number(activeFilter.anchorDate.slice(0, 4)) ||
    Number(effectiveToday.slice(0, 4));
  const yearOptions = useMemo(() => {
    const currentYear = Number(effectiveToday.slice(0, 4)) || 2026;
    const minYear = Math.min(currentYear - 5, selectedYear - 1);
    const maxYear = Math.max(currentYear + 1, selectedYear + 1);
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) {
      years.push(y);
    }
    return years;
  }, [effectiveToday, selectedYear]);

  const modeLabels: Record<IncidentPeriodMode, string> = {
    all: isVietnamese ? "Tất cả" : "All",
    day: isVietnamese ? "Ngày" : "Day",
    week: isVietnamese ? "Tuần" : "Week",
    month: isVietnamese ? "Tháng" : "Month",
    year: isVietnamese ? "Năm" : "Year",
    custom: isVietnamese ? "Khoảng thời gian" : "Custom",
  };

  const handleModeChange = (nextMode: IncidentPeriodMode) => {
    if (nextMode === "all") {
      onPeriodFilterChange({
        ...activeFilter,
        mode: "all",
      });
      return;
    }
    if (nextMode === "custom") {
      const start =
        activeResolved.startDate || activeFilter.customStart || effectiveToday;
      const end =
        activeResolved.endDate || activeFilter.customEnd || effectiveToday;
      onPeriodFilterChange({
        ...activeFilter,
        mode: "custom",
        customStart: start <= end ? start : end,
        customEnd: end >= start ? end : start,
      });
      return;
    }
    // Khi chuyển chế độ Ngày / Tuần / Tháng / Năm luôn neo về mốc hiện tại (today)
    // để tránh trôi lùi ngày khi chuyển qua lại giữa Năm -> Tháng -> Tuần -> Ngày.
    onPeriodFilterChange({
      ...activeFilter,
      mode: nextMode,
      anchorDate: effectiveToday,
    });
  };

  const handleStepAnchor = (delta: -1 | 1) => {
    const nextAnchor = shiftIncidentPeriodAnchor(
      activeFilter.mode,
      activeFilter.anchorDate || effectiveToday,
      delta,
    );
    onPeriodFilterChange({
      ...activeFilter,
      anchorDate: nextAnchor,
    });
  };

  const handleJumpToCurrent = () => {
    onPeriodFilterChange({
      ...activeFilter,
      anchorDate: effectiveToday,
    });
  };

  const handleResetPeriod = () => {
    onPeriodFilterChange(createDefaultIncidentPeriodFilter(effectiveToday));
  };

  const currentJumpLabel =
    activeFilter.mode === "day"
      ? isVietnamese
        ? "Hôm nay"
        : "Today"
      : activeFilter.mode === "week"
        ? isVietnamese
          ? "7 ngày gần nhất"
          : "Last 7 days"
        : activeFilter.mode === "month"
          ? isVietnamese
            ? "Tháng này"
            : "This month"
          : isVietnamese
            ? "Năm nay"
            : "This year";

  const resolvedAriaLabel =
    ariaLabel ??
    (isVietnamese ? "Bộ lọc thời gian toàn trang" : "Page-wide time filter");
  const resolvedAllScopeCaption =
    allScopeCaption ??
    (isVietnamese
      ? "Áp dụng toàn trang (Thống kê, Thẻ & Danh sách)"
      : "Applies page-wide (Stats, Cards & List)");

  return (
    <div
      role="region"
      aria-label={resolvedAriaLabel}
      className={`rounded-[22px] p-3 sm:p-3.5 ${NM.recessed} ${className}`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode selector pills */}
          <div
            role="group"
            aria-label={
              isVietnamese
                ? "Chọn khung thời gian"
                : "Select time granularity"
            }
            className="inline-flex flex-wrap items-center gap-1 rounded-2xl bg-background/40 p-1"
          >
            <span
              aria-hidden="true"
              className="hidden sm:inline-flex items-center gap-1 px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground"
            >
              <CalendarRange className="size-3.5 text-primary" />
              {isVietnamese ? "Thời gian" : "Period"}
            </span>
            {PERIOD_MODE_ORDER.map((mode) => {
              const isActive = activeFilter.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => handleModeChange(mode)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs transition-all duration-200 ${
                    isActive
                      ? `${NM.extruded} font-extrabold text-primary`
                      : "font-semibold text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              );
            })}
          </div>

          {/* Time anchor / custom range controls */}
          {activeFilter.mode !== "all" && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilter.mode !== "custom" ? (
                <>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepAnchor(-1)}
                      aria-label={
                        isVietnamese ? "Mốc trước" : "Previous period"
                      }
                      title={isVietnamese ? "Mốc trước" : "Previous period"}
                      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-foreground transition-colors hover:text-primary ${NM.tactileBtn}`}
                    >
                      <ChevronLeft className="size-4" />
                    </button>

                    {activeFilter.mode === "day" && (
                      <input
                        type="date"
                        aria-label={
                          isVietnamese ? "Chọn ngày hiển thị" : "Select date"
                        }
                        value={activeFilter.anchorDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            onPeriodFilterChange({
                              ...activeFilter,
                              anchorDate: e.target.value,
                            });
                          }
                        }}
                        className={`h-9 rounded-xl border border-border/40 bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                      />
                    )}

                    {activeFilter.mode === "week" && (
                      <input
                        type="date"
                        aria-label={
                          isVietnamese
                            ? "Chọn ngày kết thúc khung 7 ngày"
                            : "Select end date of 7-day week"
                        }
                        title={
                          isVietnamese
                            ? "Hiển thị 7 ngày kết thúc vào ngày đã chọn"
                            : "Shows 7 days ending on the selected date"
                        }
                        value={activeFilter.anchorDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            onPeriodFilterChange({
                              ...activeFilter,
                              anchorDate: e.target.value,
                            });
                          }
                        }}
                        className={`h-9 rounded-xl border border-border/40 bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                      />
                    )}

                    {activeFilter.mode === "month" && (
                      <input
                        type="month"
                        aria-label={
                          isVietnamese ? "Chọn tháng hiển thị" : "Select month"
                        }
                        value={activeFilter.anchorDate.slice(0, 7)}
                        onChange={(e) => {
                          if (/^\d{4}-\d{2}$/.test(e.target.value)) {
                            onPeriodFilterChange({
                              ...activeFilter,
                              anchorDate: `${e.target.value}-01`,
                            });
                          }
                        }}
                        className={`h-9 rounded-xl border border-border/40 bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                      />
                    )}

                    {activeFilter.mode === "year" && (
                      <select
                        aria-label={
                          isVietnamese ? "Chọn năm hiển thị" : "Select year"
                        }
                        value={selectedYear}
                        onChange={(e) => {
                          const yr = Number(e.target.value);
                          if (Number.isInteger(yr)) {
                            onPeriodFilterChange({
                              ...activeFilter,
                              anchorDate: `${yr}-01-01`,
                            });
                          }
                        }}
                        className={`h-9 cursor-pointer rounded-xl border border-border/40 bg-background px-3 text-xs font-bold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                      >
                        {yearOptions.map((yr) => (
                          <option key={yr} value={yr}>
                            {isVietnamese ? `Năm ${yr}` : yr}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStepAnchor(1)}
                      aria-label={
                        isVietnamese ? "Mốc tiếp theo" : "Next period"
                      }
                      title={isVietnamese ? "Mốc tiếp theo" : "Next period"}
                      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-foreground transition-colors hover:text-primary ${NM.tactileBtn}`}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  {activeFilter.mode === "day" && isCurrentAnchor && (
                    <button
                      type="button"
                      onClick={() => handleStepAnchor(-1)}
                      className={`inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-xs font-bold text-primary ${NM.tactileBtn}`}
                    >
                      {isVietnamese ? "Hôm qua" : "Yesterday"}
                    </button>
                  )}

                  {!isCurrentAnchor && (
                    <button
                      type="button"
                      onClick={handleJumpToCurrent}
                      className={`inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-xs font-bold text-primary ${NM.tactileBtn}`}
                    >
                      {currentJumpLabel}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <span>{isVietnamese ? "Từ" : "From"}</span>
                    <input
                      type="date"
                      aria-label={isVietnamese ? "Từ ngày" : "From date"}
                      value={activeFilter.customStart}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        const nextEnd =
                          nextStart &&
                          activeFilter.customEnd &&
                          nextStart > activeFilter.customEnd
                            ? nextStart
                            : activeFilter.customEnd;
                        onPeriodFilterChange({
                          ...activeFilter,
                          mode: "custom",
                          customStart: nextStart,
                          customEnd: nextEnd,
                        });
                      }}
                      className={`h-9 rounded-xl border border-border/40 bg-background px-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                    />
                  </label>
                  <span className="text-xs font-bold text-muted-foreground">
                    →
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <span>{isVietnamese ? "Đến" : "To"}</span>
                    <input
                      type="date"
                      aria-label={isVietnamese ? "Đến ngày" : "To date"}
                      value={activeFilter.customEnd}
                      min={activeFilter.customStart || undefined}
                      onChange={(e) => {
                        const nextEnd = e.target.value;
                        const nextStart =
                          nextEnd &&
                          activeFilter.customStart &&
                          nextEnd < activeFilter.customStart
                            ? nextEnd
                            : activeFilter.customStart;
                        onPeriodFilterChange({
                          ...activeFilter,
                          mode: "custom",
                          customStart: nextStart,
                          customEnd: nextEnd,
                        });
                      }}
                      className={`h-9 rounded-xl border border-border/40 bg-background px-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary ${NM.extruded}`}
                    />
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetPeriod}
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:text-primary ${NM.tactileBtn}`}
              >
                <RotateCcw className="size-3.5" />
                <span>{isVietnamese ? "Bỏ lọc" : "Reset"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Time Scope Summary Pill */}
        <div
          className={`flex flex-col justify-center rounded-xl px-3.5 py-2 text-left xl:text-right ${NM.extruded}`}
        >
          <p className="text-xs font-semibold text-foreground">
            <span className="text-muted-foreground">
              {isVietnamese ? "Hiển thị:" : "Showing:"}
            </span>{" "}
            <span
              className={`font-mono font-bold ${
                activeResolved.mode === "all"
                  ? "text-foreground"
                  : activeResolved.isValid
                    ? "text-primary"
                    : "text-danger"
              }`}
            >
              {periodLabel}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            {periodRangeSummary
              ? `${periodRangeSummary} · UTC+7`
              : resolvedAllScopeCaption}
          </p>
        </div>
      </div>
    </div>
  );
}
