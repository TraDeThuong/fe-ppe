"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";
import {
  IncidentStatsDetailPanel,
  type IncidentStatKey,
} from "./incident-stats-detail-panel";

export interface IncidentKpiSummaryProps {
  incidents: IncidentItem[];
  totalIncidentsCount?: number;
  loading?: boolean;
  selectedStat?: IncidentStatKey | null;
  onSelectStat?: (stat: IncidentStatKey | null) => void;
  onReview?: (incident: IncidentItem) => void;
  onAssign?: (incident: IncidentItem) => void;
  onResolve?: (incident: IncidentItem) => void;
  onFilterStatus?: (status: string) => void;
  onFilterSeverity?: (severity: string) => void;
  onFilterViolation?: (violation: string) => void;
}

export function IncidentKpiSummary({
  incidents,
  totalIncidentsCount,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  onReview,
  onAssign,
  onResolve,
  onFilterStatus,
  onFilterSeverity,
  onFilterViolation,
}: IncidentKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] = useState<IncidentStatKey | null>(null);
  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: IncidentStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const total = totalIncidentsCount !== undefined ? totalIncidentsCount : incidents.length;
  const pending = incidents.filter((i) => i.status === "PENDING_REVIEW").length;
  const critical = incidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length;
  const resolved = incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;

  // Hiệu ứng chìm sâu (neumorphic sunken) chuẩn mực giống trang Role:
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
        {/* 1. Tổng sự cố */}
        <StatsCard
          title={t("incidents.kpi.total")}
          value={loading ? "..." : total}
          icon={AlertTriangle}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("incidents.kpi.totalDesc")}
          onClick={() => handleToggle("total")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "total" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "total" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("incidents.stats.collapse") || (isVietnamese ? "Thu gọn" : "Collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("incidents.stats.viewDetail") || (isVietnamese ? "Chi tiết" : "Details")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Chờ thẩm duyệt */}
        <StatsCard
          title={t("incidents.kpi.pendingReview")}
          value={loading ? "..." : pending}
          icon={Clock}
          variant="soft-extruded"
          tone="warning"
          showGlow={false}
          description={t("incidents.kpi.pendingReviewDesc")}
          onClick={() => handleToggle("pendingReview")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "pendingReview" ? sunkenClass : "hover:border-warning/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "pendingReview" ? (
                <span className="flex items-center text-warning font-bold gap-0.5">
                  {t("incidents.stats.collapse") || (isVietnamese ? "Thu gọn" : "Collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("incidents.stats.viewDetail") || (isVietnamese ? "Chi tiết" : "Details")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Vi phạm khẩn cấp */}
        <StatsCard
          title={t("incidents.kpi.critical")}
          value={loading ? "..." : critical}
          icon={AlertOctagon}
          variant="soft-extruded"
          tone="danger"
          showGlow={false}
          description={t("incidents.kpi.criticalDesc")}
          onClick={() => handleToggle("critical")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "critical" ? sunkenClass : "hover:border-danger/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "critical" ? (
                <span className="flex items-center text-danger font-bold gap-0.5">
                  {t("incidents.stats.collapse") || (isVietnamese ? "Thu gọn" : "Collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("incidents.stats.viewDetail") || (isVietnamese ? "Chi tiết" : "Details")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Đã giải quyết */}
        <StatsCard
          title={t("incidents.kpi.resolved")}
          value={loading ? "..." : resolved}
          icon={CheckCircle}
          variant="soft-extruded"
          tone="success"
          showGlow={false}
          description={t("incidents.kpi.resolvedDesc")}
          onClick={() => handleToggle("resolved")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "resolved" ? sunkenClass : "hover:border-success/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "resolved" ? (
                <span className="flex items-center text-success font-bold gap-0.5">
                  {t("incidents.stats.collapse") || (isVietnamese ? "Thu gọn" : "Collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("incidents.stats.viewDetail") || (isVietnamese ? "Chi tiết" : "Details")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <IncidentStatsDetailPanel
          activeStat={activeStat}
          incidents={incidents}
          loading={loading}
          onClose={() => handleToggle(activeStat)}
          onReview={onReview}
          onAssign={onAssign}
          onResolve={onResolve}
          onFilterStatus={onFilterStatus}
          onFilterSeverity={onFilterSeverity}
          onFilterViolation={onFilterViolation}
        />
      )}
    </div>
  );
}
