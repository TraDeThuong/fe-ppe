"use client";

import {
  CalendarClock,
  Cpu,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { ReportArchiveStats } from "@/lib/report-analytics-data";

export type ReportArchiveKpiKey = "all" | "periodic" | "specialized" | "templates";

export interface ReportsArchiveKpiSummaryProps {
  stats: ReportArchiveStats;
  loading?: boolean;
  activeFilter?: ReportArchiveKpiKey | null;
  onSelectCard?: (key: ReportArchiveKpiKey) => void;
}

export function ReportsArchiveKpiSummary({
  stats,
  loading = false,
  activeFilter = null,
  onSelectCard,
}: ReportsArchiveKpiSummaryProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  const cards = [
    {
      key: "all" as const,
      title: isVietnamese ? "Hồ sơ Đã Phát hành" : "Published Reports",
      value: loading ? "..." : stats.totalReports,
      icon: FileText,
      tone: "primary" as const,
      description: isVietnamese
        ? `${stats.completedCount} hoàn tất · ${stats.processingCount} đang xử lý`
        : `${stats.completedCount} completed · ${stats.processingCount} active`,
      footer: isVietnamese
        ? `${stats.pdfCount} PDF · ${stats.excelCount} Excel/CSV`
        : `${stats.pdfCount} PDF · ${stats.excelCount} Excel/CSV`,
    },
    {
      key: "periodic" as const,
      title: isVietnamese ? "Báo cáo Định kỳ" : "Periodic Reports",
      value: loading ? "..." : stats.periodicCount,
      icon: CalendarClock,
      tone: "success" as const,
      description: isVietnamese
        ? "Ca ngày, tổng kết tuần & kiểm toán tháng"
        : "Daily shift, weekly & monthly audits",
      footer: `D:${stats.byType.DAILY ?? 0} · W:${stats.byType.WEEKLY ?? 0} · M:${stats.byType.MONTHLY ?? 0}`,
    },
    {
      key: "specialized" as const,
      title: isVietnamese ? "Báo cáo Chuyên đề & AI" : "Specialized & AI",
      value: loading ? "..." : stats.specializedCount,
      icon: Cpu,
      tone: "warning" as const,
      description: isVietnamese
        ? "Tổng hợp vi phạm PPE & hiệu năng mô hình"
        : "Violation summary & AI telemetry",
      footer: isVietnamese
        ? `${stats.byType.VIOLATION_SUMMARY ?? 0} vi phạm · ${stats.byType.AI_PERFORMANCE ?? 0} AI`
        : `${stats.byType.VIOLATION_SUMMARY ?? 0} violation · ${stats.byType.AI_PERFORMANCE ?? 0} AI`,
    },
    {
      key: "templates" as const,
      title: isVietnamese ? "Mẫu Báo cáo Chuẩn" : "Standard Templates",
      value: loading ? "..." : `${stats.activeTemplatesCount}/${stats.totalTemplatesCount}`,
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
