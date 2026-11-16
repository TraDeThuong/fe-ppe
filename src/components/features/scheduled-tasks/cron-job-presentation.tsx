"use client";

import { FileBarChart2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  CronJobItem,
  CronJobName,
  RecentExecutionState,
} from "@/types/cron.types";

/** Shared list display props for both table and card grid views. */
export interface CronJobListProps {
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

/** Returns visual icon and i18n category key for a scheduled task. */
export function getCronJobCategoryMeta(jobName: CronJobName) {
  const isCleanup = jobName.startsWith("cleanup-");
  return {
    isCleanup,
    Icon: isCleanup ? Trash2 : FileBarChart2,
    categoryKey: isCleanup ? "cron.category.cleanup" : "cron.category.digest",
  };
}

/** Renders the latest execution state badge for a cron job. */
export function CronLastRunBadge({
  execution,
  t,
}: {
  execution?: RecentExecutionState;
  t: (key: string) => string;
}) {
  if (execution) {
    let label = `${t("cron.justRan")} (${execution.durationMs}ms)`;
    if (execution.fromAuditLog) {
      const date = new Date(execution.timestamp);
      const timeText = Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(date);
      label = execution.durationMs > 0 ? `${timeText} (${execution.durationMs}ms)` : timeText;
    }

    return (
      <Badge
        variant={execution.success ? "success" : "danger"}
        indicator="dot"
        size="sm"
        className="whitespace-nowrap"
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" size="sm" className="text-muted-foreground whitespace-nowrap">
      {t("cron.ready")}
    </Badge>
  );
}

