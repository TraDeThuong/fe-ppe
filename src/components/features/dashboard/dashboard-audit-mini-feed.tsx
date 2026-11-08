"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowRight, CheckCircle2, XCircle, Sliders, ShieldCheck } from "lucide-react";
import { useAuditSummary } from "@/hooks/audit/use-audit-summary";
import { useAuditLogs } from "@/hooks/audit/use-audit-logs";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";

export interface DashboardAuditMiniFeedProps {
  className?: string;
}

export function DashboardAuditMiniFeed({ className = "" }: DashboardAuditMiniFeedProps) {
  const { t } = useLocale();
  const { data: summary, isLoading: isLoadingSummary } = useAuditSummary();
  const { data: logsData, isLoading: isLoadingLogs } = useAuditLogs({ limit: 4 });

  const logs = logsData?.items ?? [];
  const isLoading = isLoadingSummary || isLoadingLogs;

  const formatTime = (iso?: string) => {
    if (!iso) return "--";
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "--";
    }
  };

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border/40 bg-surface/90 p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background border border-border/40 text-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-none">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {t("dashboard.auditCard.title")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.auditCard.subtitle")}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-1 text-xs font-semibold text-foreground border border-border/40 dark:bg-white/[0.06] dark:border-white/[0.1]">
            {summary?.totalLogs ?? 0} {t("dashboard.auditCard.totalLogs").toLowerCase()}
          </span>
        </div>

        {/* Audit KPI stats pills */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/30 bg-background/50 p-2 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              {t("dashboard.auditCard.configChanges")}
            </p>
            <p className="mt-0.5 text-xs font-bold text-foreground font-mono">
              {summary?.configChangesCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border/30 bg-background/50 p-2 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              {t("dashboard.auditCard.incidentReviews")}
            </p>
            <p className="mt-0.5 text-xs font-bold text-foreground font-mono">
              {summary?.incidentReviewsCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border/30 bg-background/50 p-2 text-center dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              Thành công
            </p>
            <p className="mt-0.5 text-xs font-bold text-foreground font-mono">
              {summary?.successRate != null ? `${Math.round(summary.successRate)}%` : "--"}
            </p>
          </div>
        </div>

        {/* Recent logs list */}
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="space-y-2 py-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="size-2 rounded-full shrink-0" />
                    <Skeleton className="h-3.5 w-3/4 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-14 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
              Chưa có nhật ký hoạt động gần đây
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === "SUCCESS";
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-xs transition-colors hover:bg-background/80 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        isSuccess ? "bg-primary" : "bg-danger"
                      }`}
                    />
                    <span className="font-semibold text-foreground truncate">
                      {log.action}
                    </span>
                    <span className="text-muted-foreground truncate hidden sm:inline">
                      · {log.userName || log.userEmail || "Hệ thống"}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-end border-t border-border/40 pt-3 text-xs dark:border-white/[0.08]">
        <Link
          href="/audit-logs"
          className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline dark:text-primary-foreground"
        >
          <span>{t("dashboard.auditCard.viewAll")}</span>
          <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
