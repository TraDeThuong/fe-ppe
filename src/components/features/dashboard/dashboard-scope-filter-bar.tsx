"use client";

import React, { useMemo } from "react";
import { Building2, CalendarRange, RotateCcw } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Input } from "@/components/ui/form/foundation/input";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import type { DashboardPeriod, DashboardPreset } from "@/types/dashboard.types";

export interface DashboardPeriodState {
  today: string;
  preset: DashboardPreset;
  setPreset: (preset: DashboardPreset) => void;
  customStart: string;
  setCustomStart: (value: string) => void;
  customEnd: string;
  setCustomEnd: (value: string) => void;
  period: DashboardPeriod | null;
}

export interface DashboardScopeSiteOption {
  id: string;
  name: string;
}

export interface DashboardScopeFilterBarProps {
  sites?: DashboardScopeSiteOption[];
  siteId?: string | null;
  siteName?: string | null;
  onSiteChange?: (siteId: string | null) => void;
  canViewSites?: boolean;
  periodState: DashboardPeriodState;
  className?: string;
}

const PRESET_KEYS: DashboardPreset[] = ["today", "7d", "month", "custom"];

export function DashboardScopeFilterBar({
  sites = [],
  siteId = null,
  siteName,
  onSiteChange,
  canViewSites = true,
  periodState,
  className = "",
}: DashboardScopeFilterBarProps) {
  const { t } = useLocale();
  const { period } = periodState;

  const siteOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("dashboard.data.allSites") },
      ...sites.map((site) => ({
        value: site.id,
        label: site.name,
      })),
    ],
    [sites, t],
  );

  const presetOptions = useMemo<SelectOption[]>(
    () =>
      PRESET_KEYS.map((key) => ({
        value: key,
        label: t(`dashboard.period.${key}`),
      })),
    [t],
  );

  const resolvedSiteName =
    siteName ||
    sites.find((s) => s.id === siteId)?.name ||
    t("dashboard.data.allSites");

  const hasCustomFilter = Boolean(siteId) || periodState.preset !== "today";

  const handleReset = () => {
    onSiteChange?.(null);
    periodState.setPreset("today");
  };

  return (
    <div
      role="region"
      aria-label={t("dashboard.period.title")}
      className={`rounded-[22px] p-3.5 sm:p-4 ${NM.recessed} ${className}`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        {/* Left: Portal Select Filters + Optional Custom Date Range */}
        <div className="flex flex-wrap items-end gap-3">
          {canViewSites && onSiteChange && (
            <div className="w-full space-y-1.5 sm:w-auto sm:min-w-[230px]">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <Building2 className="size-3 text-primary" />
                {t("dashboard.activeSite")}
              </span>
              <Select
                size="sm"
                ariaLabel={t("dashboard.activeSite")}
                options={siteOptions}
                value={siteId || ""}
                onValueChange={(value) => onSiteChange(value || null)}
                placeholder={t("dashboard.data.allSites")}
              />
            </div>
          )}

          <div className="w-full space-y-1.5 sm:w-auto sm:min-w-[190px]">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <CalendarRange className="size-3 text-primary" />
              {t("dashboard.period.title")}
            </span>
            <Select
              size="sm"
              ariaLabel={t("dashboard.period.title")}
              options={presetOptions}
              value={periodState.preset}
              onValueChange={(value) =>
                periodState.setPreset(value as DashboardPreset)
              }
            />
          </div>

          {periodState.preset === "custom" && (
            <>
              <div className="w-full space-y-1.5 sm:w-auto sm:min-w-[155px]">
                <label
                  htmlFor="dashboard-period-from"
                  className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  {t("dashboard.period.from")}
                </label>
                <Input
                  id="dashboard-period-from"
                  type="date"
                  size="sm"
                  aria-label={t("dashboard.period.from")}
                  value={periodState.customStart}
                  max={
                    periodState.customEnd < periodState.today
                      ? periodState.customEnd
                      : periodState.today
                  }
                  onChange={(event) =>
                    periodState.setCustomStart(event.target.value)
                  }
                />
              </div>

              <div className="w-full space-y-1.5 sm:w-auto sm:min-w-[155px]">
                <label
                  htmlFor="dashboard-period-to"
                  className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  {t("dashboard.period.to")}
                </label>
                <Input
                  id="dashboard-period-to"
                  type="date"
                  size="sm"
                  aria-label={t("dashboard.period.to")}
                  value={periodState.customEnd}
                  min={periodState.customStart}
                  max={periodState.today}
                  onChange={(event) =>
                    periodState.setCustomEnd(event.target.value)
                  }
                />
              </div>
            </>
          )}

          {hasCustomFilter && (
            <button
              type="button"
              onClick={handleReset}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-primary ${NM.tactileBtn}`}
            >
              <RotateCcw className="size-3.5" />
              <span>{t("dashboard.period.reset")}</span>
            </button>
          )}
        </div>

        {/* Right: Active Scope Telemetry Pill */}
        <div
          className={`flex flex-col justify-center rounded-xl px-3.5 py-2 text-left xl:text-right ${NM.extruded}`}
        >
          <p className="text-xs font-semibold text-foreground">
            <span className="font-extrabold">{resolvedSiteName}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="font-mono font-bold text-primary">
              {period
                ? `${period.startDate} → ${period.endDate}`
                : t("dashboard.data.invalidPeriod")}
            </span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Asia/Ho_Chi_Minh (UTC+7)
          </p>
        </div>
      </div>
    </div>
  );
}

