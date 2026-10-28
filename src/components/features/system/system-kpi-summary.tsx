"use client";

import { Activity, Cpu, Server, Settings2 } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { SystemHealthReport } from "@/types";

import type { SystemTabKey } from "./system-tabs";

export interface SystemKpiSummaryProps {
  totalConfigs: number;
  healthReport?: SystemHealthReport;
  activeFlagsCount: number;
  loading?: boolean;
  activeTab?: SystemTabKey;
  onSelectTab?: (tab: SystemTabKey) => void;
}

export function SystemKpiSummary({
  totalConfigs,
  healthReport,
  activeFlagsCount,
  loading = false,
  activeTab,
  onSelectTab,
}: SystemKpiSummaryProps) {
  const { t } = useLocale();

  const healthyServices = healthReport?.healthyCount ?? 12;
  const totalServices = healthReport?.totalServices ?? 12;
  const avgLatency = healthReport?.averageLatencyMs ?? 24;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        className={onSelectTab ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""}
        onClick={() => onSelectTab?.("configs")}
      >
        <StatsCard
          title={t("system.kpi.totalConfigs")}
          value={loading ? "..." : totalConfigs}
          icon={Settings2}
          variant="soft-extruded"
          tone="info"
          description="Tham số runtime đang chạy"
        />
      </div>

      <div
        className={onSelectTab ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""}
        onClick={() => onSelectTab?.("health")}
      >
        <StatsCard
          title={t("system.kpi.servicesHealthy")}
          value={loading ? "..." : `${healthyServices}/${totalServices}`}
          icon={Server}
          variant="soft-extruded"
          tone={healthyServices === totalServices ? "success" : "warning"}
          description="Dịch vụ & hạ tầng khỏe mạnh"
        />
      </div>

      <div
        className={onSelectTab ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""}
        onClick={() => onSelectTab?.("flags")}
      >
        <StatsCard
          title={t("system.kpi.activeFlags")}
          value={loading ? "..." : activeFlagsCount}
          icon={Cpu}
          variant="soft-extruded"
          tone="primary"
          description={t("system.kpi.flagsDesc")}
        />
      </div>

      <div
        className={onSelectTab ? "cursor-pointer transition-transform hover:-translate-y-0.5" : ""}
        onClick={() => onSelectTab?.("health")}
      >
        <StatsCard
          title={t("system.kpi.averageLatency")}
          value={loading ? "..." : `${avgLatency} ms`}
          icon={Activity}
          variant="soft-extruded"
          tone={avgLatency < 100 ? "success" : "danger"}
          description="Độ trễ phản hồi RTT trung bình"
        />
      </div>
    </div>
  );
}
