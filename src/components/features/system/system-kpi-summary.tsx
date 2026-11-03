"use client";

import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, Cpu, Server, Settings2 } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { SystemConfigItem, SystemHealthReport } from "@/types";
import {
  SystemStatsDetailPanel,
  type SystemStatKey,
} from "./system-stats-detail-panel";
import type { SystemTabKey } from "./system-tabs";

export type { SystemStatKey };

export interface SystemKpiSummaryProps {
  totalConfigs: number;
  healthReport?: SystemHealthReport;
  featureFlags?: SystemConfigItem[];
  configs?: SystemConfigItem[];
  loading?: boolean;
  selectedStat?: SystemStatKey | null;
  onSelectStat?: (stat: SystemStatKey | null) => void;
  activeTab?: SystemTabKey;
  onSelectTab?: (tab: SystemTabKey) => void;
  onRefreshHealth?: () => void;
  isRefreshingHealth?: boolean;
  onCreateConfig?: () => void;
  onToggleFlag?: (flag: SystemConfigItem, enabled: boolean) => void;
  canManage?: boolean;
}

export function SystemKpiSummary({
  totalConfigs,
  healthReport,
  featureFlags = [],
  configs = [],
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  activeTab: _activeTab,
  onSelectTab,
  onRefreshHealth,
  isRefreshingHealth = false,
  onCreateConfig,
  onToggleFlag,
  canManage = true,
}: SystemKpiSummaryProps) {
  const { t } = useLocale();

  const [internalSelectedStat, setInternalSelectedStat] = useState<SystemStatKey | null>(null);

  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: SystemStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const healthyServices = healthReport?.healthyCount ?? 12;
  const totalServices = healthReport?.totalServices ?? 12;
  const avgLatency = healthReport?.averageLatencyMs ?? 24;
  const activeFlagsCount = featureFlags.filter((f) => Boolean(f.value)).length;

  // Hiệu ứng chìm sâu (neumorphic sunken) khi card được chọn (chuẩn thiết kế như trang /roles):
  // - Chìm xuống dưới (!translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring bao quanh
  // - Khi hover vẫn giữ nguyên trạng thái chìm sâu
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className="space-y-4">
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Feature Flags */}
        <StatsCard
          title={t("system.stats.activeFlags")}
          value={loading ? "..." : `${activeFlagsCount}/${featureFlags.length}`}
          icon={Cpu}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("system.stats.activeFlagsDesc")}
          onClick={() => handleToggle("flags")}
          className={`transition-all duration-200 ${
            activeStat === "flags" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "flags" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("system.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("system.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Biến Cấu hình */}
        <StatsCard
          title={t("system.stats.totalConfigs")}
          value={loading ? "..." : totalConfigs}
          icon={Settings2}
          variant="soft-extruded"
          tone="info"
          showGlow={false}
          description={t("system.stats.totalConfigsDesc")}
          onClick={() => handleToggle("configs")}
          className={`transition-all duration-200 ${
            activeStat === "configs" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "configs" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("system.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("system.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Cụm Dịch vụ */}
        <StatsCard
          title={t("system.stats.servicesHealthy")}
          value={loading ? "..." : `${healthyServices}/${totalServices}`}
          icon={Server}
          variant="soft-extruded"
          tone={healthyServices === totalServices ? "success" : "warning"}
          showGlow={false}
          description={t("system.stats.servicesHealthyDesc")}
          onClick={() => handleToggle("health")}
          className={`transition-all duration-200 ${
            activeStat === "health" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "health" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("system.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("system.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Độ trễ trung bình & Hạ tầng */}
        <StatsCard
          title={t("system.stats.averageLatency")}
          value={loading ? "..." : `${avgLatency} ms`}
          icon={Activity}
          variant="soft-extruded"
          tone={avgLatency < 100 ? "success" : "danger"}
          showGlow={false}
          description={t("system.stats.averageLatencyDesc")}
          onClick={() => handleToggle("latency")}
          className={`transition-all duration-200 ${
            activeStat === "latency" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "latency" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("system.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("system.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <SystemStatsDetailPanel
          activeStat={activeStat}
          totalConfigs={totalConfigs}
          healthReport={healthReport}
          featureFlags={featureFlags}
          configs={configs}
          onClose={() => handleToggle(activeStat)}
          onSelectTab={(tab) => {
            onSelectTab?.(tab);
          }}
          onRefreshHealth={() => onRefreshHealth?.()}
          isRefreshingHealth={isRefreshingHealth}
          onCreateConfig={onCreateConfig}
          onToggleFlag={onToggleFlag}
          canManage={canManage}
        />
      )}
    </div>
  );
}
