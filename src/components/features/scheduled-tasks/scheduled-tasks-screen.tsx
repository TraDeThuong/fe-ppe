"use client";

import { useRef, useState } from "react";
import {
  CalendarClock,
  Info,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { ForbiddenView } from "@/components/features/app-shell/forbidden-view";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useCronJobs, useCronMutations } from "@/hooks/cron/use-cron";
import { ApiError } from "@/lib/axios";
import { canReadCron, CRON_TIMEZONE, filterCronJobs } from "@/lib/cron";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  CronJobExecutionResult,
  CronJobItem,
  CronJobName,
  CronScheduleFilter,
  TriggerCronJobPayload,
} from "@/types/cron.types";
import { CronJobTable } from "./cron-job-table";
import { CronJobDialog } from "./cron-job-dialog";
import { CronKpiSummary, type CronStatKey } from "./cron-kpi-summary";
import { CronToolbar } from "./cron-toolbar";

export function ScheduledTasksScreen() {
  const { user, status } = useAuth();
  const { t } = useLocale();

  const canRead = canReadCron(status, user?.permissions ?? []);
  const canManage = canRead && Boolean(user?.permissions.includes("CRON_JOB_MANAGE"));
  const query = useCronJobs(canRead);
  const { trigger, toggle } = useCronMutations();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CronScheduleFilter>("all");
  const [selectedStat, setSelectedStat] = useState<CronStatKey | null>(null);
  const [selection, setSelection] = useState<{
    job: CronJobItem;
    action: "trigger" | "toggle";
  } | null>(null);
  const [result, setResult] = useState<CronJobExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedJobs, setBlockedJobs] = useState<ReadonlySet<CronJobName>>(new Set());

  // The ref closes the gap before React renders the mutation's pending state.
  const submitting = useRef(false);
  const pending = trigger.isPending || toggle.isPending;
  const jobs = query.data ?? [];
  const visible = filterCronJobs(jobs, search, filter);
  const enabledCount = jobs.filter((job) => job.isEnabled).length;
  const disabledCount = jobs.length - enabledCount;

  const refresh = async () => {
    if (!canRead || submitting.current) return;
    const response = await query.refetch();
    if (response.isSuccess) {
      setBlockedJobs(new Set());
      setError(null);
      // Close an old confirmation instead of replaying a toggle against new data.
      setSelection(null);
      setResult(null);
    }
  };

  const open = (job: CronJobItem, action: "trigger" | "toggle") => {
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
    setSelection({ job, action });
  };

  const close = () => {
    if (submitting.current) return;
    setSelection(null);
    setResult(null);
    setError(null);
  };

  const confirm = async (payload: TriggerCronJobPayload) => {
    if (
      !selection ||
      !canManage ||
      submitting.current ||
      blockedJobs.has(selection.job.name)
    )
      return;
    const { job, action } = selection;
    if (query.isError || query.isFetching) {
      setError(t("cron.refreshBeforeAction"));
      return;
    }
    const current = jobs.find((item) => item.name === job.name);
    if (!current || (action === "toggle" && current.isEnabled !== job.isEnabled)) {
      setError(t("cron.stateChanged"));
      setBlockedJobs((previous) => new Set(previous).add(job.name));
      return;
    }
    submitting.current = true;
    setError(null);
    try {
      if (action === "trigger") {
        const response = await trigger.mutateAsync({ jobName: job.name, payload });
        setResult(response);
      } else {
        const response = await toggle.mutateAsync(job.name);
        toast.success(
          t(response.isEnabled ? "cron.toast.enabled" : "cron.toast.disabled")
        );
        setSelection(null);
      }
    } catch (cause) {
      // A transport/server error may occur after a side effect already happened.
      // Never replay a non-idempotent trigger/toggle automatically.
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
        badge={`${CRON_TIMEZONE} (UTC+7)`}
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
        onTrigger={(job) => open(job, "trigger")}
        onToggle={(job) => open(job, "toggle")}
        onFilterChange={setFilter}
      />

      {/* Clean System Notice Banner (Tối giản, giới hạn màu sắc, không icon rườm rà) */}
      <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-surface/70 p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground shadow-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1 leading-relaxed">
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
          totalCount={jobs.length}
          visibleCount={visible.length}
          enabledCount={enabledCount}
          disabledCount={disabledCount}
        />

        {/* High-fidelity Table */}
        <CronJobTable
          jobs={visible}
          loading={query.isPending}
          fetching={query.isFetching}
          error={query.error}
          filtered={Boolean(search.trim()) || filter !== "all"}
          canManage={canManage}
          blockedJobs={blockedJobs}
          onRetry={() => void refresh()}
          onTrigger={(job) => open(job, "trigger")}
          onToggle={(job) => open(job, "toggle")}
        />
      </section>

      {/* Confirmation & Execution Dialog */}
      {selection && canManage ? (
        <CronJobDialog
          key={`${selection.job.name}:${selection.action}`}
          {...selection}
          pending={pending}
          error={error}
          result={result}
          blocked={blockedJobs.has(selection.job.name)}
          onConfirm={confirm}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
