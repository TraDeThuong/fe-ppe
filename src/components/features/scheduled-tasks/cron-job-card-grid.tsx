"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Clock,
  Eye,
  Pencil,
  Play,
  Power,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableError } from "@/components/ui/table";
import {
  calculateNextRun,
  getCronScheduleLabel,
  detectCronConflicts,
} from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import {
  CronLastRunBadge,
  getCronJobCategoryMeta,
  type CronJobListProps,
} from "./cron-job-presentation";

export type CronJobCardGridProps = CronJobListProps;

export function CronJobCardGrid({
  jobs,
  allJobs = jobs,
  recentExecutions = {},
  loading,
  fetching,
  error,
  filtered,
  canManage,
  blockedJobs,
  actionPending,
  onRetry,
  onTrigger,
  onToggle,
  onEdit,
  onViewDetail,
  onResetFilters,
}: CronJobCardGridProps) {
  const { t, locale } = useLocale();

  if (loading && jobs.length === 0) {
    return (
      <div
        aria-busy="true"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl border border-border/30 bg-surface-elevated/40"
          />
        ))}
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-surface/95 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10 dark:bg-card/95">
        <TableError onRetry={onRetry} />
      </div>
    );
  }

  if (!loading && jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/60 bg-surface/95 p-10 text-center shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10 dark:bg-card/95">
        <span
          aria-hidden="true"
          className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
        >
          <CalendarClock className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          {t(filtered ? "cron.noResults" : "cron.empty")}
        </p>
        {filtered && onResetFilters && (
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={onResetFilters}
              className="gap-1.5 rounded-xl text-xs font-semibold shadow-sm"
            >
              <RotateCcw className="size-3.5" />
              {t("cron.resetFilters")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Boolean(error) && (
        <div className="overflow-hidden rounded-2xl border border-danger/20 bg-surface/95">
          <TableError onRetry={onRetry} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => {
          const { Icon, categoryKey } = getCronJobCategoryMeta(job.name);
          const blocked = blockedJobs.has(job.name);
          const actionDisabled = fetching || actionPending || Boolean(error) || blocked;
          const conflict = detectCronConflicts(job.name, allJobs, t);
          const nextRun = calculateNextRun(job, new Date(), locale);
          const execution = recentExecutions[job.name];
          const jobTitle = t(`cron.jobs.${job.name}`);

          return (
            <div
              key={job.name}
              role={onViewDetail ? "button" : undefined}
              tabIndex={onViewDetail ? 0 : undefined}
              onClick={onViewDetail ? () => onViewDetail(job) : undefined}
              onKeyDown={
                onViewDetail
                  ? (event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onViewDetail(job);
                      }
                    }
                  : undefined
              }
              className={[
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/60 bg-surface/95 p-4 sm:p-5",
                "shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]",
                "transition-all duration-300 dark:border-white/10 dark:bg-card/90",
                onViewDetail
                  ? "cursor-pointer hover:-translate-y-1 hover:border-primary/40 hover:shadow-[8px_14px_24px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  : "",
              ].join(" ")}
            >
              {/* Specular Rim Highlight */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent ${
                  job.isEnabled ? "via-primary/40" : "via-border/60"
                } to-transparent`}
              />

              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] transition-transform duration-200 group-hover:scale-105 dark:bg-primary/15 dark:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.35)]"
                    >
                      <Icon className="size-4" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {jobTitle}
                        </h4>
                        {onViewDetail && (
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-primary opacity-0 -translate-y-0.5 translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0"
                          />
                        )}
                      </div>
                      <p className="font-mono text-[11px] font-semibold text-primary truncate">
                        {job.name}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={job.isEnabled ? "success" : "outline"}
                    indicator="dot"
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                  >
                    {t(job.isEnabled ? "cron.enabled" : "cron.disabled")}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2.25rem]">
                  {job.description}
                </p>

                {blocked && (
                  <Badge variant="warning" size="sm">
                    {t("cron.refreshRequired")}
                  </Badge>
                )}

                {/* Schedule & Execution Metadata Panel */}
                <div className="space-y-2.5 rounded-xl border border-border/35 bg-surface-elevated/45 p-3 text-xs dark:border-white/5 dark:bg-background/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {t(categoryKey)}
                    </span>
                    <code className="font-mono text-[11px] font-semibold text-foreground rounded-md border border-border/40 bg-background/80 px-2 py-0.5">
                      {job.cron}
                    </code>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-medium text-foreground">
                      {getCronScheduleLabel(job, t)}
                    </span>
                    {conflict.hasConflict && (
                      <span
                        title={conflict.description}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                      >
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        <span>{t("cron.conflictBadge")}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 border-t border-border/30 pt-2 sm:grid-cols-2">
                    <div className="min-w-0 space-y-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {t("cron.table.nextRun")}
                      </span>
                      {nextRun.isPaused ? (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground"
                        >
                          {nextRun.formatted}
                        </Badge>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="truncate font-medium text-foreground">
                            {nextRun.formatted}
                          </div>
                          <div className="text-[11px] font-semibold text-primary">
                            {nextRun.relativeTime}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1 sm:text-right">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("cron.table.lastRun")}
                      </span>
                      <div className="sm:flex sm:justify-end">
                        <CronLastRunBadge execution={execution} t={t} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                onClick={(event) => event.stopPropagation()}
                className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-3 dark:border-white/5"
              >
                {onViewDetail ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewDetail(job)}
                    aria-label={`${t("cron.table.viewDetail")}: ${job.name}`}
                    className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                    <span>{t("cron.table.viewDetail")}</span>
                  </Button>
                ) : (
                  <span />
                )}

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={actionDisabled}
                      onClick={() => onEdit(job)}
                      aria-label={t("cron.edit.action") + ": " + jobTitle}
                      className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      <span>{t("cron.edit.action")}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actionDisabled}
                      onClick={() => onTrigger(job)}
                      aria-label={`${t("cron.runNow")}: ${job.name}`}
                      className="h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm"
                    >
                      <Play className="size-3.5 text-primary" aria-hidden="true" />
                      <span>{t("cron.runNow")}</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={actionDisabled}
                      onClick={() => onToggle(job)}
                      aria-label={`${t(
                        job.isEnabled ? "cron.disable" : "cron.enable"
                      )}: ${job.name}`}
                      className={`h-8 gap-1.5 rounded-xl px-2.5 text-xs font-semibold ${
                        job.isEnabled
                          ? "text-danger hover:bg-danger/10 hover:text-danger"
                          : "text-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <Power className="size-3.5" aria-hidden="true" />
                      <span>{t(job.isEnabled ? "cron.disable" : "cron.enable")}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

