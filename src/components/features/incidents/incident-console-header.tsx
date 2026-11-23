"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Images,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import { ROLE_LABELS } from "@/config/navigation";
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

export interface IncidentConsoleHeaderProps {
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  canCreateIncident: boolean;
  onCreateIncident: () => void;
  siteName?: string | null;
  userRole?: string | null;
  criticalCount: number;
  periodFilter?: IncidentPeriodFilter;
  resolvedPeriod?: ResolvedIncidentPeriod;
  today?: string;
  onPeriodFilterChange?: (next: IncidentPeriodFilter) => void;
}

const PERIOD_MODE_ORDER: readonly IncidentPeriodMode[] = [
  "all",
  "day",
  "week",
  "month",
  "year",
  "custom",
];

export function IncidentConsoleHeader({
  isConnected,
  isRefreshing,
  onRefresh,
  canCreateIncident,
  onCreateIncident,
  siteName,
  userRole,
  criticalCount,
  periodFilter,
  resolvedPeriod,
  today,
  onPeriodFilterChange,
}: IncidentConsoleHeaderProps) {
  const { t, locale } = useLocale();
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

  const selectedYear = Number(activeFilter.anchorDate.slice(0, 4)) || Number(effectiveToday.slice(0, 4));
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
    if (!onPeriodFilterChange) return;
    if (nextMode === "all") {
      onPeriodFilterChange({
        ...activeFilter,
        mode: "all",
      });
      return;
    }
    if (nextMode === "custom") {
      const start = activeResolved.startDate || activeFilter.customStart || effectiveToday;
      const end = activeResolved.endDate || activeFilter.customEnd || effectiveToday;
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
    if (!onPeriodFilterChange) return;
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
    if (!onPeriodFilterChange) return;
    onPeriodFilterChange({
      ...activeFilter,
      anchorDate: effectiveToday,
    });
  };

  const handleResetPeriod = () => {
    if (!onPeriodFilterChange) return;
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

  const roleKey = userRole
    ? (ROLE_LABELS[userRole.toUpperCase()] ?? `roles.${userRole.toUpperCase()}`)
    : null;
  const roleDisplay = roleKey ? t(roleKey) || userRole : null;
  const resolvedSiteLabel =
    siteName || (isVietnamese ? "Tất cả công trường" : "All Sites");

  return (
    <section
      aria-label={
        isVietnamese
          ? "Tiêu đề trung tâm quản lý sự cố PPE"
          : "PPE Incident Console Header"
      }
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular highlight (đồng bộ /cameras và /dashboard) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative space-y-5">
        {/* Layer 1: Identity & Right Action Modules */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <ShieldAlert className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                  }`}
                />
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("incidents.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isVietnamese
                    ? "Giám sát An toàn PPE"
                    : "PPE Safety Monitoring"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {roleDisplay && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    <ShieldCheck className="size-3.5" />
                    {roleDisplay}
                  </span>
                )}

                <span
                  title={
                    isConnected
                      ? isVietnamese
                        ? "Đang kết nối nhận diện vi phạm tự động thời gian thực"
                        : "Connected to realtime incident detection stream"
                      : isVietnamese
                        ? "Đang duy trì kiểm tra định kỳ (15s)"
                        : "Maintaining polling (15s)"
                  }
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${
                    isConnected ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    )}
                    <span
                      className={`relative h-2 w-2 rounded-full ${
                        isConnected ? "bg-primary" : "bg-accent"
                      }`}
                    />
                  </span>
                  {isConnected ? "Realtime Active" : "Polling (15s)"}
                </span>

                <span
                  title={resolvedSiteLabel}
                  className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{resolvedSiteLabel}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${
                    criticalCount > 0 ? "text-accent" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      criticalCount > 0
                        ? "animate-pulse bg-accent"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  {criticalCount > 0
                    ? isVietnamese
                      ? `${criticalCount} vi phạm khẩn cấp`
                      : `${criticalCount} critical alerts`
                    : isVietnamese
                      ? "Không có vi phạm khẩn cấp"
                      : "No critical alerts"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls (đồng bộ /cameras & /dashboard) */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-center">
            <Link
              href="/evidences"
              className={`group inline-flex shrink-0 items-center gap-2.5 sm:gap-3 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary transition-all duration-200 group-hover:scale-105 ${NM.recessed}`}
              >
                <Images className="size-4" />
              </span>
              <span className="text-left leading-tight">
                <span className="block font-extrabold">
                  {t("nav.evidences")}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {isVietnamese ? "Ảnh & video vi phạm" : "Violation media"}
                </span>
              </span>
            </Link>

            <ConsoleRefreshButton
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              subtitle={isVietnamese ? "Dữ liệu sự cố" : "Incident feed"}
            />

            {canCreateIncident && (
              <button
                type="button"
                onClick={onCreateIncident}
                className="inline-flex h-11 sm:h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)]"
              >
                <Plus className="size-4" />
                <span>
                  {isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Layer 2: Time Period Filter Strip (tác động toàn trang: header, KPI stats, card điều phối & bảng) */}
        {onPeriodFilterChange && (
          <div
            role="region"
            aria-label={
              isVietnamese
                ? "Bộ lọc thời gian sự cố toàn trang"
                : "Page-wide incident time filter"
            }
            className={`rounded-[22px] p-3 sm:p-3.5 ${NM.recessed}`}
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
                            title={
                              isVietnamese ? "Mốc trước" : "Previous period"
                            }
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
                            title={
                              isVietnamese ? "Mốc tiếp theo" : "Next period"
                            }
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
                    : isVietnamese
                      ? "Áp dụng toàn trang (Thống kê, Thẻ & Danh sách)"
                      : "Applies page-wide (Stats, Cards & List)"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
