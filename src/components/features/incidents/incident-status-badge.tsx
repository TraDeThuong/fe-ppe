"use client";

import { useLocale } from "@/providers/locale-provider";
import type { IncidentStatus } from "@/types";

export interface IncidentStatusBadgeProps {
  status: IncidentStatus | string;
  size?: "sm" | "md";
}

export function IncidentStatusBadge({ status, size = "sm" }: IncidentStatusBadgeProps) {
  const { t } = useLocale();

  const config: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
  > = {
    PENDING_REVIEW: {
      label: t("incidents.status.pendingReview"),
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-500",
      dot: "bg-amber-500 animate-pulse",
    },
    CONFIRMED: {
      label: t("incidents.status.confirmed"),
      bg: "bg-rose-500/10 border-rose-500/30",
      text: "text-rose-500",
      dot: "bg-rose-500",
    },
    DISMISSED: {
      label: t("incidents.status.dismissed"),
      bg: "bg-muted/30 border-muted/50",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    RESOLVED: {
      label: t("incidents.status.resolved"),
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    CLOSED: {
      label: t("incidents.status.closed"),
      bg: "bg-slate-500/10 border-slate-500/30",
      text: "text-slate-400",
      dot: "bg-slate-400",
    },
  };

  const current = config[status] || {
    label: status,
    bg: "bg-muted/30 border-muted/50",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${current.bg} ${current.text} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
}
