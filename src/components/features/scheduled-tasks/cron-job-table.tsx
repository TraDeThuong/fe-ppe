"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  Eye,
  Play,
  Power,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableContent,
  TableRowActions,
  type TableFeatureSet,
  type TableRowAction,
} from "@/components/ui/table";
import {
  calculateNextRun,
  describeCronSchedule,
  detectCronConflicts,
} from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem } from "@/types/cron.types";
import {
  CronLastRunBadge,
  getCronJobCategoryMeta,
  type CronJobListProps,
} from "./cron-job-presentation";

export type CronJobTableProps = CronJobListProps;

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
}: CronJobTableProps) {
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
          const { Icon } = getCronJobCategoryMeta(job.name);
          const blocked = blockedJobs.has(job.name);

          return (
            <div className="flex items-start gap-3 py-1 min-w-56 max-w-sm">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] dark:bg-primary/15 dark:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.35)]"
              >
                <Icon className="size-4" />
              </span>

              <div className="min-w-0 space-y-1">
                <button
                  type="button"
                  onClick={() => onViewDetail?.(job)}
                  className="font-semibold text-foreground text-sm hover:text-primary transition-colors text-left leading-snug"
                >
                  {t(`cron.jobs.${job.name}`)}
                </button>
                <p className="font-mono text-[11px] text-primary font-medium truncate">
                  {job.name}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
                {blocked && (
                  <Badge variant="warning" size="sm" className="mt-1">
                    {t("cron.refreshRequired")}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "cron",
        accessorKey: "cron",
        header: t("cron.table.expression"),
        cell: ({ row }) => (
          <code className="inline-block font-mono text-xs font-semibold text-foreground whitespace-nowrap rounded-lg border border-border/40 bg-muted/50 px-2.5 py-1">
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
                  <AlertTriangle className="size-3" aria-hidden="true" />
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
              <Badge variant="outline" size="sm" className="text-muted-foreground whitespace-nowrap">
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
        cell: ({ row }) => (
          <CronLastRunBadge
            execution={recentExecutions[row.original.name]}
            t={t}
          />
        ),
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
              className="whitespace-nowrap"
            >
              {t(isEnabled ? "cron.enabled" : "cron.disabled")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("cron.table.actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          const isActionDisabled = (item: CronJobItem) =>
            fetching || Boolean(error) || blockedJobs.has(item.name);

          const actions: TableRowAction<CronJobItem>[] = [
            {
              id: "view-detail",
              label: t("cron.table.viewDetail"),
              icon: <Eye className="size-3.5" aria-hidden="true" />,
              hidden: !onViewDetail,
              onClick: (item) => onViewDetail?.(item),
            },
            {
              id: "run-now",
              label: t("cron.runNow"),
              icon: <Play className="size-3.5" aria-hidden="true" />,
              variant: "primary",
              hidden: !canManage,
              disabled: isActionDisabled,
              onClick: (item) => onTrigger(item),
            },
            {
              id: "toggle-schedule",
              label: t(job.isEnabled ? "cron.disable" : "cron.enable"),
              icon: <Power className="size-3.5" aria-hidden="true" />,
              variant: job.isEnabled ? "danger" : "outline",
              hidden: !canManage,
              disabled: isActionDisabled,
              onClick: (item) => onToggle(item),
            },
          ];

          return (
            <div className="flex justify-end">
              <TableRowActions
                row={row}
                actions={actions}
                label={`${t("cron.table.actions")}: ${job.name}`}
              />
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
        onRowClick={onViewDetail ? (row) => onViewDetail(row.original) : undefined}
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
