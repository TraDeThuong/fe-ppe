"use client";

import { Activity, Cpu, Gauge, Zap } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { AiPerformanceDto } from "@/types";

export interface AiMetricsKpiSummaryProps {
  performance?: AiPerformanceDto | null;
  loading?: boolean;
}

export function AiMetricsKpiSummary({
  performance,
  loading = false,
}: AiMetricsKpiSummaryProps) {
  const { t } = useLocale();

  const mapFormatted = performance
    ? `${(performance.mAP50 * 100).toFixed(1)}%`
    : "94.8%";
  const latencyFormatted = performance
    ? `${performance.averageLatencyMs.toFixed(1)} ms`
    : "32.4 ms";
  const fpsFormatted = performance
    ? `${performance.averageFps.toFixed(1)} FPS`
    : "30.2 FPS";
  const samplesFormatted = performance
    ? `${(performance.totalFramesProcessed / 1000000).toFixed(2)}M`
    : "1.25M";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title={t("aiMetrics.kpi.map50")}
        value={loading ? "..." : mapFormatted}
        icon={Zap}
        variant="soft-extruded"
        tone="primary"
        description={t("aiMetrics.kpi.mapDesc")}
      />

      <StatsCard
        title={t("aiMetrics.kpi.latency")}
        value={loading ? "..." : latencyFormatted}
        icon={Gauge}
        variant="soft-extruded"
        tone="warning"
        description={t("aiMetrics.kpi.latencyDesc")}
      />

      <StatsCard
        title={t("aiMetrics.kpi.fps")}
        value={loading ? "..." : fpsFormatted}
        icon={Activity}
        variant="soft-extruded"
        tone="success"
        description={t("aiMetrics.kpi.fpsDesc")}
      />

      <StatsCard
        title={t("aiMetrics.kpi.samples")}
        value={loading ? "..." : samplesFormatted}
        icon={Cpu}
        variant="soft-extruded"
        tone="info"
        description={t("aiMetrics.kpi.samplesDesc")}
      />
    </div>
  );
}
