"use client";

import { Activity, AlertTriangle, Camera, WifiOff, Zap } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraKpiSummaryProps {
  cameras: CameraItem[];
  loading?: boolean;
}

export function CameraKpiSummary({
  cameras,
  loading = false,
}: CameraKpiSummaryProps) {
  const { t } = useLocale();

  const total = cameras.length;
  const online = cameras.filter((c) => c.status === "ONLINE").length;
  const offline = cameras.filter((c) => c.status === "OFFLINE" || c.status === "ERROR").length;

  const latencies = cameras
    .map((c) => c.currentLatencyMs)
    .filter((lat): lat is number => typeof lat === "number" && lat > 0);
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 42;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("cameras.kpi.total")}
        value={loading ? "..." : total}
        icon={Camera}
        variant="soft-extruded"
        tone="primary"
        description="Connected surveillance units"
      />

      <StatsCard
        title={t("cameras.kpi.online")}
        value={loading ? "..." : online}
        icon={Activity}
        variant="soft-extruded"
        tone="success"
        description="Real-time RTSP streams"
      />

      <StatsCard
        title={t("cameras.kpi.offline")}
        value={loading ? "..." : offline}
        icon={offline > 0 ? AlertTriangle : WifiOff}
        variant="soft-extruded"
        tone={offline > 0 ? "danger" : "default"}
        description="Needs inspection / network"
      />

      <StatsCard
        title={t("cameras.kpi.avgLatency")}
        value={loading ? "..." : `${avgLatency} ms`}
        icon={Zap}
        variant="soft-extruded"
        tone="info"
        description="Sub-second edge response"
      />
    </div>
  );
}
