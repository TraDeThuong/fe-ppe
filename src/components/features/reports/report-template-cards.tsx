"use client";

import { FileSpreadsheet, FileText, LayoutTemplate, SendHorizontal } from "lucide-react";
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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("reports.templates.title")}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {t("reports.templates.desc")}
        </p>
      </div>

      {/* Grid of Templates */}
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-surface p-8 text-center text-xs text-muted-foreground">
          {isVietnamese
            ? "Chưa có mẫu báo cáo nào trên hệ thống."
            : "No report templates available on the platform."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {templates.map((tpl) => {
            const isExcel = tpl.fileType === "EXCEL" || tpl.fileType === "CSV";

            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] transition-all hover:border-primary/40 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08)] ${
                        isExcel
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isExcel ? (
                        <FileSpreadsheet className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>

                    <span className="rounded-full bg-border/40 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      v{tpl.version.replace(/^v/i, "")}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-foreground">{tpl.name}</h5>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="font-bold text-xs uppercase text-foreground">
                    {tpl.fileType}
                  </span>

                  {canExport && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSelectTemplate(tpl)}
                      className="gap-1.5 text-xs text-primary hover:text-primary"
                    >
                      <SendHorizontal className="h-3.5 w-3.5" />
                      <span>{t("reports.templates.generate")}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
