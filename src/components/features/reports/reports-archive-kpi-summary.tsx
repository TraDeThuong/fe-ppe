"use client";

import {
  CalendarClock,
  Cpu,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { ReportArchiveStats, ReportTemplateCounts } from "@/lib/report-archive";

export type ReportArchiveKpiKey = "all" | "periodic" | "specialized" | "templates";

export interface ReportsArchiveKpiSummaryProps {
  /** Số đếm của cả cơ sở; undefined khi chưa có: hiện "..." lúc tải, "–" khi lỗi (không hiện 0 giả). */
  stats?: ReportArchiveStats;
  loading?: boolean;
  /** Đếm từ danh sách mẫu; undefined khi danh sách chưa tải. */
  templateCounts?: ReportTemplateCounts;
  templatesLoading?: boolean;
  activeFilter?: ReportArchiveKpiKey | null;
  onSelectCard?: (key: ReportArchiveKpiKey) => void;
}

export function ReportsArchiveKpiSummary({
  stats,
  loading = false,
  templateCounts,
  templatesLoading = false,
  activeFilter = null,
  onSelectCard,
}: ReportsArchiveKpiSummaryProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  const count = (value?: number) => value ?? (loading ? "..." : "–");

  const cards = [
    {
      key: "all" as const,
      title: isVietnamese ? "Tổng hồ sơ báo cáo" : "Total report records",
      value: count(stats?.totalReports),
      icon: FileText,
      tone: "primary" as const,
      description: isVietnamese
        ? `${count(stats?.completedCount)} hoàn tất · ${count(stats?.processingCount)} đang xử lý`
        : `${count(stats?.completedCount)} completed · ${count(stats?.processingCount)} in progress`,
      footer: isVietnamese
        ? `${count(stats?.failedCount)} thất bại`
        : `${count(stats?.failedCount)} failed`,
    },
    {
      key: "periodic" as const,
      title: isVietnamese ? "Báo cáo Định kỳ" : "Periodic Reports",
      value: count(stats?.periodicCount),
      icon: CalendarClock,
      tone: "success" as const,
      description: isVietnamese
        ? "Ca ngày, tổng kết tuần & kiểm toán tháng"
        : "Daily shift, weekly & monthly audits",
      footer: `D:${count(stats?.byType.DAILY)} · W:${count(stats?.byType.WEEKLY)} · M:${count(stats?.byType.MONTHLY)}`,
    },
    {
      key: "specialized" as const,
      title: isVietnamese ? "Báo cáo Chuyên đề & AI" : "Specialized & AI",
      value: count(stats?.specializedCount),
      icon: Cpu,
      tone: "warning" as const,
      description: isVietnamese
        ? "Tổng hợp vi phạm PPE & hiệu năng mô hình"
        : "Violation summary & AI telemetry",
      footer: isVietnamese
        ? `${count(stats?.byType.VIOLATION_SUMMARY)} vi phạm · ${count(stats?.byType.AI_PERFORMANCE)} AI`
        : `${count(stats?.byType.VIOLATION_SUMMARY)} violation · ${count(stats?.byType.AI_PERFORMANCE)} AI`,
    },
    {
      key: "templates" as const,
      title: isVietnamese ? "Mẫu Báo cáo Chuẩn" : "Standard Templates",
      value: templateCounts
        ? `${templateCounts.active}/${templateCounts.total}`
        : templatesLoading
          ? "..."
          : "–",
      icon: LayoutTemplate,
      tone: "primary" as const,
      description: isVietnamese
        ? "Mẫu đang kích hoạt sẵn sàng xuất file"
        : "Active templates ready for export",
      footer: isVietnamese ? "Nhấn để xem danh mục mẫu" : "Click to jump to templates",
    },
  ];

  return (
    <section
      aria-label={isVietnamese ? "Chỉ số kho báo cáo" : "Reports archive KPIs"}
      aria-busy={loading || templatesLoading}
      className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
    >
      {cards.map((card) => {
        const isSelected = activeFilter === card.key;
        return (
          <StatsCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant="soft-extruded"
            tone={card.tone}
            showGlow={false}
            description={card.description}
            onClick={onSelectCard ? () => onSelectCard(card.key) : undefined}
            className={`transition-all duration-200 ${
              onSelectCard ? "cursor-pointer" : ""
            } ${isSelected ? sunkenClass : "hover:border-primary/30"}`}
            footer={
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {card.footer}
              </span>
            }
          />
        );
      })}
    </section>
  );
}
