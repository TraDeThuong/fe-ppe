"use client";

import {
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  Cpu,
  FilePlus2,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { NM } from "@/components/features/ai-test/nm-styles";
import { isReportTypeGroup, REPORT_TYPE_GROUPS } from "@/lib/report-archive";
import type { ReportTemplateDto } from "@/types";

export interface ReportTypeOverviewStripProps {
  /** "" (tất cả), 1 loại (DAILY…) hoặc 1 nhóm (PERIODIC / SPECIALIZED) */
  selectedType: string;
  onSelectType: (type: string) => void;
  /** Số hồ sơ theo loại của cả cơ sở (không theo trang/bộ lọc); undefined khi chưa có dữ liệu */
  countsByType?: Record<string, number>;
  totalCount?: number;
  templates: ReportTemplateDto[];
  canExportReports: boolean;
  onQuickGenerateForType: (reportType: string) => void;
}

export function ReportTypeOverviewStrip({
  selectedType,
  onSelectType,
  countsByType,
  totalCount,
  templates,
  canExportReports,
  onQuickGenerateForType,
}: ReportTypeOverviewStripProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const items = [
    {
      type: "",
      title: t("reports.types.allTitle"),
      subtitle: t("reports.types.allDesc"),
      formatHint: "PDF / XLSX",
      count: totalCount,
      icon: Layers,
    },
    {
      type: "DAILY",
      title: t("reports.types.dailyTitle"),
      subtitle: t("reports.types.dailyDesc"),
      formatHint: "PDF",
      count: countsByType?.DAILY,
      icon: CalendarDays,
    },
    {
      type: "WEEKLY",
      title: t("reports.types.weeklyTitle"),
      subtitle: t("reports.types.weeklyDesc"),
      formatHint: "PDF",
      count: countsByType?.WEEKLY,
      icon: CalendarRange,
    },
    {
      type: "MONTHLY",
      title: t("reports.types.monthlyTitle"),
      subtitle: t("reports.types.monthlyDesc"),
      formatHint: "EXCEL",
      count: countsByType?.MONTHLY,
      icon: CalendarCheck2,
    },
    {
      type: "VIOLATION_SUMMARY",
      title: t("reports.types.violationTitle"),
      subtitle: t("reports.types.violationDesc"),
      formatHint: "PDF / XLSX",
      count: countsByType?.VIOLATION_SUMMARY,
      icon: ShieldAlert,
    },
    {
      type: "AI_PERFORMANCE",
      title: t("reports.types.aiTitle"),
      subtitle: t("reports.types.aiDesc"),
      formatHint: "PDF",
      count: countsByType?.AI_PERFORMANCE,
      icon: Cpu,
    },
  ];

  const hasTemplates = templates.some(
    (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE",
  );

  // Đang lọc theo nhóm (từ thẻ KPI hoặc dropdown): làm nổi các loại thuộc nhóm.
  const selectedGroupTypes: readonly string[] = isReportTypeGroup(selectedType)
    ? REPORT_TYPE_GROUPS[selectedType]
    : [];

  return (
    <section
      aria-label={t("reports.types.sectionTitle")}
      className={`rounded-2xl p-2.5 sm:p-3 border border-white/50 dark:border-white/5 ${NM.extruded}`}
    >
      {/* Header siêu gọn 1 dòng */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
          <h3 className="truncate text-xs font-extrabold tracking-tight text-foreground">
            {t("reports.types.sectionTitle")}
          </h3>
          <span className="hidden md:inline text-muted-foreground/30">•</span>
          <p className="hidden md:block truncate text-[11px] text-muted-foreground">
            {t("reports.types.sectionDesc")}
          </p>
        </div>

        {selectedType && (
          <button
            type="button"
            onClick={() => onSelectType("")}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-primary transition-all cursor-pointer border border-white/40 dark:border-white/10 ${NM.recessed} hover:brightness-105 active:scale-95`}
          >
            {isVietnamese ? "Tất cả" : "All"}
          </button>
        )}
      </div>

      {/* Mobile: Cuộn ngang (không chiếm height) | Tablet/Desktop: Grid 2 -> 3 -> 6 cột */}
      <div
        className={`flex gap-1.5 overflow-x-auto no-scrollbar rounded-xl p-1.5 sm:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 sm:overflow-visible ${NM.recessed}`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.type;
          const isInSelectedGroup = !isSelected && selectedGroupTypes.includes(item.type);
          const showQuickExport = canExportReports && item.type && hasTemplates;

          return (
            <div
              key={item.type || "ALL"}
              role="button"
              tabIndex={0}
              title={item.formatHint ? `${item.subtitle} (${item.formatHint})` : item.subtitle}
              onClick={() => onSelectType(item.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectType(item.type);
                }
              }}
              className={`group relative flex min-w-[168px] sm:min-w-0 shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer select-none ${isSelected
                  ? `${NM.extruded} bg-background/75 border border-primary/35`
                  : isInSelectedGroup
                    ? "border border-primary/25 bg-background/50"
                    : "border border-transparent hover:bg-white/40 dark:hover:bg-white/[0.04]"
                }`}
            >
              {/* Cụm trái: Icon + Title + Subtitle */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isInSelectedGroup
                        ? "bg-primary/20 text-primary"
                        : "bg-primary/10 text-primary group-hover:bg-primary/15"
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p
                      className={`truncate text-[11px] font-bold leading-tight transition-colors ${isSelected || isInSelectedGroup
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                        }`}
                    >
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground/80">
                    {item.subtitle}
                    {item.formatHint && (
                      <span className="ml-1 font-mono text-[9px] opacity-70">
                        · {item.formatHint}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Cụm phải: Badge Count + Nút xuất nhanh tối giản */}
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold tabular-nums leading-none ${isSelected
                      ? "bg-primary text-primary-foreground"
                      : isInSelectedGroup
                        ? "bg-primary/15 text-primary"
                        : "bg-black/[0.05] dark:bg-white/[0.07] text-foreground/75"
                    }`}
                >
                  {item.count ?? "–"}
                </span>

                {showQuickExport && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickGenerateForType(item.type);
                    }}
                    title={isVietnamese ? "Xuất báo cáo loại này" : "Export this type"}
                    aria-label={isVietnamese ? "Xuất báo cáo loại này" : "Export this type"}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-primary/80 transition-all hover:bg-primary hover:text-primary-foreground active:scale-90 cursor-pointer"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
