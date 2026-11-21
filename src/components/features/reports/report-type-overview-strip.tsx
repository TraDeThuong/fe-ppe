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
import type { ReportTemplateDto } from "@/types";

export interface ReportTypeOverviewStripProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  countsByType: Record<string, number>;
  totalCount: number;
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
      count: countsByType.DAILY ?? 0,
      icon: CalendarDays,
    },
    {
      type: "WEEKLY",
      title: t("reports.types.weeklyTitle"),
      subtitle: t("reports.types.weeklyDesc"),
      formatHint: "PDF",
      count: countsByType.WEEKLY ?? 0,
      icon: CalendarRange,
    },
    {
      type: "MONTHLY",
      title: t("reports.types.monthlyTitle"),
      subtitle: t("reports.types.monthlyDesc"),
      formatHint: "EXCEL",
      count: countsByType.MONTHLY ?? 0,
      icon: CalendarCheck2,
    },
    {
      type: "VIOLATION_SUMMARY",
      title: t("reports.types.violationTitle"),
      subtitle: t("reports.types.violationDesc"),
      formatHint: "PDF / XLSX",
      count: countsByType.VIOLATION_SUMMARY ?? 0,
      icon: ShieldAlert,
    },
    {
      type: "AI_PERFORMANCE",
      title: t("reports.types.aiTitle"),
      subtitle: t("reports.types.aiDesc"),
      formatHint: "PDF",
      count: countsByType.AI_PERFORMANCE ?? 0,
      icon: Cpu,
    },
  ];

  const hasTemplates = templates.some(
    (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE",
  );

  return (
    <section
      aria-label={t("reports.types.sectionTitle")}
      className={`rounded-3xl p-4 sm:p-5 border border-white/50 dark:border-white/5 ${NM.extruded}`}
    >
      {/* Header tích hợp gọn trong cùng 1 card */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          <h3 className="text-sm font-extrabold tracking-tight text-foreground">
            {t("reports.types.sectionTitle")}
          </h3>
          <span className="hidden sm:inline-block text-muted-foreground/40">•</span>
          <p className="hidden sm:block text-[11px] font-medium text-muted-foreground">
            {t("reports.types.sectionDesc")}
          </p>
        </div>

        {selectedType && (
          <button
            type="button"
            onClick={() => onSelectType("")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-primary transition-all cursor-pointer border border-white/40 dark:border-white/10 ${NM.recessed} hover:brightness-105 active:scale-95`}
          >
            <span>
              {isVietnamese ? "Xem tất cả loại báo cáo" : "Show all report types"}
            </span>
          </button>
        )}
      </div>

      {/* Khay chứa lõm (Recessed Well) gom tất cả item thành 1 cụm liền mạch */}
      <div
        className={`grid grid-cols-1 gap-2 rounded-2xl p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${NM.recessed}`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.type;

          return (
            <div
              key={item.type || "ALL"}
              role="button"
              tabIndex={0}
              onClick={() => onSelectType(item.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectType(item.type);
                }
              }}
              className={`group relative flex cursor-pointer flex-col justify-between rounded-xl p-2.5 text-left transition-all duration-200 select-none ${isSelected
                  ? `${NM.extruded} bg-background/60 border border-primary/30`
                  : "border border-transparent hover:bg-white/30 dark:hover:bg-white/[0.03]"
                }`}
            >
              {/* Hàng trên: Icon bên trái + Nội dung + Count bên phải (tiết kiệm chiều cao tối đa) */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${isSelected
                      ? "bg-primary text-primary-foreground shadow-[0_4px_10px_-2px_hsl(var(--primary)/0.5)]"
                      : "bg-primary/10 text-primary group-hover:bg-primary/15"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={`truncate text-xs font-extrabold tracking-tight transition-colors ${isSelected
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                        }`}
                    >
                      {item.title}
                    </p>

                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold tabular-nums ${isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-black/[0.04] dark:bg-white/[0.06] text-foreground/80"
                        }`}
                    >
                      {item.count}
                    </span>
                  </div>

                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              {/* Hàng dưới siêu gọn: Format hint + Nút xuất nhanh nằm chung 1 dòng */}
              {(item.formatHint || (canExportReports && item.type && hasTemplates)) && (
                <div className="mt-2 flex items-center justify-between gap-1 border-t border-border/30 pt-1.5">
                  {item.formatHint ? (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground/75">
                      {item.formatHint}
                    </span>
                  ) : (
                    <span />
                  )}

                  {canExportReports && item.type && hasTemplates && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickGenerateForType(item.type);
                      }}
                      title={isVietnamese ? "Xuất báo cáo loại này" : "Generate this type"}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer active:scale-95"
                    >
                      <FilePlus2 className="h-3 w-3" />
                      <span>{isVietnamese ? "Xuất" : "Export"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
