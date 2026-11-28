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

  // Giá trị chính: "..." khi đang tải, "–" khi không có dữ liệu. Số phụ: "–" khi không có dữ liệu.
  const main = (pick: (s: ReportArchiveStats) => number | string) =>
    loading ? "..." : stats ? pick(stats) : "–";
  const sub = (pick: (s: ReportArchiveStats) => number) =>
    stats ? String(pick(stats)) : "–";

  const cards = [
    {
      key: "all" as const,
      title: isVietnamese ? "Hồ sơ Đã Phát hành" : "Published Reports",
      value: main((s) => s.totalReports),
      icon: FileText,
      tone: "primary" as const,
      description: isVietnamese
        ? `${sub((s) => s.completedCount)} hoàn tất · ${sub((s) => s.processingCount)} đang xử lý`
        : `${sub((s) => s.completedCount)} completed · ${sub((s) => s.processingCount)} active`,
      // API hiện có không lọc theo định dạng tệp nên không đếm PDF/Excel chính xác được;
      // dùng số hồ sơ lỗi (đếm được theo trạng thái) để thẻ vẫn đủ thông tin.
      footer: isVietnamese
        ? `${sub((s) => s.failedCount)} thất bại`
        : `${sub((s) => s.failedCount)} failed`,
    },
    {
      key: "periodic" as const,
      title: isVietnamese ? "Báo cáo Định kỳ" : "Periodic Reports",
      value: main((s) => s.periodicCount),
      icon: CalendarClock,
      tone: "success" as const,
      description: isVietnamese
        ? "Ca ngày, tổng kết tuần & kiểm toán tháng"
        : "Daily shift, weekly & monthly audits",
      footer: `D:${sub((s) => s.byType.DAILY ?? 0)} · W:${sub((s) => s.byType.WEEKLY ?? 0)} · M:${sub((s) => s.byType.MONTHLY ?? 0)}`,
    },
    {
      key: "specialized" as const,
      title: isVietnamese ? "Báo cáo Chuyên đề & AI" : "Specialized & AI",
      value: main((s) => s.specializedCount),
      icon: Cpu,
      tone: "warning" as const,
      description: isVietnamese
        ? "Tổng hợp vi phạm PPE & hiệu năng mô hình"
        : "Violation summary & AI telemetry",
      footer: isVietnamese
        ? `${sub((s) => s.byType.VIOLATION_SUMMARY ?? 0)} vi phạm · ${sub((s) => s.byType.AI_PERFORMANCE ?? 0)} AI`
        : `${sub((s) => s.byType.VIOLATION_SUMMARY ?? 0)} violation · ${sub((s) => s.byType.AI_PERFORMANCE ?? 0)} AI`,
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
