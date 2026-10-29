"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { AuditLogItem, AuditSummaryDto } from "@/types";
import {
  AuditStatsDetailPanel,
  type AuditStatKey,
} from "./audit-stats-detail-panel";

export interface AuditKpiSummaryProps {
  summary?: AuditSummaryDto;
  logs?: AuditLogItem[];
  totalLogsCount: number;
  loading?: boolean;
  selectedStat?: AuditStatKey | null;
  onSelectStat?: (stat: AuditStatKey | null) => void;
  onOpenExport?: () => void;
  onSwitchTab?: (tab: "all" | "configChanges" | "incidentReviews") => void;
  onFilterStatus?: (status: "SUCCESS" | "FAILED" | "") => void;
  onFilterAction?: (action: string) => void;
  onSelectRecord?: (record: AuditLogItem) => void;
}

export function AuditKpiSummary({
  summary,
  logs = [],
  totalLogsCount,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  onOpenExport,
  onSwitchTab,
  onFilterStatus,
  onFilterAction,
  onSelectRecord,
}: AuditKpiSummaryProps) {
  const { t } = useLocale();

  const [internalSelectedStat, setInternalSelectedStat] = useState<AuditStatKey | null>(null);

  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: AuditStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const total = summary?.totalLogs ?? totalLogsCount;
  const configChanges = summary?.configChangesCount ?? 0;
  const incidentReviews = summary?.incidentReviewsCount ?? 0;
  const successRate = summary?.successRate ?? 99.8;

  // Hiệu ứng chìm sâu (neumorphic sunken) khi card được chọn:
  // - Chìm xuống dưới (translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring bao quanh
  // - Khi hover vẫn giữ nguyên trạng thái chìm sâu
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <div className="space-y-4">
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số bản ghi kiểm toán */}
        <StatsCard
          title={t("audit.kpi.totalLogs")}
          value={loading ? "..." : total.toLocaleString()}
          icon={FileText}
          variant="soft-extruded"
          tone="info"
          showGlow={false}
          description={t("audit.stats.totalLogsDesc")}
          onClick={() => handleToggle("totalLogs")}
          className={`transition-all duration-200 ${
            activeStat === "totalLogs" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalLogs" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("audit.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("audit.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Thay đổi cấu hình */}
        <StatsCard
          title={t("audit.kpi.configChanges")}
          value={loading ? "..." : configChanges}
          icon={Settings}
          variant="soft-extruded"
          tone="warning"
          showGlow={false}
          description={t("audit.stats.configChangesDesc")}
          onClick={() => handleToggle("configChanges")}
          className={`transition-all duration-200 ${
            activeStat === "configChanges" ? sunkenClass : "hover:border-warning/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "configChanges" ? (
                <span className="flex items-center text-warning font-bold gap-0.5">
                  {t("audit.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("audit.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Thẩm duyệt sự cố PPE */}
        <StatsCard
          title={t("audit.kpi.incidentReviews")}
          value={loading ? "..." : incidentReviews}
          icon={ShieldAlert}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("audit.stats.incidentReviewsDesc")}
          onClick={() => handleToggle("incidentReviews")}
          className={`transition-all duration-200 ${
            activeStat === "incidentReviews" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "incidentReviews" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("audit.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("audit.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Tỷ lệ thực thi thành công */}
        <StatsCard
          title={t("audit.kpi.successRate")}
          value={loading ? "..." : `${successRate}%`}
          icon={CheckCircle2}
          variant="soft-extruded"
          tone="success"
          showGlow={false}
          description={t("audit.stats.successRateDesc")}
          onClick={() => handleToggle("successRate")}
          className={`transition-all duration-200 ${
            activeStat === "successRate" ? sunkenClass : "hover:border-success/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "successRate" ? (
                <span className="flex items-center text-success font-bold gap-0.5">
                  {t("audit.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("audit.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <AuditStatsDetailPanel
          activeStat={activeStat}
          summary={summary}
          logs={logs}
          totalLogsCount={totalLogsCount}
          onClose={() => handleToggle(activeStat)}
          onOpenExport={onOpenExport}
          onSwitchTab={onSwitchTab}
          onFilterStatus={onFilterStatus}
          onFilterAction={onFilterAction}
          onSelectRecord={onSelectRecord}
        />
      )}
    </div>
  );
}
