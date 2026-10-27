"use client";

import { CheckCircle2, FileText, Settings, ShieldAlert } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { AuditSummaryDto } from "@/types";

export interface AuditKpiSummaryProps {
  summary?: AuditSummaryDto;
  totalLogsCount: number;
  loading?: boolean;
}

export function AuditKpiSummary({
  summary,
  totalLogsCount,
  loading = false,
}: AuditKpiSummaryProps) {
  const { t } = useLocale();

  const total = summary?.totalLogs ?? totalLogsCount;
  const configChanges = summary?.configChangesCount ?? 0;
  const incidentReviews = summary?.incidentReviewsCount ?? 0;
  const successRate = summary?.successRate ?? 99.8;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("audit.kpi.totalLogs")}
        value={loading ? "..." : total.toLocaleString()}
        icon={FileText}
        variant="soft-extruded"
        tone="info"
        description="Immutable WORM records"
      />

      <StatsCard
        title={t("audit.kpi.configChanges")}
        value={loading ? "..." : configChanges}
        icon={Settings}
        variant="soft-extruded"
        tone="warning"
        description="System alterations"
      />

      <StatsCard
        title={t("audit.kpi.incidentReviews")}
        value={loading ? "..." : incidentReviews}
        icon={ShieldAlert}
        variant="soft-extruded"
        tone="primary"
        description="PPE reviews & resolutions"
      />

      <StatsCard
        title={t("audit.kpi.successRate")}
        value={loading ? "..." : `${successRate}%`}
        icon={CheckCircle2}
        variant="soft-extruded"
        tone="success"
        description="Operations completed"
      />
    </div>
  );
}
