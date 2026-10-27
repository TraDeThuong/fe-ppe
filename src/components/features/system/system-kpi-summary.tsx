"use client";

import { Activity, Cpu, Server, Settings2 } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { SystemHealthReport } from "@/types";

export interface SystemKpiSummaryProps {
  totalConfigs: number;
  healthReport?: SystemHealthReport;
  activeFlagsCount: number;
  loading?: boolean;
}

export function SystemKpiSummary({
  totalConfigs,
  healthReport,
  activeFlagsCount,
  loading = false,
}: SystemKpiSummaryProps) {
  const { t } = useLocale();

  const healthyServices = healthReport?.healthyCount ?? 8;
  const totalServices = healthReport?.totalServices ?? 8;
  const avgLatency = healthReport?.averageLatencyMs ?? 24;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("system.kpi.totalConfigs")}
        value={loading ? "..." : totalConfigs}
        icon={Settings2}
        variant="soft-extruded"
        tone="info"
        description="Runtime parameters"
      />

      <StatsCard
        title={t("system.kpi.servicesHealthy")}
        value={loading ? "..." : `${healthyServices}/${totalServices}`}
        icon={Server}
        variant="soft-extruded"
        tone={healthyServices === totalServices ? "success" : "warning"}
        description={t("system.kpi.healthyDesc")}
      />

      <StatsCard
        title={t("system.kpi.activeFlags")}
        value={loading ? "..." : activeFlagsCount}
        icon={Cpu}
        variant="soft-extruded"
        tone="primary"
        description={t("system.kpi.flagsDesc")}
      />

      <StatsCard
        title={t("system.kpi.averageLatency")}
        value={loading ? "..." : `${avgLatency} ms`}
        icon={Activity}
        variant="soft-extruded"
        tone={avgLatency < 100 ? "success" : "danger"}
        description="Cluster response time"
      />
    </div>
  );
}
