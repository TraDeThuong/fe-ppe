"use client";

import React, { useContext, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  Play,
  Power,
  RefreshCw,
  Sparkles,
  Timer,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { CronJobDetailModal } from "@/components/features/scheduled-tasks/cron-job-detail-modal";
import { CronJobDialog } from "@/components/features/scheduled-tasks/cron-job-dialog";
import { getCronJobCategoryMeta } from "@/components/features/scheduled-tasks/cron-job-presentation";
import { CronToggleConfirmDialog } from "@/components/features/scheduled-tasks/cron-toggle-confirm-dialog";
import { AnimatedMetricValue, AnimatedNumber } from "@/components/ui/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthContext } from "@/contexts/AuthContext";
import { useCronJobs, useCronMutations } from "@/hooks/cron/use-cron";
import { useCronRecentExecutions } from "@/hooks/cron/use-cron-history";
import { useRefreshFeedback } from "@/hooks/use-refresh-feedback";
import { ApiError } from "@/lib/axios";
import {
  assessCronJobGuidance,
  calculateNextRun,
  canReadCron,
  CRON_TIMEZONE,
  getCronScheduleLabel,
  detectCronConflicts,
  extractRecentCronExecutions,
  findNextScheduledJob,
  formatCronOutcomeSummary,
  formatCronRelativeAgo,
  mergeRecentExecutions,
} from "@/lib/cron";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogItem } from "@/types/audit.types";
import type {
  CronJobExecutionResult,
  CronJobItem,
  CronJobName,
  RecentExecutionState,
  TriggerCronJobPayload,
} from "@/types/cron.types";

export interface DashboardCronMiniCardProps {
  className?: string;
  maxDisplay?: number;
  jobsOverride?: CronJobItem[];
  auditItemsOverride?: AuditLogItem[];
  canReadOverride?: boolean;
  canManageOverride?: boolean;
}

const KNOWN_JOB_NAMES = new Set<string>([
  "cleanup-audit-logs",
  "cleanup-unconfirmed-uploads",
  "cleanup-expired-tokens",
  "daily-summary-digest",
  "weekly-summary-digest",
]);

function formatExecutionClock(timestamp: string, locale: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: CRON_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return "—";
  }
}

export function DashboardCronMiniCard({
  className = "",
  maxDisplay = 5,
  jobsOverride,
  auditItemsOverride,
  canReadOverride,
  canManageOverride,
}: DashboardCronMiniCardProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const authCtx = useContext(AuthContext);
  const permissions = authCtx?.user?.permissions ?? [];

  const canRead =
    canReadOverride ??
    (jobsOverride !== undefined
      ? true
      : authCtx
        ? canReadCron(authCtx.status, permissions)
        : false);

  const canManage =
    canManageOverride ??
    (canRead && permissions.includes("CRON_JOB_MANAGE"));

  const canReadAudit =
    auditItemsOverride === undefined &&
    canRead &&
    permissions.includes("AUDIT_LOG_READ");

  const jobsQuery = useCronJobs(jobsOverride === undefined && canRead);
  const auditQuery = useCronRecentExecutions(canReadAudit);
  const { trigger, toggle } = useCronMutations();

  const [sessionExecutions, setSessionExecutions] = useState<
    Record<string, RecentExecutionState>
  >({});
  const [detailJob, setDetailJob] = useState<CronJobItem | null>(null);
  const [triggerJob, setTriggerJob] = useState<CronJobItem | null>(null);
  const [toggleJob, setToggleJob] = useState<CronJobItem | null>(null);
  const [triggerResult, setTriggerResult] =
    useState<CronJobExecutionResult | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [blockedJobs, setBlockedJobs] = useState<ReadonlySet<CronJobName>>(
    new Set(),
  );
  const submitting = useRef(false);

  const jobList = jobsOverride ?? jobsQuery.data ?? [];
  const isLoading = jobsOverride === undefined && canRead && jobsQuery.isLoading;
  const isFetching = jobsOverride === undefined && canRead && jobsQuery.isFetching;
  const isError = jobsOverride === undefined && canRead && jobsQuery.isError;
  const pending = trigger.isPending || toggle.isPending;

  const displayJobs = useMemo(
    () => jobList.slice(0, maxDisplay),
    [jobList, maxDisplay],
  );
  const remainingCount = Math.max(0, jobList.length - displayJobs.length);
  const enabledCount = useMemo(
    () => jobList.filter((j) => j.isEnabled).length,
    [jobList],
  );

  const recentExecutions = useMemo(() => {
    const auditItems = auditItemsOverride ?? auditQuery.data?.items ?? [];
    const fromAudit = extractRecentCronExecutions(auditItems);
    return mergeRecentExecutions(fromAudit, sessionExecutions);
  }, [auditItemsOverride, auditQuery.data?.items, sessionExecutions]);

  const auditAvailable =
    auditItemsOverride !== undefined ||
    (canReadAudit && !auditQuery.isLoading && !auditQuery.isError);

  const jobGuidanceMap = useMemo(() => {
    const now = new Date();
    const map = new Map<
      CronJobName,
      ReturnType<typeof assessCronJobGuidance>
    >();
    for (const job of jobList) {
      map.set(
        job.name,
        assessCronJobGuidance(job, recentExecutions[job.name], {
          auditAvailable,
          now,
        }),
      );
    }
    return map;
  }, [jobList, recentExecutions, auditAvailable]);

  const needRunJobs = useMemo(() => {
    return jobList
      .map((job) => ({
        job,
        guidance: jobGuidanceMap.get(job.name)!,
      }))
      .filter((entry) => entry.guidance?.shouldClickRun)
      .sort((a, b) => a.guidance.priorityRank - b.guidance.priorityRank);
  }, [jobList, jobGuidanceMap]);

  const primaryActionEntry = needRunJobs[0] ?? null;

  const earliestNext = useMemo(
    () => findNextScheduledJob(jobList, new Date(), locale),
    [jobList, locale],
  );

  const latestExecutionEntry = useMemo(() => {
    let latest: { jobName: CronJobName; exec: RecentExecutionState } | null =
      null;
    for (const job of jobList) {
      const exec = recentExecutions[job.name];
      if (!exec) continue;
      if (
        !latest ||
        new Date(exec.timestamp).getTime() >
        new Date(latest.exec.timestamp).getTime()
      ) {
        latest = { jobName: job.name, exec };
      }
    }
    return latest;
  }, [jobList, recentExecutions]);

  const handleRefresh = async () => {
    if (!canRead || jobsOverride !== undefined || submitting.current) return;
    const tasks: Promise<unknown>[] = [jobsQuery.refetch()];
    if (canReadAudit) tasks.push(auditQuery.refetch());
    const [jobsRes] = await Promise.all(tasks);
    if ((jobsRes as { isSuccess?: boolean })?.isSuccess) {
      setBlockedJobs(new Set());
      setTriggerError(null);
    }
  };

  const {
    isSpinning: isRefreshingCron,
    isSuccess: isCronRefreshed,
    lastSyncedLabel: cronSyncedLabel,
    trigger: triggerCronRefresh,
  } = useRefreshFeedback({
    onRefresh: handleRefresh,
    isRefreshing: isFetching,
    hasError: isError,
  });

  const openTriggerDialog = (job: CronJobItem) => {
    if (
      !canManage ||
      isFetching ||
      isError ||
      blockedJobs.has(job.name) ||
      submitting.current
    ) {
      return;
    }
    setTriggerResult(null);
    setTriggerError(null);
    setTriggerJob(job);
  };

  const openToggleDialog = (job: CronJobItem) => {
    if (
      !canManage ||
      isFetching ||
      isError ||
      blockedJobs.has(job.name) ||
      submitting.current
    ) {
      return;
    }
    setToggleJob(job);
  };

  const confirmTrigger = async (payload: TriggerCronJobPayload) => {
    if (
      !triggerJob ||
      !canManage ||
      submitting.current ||
      blockedJobs.has(triggerJob.name)
    ) {
      return;
    }
    if (isError || isFetching) {
      setTriggerError(t("cron.refreshBeforeAction"));
      return;
    }
    submitting.current = true;
    setTriggerError(null);
    try {
      const response = await trigger.mutateAsync({
        jobName: triggerJob.name,
        payload,
      });
      setTriggerResult(response);
      setSessionExecutions((prev) => ({
        ...prev,
        [triggerJob.name]: {
          timestamp: new Date().toISOString(),
          success: response.success,
          durationMs: response.durationMs,
          data: response.data,
          error: response.error,
          triggerType: "MANUAL",
          fromAuditLog: false,
        },
      }));
      toast.success(
        t("cron.toast.triggerSuccess", {
          name: KNOWN_JOB_NAMES.has(triggerJob.name)
            ? t(`cron.jobs.${triggerJob.name}`)
            : triggerJob.name,
          duration: response.durationMs,
        }),
      );
    } catch (cause: unknown) {
      const uncertain =
        !(cause instanceof ApiError) ||
        cause.status === 0 ||
        cause.status >= 500 ||
        cause.status === 408;
      if (uncertain) {
        setBlockedJobs((previous) => new Set(previous).add(triggerJob.name));
        setTriggerError(t("cron.unknownOutcome"));
      } else {
        setTriggerError(cause.message);
      }
    } finally {
      submitting.current = false;
    }
  };

  const confirmToggle = async () => {
    if (
      !toggleJob ||
      !canManage ||
      submitting.current ||
      blockedJobs.has(toggleJob.name)
    ) {
      return;
    }
    if (isError || isFetching) {
      toast.error(t("cron.refreshBeforeAction"));
      return;
    }
    submitting.current = true;
    try {
      const response = await toggle.mutateAsync(toggleJob.name);
      toast.success(
        t(response.isEnabled ? "cron.toast.enabled" : "cron.toast.disabled"),
      );
      setToggleJob(null);
    } catch (cause: unknown) {
      const uncertain =
        !(cause instanceof ApiError) ||
        cause.status === 0 ||
        cause.status >= 500 ||
        cause.status === 408;
      if (uncertain) {
        setBlockedJobs((previous) => new Set(previous).add(toggleJob.name));
        toast.error(t("cron.unknownOutcome"));
      } else {
        toast.error(
          cause.message || t("cron.toast.triggerFailed", { error: "Unknown" }),
        );
      }
    } finally {
      submitting.current = false;
    }
  };

  const getJobTitle = (jobName: CronJobName) =>
    KNOWN_JOB_NAMES.has(jobName) ? t(`cron.jobs.${jobName}`) : jobName;

  const getJobSummary = (job: CronJobItem) => {
    if (KNOWN_JOB_NAMES.has(job.name)) {
      const localized = t(`dashboard.cronCard.jobSummary.${job.name}`);
      if (localized && !localized.startsWith("dashboard.cronCard.jobSummary.")) {
        return localized;
      }
    }
    return job.description;
  };

  return (
    <section
      aria-label={t("dashboard.cronCard.title")}
      className={`flex flex-col justify-between rounded-[28px] bg-background p-5 sm:p-6 transition-all duration-300 ${NM.chassis} ${className}`}
    >
      <div className="space-y-5">
        {/* Header: Thoáng rộng, tách bạch bằng hình khối lồi/lõm */}
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-background text-primary ${NM.extruded}`}
            >
              <div
                className={`flex size-8 items-center justify-center rounded-[11px] bg-background ${NM.recessed}`}
              >
                <CalendarClock className="size-4.5" strokeWidth={2.3} />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-black tracking-tight text-foreground sm:text-[17px]">
                {t("dashboard.cronCard.title")}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t("dashboard.cronCard.subtitle")}
              </p>
            </div>
          </div>

          {/* Cụm Trạng thái & Phím làm mới */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canRead && jobList.length > 0 && (
              <span
                className={`inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-1.5 font-mono text-xs font-extrabold ${enabledCount > 0 ? "text-primary" : "text-muted-foreground"
                  } ${NM.recessed}`}
              >
                <span className="relative flex size-2">
                  {enabledCount > 0 && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-45" />
                  )}
                  <span
                    className={`relative inline-flex size-2 rounded-full ${enabledCount > 0
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : "bg-muted-foreground/50"
                      }`}
                  />
                </span>
                <span>
                  <AnimatedMetricValue
                    value={t("dashboard.cronCard.autoEnabledCount", {
                      enabled: enabledCount,
                      total: jobList.length,
                    })}
                  />
                </span>
              </span>
            )}

            {canRead && (
              <button
                type="button"
                onClick={triggerCronRefresh}
                disabled={isRefreshingCron || jobsOverride !== undefined}
                aria-label={t("dashboard.cronCard.refresh")}
                title={
                  cronSyncedLabel
                    ? `${t("dashboard.cronCard.refresh")} · ${cronSyncedLabel}`
                    : t("dashboard.cronCard.refresh")
                }
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-xs font-bold transition-all disabled:opacity-50 ${NM.tactileBtn} ${
                  isCronRefreshed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {isCronRefreshed ? (
                  <Check className="size-3.5 stroke-[2.75] text-emerald-500" />
                ) : (
                  <RefreshCw
                    className={`size-3.5 text-primary ${isRefreshingCron ? "animate-spin" : ""}`}
                    strokeWidth={2.4}
                  />
                )}
                <span>
                  {isCronRefreshed
                    ? isVi
                      ? "Đã cập nhật"
                      : "Updated"
                    : t("dashboard.cronCard.refresh")}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Telemetry: 3 Khối đồng hồ nổi độc lập (Independent Extruded Pods) */}
        {canRead && jobList.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Pod 1: Đang bật */}
            <div
              className={`flex items-center justify-between gap-3 rounded-[18px] bg-background px-4 py-3 ${NM.extruded}`}
            >
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.cronCard.summaryEnabled")}
                </span>
                <span className="mt-1 block font-mono text-base font-black tabular-nums text-foreground sm:text-lg">
                  <span className="text-primary">
                    <AnimatedNumber value={enabledCount} />
                  </span>
                  <span className="text-muted-foreground/60">
                    /<AnimatedNumber value={jobList.length} />
                  </span>
                </span>
              </div>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary ${NM.recessed}`}
              >
                <Power className="size-4" strokeWidth={2.4} />
              </div>
            </div>

            {/* Pod 2: Lần chạy kế tiếp */}
            <div
              className={`flex items-center justify-between gap-3 rounded-[18px] bg-background px-4 py-3 ${NM.extruded}`}
            >
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.cronCard.summaryNextRun")}
                </span>
                {earliestNext ? (
                  <div className="mt-1 min-w-0">
                    <p className="truncate text-xs font-extrabold text-foreground">
                      {getJobTitle(earliestNext.job.name)}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-primary">
                      {earliestNext.nextRun.relativeTime}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                    {t("dashboard.cronCard.noUpcomingRun")}
                  </p>
                )}
              </div>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary ${NM.recessed}`}
              >
                <Timer className="size-4" strokeWidth={2.4} aria-hidden="true" />
              </div>
            </div>

            {/* Pod 3: Lần chạy gần nhất */}
            <div
              className={`flex items-center justify-between gap-3 rounded-[18px] bg-background px-4 py-3 ${NM.extruded}`}
            >
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.cronCard.summaryLastRun")}
                </span>
                {latestExecutionEntry ? (
                  <div className="mt-1 min-w-0">
                    <p className="truncate text-xs font-extrabold text-foreground">
                      {getJobTitle(latestExecutionEntry.jobName)}
                    </p>
                    <p
                      className={`mt-0.5 truncate font-mono text-[11px] font-bold ${latestExecutionEntry.exec.success
                          ? "text-primary"
                          : "text-danger"
                        }`}
                    >
                      {formatCronRelativeAgo(
                        latestExecutionEntry.exec.timestamp,
                        new Date(),
                        locale,
                      )}
                      {latestExecutionEntry.exec.durationMs > 0
                        ? ` · ${latestExecutionEntry.exec.durationMs}ms`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                    {t("dashboard.cronCard.noRecentRun")}
                  </p>
                )}
              </div>
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-background ${latestExecutionEntry?.exec.success === false
                    ? "text-danger"
                    : "text-accent-foreground"
                  } ${NM.recessed}`}
              >
                <Clock className="size-4" strokeWidth={2.4} />
              </div>
            </div>
          </div>
        )}

        {/* Actionable Recommendation Banner: Trả lời ngay Nên chạy cái nào & Cái nào vừa chạy */}
        {canRead && jobList.length > 0 && (
          <div
            role="status"
            className={`flex flex-col gap-2.5 rounded-[18px] bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              primaryActionEntry
                ? primaryActionEntry.guidance.state === "failed"
                  ? "bg-danger/[0.06]"
                  : "bg-warning/[0.07]"
                : "bg-primary/[0.04]"
            } ${NM.extruded}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-background ${
                  primaryActionEntry
                    ? primaryActionEntry.guidance.state === "failed"
                      ? "text-danger"
                      : "text-warning"
                    : "text-primary"
                } ${NM.recessed}`}
              >
                {primaryActionEntry ? (
                  <AlertTriangle className="size-4" strokeWidth={2.3} />
                ) : (
                  <CheckCircle2 className="size-4" strokeWidth={2.3} />
                )}
              </div>

              <div className="min-w-0 space-y-0.5 text-xs">
                {primaryActionEntry ? (
                  <>
                    <p className="font-extrabold text-foreground">
                      {t("dashboard.cronCard.guidance.needRunTitle", {
                        count: needRunJobs.length,
                        name: getJobTitle(primaryActionEntry.job.name),
                      })}
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {t(
                        `dashboard.cronCard.guidance.${primaryActionEntry.guidance.state}`,
                      )}
                    </p>
                  </>
                ) : auditAvailable ? (
                  <>
                    <p className="font-extrabold text-foreground">
                      {t("dashboard.cronCard.guidance.allHealthyTitle")}
                    </p>
                    {latestExecutionEntry && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-primary">
                          {t("dashboard.cronCard.badge.justRan")}:
                        </span>{" "}
                        {getJobTitle(latestExecutionEntry.jobName)} (
                        {formatCronRelativeAgo(
                          latestExecutionEntry.exec.timestamp,
                          new Date(),
                          locale,
                        )}
                        )
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium text-muted-foreground">
                    {t("dashboard.cronCard.guidance.noHistoryHint")}
                  </p>
                )}
              </div>
            </div>

            {primaryActionEntry && canManage && (
              <button
                type="button"
                disabled={
                  isFetching ||
                  isError ||
                  blockedJobs.has(primaryActionEntry.job.name)
                }
                onClick={() => openTriggerDialog(primaryActionEntry.job)}
                className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 self-end rounded-full bg-primary px-3.5 text-[11px] font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.15)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 sm:self-center"
              >
                <Play className="size-3 fill-current" strokeWidth={2.4} />
                <span>{t("dashboard.cronCard.runNow")}</span>
              </button>
            )}
          </div>
        )}

        {/* Khay lõm chứa danh sách tác vụ (Recessed Task Deck) */}
        <div
          className={`rounded-[22px] bg-background p-3 sm:p-3.5 ${NM.recessed}`}
        >
          {!canRead ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center text-xs text-muted-foreground">
              <div
                className={`flex size-11 items-center justify-center rounded-2xl bg-background text-muted-foreground ${NM.extruded}`}
              >
                <Lock className="size-4.5" />
              </div>
              <p className="max-w-xs font-medium leading-relaxed">
                {t("dashboard.cronCard.noAccess")}
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3 py-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-3 rounded-[16px] bg-background p-3.5 ${NM.extruded}`}
                >
                  <div className="flex flex-1 items-center gap-3.5">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/5 rounded-md" />
                      <Skeleton className="h-3 w-3/4 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2.5 py-6 text-xs text-muted-foreground">
              <p className="font-medium">{t("dashboard.data.error")}</p>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className={`rounded-full bg-background px-4 py-1.5 text-xs font-bold text-primary ${NM.tactileBtn}`}
              >
                {t("dashboard.data.retry")}
              </button>
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="flex min-h-36 items-center justify-center text-xs font-medium text-muted-foreground">
              {t("cron.empty")}
            </div>
          ) : (
            <div className="max-h-[340px] space-y-2.5 overflow-y-auto p-1 pr-1.5">
              {displayJobs.map((job) => {
                const { Icon } = getCronJobCategoryMeta(job.name);
                const jobTitle = getJobTitle(job.name);
                const jobSummary = getJobSummary(job);
                const scheduleText = getCronScheduleLabel(job, t);
                const nextRun = calculateNextRun(job, new Date(), locale);
                const conflict = detectCronConflicts(job.name, jobList, t);
                const lastExec = recentExecutions[job.name];
                const guidance = jobGuidanceMap.get(job.name);
                const outcomeSummary = lastExec
                  ? formatCronOutcomeSummary(job.name, lastExec.data, locale)
                  : null;
                const relativeAgo = lastExec
                  ? formatCronRelativeAgo(lastExec.timestamp, new Date(), locale)
                  : null;
                const isLatestRanJob =
                  latestExecutionEntry?.jobName === job.name;
                const isBlocked = blockedJobs.has(job.name);
                const actionDisabled = isFetching || isError || isBlocked;

                return (
                  <div
                    key={job.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailJob(job)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailJob(job);
                      }
                    }}
                    className={`group flex cursor-pointer flex-col gap-3 rounded-[16px] bg-background p-3.5 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:flex-row sm:items-center sm:justify-between ${
                      guidance?.state === "failed"
                        ? "ring-1 ring-danger/35"
                        : guidance?.shouldClickRun
                          ? "ring-1 ring-warning/35"
                          : guidance?.isJustRan || isLatestRanJob
                            ? "ring-1 ring-primary/30"
                            : ""
                    } ${NM.extruded}`}
                  >
                    {/* Vùng trái: Icon hốc lõm + Metadata */}
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <div
                        className={`relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-background ${job.isEnabled ? "text-primary" : "text-muted-foreground"
                          } ${NM.recessed}`}
                      >
                        <Icon className="size-4.5" strokeWidth={2.2} />
                        {/* Đèn LED trạng thái góc icon */}
                        <span
                          className={`absolute -right-0.5 -top-0.5 size-2 rounded-full ${
                            guidance?.state === "failed"
                              ? "bg-danger shadow-[0_0_6px_hsl(var(--danger))]"
                              : guidance?.shouldClickRun
                                ? "bg-warning shadow-[0_0_6px_hsl(var(--warning))]"
                                : job.isEnabled
                                  ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                                  : "bg-muted-foreground/40"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[13px] font-black text-foreground transition-colors group-hover:text-primary sm:text-sm">
                            {jobTitle}
                          </span>

                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${job.isEnabled
                                ? "bg-primary/10 text-primary"
                                : "bg-accent text-accent-foreground"
                              }`}
                          >
                            {t(
                              job.isEnabled
                                ? "dashboard.cronCard.statusAuto"
                                : "dashboard.cronCard.statusPaused",
                            )}
                          </span>

                          {guidance?.state === "failed" && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger/15 px-2.5 py-0.5 text-[10px] font-extrabold text-danger">
                              <AlertTriangle className="size-3" />
                              <span>{t("dashboard.cronCard.badge.failed")}</span>
                            </span>
                          )}

                          {guidance &&
                            guidance.shouldClickRun &&
                            guidance.state !== "failed" && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-extrabold text-warning">
                                <Play className="size-2.5 fill-current" />
                                <span>{t("dashboard.cronCard.badge.needRun")}</span>
                              </span>
                            )}

                          {lastExec &&
                            (guidance?.isJustRan || isLatestRanJob) &&
                            guidance?.state !== "failed" && (
                              <span
                                title={formatExecutionClock(lastExec.timestamp, locale)}
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-extrabold text-success"
                              >
                                <Sparkles className="size-2.5" />
                                <span>
                                  {t("dashboard.cronCard.badge.justRan")}
                                  {relativeAgo ? ` · ${relativeAgo}` : ""}
                                </span>
                              </span>
                            )}

                          {conflict.hasConflict && (
                            <span
                              title={conflict.description}
                              className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-extrabold text-warning"
                            >
                              <AlertTriangle className="size-3" />
                              <span>{t("cron.conflictBadge")}</span>
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {guidance?.shouldClickRun
                            ? t(`dashboard.cronCard.guidance.${guidance.state}`)
                            : outcomeSummary
                              ? `${jobSummary} · ${outcomeSummary}`
                              : jobSummary}
                        </p>

                        {/* Hàng thông số nhịp chạy khắc chìm nhẹ */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
                          <span
                            title={`${job.cron} (${CRON_TIMEZONE})`}
                            className={`inline-flex items-center gap-1.5 rounded-lg bg-background px-2 py-0.5 font-semibold text-foreground/85 ${NM.recessed}`}
                          >
                            <Clock className="size-3 text-primary" />
                            <span>{scheduleText}</span>
                          </span>

                          {!nextRun.isPaused && (
                            <span className="font-bold text-primary">
                              {t("dashboard.cronCard.nextRunPrefix")}{" "}
                              {nextRun.relativeTime}
                            </span>
                          )}

                          {lastExec ? (
                            <span
                              title={formatExecutionClock(lastExec.timestamp, locale)}
                              className={`font-mono text-[10px] font-semibold ${lastExec.success
                                  ? "text-muted-foreground"
                                  : "text-danger"
                                }`}
                            >
                              · {t("dashboard.cronCard.lastRunPrefix")}{" "}
                              {relativeAgo}
                              {lastExec.durationMs > 0
                                ? ` (${lastExec.durationMs}ms)`
                                : ""}
                            </span>
                          ) : (
                            guidance &&
                            guidance.state !== "unknown" && (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                · {t("dashboard.cronCard.noRecentRun")}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vùng phải: Cụm nút cơ học Tactile Controls */}
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-center"
                    >
                      {canManage && (
                        <>
                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => openTriggerDialog(job)}
                            aria-label={`${t("dashboard.cronCard.runNow")}: ${jobTitle}`}
                            title={t("dashboard.cronCard.runNow")}
                            className={
                              guidance?.shouldClickRun
                                ? "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 text-[11px] font-extrabold text-primary-foreground shadow-[3px_3px_8px_rgba(0,0,0,0.16)] transition-all hover:opacity-95 disabled:opacity-50"
                                : `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 text-[11px] font-bold ${
                                    job.isEnabled
                                      ? "text-muted-foreground hover:text-primary"
                                      : "text-primary"
                                  } transition-all disabled:opacity-50 ${NM.tactileBtn}`
                            }
                          >
                            <Play
                              className={`size-3 ${guidance?.shouldClickRun ? "fill-current" : "fill-primary/15"}`}
                              strokeWidth={2.5}
                            />
                            <span>
                              {lastExec && !guidance?.shouldClickRun && job.isEnabled
                                ? t("dashboard.cronCard.rerun")
                                : t("dashboard.cronCard.runNow")}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={actionDisabled}
                            onClick={() => openToggleDialog(job)}
                            aria-label={`${t(
                              job.isEnabled
                                ? "dashboard.cronCard.disableAction"
                                : "dashboard.cronCard.enableAction",
                            )}: ${jobTitle}`}
                            title={t(
                              job.isEnabled
                                ? "dashboard.cronCard.disableAction"
                                : "dashboard.cronCard.enableAction",
                            )}
                            className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-background transition-all disabled:opacity-50 ${job.isEnabled
                                ? "text-muted-foreground hover:text-danger"
                                : "text-primary"
                              } ${NM.tactileBtn}`}
                          >
                            <Power className="size-3.5" strokeWidth={2.4} />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailJob(job)}
                        aria-label={`${t("cron.table.viewDetail")}: ${jobTitle}`}
                        title={t("cron.table.viewDetail")}
                        className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-background text-muted-foreground transition-colors group-hover:text-primary ${NM.recessed}`}
                      >
                        <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {remainingCount > 0 && (
                <div className="pt-1.5 text-center">
                  <Link
                    href="/scheduled-tasks"
                    className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3.5 py-1 text-[11px] font-bold text-primary transition-all ${NM.tactileBtn}`}
                  >
                    <span>
                      {t("dashboard.cronCard.moreTasks", {
                        count: remainingCount,
                      })}
                    </span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Thoáng rộng, cân đối */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("dashboard.cronCard.inspectHint")}
        </span>

        <Link
          href="/scheduled-tasks"
          className={`group inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-1.5 text-xs font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 ${NM.tactileBtn}`}
        >
          <span>{t("dashboard.cronCard.viewAll")}</span>
          <ArrowRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        </Link>
      </div>

      {/* Trigger Modal */}
      {triggerJob && canManage && (
        <CronJobDialog
          key={`${triggerJob.name}:trigger`}
          job={triggerJob}
          action="trigger"
          pending={pending}
          error={triggerError}
          result={triggerResult}
          blocked={blockedJobs.has(triggerJob.name)}
          onConfirm={confirmTrigger}
          onClose={() => {
            if (submitting.current) return;
            setTriggerJob(null);
            setTriggerResult(null);
            setTriggerError(null);
          }}
        />
      )}

      {/* Toggle Confirm Modal */}
      {toggleJob && canManage && (
        <CronToggleConfirmDialog
          job={toggleJob}
          open={Boolean(toggleJob)}
          pending={pending}
          onConfirm={confirmToggle}
          onClose={() => setToggleJob(null)}
        />
      )}

      {/* Job Detail Modal */}
      {detailJob && (
        <CronJobDetailModal
          job={detailJob}
          allJobs={jobList}
          recentExecution={recentExecutions[detailJob.name]}
          canManage={canManage}
          blocked={blockedJobs.has(detailJob.name)}
          onTrigger={(job) => openTriggerDialog(job)}
          onToggle={(job) => openToggleDialog(job)}
          onClose={() => setDetailJob(null)}
        />
      )}
    </section>
  );
}
