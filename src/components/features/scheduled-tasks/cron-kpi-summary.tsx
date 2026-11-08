"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CirclePause,
  CirclePlay,
  Cpu,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem, CronJobName, CronScheduleFilter } from "@/types/cron.types";
import {
  CronStatsDetailPanel,
  type CronStatKey,
} from "./cron-stats-detail-panel";

export type { CronStatKey };

export interface CronKpiSummaryProps {
  jobs: CronJobItem[];
  loading?: boolean;
  hasData?: boolean;
  canManage?: boolean;
  blockedJobs?: ReadonlySet<CronJobName>;
  selectedStat?: CronStatKey | null;
  onSelectStat?: (stat: CronStatKey | null) => void;
  onTrigger?: (job: CronJobItem) => void;
  onToggle?: (job: CronJobItem) => void;
  onFilterChange?: (filter: CronScheduleFilter) => void;
  className?: string;
}

export function CronKpiSummary({
  jobs,
  loading = false,
  hasData = true,
  canManage = false,
  blockedJobs = new Set(),
  selectedStat: propSelectedStat,
  onSelectStat,
  onTrigger,
  onToggle,
  onFilterChange,
  className = "",
}: CronKpiSummaryProps) {
  const { t, number, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] =
    useState<CronStatKey | null>(null);

  const activeStat =
    propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: CronStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const { total, enabledCount, disabledCount, enabledRate } = useMemo(() => {
    const tot = jobs.length;
    const enabled = jobs.filter((j) => j.isEnabled).length;
    const disabled = tot - enabled;
    const rate = tot > 0 ? Math.round((enabled / tot) * 100) : 0;
    return {
      total: tot,
      enabledCount: enabled,
      disabledCount: disabled,
      enabledRate: rate,
    };
  }, [jobs]);

  // Hiệu ứng chìm sâu (neumorphic sunken) đồng bộ với Cameras, System, Roles
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bento Grid 4 Stats Cards - Bảng màu đồng nhất theo tone primary & neutral */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng tác vụ */}
        <StatsCard
          title={t("cron.kpi.total")}
          value={
            <span data-testid="cron-kpi-total">
              {loading ? "..." : hasData ? number.format(total) : "—"}
            </span>
          }
          icon={CalendarClock}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={
            isVietnamese
              ? "Tác vụ định kỳ hệ thống"
              : t("cron.kpi.totalDesc")
          }
          onClick={() => handleToggle("total")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "total" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "total" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("cron.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("cron.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Lịch đang bật */}
        <StatsCard
          title={t("cron.kpi.enabled")}
          value={
            <span data-testid="cron-kpi-enabled">
              {loading ? "..." : hasData ? number.format(enabledCount) : "—"}
            </span>
          }
          icon={CirclePlay}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          progress={enabledRate}
          progressLabel={`${enabledRate}%`}
          description={
            isVietnamese
              ? `${enabledRate}% tự động kích hoạt`
              : `${enabledRate}% automated`
          }
          onClick={() => handleToggle("enabled")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "enabled"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "enabled" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("cron.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground font-semibold gap-0.5">
                  {t("cron.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Lịch đang tắt */}
        <StatsCard
          title={t("cron.kpi.disabled")}
          value={
            <span data-testid="cron-kpi-disabled">
              {loading ? "..." : hasData ? number.format(disabledCount) : "—"}
            </span>
          }
          icon={CirclePause}
          variant="soft-extruded"
          tone="default"
          showGlow={false}
          description={
            disabledCount > 0
              ? isVietnamese
                ? `${disabledCount} tác vụ tạm ngưng`
                : `${disabledCount} tasks paused`
              : isVietnamese
              ? "Tất cả đang hoạt động"
              : "All tasks active"
          }
          onClick={() => handleToggle("disabled")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "disabled"
              ? sunkenClass
              : "hover:border-border"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "disabled" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("cron.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("cron.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Hạ tầng Scheduler */}
        <StatsCard
          title={t("cron.kpi.engine")}
          value="UTC+7"
          icon={Cpu}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={
            isVietnamese
              ? "Asia/Ho_Chi_Minh"
              : "Asia/Ho_Chi_Minh"
          }
          onClick={() => handleToggle("engine")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "engine" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "engine" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("cron.kpi.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("cron.kpi.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Expandable Detail Panel */}
      {activeStat && (
        <div className="pt-1 sm:pt-2 animate-in fade-in-50 slide-in-from-top-3 duration-300">
          <CronStatsDetailPanel
            activeStat={activeStat}
            jobs={jobs}
            canManage={canManage}
            blockedJobs={blockedJobs}
            onClose={() => handleToggle(activeStat)}
            onTrigger={(job) => onTrigger?.(job)}
            onToggle={(job) => onToggle?.(job)}
            onFilterChange={onFilterChange}
          />
        </div>
      )}
    </div>
  );
}
