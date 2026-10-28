"use client";

import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, Cpu, Gauge, Zap } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { AiPerformanceDto } from "@/types";
import { AiMetricsStatsDetailPanel, type AiMetricStatKey } from "./ai-metrics-stats-detail-panel";

export interface AiMetricsKpiSummaryProps {
  performance?: AiPerformanceDto | null;
  loading?: boolean;
  selectedStat?: AiMetricStatKey | null;
  onSelectStat?: (stat: AiMetricStatKey | null) => void;
}

export function AiMetricsKpiSummary({
  performance,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
}: AiMetricsKpiSummaryProps) {
  const { t } = useLocale();

  const [internalSelectedStat, setInternalSelectedStat] = useState<AiMetricStatKey | null>(null);

  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: AiMetricStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

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

  // Hiệu ứng chìm sâu (neumorphic sunken) khi card được chọn:
  // - Chìm xuống dưới (translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring bao quanh
  // - Khi hover vẫn giữ nguyên trạng thái chìm sâu
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className="space-y-4">
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop giống trang Roles */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. mAP@50 */}
        <StatsCard
          title={t("aiMetrics.kpi.map50")}
          value={loading ? "..." : mapFormatted}
          icon={Zap}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("aiMetrics.kpi.mapDesc")}
          onClick={() => handleToggle("map50")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "map50" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "map50" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("aiMetrics.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("aiMetrics.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Độ trễ suy luận */}
        <StatsCard
          title={t("aiMetrics.kpi.latency")}
          value={loading ? "..." : latencyFormatted}
          icon={Gauge}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("aiMetrics.kpi.latencyDesc")}
          onClick={() => handleToggle("latency")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "latency" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "latency" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("aiMetrics.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("aiMetrics.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Tốc độ khung hình (FPS) */}
        <StatsCard
          title={t("aiMetrics.kpi.fps")}
          value={loading ? "..." : fpsFormatted}
          icon={Activity}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("aiMetrics.kpi.fpsDesc")}
          onClick={() => handleToggle("fps")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "fps" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "fps" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("aiMetrics.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("aiMetrics.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Tổng lượt suy luận */}
        <StatsCard
          title={t("aiMetrics.kpi.samples")}
          value={loading ? "..." : samplesFormatted}
          icon={Cpu}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("aiMetrics.kpi.samplesDesc")}
          onClick={() => handleToggle("samples")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "samples" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "samples" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("aiMetrics.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("aiMetrics.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <AiMetricsStatsDetailPanel
          activeStat={activeStat}
          performance={performance}
          onSelectStat={(stat) => {
            if (onSelectStat) {
              onSelectStat(stat);
            } else {
              setInternalSelectedStat(stat);
            }
          }}
          onClose={() => handleToggle(activeStat)}
        />
      )}
    </div>
  );
}
