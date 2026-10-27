"use client";

import { useLocale } from "@/providers/locale-provider";
import type { IncidentSeverity } from "@/types";

export interface IncidentSeverityBadgeProps {
  severity: IncidentSeverity | string;
}

export function IncidentSeverityBadge({ severity }: IncidentSeverityBadgeProps) {
  const { t } = useLocale();

  const config: Record<string, { label: string; badgeClass: string }> = {
    CRITICAL: {
      label: t("incidents.severity.critical"),
      badgeClass: "bg-danger text-white shadow-sm font-bold",
    },
    HIGH: {
      label: t("incidents.severity.high"),
      badgeClass: "bg-orange-500/15 text-orange-500 border border-orange-500/30",
    },
    MEDIUM: {
      label: t("incidents.severity.medium"),
      badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
    },
    LOW: {
      label: t("incidents.severity.low"),
      badgeClass: "bg-blue-500/15 text-blue-500 border border-blue-500/30",
    },
  };

  const current = config[severity] || {
    label: severity,
    badgeClass: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase ${current.badgeClass}`}
    >
      {current.label}
    </span>
  );
}
