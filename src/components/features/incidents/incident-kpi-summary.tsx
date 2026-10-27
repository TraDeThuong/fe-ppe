"use client";

import { AlertOctagon, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface IncidentKpiSummaryProps {
  incidents: IncidentItem[];
  loading?: boolean;
}

export function IncidentKpiSummary({
  incidents,
  loading = false,
}: IncidentKpiSummaryProps) {
  const { t } = useLocale();

  const total = incidents.length;
  const pending = incidents.filter((i) => i.status === "PENDING_REVIEW").length;
  const critical = incidents.filter((i) => i.severity === "CRITICAL").length;
  const resolved = incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("incidents.kpi.total")}
        value={loading ? "..." : total}
        icon={AlertTriangle}
        variant="soft-extruded"
        tone="primary"
        description="All recorded PPE breaches"
      />

      <StatsCard
        title={t("incidents.kpi.pendingReview")}
        value={loading ? "..." : pending}
        icon={Clock}
        variant="soft-extruded"
        tone="warning"
        description="Requires human verification"
      />

      <StatsCard
        title={t("incidents.kpi.critical")}
        value={loading ? "..." : critical}
        icon={AlertOctagon}
        variant="soft-extruded"
        tone="danger"
        description="Immediate hazard level"
      />

      <StatsCard
        title={t("incidents.kpi.resolved")}
        value={loading ? "..." : resolved}
        icon={CheckCircle}
        variant="soft-extruded"
        tone="success"
        description="Remediated & verified"
      />
    </div>
  );
}
