"use client";

import { useMemo } from "react";
import {
  Activity,
  CalendarClock,
  CirclePause,
  CirclePlay,
  Filter,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRON_SCHEDULE_FREQUENCIES, getCronJobSchedule } from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { CronJobItem, CronScheduleFilter } from "@/types/cron.types";

export type CronStatKey = "total" | "enabled" | "disabled";

export interface CronStatsDetailPanelProps {
  activeStat: CronStatKey;
  jobs: CronJobItem[];
  onClose: () => void;
  onFilterChange?: (filter: CronScheduleFilter) => void;
  className?: string;
}

export function CronStatsDetailPanel({
  activeStat,
  jobs,
  onClose,
  onFilterChange,
  className = "",
}: CronStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const enabledJobs = useMemo(() => jobs.filter((j) => j.isEnabled), [jobs]);
  const disabledJobs = useMemo(() => jobs.filter((j) => !j.isEnabled), [jobs]);

  // Thống kê tính theo nhóm job của thẻ KPI đang mở; danh sách job & thao tác
  // nằm ở bảng/lưới chính (bấm thẻ KPI sẽ lọc bảng chính theo trạng thái).
  const scopedJobs =
    activeStat === "enabled" ? enabledJobs : activeStat === "disabled" ? disabledJobs : jobs;
  const cleanupJobs = useMemo(
    () => scopedJobs.filter((j) => j.name.startsWith("cleanup-")),
    [scopedJobs]
  );
  const digestJobs = useMemo(
    () => scopedJobs.filter((j) => j.name.includes("digest") || j.name.includes("summary")),
    [scopedJobs]
  );

  const enabledRatio = jobs.length > 0 ? Math.round((enabledJobs.length / jobs.length) * 100) : 0;

  return (
    <div
      className={`group/panel relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/80 bg-surface/95 p-4 sm:p-6 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 dark:border-white/[0.07] dark:bg-card/95 animate-in fade-in slide-in-from-top-3 ${className}`}
    >
      {/* Ambient Radial Aura (Primary & Accent blend) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-tr from-accent/15 via-primary/5 to-transparent blur-3xl"
      />

      {/* Specular Metallic Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-24 top-[1.5px] h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      {/* Precision Corner Micro-Indicators */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 left-3 h-1 w-1 rounded-full bg-primary/40 shadow-[0_0_6px_hsl(var(--primary))]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 h-1 w-1 rounded-full bg-accent/40"
      />

      {/* HEADER TOOLBAR */}
      <div className="relative mb-5 flex items-center justify-between gap-3 pb-4">
        {/* Engraved Divider Line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/[0.08]"
        />

        <div className="flex items-center gap-3.5 min-w-0">
          {/* Extruded Neumorphic Medallion Icon */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-surface-elevated to-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:from-card dark:to-background">
            <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10" />
            <div className="relative text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.35)]">
              {activeStat === "total" && <CalendarClock className="h-5 w-5" />}
              {activeStat === "enabled" && <CirclePlay className="h-5 w-5" />}
              {activeStat === "disabled" && <CirclePause className="h-5 w-5 text-accent-foreground" />}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                {activeStat === "total" && t("cron.detail.allTitle")}
                {activeStat === "enabled" && t("cron.detail.enabledTitle")}
                {activeStat === "disabled" && t("cron.detail.disabledTitle")}
              </h3>

              {/* Inset Neumorphic Pill Counter */}
              <Badge
                variant="outline"
                size="sm"
                className="border-primary/20 bg-primary/[0.06] font-mono text-[11px] font-semibold tracking-wider text-primary px-2.5 py-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                {activeStat === "total" && `${jobs.length} ${isVietnamese ? "TÁC VỤ" : "JOBS"}`}
                {activeStat === "enabled" && `${enabledJobs.length} / ${jobs.length}`}
                {activeStat === "disabled" && `${disabledJobs.length} / ${jobs.length}`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5 hidden sm:block">
              {activeStat === "total" && t("cron.detail.allDesc")}
              {activeStat === "enabled" && t("cron.detail.enabledDesc")}
              {activeStat === "disabled" && t("cron.detail.disabledDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Tactile Close */}
        <div className="flex items-center gap-2 shrink-0">
          {activeStat === "enabled" && onFilterChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterChange("enabled")}
              className="h-8 gap-1.5 rounded-xl border-primary/25 bg-surface px-3 text-xs font-medium text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/50 hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Lọc đang bật" : "Filter Enabled"}</span>
            </Button>
          )}

          {activeStat === "disabled" && onFilterChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterChange("disabled")}
              className="h-8 gap-1.5 rounded-xl border-accent/40 bg-surface px-3 text-xs font-medium text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/40 hover:bg-accent/20 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            >
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Lọc đang tắt" : "Filter Disabled"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl border border-white/60 bg-surface text-muted-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/10 dark:bg-card"
            title={t("cron.close")}
            aria-label={t("cron.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BODY: THỐNG KÊ THEO NHÓM (tổng / đang bật / đã tắt)                   */}
      {/* ===================================================================== */}
      {activeStat === "disabled" && scopedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-background/50 p-7 text-center shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)] dark:border-white/[0.04]">
          <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="font-semibold text-foreground text-sm">
            {isVietnamese
              ? "Tất cả các tác vụ đang được bật tự động."
              : "All scheduled tasks are currently enabled."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isVietnamese
              ? "Hệ thống đang vận hành ở trạng thái tự động hóa tối đa."
              : "System is operating at full automation capacity."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recessed Telemetry Wells */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
            {[
              {
                label: t("cron.category.cleanup"),
                value: cleanupJobs.length,
                accent: true,
              },
              {
                label: t("cron.category.digest"),
                value: digestJobs.length,
                accent: false,
              },
              ...CRON_SCHEDULE_FREQUENCIES.map((frequency, index) => ({
                label: t("cron.edit.frequency." + frequency),
                value: scopedJobs.filter((job) => getCronJobSchedule(job)?.frequency === frequency).length,
                accent: index % 2 === 0,
              })),
            ].map((metric, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border border-black/[0.04] bg-background/60 p-3 sm:p-3.5 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/[0.04] dark:bg-background/40"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground truncate">
                    {metric.label}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      metric.accent
                        ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                        : "bg-accent"
                    }`}
                  />
                </div>
                <p className="mt-1.5 font-mono text-lg sm:text-xl font-bold tabular-nums tracking-tight text-foreground">
                  <AnimatedNumber value={metric.value} />
                </p>
              </div>
            ))}
          </div>

          {/* Tactile Gauge Bar (Enabled Ratio) */}
          <div className="rounded-2xl border border-black/[0.04] bg-background/50 px-3.5 py-2.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/[0.04]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                {isVietnamese ? "Mức độ sẵn sàng tự động hóa" : "Automation Readiness"}
              </span>
              <span className="font-mono font-bold text-primary">{enabledRatio}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] p-[2px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-700 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                style={{ width: `${enabledRatio}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
