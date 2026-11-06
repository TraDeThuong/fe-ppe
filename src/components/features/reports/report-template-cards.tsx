
"use client";

import {
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  SendHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { ReportTemplateDto } from "@/types";

export interface ReportTemplateCardsProps {
  templates: ReportTemplateDto[];
  onSelectTemplate: (template: ReportTemplateDto) => void;
  canExport?: boolean;
}

export function ReportTemplateCards({
  templates,
  onSelectTemplate,
  canExport = true,
}: ReportTemplateCardsProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <section className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary shadow-[3px_3px_7px_rgba(0,0,0,0.10),-3px_-3px_7px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.035)]">
            <LayoutTemplate className="h-[17px] w-[17px]" />
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-tight text-foreground">
              {t("reports.templates.title")}
            </h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("reports.templates.desc")}
            </p>
          </div>
        </div>

        <span className="flex h-7 items-center rounded-lg bg-background px-2.5 text-[11px] font-bold tabular-nums text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.65)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_3px_rgba(255,255,255,0.025)]">
          {templates.length} {isVietnamese ? "mẫu" : "templates"}
        </span>
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-background px-6 py-10 text-center shadow-[inset_5px_5px_12px_rgba(0,0,0,0.07),inset_-5px_-5px_12px_rgba(255,255,255,0.7)] dark:shadow-[inset_5px_5px_12px_rgba(0,0,0,0.35),inset_-3px_-3px_8px_rgba(255,255,255,0.025)]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-[3px_3px_8px_rgba(0,0,0,0.09),-3px_-3px_8px_rgba(255,255,255,0.7)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.3)]">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            {isVietnamese
              ? "Chưa có mẫu báo cáo nào trên hệ thống."
              : "No report templates available."}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isVietnamese
              ? "Các mẫu báo cáo sẽ xuất hiện tại đây."
              : "Available report templates will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((tpl) => {
            const isExcel =
              tpl.fileType === "EXCEL" || tpl.fileType === "CSV";

            return (
              <article
                key={tpl.id}
                className="
                  group relative flex min-w-0 flex-col justify-between
                  overflow-hidden rounded-[20px]
                  border border-border/20
                  bg-background p-4
                  shadow-[6px_6px_14px_rgba(0,0,0,0.09),-5px_-5px_13px_rgba(255,255,255,0.78)]
                  transition-all duration-300 ease-out
                  hover:-translate-y-1
                  hover:shadow-[9px_10px_20px_rgba(0,0,0,0.12),-6px_-6px_15px_rgba(255,255,255,0.85)]
                  dark:shadow-[6px_6px_14px_rgba(0,0,0,0.35),-3px_-3px_9px_rgba(255,255,255,0.035)]
                  dark:hover:shadow-[9px_10px_20px_rgba(0,0,0,0.45),-3px_-3px_10px_rgba(255,255,255,0.05)]
                "
              >
                {/* Subtle Accent Decoration */}
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl transition-all duration-500 group-hover:bg-accent/20" />

                <div className="relative space-y-4">
                  {/* Icon + Version */}
                  <div className="flex items-start justify-between">
                    <div
                      className="
                        relative flex h-12 w-12 items-center justify-center
                        rounded-[15px] bg-background text-primary
                        shadow-[inset_3px_3px_6px_rgba(0,0,0,0.11),inset_-3px_-3px_6px_rgba(255,255,255,0.85)]
                        transition-all duration-300
                        group-hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.13),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]
                        dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.035)]
                      "
                    >
                      {isExcel ? (
                        <FileSpreadsheet className="h-[21px] w-[21px]" />
                      ) : (
                        <FileText className="h-[21px] w-[21px]" />
                      )}

                      <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-accent shadow-[0_1px_4px_rgba(0,0,0,0.15)]" />
                    </div>

                    <span className="rounded-lg bg-background px-2.5 py-1 text-[10px] font-bold tracking-wide text-muted-foreground shadow-[2px_2px_5px_rgba(0,0,0,0.07),-2px_-2px_5px_rgba(255,255,255,0.7)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3)]">
                      v{tpl.version.replace(/^v/i, "")}
                    </span>
                  </div>

                  {/* Template Information */}
                  <div className="min-w-0">
                    <h5 className="line-clamp-1 text-[13px] font-bold tracking-tight text-foreground">
                      {tpl.name}
                    </h5>

                    <p className="mt-1.5 line-clamp-2 min-h-[34px] text-[11px] leading-[1.6] text-muted-foreground">
                      {tpl.description ||
                        (isVietnamese
                          ? "Mẫu xuất báo cáo hệ thống."
                          : "System report template.")}
                    </p>
                  </div>

                  {/* File Type Inset */}
                  <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2.5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.75)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_3px_rgba(255,255,255,0.025)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {isExcel ? (
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <span className="text-[10px] font-extrabold tracking-wider text-foreground">
                        {tpl.fileType}
                      </span>
                    </div>

                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </div>

                {/* Footer Action */}
                {canExport && (
                  <div className="relative mt-3 border-t border-border/20 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectTemplate(tpl)}
                      className="
                        h-9 w-full justify-center gap-2 rounded-xl
                        bg-primary/10 text-primary
                        text-[11px] font-bold
                        shadow-[3px_3px_7px_rgba(0,0,0,0.07),-3px_-3px_7px_rgba(255,255,255,0.7)]
                        transition-all duration-200
                        hover:bg-primary hover:text-primary-foreground
                        hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.12)]
                        active:scale-[0.98]
                        dark:shadow-[3px_3px_7px_rgba(0,0,0,0.3)]
                      "
                    >
                      <SendHorizontal className="h-3.5 w-3.5" />
                      {t("reports.templates.generate")}
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
