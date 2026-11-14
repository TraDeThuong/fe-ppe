"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Clock,
  Eye,
  Play,
  Power,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableContent, type TableFeatureSet } from "@/components/ui/table";
import {
  calculateNextRun,
  describeCronSchedule,
  detectCronConflicts,
} from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type {
  CronJobItem,
  CronJobName,
  RecentExecutionState,
} from "@/types/cron.types";

interface Props {
  jobs: CronJobItem[];
  allJobs?: CronJobItem[];
  recentExecutions?: Record<string, RecentExecutionState>;
  loading: boolean;
  fetching: boolean;
  error: unknown;
  filtered: boolean;
  canManage: boolean;
  blockedJobs: ReadonlySet<CronJobName>;
  onRetry: () => void;
  onTrigger: (job: CronJobItem) => void;
  onToggle: (job: CronJobItem) => void;
  onViewDetail?: (job: CronJobItem) => void;
  onResetFilters?: () => void;
}

export function CronJobTable({
  jobs,
  allJobs = jobs,
  recentExecutions = {},
  loading,
  fetching,
  error,
  filtered,
  canManage,
  blockedJobs,
  onRetry,
  onTrigger,
  onToggle,
  onViewDetail,
  onResetFilters,
}: Props) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const columns = useMemo<ColumnDef<TableFeatureSet, CronJobItem, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("cron.table.job"),
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="space-y-1 py-1.5 min-w-48 max-w-xs sm:max-w-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewDetail?.(job)}
                  className="font-semibold text-foreground text-sm hover:text-primary transition-colors text-left"
                >
                  {t(`cron.jobs.${job.name}`)}
                </button>
              </div>
              <p className="font-mono text-xs text-primary font-medium">
                {job.name}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {job.description}
              </p>
            </div>
          );
        },
      },
      {
        id: "cron",
        accessorKey: "cron",
        header: t("cron.table.expression"),
        cell: ({ row }) => (
          <code className="font-mono text-xs font-semibold text-foreground whitespace-nowrap rounded-md bg-muted/50 px-2 py-1">
            {row.original.cron}
          </code>
        ),
      },
      {
        id: "schedule",
        header: t("cron.table.schedule"),
        cell: ({ row }) => {
          const job = row.original;
          const conflict = detectCronConflicts(job.name, allJobs, isVietnamese);
          return (
            <div className="space-y-1 py-1 whitespace-nowrap">
              <div className="text-xs sm:text-sm text-foreground font-medium">
                {describeCronSchedule(job.cron, t)}
              </div>
              {conflict.hasConflict && (
                <div
                  title={conflict.description}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle className="size-3" />
                  <span>{t("cron.conflictBadge")} (08:00 T2)</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "nextRun",
        header: t("cron.table.nextRun"),
        cell: ({ row }) => {
          const job = row.original;
          const calculation = calculateNextRun(
            job.cron,
            job.isEnabled,
            new Date(),
            locale
          );

          if (calculation.isPaused) {
            return (
              <Badge variant="outline" size="sm" className="text-muted-foreground">
                {calculation.formatted}
              </Badge>
            );
          }

          return (
            <div className="space-y-0.5 py-1 whitespace-nowrap text-xs">
              <div className="font-medium text-foreground">
                {calculation.formatted}
              </div>
              <div className="text-[11px] text-primary font-semibold">
                {calculation.relativeTime}
              </div>
            </div>
          );
        },
      },
      {
        id: "lastRun",
        header: t("cron.table.lastRun"),
        cell: ({ row }) => {
          const job = row.original;
          const execution = recentExecutions[job.name];

          if (execution) {
            return (
              <Badge
                variant={execution.success ? "success" : "danger"}
                indicator="dot"
                size="sm"
                className="whitespace-nowrap"
              >
                {t("cron.justRan")} ({execution.durationMs}ms)
              </Badge>
            );
          }

          return (
            <Badge variant="outline" size="sm" className="text-muted-foreground">
              {t("cron.ready")}
            </Badge>
          );
        },
      },
      {
        id: "isEnabled",
        accessorKey: "isEnabled",
        header: t("cron.table.status"),
        cell: ({ row }) => {
          const isEnabled = row.original.isEnabled;
          return (
            <Badge
              variant={isEnabled ? "success" : "outline"}
              indicator="dot"
            >
              {t(isEnabled ? "cron.enabled" : "cron.disabled")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("cron.table.actions"),
        cell: ({ row }: { row: { original: CronJobItem } }) => {
          const job = row.original;
          const blocked = blockedJobs.has(job.name);
          const disabled = fetching || Boolean(error) || blocked;

          return (
            <div className="flex min-w-56 flex-wrap items-center gap-1.5 py-1">
              {/* View Detail Button */}
              {onViewDetail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetail(job)}
                  aria-label={`${t("cron.table.viewDetail")}: ${job.name}`}
                  className="h-8 gap-1 rounded-xl text-xs font-semibold shadow-sm px-2"
                >
                  <Eye className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("cron.table.viewDetail")}</span>
                </Button>
              )}

              {canManage && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onTrigger(job)}
                    aria-label={`${t("cron.runNow")}: ${job.name}`}
                    className="h-8 gap-1 rounded-xl text-xs font-semibold shadow-sm px-2"
                  >
                    <Play className="size-3.5 text-primary" aria-hidden="true" />
                    <span>{t("cron.runNow")}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onToggle(job)}
                    aria-label={`${t(
                      job.isEnabled ? "cron.disable" : "cron.enable"
                    )}: ${job.name}`}
                    className="h-8 gap-1 rounded-xl text-xs font-semibold px-2"
                  >
                    <Power className="size-3.5" aria-hidden="true" />
                    <span>{t(job.isEnabled ? "cron.disable" : "cron.enable")}</span>
                  </Button>
                </>
              )}

              {blocked && (
                <p className="w-full text-xs font-medium text-warning mt-0.5">
                  {t("cron.refreshRequired")}
                </p>
              )}
            </div>
          );
        },
      },
    ],
    [
      t,
      locale,
      isVietnamese,
      allJobs,
      recentExecutions,
      canManage,
      fetching,
      error,
      blockedJobs,
      onTrigger,
      onToggle,
      onViewDetail,
    ]
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-surface/95 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10 dark:bg-card/95">
      {/* Specular Rim Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <Table<CronJobItem>
        data={jobs}
        columns={columns}
        getRowId={(job) => job.name}
        loading={loading}
        fetching={fetching}
        error={error}
        onRetry={onRetry}
        emptyMessage={t(filtered ? "cron.noResults" : "cron.empty")}
        features={{
          pagination: false,
          rowSelection: false,
          globalFilter: false,
          columnFilters: false,
          columnVisibility: false,
          sorting: false,
          editing: false,
        }}
      >
        <TableContent skeletonRows={5} />
      </Table>

      {!loading && jobs.length === 0 && filtered && onResetFilters && (
        <div className="flex justify-center pb-6 pt-2">
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
