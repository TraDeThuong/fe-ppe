"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  History,
  Lock,
  Pencil,
  Play,
  Power,
  ShieldAlert,
  Timer,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Loader } from "@/components/ui/loader";
import { useCan } from "@/hooks/use-can";
import { useCronJobHistory } from "@/hooks/cron/use-cron-history";
import { ApiError } from "@/lib/axios";
import {
  calculateNextRun,
  CRON_TIMEZONE,
  detectCronConflicts,
  extractRecentCronExecutions,
  getCronScheduleLabel,
  mergeRecentExecutions,
} from "@/lib/cron";
import { useLocale } from "@/providers/locale-provider";
import type {
  CronJobItem,
  RecentExecutionState,
} from "@/types/cron.types";
import type { AuditLogItem } from "@/types/audit.types";

interface Props {
  job: CronJobItem;
  allJobs: CronJobItem[];
  recentExecution?: RecentExecutionState | null;
  canManage: boolean;
  blocked: boolean;
  onTrigger: (job: CronJobItem) => void;
  onToggle: (job: CronJobItem) => void;
  onEdit?: (job: CronJobItem) => void;
  onClose: () => void;
}

export function CronJobDetailModal({
  job,
  allJobs,
  recentExecution,
  canManage,
  blocked,
  onTrigger,
  onToggle,
  onEdit,
  onClose,
}: Props) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [activeTab, setActiveTab] = useState<"history" | "errors">("history");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const canReadAudit = useCan()("AUDIT_LOG_READ");
  const historyQuery = useCronJobHistory(job.name, canReadAudit);
  const auditForbidden = !canReadAudit ||
    (historyQuery.error instanceof ApiError && historyQuery.error.status === 403);
  const hasAuditData = !auditForbidden && historyQuery.isSuccess;
  const auditItems: AuditLogItem[] = hasAuditData ? historyQuery.data.items : [];
  const allowedRecentExecution = auditForbidden && recentExecution?.source === "audit"
    ? undefined
    : recentExecution;
  const lastExecution = mergeRecentExecutions(
    extractRecentCronExecutions(auditItems),
    allowedRecentExecution ? { [job.name]: allowedRecentExecution } : {},
    [job],
  )[job.name];
  const lastRunAt = lastExecution?.timestamp ?? job.lastRunAt ?? job.lastRun;
  const lastRun = lastRunAt ? new Date(lastRunAt) : null;

  const nextRun = useMemo(
    () => calculateNextRun(job, new Date(), locale),
    [job, locale]
  );

  const conflict = useMemo(
    () => detectCronConflicts(job.name, allJobs, t),
    [job.name, allJobs, t]
  );

  const failedItems = useMemo(
    () => auditItems.filter((item) => item.status === "FAILED" || Boolean(item.errorMessage)),
    [auditItems]
  );

  const displayedItems = activeTab === "history" ? auditItems : failedItems;

  const jobTitle = t(`cron.jobs.${job.name}`);

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("cron.detail.title")}
      description={jobTitle}
      icon={<Clock className="size-5 text-primary" />}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Cpu className="size-3.5 text-primary" />
            <span>{CRON_TIMEZONE} (UTC+7)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("cron.close")}
            </Button>

            {canManage && (
              <>
                {onEdit && (
                  <Button
                    variant="outline"
                    disabled={blocked}
                    onClick={() => {
                      onClose();
                      onEdit(job);
                    }}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Pencil className="size-3.5" />
                    {t("cron.edit.action")}
                  </Button>
                )}

                <Button
                  variant="outline"
                  disabled={blocked}
                  onClick={() => {
                    onClose();
                    onToggle(job);
                  }}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Power className="size-3.5" />
                  {t(job.isEnabled ? "cron.disable" : "cron.enable")}
                </Button>

                <Button
                  variant="primary"
                  disabled={blocked}
                  onClick={() => {
                    onClose();
                    onTrigger(job);
                  }}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Play className="size-3.5" />
                  {t("cron.runNow")}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Header Summary Card */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="text-base font-bold text-foreground">{jobTitle}</h4>
              <p className="font-mono text-xs text-primary font-medium mt-0.5">
                {job.name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={job.isEnabled ? "success" : "outline"} indicator="dot">
                {t(job.isEnabled ? "cron.enabled" : "cron.disabled")}
              </Badge>

              {lastExecution ? (
                <Badge
                  variant={lastExecution.success ? "success" : "danger"}
                  className="text-[11px]"
                >
                  {t(lastExecution.success ? "cron.detail.lastRunSuccess" : "cron.detail.lastRunFailed")}
                </Badge>
              ) : null}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {job.description}
          </p>

          {/* Conflict Alert Banner */}
          {conflict.hasConflict && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-0.5">
                <span className="font-semibold">{t("cron.conflictAlert")}:</span>
                <p>{conflict.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Cấu hình lịch */}
          <div className="rounded-xl border border-border/50 bg-surface/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Calendar className="size-4 text-primary" />
              {t("cron.detail.scheduleInfo")}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Biểu thức Cron:" : "Cron Expression:"}
                </span>
                <code className="rounded bg-muted/60 px-2 py-0.5 font-mono font-semibold text-foreground">
                  {job.cron}
                </code>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Mô tả lịch:" : "Schedule:"}
                </span>
                <span className="font-medium text-foreground text-right">
                  {getCronScheduleLabel(job, t)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">{t("cron.detail.timezone")}:</span>
                <span className="font-mono text-muted-foreground">{CRON_TIMEZONE}</span>
              </div>
            </div>
          </div>

          {/* Thời điểm thực thi */}
          <div className="rounded-xl border border-border/50 bg-surface/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Timer className="size-4 text-primary" />
              {t("cron.detail.timingInfo")}
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">{t("cron.table.nextRun")}:</span>
                <span className="font-semibold text-foreground text-right">
                  {nextRun.formatted}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Thời gian tới:" : "In:"}
                </span>
                <Badge variant={nextRun.isPaused ? "outline" : "primary"} size="sm">
                  {nextRun.relativeTime}
                </Badge>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">{t("cron.table.lastRun")}:</span>
                <span className="text-foreground text-right">
                  {lastRun && Number.isFinite(lastRun.getTime())
                    ? lastRun.toLocaleString(locale, { timeZone: CRON_TIMEZONE })
                    : "—"}
                  {lastExecution && lastExecution.durationMs > 0 ? ` (${lastExecution.durationMs}ms)` : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection: History vs Errors */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "history"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="size-3.5" />
                {t("cron.detail.historyTab")}
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {hasAuditData ? auditItems.length : "—"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("errors")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "errors"
                    ? "bg-danger text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldAlert className="size-3.5" />
                {t("cron.detail.errorsTab")}
                <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                  {hasAuditData ? failedItems.length : "—"}
                </span>
              </button>
            </div>

            {!auditForbidden && historyQuery.isFetching && (
              <span className="text-[11px] text-muted-foreground animate-pulse">
                {isVietnamese ? "Đang tải dữ liệu..." : "Loading logs..."}
              </span>
            )}
          </div>

          {/* History / Error Items List */}
          {auditForbidden ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-8 px-4 text-center text-muted-foreground">
              <Lock className="size-8 opacity-40 mb-2" />
              <p className="text-xs font-medium">{t("cron.detail.noAuditPermission")}</p>
            </div>
          ) : historyQuery.isLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader showLabel />
            </div>
          ) : historyQuery.isError ? (
            <p role="alert" className="rounded-xl border border-danger/30 p-4 text-center text-xs text-danger">
              {t("cron.detail.auditLoadError")}
            </p>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-8 text-center text-muted-foreground">
              {activeTab === "history" ? (
                <>
                  <History className="size-8 opacity-40 mb-2" />
                  <p className="text-xs">{t("cron.detail.noHistory")}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-8 text-emerald-500 opacity-60 mb-2" />
                  <p className="text-xs text-foreground font-medium">
                    {t("cron.detail.noErrors")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-border/30">
              {displayedItems.map((item) => {
                const isExpanded = expandedLogId === item.id;
                const isSuccess = item.status === "SUCCESS";
                const durationMs = item.details?.durationMs as number | undefined;

                return (
                  <div key={item.id} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {isSuccess ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 text-danger shrink-0" />
                        )}
                        <span className="font-semibold text-foreground">
                          {item.action}
                        </span>
                        {durationMs !== undefined && (
                          <Badge variant="outline" size="sm" className="text-[10px] py-0">
                            {durationMs}ms
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                        <span>
                          {new Date(item.createdAt).toLocaleString(locale, {
                            timeZone: CRON_TIMEZONE,
                          })}
                        </span>
                        {item.details && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : item.id)
                            }
                            className="text-primary hover:underline font-mono text-[10px]"
                          >
                            {isExpanded ? (isVietnamese ? "Ẩn" : "Hide") : "JSON"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pl-0 sm:pl-5.5">
                      <span>
                        {isVietnamese ? "Người thực hiện" : "Triggered by"}:{" "}
                        {item.userName || item.userEmail || (isVietnamese ? "Hệ thống" : "System")}
                      </span>
                      {item.ipAddress && <span>IP: {item.ipAddress}</span>}
                    </div>

                    {item.errorMessage && (
                      <p className="pl-5.5 text-xs text-danger font-mono bg-danger/5 p-1.5 rounded-lg border border-danger/20">
                        {item.errorMessage}
                      </p>
                    )}

                    {isExpanded && item.details && (
                      <pre className="mt-1 rounded-lg bg-muted/60 p-2 text-[10px] font-mono text-foreground overflow-x-auto">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

