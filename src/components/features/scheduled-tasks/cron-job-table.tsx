"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Play, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableContent, type TableFeatureSet } from "@/components/ui/table";
import { describeCronSchedule } from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type { CronJobItem, CronJobName } from "@/types/cron.types";

interface Props {
  jobs: CronJobItem[];
  loading: boolean;
  fetching: boolean;
  error: unknown;
  filtered: boolean;
  canManage: boolean;
  blockedJobs: ReadonlySet<CronJobName>;
  onRetry: () => void;
  onTrigger: (job: CronJobItem) => void;
  onToggle: (job: CronJobItem) => void;
}

export function CronJobTable({
  jobs,
  loading,
  fetching,
  error,
  filtered,
  canManage,
  blockedJobs,
  onRetry,
  onTrigger,
  onToggle,
}: Props) {
  const { t } = useLocale();

  const columns = useMemo<ColumnDef<TableFeatureSet, CronJobItem, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("cron.table.job"),
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="space-y-1 py-1.5 min-w-56 max-w-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground text-sm">
                  {t(`cron.jobs.${job.name}`)}
                </p>
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
          <code className="font-mono text-xs font-semibold text-foreground whitespace-nowrap rounded-md bg-muted/40 px-2 py-1">
            {row.original.cron}
          </code>
        ),
      },
      {
        id: "schedule",
        header: t("cron.table.schedule"),
        cell: ({ row }) => (
          <span className="text-xs sm:text-sm text-foreground whitespace-nowrap">
            {describeCronSchedule(row.original.cron, t)}
          </span>
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
            >
              {t(isEnabled ? "cron.enabled" : "cron.disabled")}
            </Badge>
          );
        },
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: t("cron.table.actions"),
              cell: ({ row }: { row: { original: CronJobItem } }) => {
                const job = row.original;
                const blocked = blockedJobs.has(job.name);
                const disabled = fetching || Boolean(error) || blocked;
                return (
                  <div className="flex min-w-52 flex-wrap items-center gap-2 py-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => onTrigger(job)}
                      aria-label={`${t("cron.runNow")}: ${job.name}`}
                      className="h-8 gap-1.5 rounded-xl text-xs font-semibold shadow-sm"
                    >
                      <Play className="size-3.5 text-primary" aria-hidden="true" />
                      {t("cron.runNow")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      onClick={() => onToggle(job)}
                      aria-label={`${t(
                        job.isEnabled ? "cron.disable" : "cron.enable"
                      )}: ${job.name}`}
                      className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
                    >
                      <Power className="size-3.5" aria-hidden="true" />
                      {t(job.isEnabled ? "cron.disable" : "cron.enable")}
                    </Button>
                    {blocked ? (
                      <p className="w-full text-xs font-medium text-warning mt-1">
                        {t("cron.refreshRequired")}
                      </p>
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [t, canManage, fetching, error, blockedJobs, onTrigger, onToggle]
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
    </div>
  );
}
