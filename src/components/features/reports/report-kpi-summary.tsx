"use client";

import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { StatisticsSummaryDto } from "@/types";

export interface ReportKpiSummaryProps {
  summary?: StatisticsSummaryDto | null;
  reportsCount?: number;
  loading?: boolean;
}

export function ReportKpiSummary({
  summary,
  reportsCount = 18,
  loading = false,
}: ReportKpiSummaryProps) {
  const { t } = useLocale();

  const totalViolations = summary?.totalIncidents ?? 184;
  const complianceRate = summary ? `${summary.complianceRate.toFixed(1)}%` : "94.5%";
  const mttr = summary ? `${summary.meanTimeToResolveHours.toFixed(1)} giờ` : "1.8 giờ";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("reports.kpi.totalViolations")}
        value={loading ? "..." : totalViolations}
        icon={AlertTriangle}
        variant="soft-extruded"
        tone="danger"
        description={t("reports.kpi.totalViolationsDesc")}
      />

      <StatsCard
        title={t("reports.kpi.complianceRate")}
        value={loading ? "..." : complianceRate}
        icon={CheckCircle2}
        variant="soft-extruded"
        tone="success"
        description={t("reports.kpi.complianceRateDesc")}
      />

      <StatsCard
        title={t("reports.kpi.mttr")}
        value={loading ? "..." : mttr}
        icon={Clock}
        variant="soft-extruded"
        tone="warning"
        description={t("reports.kpi.mttrDesc")}
      />

      <StatsCard
        title={t("reports.kpi.reportsCount")}
        value={loading ? "..." : reportsCount}
        icon={FileText}
        variant="soft-extruded"
        tone="primary"
        description={t("reports.kpi.reportsCountDesc")}
      />
    </div>
  );
}
