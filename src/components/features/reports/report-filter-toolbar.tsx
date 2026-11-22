"use client";

import { AlertCircle, Building2, CalendarDays } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface ReportFilterToolbarProps {
  sites: SiteItem[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  startDate?: string;
  endDate?: string;
  activeDateRangeLabel?: string;
  rangeError?: string | null;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
}

export function ReportFilterToolbar({
  sites,
  selectedSiteId,
  onSiteChange,
  period,
  onPeriodChange,
  startDate,
  endDate,
  activeDateRangeLabel,
  rangeError,
  onStartDateChange,
  onEndDateChange,
}: ReportFilterToolbarProps) {
  const { t } = useLocale();

  const periodOptions = [
    { value: "today", label: t("reports.toolbar.periodToday") },
    { value: "7d", label: t("reports.toolbar.period7d") },
    { value: "30d", label: t("reports.toolbar.period30d") },
    { value: "custom", label: t("reports.toolbar.periodCustom") },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/35 bg-surface p-3.5 shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)] lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Site + Period Quick Pills + Optional Custom Date */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Site Filter */}
          <div className="relative flex w-full sm:w-auto items-center">
            <Building2 className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedSiteId}
              onChange={(e) => onSiteChange(e.target.value)}
              aria-label={t("reports.toolbar.allSites")}
              className="w-full sm:w-auto max-w-full rounded-xl border border-border/40 bg-background py-2 pl-8 pr-3 text-xs font-semibold text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] focus:border-primary focus:outline-none"
            >
              <option value="">{t("reports.toolbar.allSites")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Quick Segmented Pills */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-background/75 p-1 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            {periodOptions.map((opt) => {
              const isActive = period === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPeriodChange(opt.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-surface text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker (BE max 90 days) */}
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
              <div
                className={`flex items-center gap-1.5 rounded-xl border bg-background px-2.5 py-1.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${
                  rangeError ? "border-destructive/60" : "border-border/40"
                }`}
              >
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {t("reports.toolbar.from")}
                </span>
                <input
                  type="date"
                  value={startDate || ""}
                  max={endDate || undefined}
                  onChange={(e) => onStartDateChange?.(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
                />
              </div>
              <span className="text-xs text-muted-foreground">–</span>
              <div
                className={`flex items-center gap-1.5 rounded-xl border bg-background px-2.5 py-1.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] ${
                  rangeError ? "border-destructive/60" : "border-border/40"
                }`}
              >
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {t("reports.toolbar.to")}
                </span>
                <input
                  type="date"
                  value={endDate || ""}
                  min={startDate || undefined}
                  onChange={(e) => onEndDateChange?.(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Date Range Indicator */}
        {activeDateRangeLabel && (
          <div className="flex items-center gap-1.5 self-start rounded-xl bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] lg:self-auto">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span className="tabular-nums">{activeDateRangeLabel}</span>
          </div>
        )}
      </div>

      {rangeError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{rangeError}</span>
        </div>
      )}
    </div>
  );
}
