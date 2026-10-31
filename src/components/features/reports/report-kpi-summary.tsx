"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraStatDto,
  IncidentItem,
  ReportGenerationDto,
  ReportTemplateDto,
  SiteItem,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";
import {
  ReportStatsDetailPanel,
  type ReportStatKey,
} from "./report-stats-detail-panel";

export interface ReportKpiSummaryProps {
  summary?: StatisticsSummaryDto | null;
  reportsCount?: number;
  loading?: boolean;
  selectedStat?: ReportStatKey | null;
  onSelectStat?: (stat: ReportStatKey | null) => void;
  distribution?: ViolationTypeStatDto[];
  trends?: TrendItemDto[];
  cameraRankings?: CameraStatDto[];
  templates?: ReportTemplateDto[];
  history?: ReportGenerationDto[];
  sites?: SiteItem[];
  incidents?: IncidentItem[];
  onGenerateReport?: (template?: ReportTemplateDto) => void;
}

export function ReportKpiSummary({
  summary,
  reportsCount,
  loading = false,
  selectedStat: propSelectedStat,
  onSelectStat,
  distribution = [],
  trends = [],
  cameraRankings = [],
  templates = [],
  history = [],
  sites = [],
  incidents = [],
  onGenerateReport,
}: ReportKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] =
    useState<ReportStatKey | null>(null);

  const activeStat =
    propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: ReportStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const totalViolations = summary?.totalIncidents ?? 0;
  const complianceRate = summary
    ? `${summary.complianceRate.toFixed(1)}%`
    : "0.0%";
  const mttr = summary
    ? `${summary.meanTimeToResolveHours.toFixed(1)} ${isVietnamese ? "giờ" : "hrs"}`
    : `0.0 ${isVietnamese ? "giờ" : "hrs"}`;
  const effectiveReportsCount = reportsCount ?? history.length ?? 0;

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
        {/* 1. Tổng số vi phạm */}
        <StatsCard
          title={t("reports.kpi.totalViolations")}
          value={loading ? "..." : totalViolations}
          icon={AlertTriangle}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("reports.kpi.totalViolationsDesc")}
          onClick={() => handleToggle("totalViolations")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "totalViolations"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "totalViolations" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("reports.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("reports.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Tỷ lệ tuân thủ */}
        <StatsCard
          title={t("reports.kpi.complianceRate")}
          value={loading ? "..." : complianceRate}
          icon={CheckCircle2}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("reports.kpi.complianceRateDesc")}
          onClick={() => handleToggle("complianceRate")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "complianceRate"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "complianceRate" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("reports.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("reports.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Thời gian khắc phục trung bình (MTTR) */}
        <StatsCard
          title={t("reports.kpi.mttr")}
          value={loading ? "..." : mttr}
          icon={Clock}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("reports.kpi.mttrDesc")}
          onClick={() => handleToggle("mttr")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "mttr" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "mttr" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("reports.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("reports.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Báo cáo đã xuất */}
        <StatsCard
          title={t("reports.kpi.reportsCount")}
          value={loading ? "..." : effectiveReportsCount}
          icon={FileText}
          variant="soft-extruded"
          tone="primary"
          showGlow={false}
          description={t("reports.kpi.reportsCountDesc")}
          onClick={() => handleToggle("reportsCount")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "reportsCount"
              ? sunkenClass
              : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "reportsCount" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {t("reports.stats.collapse")} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {t("reports.stats.viewDetail")} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung thông tin chi tiết mở rộng ngay dưới stats */}
      {activeStat && (
        <ReportStatsDetailPanel
          activeStat={activeStat}
          summary={summary}
          distribution={distribution}
          trends={trends}
          cameraRankings={cameraRankings}
          templates={templates}
          history={history}
          sites={sites}
          incidents={incidents}
          onClose={() => handleToggle(activeStat)}
          onGenerateReport={onGenerateReport}
        />
      )}
    </div>
  );
}
