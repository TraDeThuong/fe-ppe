"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowRight, ShieldOff } from "lucide-react";
import { useAuditSummary } from "@/hooks/audit/use-audit-summary";
import { useLocale } from "@/providers/locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditSummaryDto } from "@/types";

export interface DashboardAuditMiniFeedProps {
  className?: string;
  enabled?: boolean;
  maxDisplay?: number;
  summaryOverride?: AuditSummaryDto;
}

function formatSuccessRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "--";
  return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`;
}

export function DashboardAuditMiniFeed({
  className = "",
  enabled = true,
  maxDisplay = 4,
  summaryOverride,
}: DashboardAuditMiniFeedProps) {
  const { t, locale } = useLocale();
  const shouldQuery = enabled && !summaryOverride;
  const {
    data: queriedSummary,
    isLoading: queryLoading,
    isError: queryError,
    refetch,
  } = useAuditSummary(undefined, { enabled: shouldQuery });

  const summary = summaryOverride ?? queriedSummary;
  const isLoading = shouldQuery && queryLoading;
  const isError = shouldQuery && queryError;
  const logs = (summary?.recentActivity ?? []).slice(0, maxDisplay);

  const formatDateTime = (iso?: string) => {
    if (!iso) return "--";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(locale === "vi-VN" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className={[
        "relative flex flex-col justify-between overflow-hidden transition-all duration-300",
        // Khung vỏ ngoài Pure Neumorphism: Tăng padding cho thoáng hơn
        "rounded-[26px] sm:rounded-[30px] p-5 sm:p-6",
        "bg-background",
        "shadow-[12px_12px_28px_var(--shadow-dark),-12px_-12px_28px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      <div className="relative space-y-4 sm:space-y-5">
        {/* Header: Thoáng rộng với khoảng cách giữa icon, tiêu đề và nút điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            {/* Icon Box 2 tầng */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
              <div className="flex size-8 items-center justify-center rounded-[10px] bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <FileText className="size-4.5" strokeWidth={2.3} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-black tracking-tight text-foreground sm:text-[17px]">
                {t("dashboard.auditCard.title")}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t("dashboard.auditCard.subtitle")}
              </p>
            </div>
          </div>

          {/* Cụm Huy hiệu khắc chìm & Phím điều hướng nổi */}
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 font-mono text-xs font-extrabold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
              <span className="text-primary">
                {enabled ? (summary?.totalLogs ?? 0) : "--"}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {t("dashboard.auditCard.totalLogs").toLowerCase()}
              </span>
            </span>

            {enabled && (
              <Link
                href="/audit-logs"
                className="group inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1.5 text-xs font-bold text-primary shadow-[3.5px_3.5px_8px_var(--shadow-dark),-3.5px_-3.5px_8px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] active:translate-y-0 active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                <span>{t("dashboard.auditCard.viewAll")}</span>
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={2.4}
                />
              </Link>
            )}
          </div>
        </div>

        {/* Audit KPI Stats: 3 Khối nổi độc lập rộng rãi, cân đối */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] bg-background px-3.5 py-3 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.auditCard.configChanges")}
            </p>
            <p className="mt-1 font-mono text-base font-black text-foreground sm:text-lg">
              {enabled ? (summary?.configChangesCount ?? 0) : "--"}
            </p>
          </div>

          <div className="rounded-[16px] bg-background px-3.5 py-3 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.auditCard.incidentReviews")}
            </p>
            <p className="mt-1 font-mono text-base font-black text-foreground sm:text-lg">
              {enabled ? (summary?.incidentReviewsCount ?? 0) : "--"}
            </p>
          </div>

          <div className="rounded-[16px] bg-background px-3.5 py-3 text-center shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("dashboard.auditCard.successRate")}
            </p>
            <p className="mt-1 font-mono text-base font-black text-primary sm:text-lg">
              {enabled ? formatSuccessRate(summary?.successRate) : "--"}
            </p>
          </div>
        </div>

        {/* Khay lõm chứa danh sách nhật ký gần đây: Lòng khay rộng và thoáng */}
        <div className="rounded-[20px] bg-background p-3 sm:p-3.5 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
          {!enabled ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2.5 text-xs text-muted-foreground">
              <div className="flex size-10 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]">
                <ShieldOff className="size-4.5" />
              </div>
              <p className="font-medium">{t("dashboard.auditCard.noPermission")}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-[14px] bg-background px-3.5 py-3 shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                >
                  <div className="flex flex-1 items-center gap-2.5">
                    <Skeleton className="size-2 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-3/4 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-16 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2.5 text-xs text-muted-foreground">
              <p className="font-medium">{t("dashboard.data.error")}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-full bg-background px-4 py-1.5 text-xs font-bold text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                {t("dashboard.data.retry")}
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs font-medium text-muted-foreground">
              {t("dashboard.auditCard.empty")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const isSuccess = log.status !== "FAILED";
                return (
                  /* Từng dòng nhật ký: Tăng độ cao và khoảng cách thoáng hơn */
                  <div
                    key={log.id}
                    title={log.errorMessage ?? undefined}
                    className="group flex items-center justify-between gap-3.5 rounded-[14px] bg-background px-3.5 py-2.5 text-xs shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[4.5px_4.5px_9px_var(--shadow-dark),-4.5px_-4.5px_9px_var(--shadow-light)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Đèn LED trạng thái */}
                      <span
                        aria-label={log.status}
                        className={`size-2 shrink-0 rounded-full ${isSuccess
                            ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.65)]"
                            : "bg-danger shadow-[0_0_6px_hsl(var(--danger)/0.65)]"
                          }`}
                      />
                      <span className="truncate font-bold text-foreground transition-colors group-hover:text-primary">
                        {log.action}
                      </span>
                      <span className="hidden truncate text-[11px] font-medium text-muted-foreground sm:inline">
                        ·{" "}
                        {log.userName ||
                          log.userEmail ||
                          t("dashboard.auditCard.systemActor")}
                      </span>
                    </div>

                    {/* Tem thời gian khắc chìm mini */}
                    <span className="shrink-0 rounded-lg bg-background px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
