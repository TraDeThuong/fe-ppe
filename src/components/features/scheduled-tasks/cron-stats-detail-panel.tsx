"use client";

import { useMemo } from "react";
import {
  CalendarClock,
  CirclePause,
  CirclePlay,
  Cpu,
  Info,
  Play,
  Power,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRON_TIMEZONE, describeCronSchedule } from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem, CronJobName, CronScheduleFilter } from "@/types/cron.types";

export type CronStatKey = "total" | "enabled" | "disabled" | "engine";

export interface CronStatsDetailPanelProps {
  activeStat: CronStatKey;
  jobs: CronJobItem[];
  canManage: boolean;
  blockedJobs: ReadonlySet<CronJobName>;
  onClose: () => void;
  onTrigger: (job: CronJobItem) => void;
  onToggle: (job: CronJobItem) => void;
  onFilterChange?: (filter: CronScheduleFilter) => void;
  className?: string;
}

export function CronStatsDetailPanel({
  activeStat,
  jobs,
  canManage,
  blockedJobs,
  onClose,
  onTrigger,
  onToggle,
  onFilterChange,
  className = "",
}: CronStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const enabledJobs = useMemo(() => jobs.filter((j) => j.isEnabled), [jobs]);
  const disabledJobs = useMemo(() => jobs.filter((j) => !j.isEnabled), [jobs]);

  const cleanupJobs = useMemo(
    () => jobs.filter((j) => j.name.startsWith("cleanup-")),
    [jobs]
  );
  const digestJobs = useMemo(
    () => jobs.filter((j) => j.name.includes("digest") || j.name.includes("summary")),
    [jobs]
  );

  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-black/60 dark:bg-card/95 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      {/* Specular Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 dark:border-black/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {activeStat === "total" && <CalendarClock className="h-4 w-4" />}
            {activeStat === "enabled" && <CirclePlay className="h-4 w-4" />}
            {activeStat === "disabled" && <CirclePause className="h-4 w-4" />}
            {activeStat === "engine" && <Cpu className="h-4 w-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "total" && t("cron.detail.allTitle")}
                {activeStat === "enabled" && t("cron.detail.enabledTitle")}
                {activeStat === "disabled" && t("cron.detail.disabledTitle")}
                {activeStat === "engine" && t("cron.detail.engineTitle")}
              </h3>

              <Badge
                variant="outline"
                size="sm"
                className="font-mono text-[10px] sm:text-[11px] text-foreground px-2 py-0.2"
              >
                {activeStat === "total" && `${jobs.length} ${isVietnamese ? "tác vụ" : "jobs"}`}
                {activeStat === "enabled" && `${enabledJobs.length}/${jobs.length}`}
                {activeStat === "disabled" && `${disabledJobs.length}/${jobs.length}`}
                {activeStat === "engine" && "Node-cron v3"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              {activeStat === "total" && t("cron.detail.allDesc")}
              {activeStat === "enabled" && t("cron.detail.enabledDesc")}
              {activeStat === "disabled" && t("cron.detail.disabledDesc")}
              {activeStat === "engine" && t("cron.detail.engineDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "enabled" && onFilterChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterChange("enabled")}
              className="h-7 text-[11px] px-2 rounded-lg"
            >
              <span>{isVietnamese ? "Lọc đang bật" : "Filter Enabled"}</span>
            </Button>
          )}

          {activeStat === "disabled" && onFilterChange && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onFilterChange("disabled")}
              className="h-7 text-[11px] px-2 rounded-lg"
            >
              <span>{isVietnamese ? "Lọc đang tắt" : "Filter Disabled"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title={t("cron.close")}
            aria-label={t("cron.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body: TOTAL JOBS */}
      {activeStat === "total" && (
        <div className="space-y-3">
          {/* Quick Metrics Bar - Monochromatic/Neutral */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {t("cron.category.cleanup")}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-foreground mt-0.5">
                {cleanupJobs.length}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {t("cron.category.digest")}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-foreground mt-0.5">
                {digestJobs.length}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Lịch hằng ngày" : "Daily Frequency"}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-foreground mt-0.5">
                {jobs.filter((j) => !j.cron.endsWith("1")).length}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Lịch hàng tuần" : "Weekly Frequency"}
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-foreground mt-0.5">
                {jobs.filter((j) => j.cron.endsWith("1")).length}
              </p>
            </div>
          </div>

          {/* Jobs Breakdown Grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {jobs.map((job) => {
              const blocked = blockedJobs.has(job.name);
              return (
                <div
                  key={job.name}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-border/30 bg-background/50 p-2.5 sm:p-3 dark:border-black/50 dark:bg-card/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {t(`cron.jobs.${job.name}`)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <code className="font-mono text-[10px] bg-muted/60 px-1 rounded">
                        {job.cron}
                      </code>
                      <span className="truncate">
                        {describeCronSchedule(job.cron, t)}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={blocked}
                      onClick={() => onTrigger(job)}
                      className="h-7 text-[11px] px-2 rounded-lg shrink-0 gap-1"
                      aria-label={`${t("cron.runNow")}: ${job.name}`}
                    >
                      <Play className="h-3 w-3" />
                      <span>{t("cron.runNow")}</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body: ENABLED JOBS */}
      {activeStat === "enabled" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {enabledJobs.map((job) => {
              const blocked = blockedJobs.has(job.name);
              return (
                <div
                  key={job.name}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-border/30 bg-background/50 p-2.5 sm:p-3 dark:border-black/50 dark:bg-card/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {t(`cron.jobs.${job.name}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {describeCronSchedule(job.cron, t)}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={blocked}
                        onClick={() => onTrigger(job)}
                        className="h-7 text-[11px] px-2 rounded-lg gap-1"
                        aria-label={`${t("cron.runNow")}: ${job.name}`}
                      >
                        <Play className="h-3 w-3" />
                        <span>{t("cron.runNow")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={blocked}
                        onClick={() => onToggle(job)}
                        className="h-7 text-[11px] px-2 rounded-lg text-muted-foreground hover:text-foreground gap-1"
                        aria-label={`${t("cron.disable")}: ${job.name}`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{t("cron.disable")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body: DISABLED JOBS */}
      {activeStat === "disabled" && (
        <div className="space-y-3">
          {disabledJobs.length === 0 ? (
            <div className="rounded-xl border border-border/30 bg-background/50 p-5 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">
                {isVietnamese
                  ? "Tất cả các tác vụ đang được bật tự động."
                  : "All scheduled tasks are currently enabled."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {disabledJobs.map((job) => {
                const blocked = blockedJobs.has(job.name);
                return (
                  <div
                    key={job.name}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-border/30 bg-background/50 p-2.5 sm:p-3 dark:border-black/50 dark:bg-card/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {t(`cron.jobs.${job.name}`)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {describeCronSchedule(job.cron, t)}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={blocked}
                          onClick={() => onTrigger(job)}
                          className="h-7 text-[11px] px-2 rounded-lg gap-1"
                          aria-label={`${t("cron.runNow")}: ${job.name}`}
                        >
                          <Play className="h-3 w-3" />
                          <span>{t("cron.runNow")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={blocked}
                          onClick={() => onToggle(job)}
                          className="h-7 text-[11px] px-2 rounded-lg gap-1"
                          aria-label={`${t("cron.enable")}: ${job.name}`}
                        >
                          <Power className="h-3 w-3" />
                          <span>{t("cron.enable")}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Body: ENGINE & ARCHITECTURE */}
      {activeStat === "engine" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Múi giờ hệ thống" : "System Timezone"}
              </span>
              <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                {CRON_TIMEZONE}
              </p>
              <p className="text-[10px] text-muted-foreground">UTC+7</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Engine định thời" : "Scheduler Engine"}
              </span>
              <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                NestJS Tasks
              </p>
              <p className="text-[10px] text-muted-foreground">node-cron v3</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Cơ chế an toàn" : "Concurrency Safe"}
              </span>
              <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                Idempotent Lock
              </p>
              <p className="text-[10px] text-muted-foreground">Mutex guarded</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5">
              <span className="text-[10px] sm:text-xs text-muted-foreground block font-medium">
                {isVietnamese ? "Trạng thái runtime" : "Runtime State"}
              </span>
              <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                In-Memory
              </p>
              <p className="text-[10px] text-muted-foreground">Volatile switch</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-background/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="text-foreground font-semibold">
              {isVietnamese
                ? "Chính sách an toàn dữ liệu"
                : "Data Safety Policy"}
            </p>
            <p className="text-[11px] leading-relaxed">
              {isVietnamese
                ? "Các tác vụ dọn dẹp hệ thống tuân thủ giới hạn lưu trữ dữ liệu và kiểm tra toàn vẹn trước khi loại bỏ bản ghi."
                : "All system cleanup tasks enforce retention periods and verify referential constraints before purging records."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
