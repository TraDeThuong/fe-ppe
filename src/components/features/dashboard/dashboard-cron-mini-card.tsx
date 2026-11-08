"use client";

import React from "react";
import Link from "next/link";
import { Clock, ArrowRight, Play, CheckCircle2, PauseCircle } from "lucide-react";
import { useCronJobs } from "@/hooks/cron/use-cron";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";

export interface DashboardCronMiniCardProps {
  className?: string;
  maxDisplay?: number;
}

export function DashboardCronMiniCard({
  className = "",
  maxDisplay = 4,
}: DashboardCronMiniCardProps) {
  const { t } = useLocale();
  const { data: jobs, isLoading, isError, refetch } = useCronJobs(true);

  const jobList = jobs ?? [];
  const displayJobs = jobList.slice(0, maxDisplay);
  const enabledCount = jobList.filter((j) => j.isEnabled).length;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border/40 bg-surface/90 p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background border border-border/40 text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-none">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t("dashboard.cronCard.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.cronCard.subtitle")}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground border border-border/40 dark:bg-white/[0.06] dark:border-white/[0.1]">
            {enabledCount}/{jobList.length} đang bật
          </span>
        </div>

        {/* Jobs list */}
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 p-2.5"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="size-2 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-1/2 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <p>{t("dashboard.data.error")}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-xs font-semibold text-primary underline"
              >
                {t("dashboard.data.retry")}
              </button>
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
              {t("dashboard.kpi.noData")}
            </div>
          ) : (
            displayJobs.map((job) => (
              <div
                key={job.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-xs transition-colors hover:bg-background/80 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      job.isEnabled ? "bg-primary" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {job.name}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {job.cron}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    job.isEnabled
                      ? "border-border/50 bg-muted/60 text-foreground dark:bg-white/[0.06] dark:border-white/[0.1]"
                      : "border-border/40 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {job.isEnabled ? "Đang chạy" : "Tạm dừng"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-end border-t border-border/40 pt-3 text-xs dark:border-white/[0.08]">
        <Link
          href="/scheduled-tasks"
          className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-primary-foreground"
        >
          <span>{t("dashboard.cronCard.viewAll")}</span>
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
