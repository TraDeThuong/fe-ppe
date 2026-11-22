"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Info,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { ForbiddenView } from "@/components/features/app-shell/forbidden-view";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useCronJobs, useCronMutations } from "@/hooks/cron/use-cron";
import { useCronRecentExecutions } from "@/hooks/cron/use-cron-history";
import { useDebounce } from "@/hooks/use-debounce";
import { ApiError } from "@/lib/axios";
import {
  canReadCron,
  CRON_TIMEZONE,
  extractRecentCronExecutions,
  filterCronJobs,
  mergeRecentExecutions,
} from "@/lib/cron";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  CronJobExecutionResult,
  CronJobItem,
  CronJobName,
  CronScheduleFilter,
  RecentExecutionState,
  TriggerCronJobPayload,
} from "@/types/cron.types";
import { CronJobCardGrid } from "./cron-job-card-grid";
import { CronJobTable } from "./cron-job-table";
import { CronJobDialog } from "./cron-job-dialog";
import { CronJobDetailModal } from "./cron-job-detail-modal";
import { CronToggleConfirmDialog } from "./cron-toggle-confirm-dialog";
import { CronKpiSummary, type CronStatKey } from "./cron-kpi-summary";
import { CronToolbar, type CronViewMode } from "./cron-toolbar";

const VIEW_MODE_STORAGE_KEY = "scheduled-tasks:view-mode";

export function ScheduledTasksScreen() {
  const { user, status } = useAuth();
  const { t, locale } = useLocale();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CronScheduleFilter>("all");
  const [viewMode, setViewMode] = useState<CronViewMode>("table");
  const [selectedStat, setSelectedStat] = useState<CronStatKey | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canRead =
    status === "authenticated" &&
    (isAdmin || canReadCron(status, user?.permissions ?? []));
  const canManage =
    canRead && (isAdmin || Boolean(user?.permissions.includes("CRON_JOB_MANAGE")));
  const canReadAudit =
    status === "authenticated" &&
    (isAdmin || Boolean(user?.permissions.includes("AUDIT_LOG_READ")));
  // Luôn tải toàn bộ danh sách cron job (~5–10 jobs) để lọc client-side đa ngôn ngữ,
  // giữ chính xác KPI tổng quan, phát hiện xung đột lịch và cache khi bật/tắt job.
  const query = useCronJobs(canRead);
  const recentAuditQuery = useCronRecentExecutions(canRead && canReadAudit);
  const { trigger, toggle } = useCronMutations();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "table" || saved === "card") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage access errors in restricted environments.
    }
  }, []);

  const handleViewModeChange = (nextMode: CronViewMode) => {
    setViewMode(nextMode);
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Ignore storage write errors in restricted environments.
    }
  };

  // Trigger modal state
  const [selection, setSelection] = useState<{
    job: CronJobItem;
    action: "trigger";
  } | null>(null);

  // Detail modal state
  const [detailJob, setDetailJob] = useState<CronJobItem | null>(null);

  // Toggle confirm modal state
  const [toggleConfirmJob, setToggleConfirmJob] = useState<CronJobItem | null>(null);

  // Lưu lịch sử các lần chạy ngay gần nhất trên giao diện (kết hợp Audit Log lịch sử)
  const [recentExecutions, setRecentExecutions] = useState<Record<string, RecentExecutionState>>({});
  const auditExecutions = useMemo(
    () => extractRecentCronExecutions(recentAuditQuery.data?.items ?? []),
    [recentAuditQuery.data?.items],
  );
  const mergedRecentExecutions = useMemo(
    () => mergeRecentExecutions(auditExecutions, recentExecutions),
    [auditExecutions, recentExecutions],
  );
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const [result, setResult] = useState<CronJobExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedJobs, setBlockedJobs] = useState<ReadonlySet<CronJobName>>(new Set());

  // The ref closes the gap before React renders the mutation's pending state.
  const submitting = useRef(false);
  const pending = trigger.isPending || toggle.isPending;
  const jobs = query.data ?? [];
  const visible = filterCronJobs(jobs, search, filter, t);
  const enabledCount = jobs.filter((job) => job.isEnabled).length;
  const disabledCount = jobs.length - enabledCount;

  const refresh = async () => {
    if (!canRead || submitting.current) return;
    const response = await query.refetch();
    if (response.isSuccess) {
      setLastSynced(new Date());
      setBlockedJobs(new Set());
      setError(null);
      setSelection(null);
      setResult(null);
    }
  };

  const openTrigger = (job: CronJobItem) => {
    if (
      !canManage ||
      query.isFetching ||
      query.isError ||
      blockedJobs.has(job.name) ||
      submitting.current
    )
      return;
    setResult(null);
    setError(null);
    setSelection({ job, action: "trigger" });
  };

  const openToggle = (job: CronJobItem) => {
    if (
      !canManage ||
      query.isFetching ||
      query.isError ||
      blockedJobs.has(job.name) ||
      submitting.current
    )
      return;
    setToggleConfirmJob(job);
  };

  const closeDialog = () => {
    if (submitting.current) return;
    setSelection(null);
    setResult(null);
    setError(null);
  };

  const confirmTrigger = async (payload: TriggerCronJobPayload) => {
    if (
      !selection ||
      !canManage ||
      submitting.current ||
      blockedJobs.has(selection.job.name)
    )
      return;
    const { job } = selection;
    if (query.isError || query.isFetching) {
      setError(t("cron.refreshBeforeAction"));
      return;
    }
    submitting.current = true;
    setError(null);
    try {
      const response = await trigger.mutateAsync({ jobName: job.name, payload });
      setResult(response);
      setRecentExecutions((prev) => ({
        ...prev,
        [job.name]: {
          timestamp: new Date().toISOString(),
          success: response.success,
          durationMs: response.durationMs,
          data: response.data,
          error: response.error,
        },
      }));
      toast.success(
        t("cron.toast.triggerSuccess", {
          name: t(`cron.jobs.${job.name}`),
          duration: response.durationMs,
        })
      );
    } catch (cause: any) {
      const uncertain =
        !(cause instanceof ApiError) ||
        cause.status === 0 ||
        cause.status >= 500 ||
        cause.status === 408;
      if (uncertain) {
        setBlockedJobs((previous) => new Set(previous).add(job.name));
        setError(t("cron.unknownOutcome"));
      } else {
        setError(cause.message);
      }
    } finally {
      submitting.current = false;
    }
  };

  const confirmToggle = async () => {
    if (!toggleConfirmJob || !canManage || submitting.current || blockedJobs.has(toggleConfirmJob.name)) {
      return;
    }
    const job = toggleConfirmJob;
    if (query.isError || query.isFetching) {
      toast.error(t("cron.refreshBeforeAction"));
      return;
    }
    submitting.current = true;
    try {
      const response = await toggle.mutateAsync(job.name);
      toast.success(
        t(response.isEnabled ? "cron.toast.enabled" : "cron.toast.disabled")
      );
      setToggleConfirmJob(null);
    } catch (cause: any) {
      const uncertain =
        !(cause instanceof ApiError) ||
        cause.status === 0 ||
        cause.status >= 500 ||
        cause.status === 408;
      if (uncertain) {
        setBlockedJobs((previous) => new Set(previous).add(job.name));
        toast.error(t("cron.unknownOutcome"));
      } else {
        toast.error(cause.message || t("cron.toast.triggerFailed", { error: "Unknown" }));
      }
    } finally {
      submitting.current = false;
    }
  };

  const taskListProps = {
    jobs: visible,
    allJobs: jobs,
    recentExecutions: mergedRecentExecutions,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    filtered: Boolean(search.trim()) || filter !== "all",
    canManage,
    blockedJobs,
    onRetry: () => void refresh(),
    onTrigger: (job: CronJobItem) => openTrigger(job),
    onToggle: (job: CronJobItem) => openToggle(job),
    onViewDetail: (job: CronJobItem) => setDetailJob(job),
    onResetFilters: () => {
      setSearch("");
      setFilter("all");
    },
  };

  if (status !== "authenticated")
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader showLabel />
      </div>
    );
  if (!canRead) return <ForbiddenView />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("cron.title")}
        description={t("cron.subtitle")}
        icon={CalendarClock}
        breadcrumbs={[
          { label: t("nav.group.admin") },
          { label: t("nav.scheduledTasks") },
        ]}
        badge={`${CRON_TIMEZONE} • ${t("cron.lastSynced", {
          time: lastSynced.toLocaleTimeString(locale),
        })}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={query.isFetching || pending}
            onClick={() => void refresh()}
            aria-label={t("cron.refresh")}
            className="gap-2 rounded-xl border-border/60 shadow-sm"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${
                query.isFetching ? "animate-spin motion-reduce:animate-none" : ""
              }`}
            />
            {t("cron.refresh")}
          </Button>
        }
      />

      {/* KPI Bento Summary with Expandable Details */}
      <CronKpiSummary
        jobs={jobs}
        loading={query.isPending}
        hasData={Boolean(query.data)}
        canManage={canManage}
        blockedJobs={blockedJobs}
        selectedStat={selectedStat}
        onSelectStat={setSelectedStat}
        onTrigger={(job) => openTrigger(job)}
        onToggle={(job) => openToggle(job)}
        onFilterChange={setFilter}
      />

      {/* Clean System Notice Banner (Tối giản, giới hạn màu sắc, không icon rườm rà) */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-surface/70 p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground shadow-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            {t("cron.apiConnected")} (
            {locale === "vi-VN" ? `${jobs.length} tác vụ được định thời` : `${jobs.length} scheduled jobs`})
          </p>
          <p>{t("cron.stateNote")}</p>
          <p className="text-xs text-muted-foreground/80">{t("cron.schedulerNote")}</p>
        </div>
      </div>

      {/* Task List Section */}
      <section aria-label={t("cron.list")} className="space-y-3 sm:space-y-4">
        {/* Modern Filter Toolbar */}
        <CronToolbar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onClearFilters={() => {
            setSearch("");
            setFilter("all");
          }}
          totalCount={jobs.length}
          visibleCount={visible.length}
          enabledCount={enabledCount}
          disabledCount={disabledCount}
        />

        {/* Task List (Table or Card Grid) */}
        {viewMode === "card" ? (
          <CronJobCardGrid {...taskListProps} />
        ) : (
          <CronJobTable {...taskListProps} />
        )}
      </section>

      {/* Confirmation & Execution Dialog for Run Now */}
      {selection && canManage ? (
        <CronJobDialog
          key={`${selection.job.name}:${selection.action}`}
          job={selection.job}
          action={selection.action}
          pending={pending}
          error={error}
          result={result}
          blocked={blockedJobs.has(selection.job.name)}
          onConfirm={confirmTrigger}
          onClose={closeDialog}
        />
      ) : null}

      {/* Safety Toggle Confirmation Dialog */}
      {toggleConfirmJob && canManage ? (
        <CronToggleConfirmDialog
          job={toggleConfirmJob}
          open={Boolean(toggleConfirmJob)}
          pending={pending}
          onConfirm={confirmToggle}
          onClose={() => setToggleConfirmJob(null)}
        />
      ) : null}

      {/* Detail Modal */}
      {detailJob ? (
        <CronJobDetailModal
          job={detailJob}
          allJobs={jobs}
          recentExecution={mergedRecentExecutions[detailJob.name]}
          canManage={canManage}
          blocked={blockedJobs.has(detailJob.name)}
          onTrigger={(job) => openTrigger(job)}
          onToggle={(job) => openToggle(job)}
          onClose={() => setDetailJob(null)}
        />
      ) : null}
    </div>
  );
}
