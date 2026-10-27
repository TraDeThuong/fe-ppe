"use client";

import { useState } from "react";
import { Calendar, FileSpreadsheet, FileText, Loader2, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { GenerateReportDto, ReportFileType, ReportTemplateDto, SiteItem } from "@/types";

export interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ReportTemplateDto[];
  sites: SiteItem[];
  selectedTemplate?: ReportTemplateDto | null;
  onSubmit: (dto: GenerateReportDto) => Promise<void>;
  loading?: boolean;
}

export function GenerateReportModal({
  open,
  onOpenChange,
  templates,
  sites,
  selectedTemplate,
  onSubmit,
  loading = false,
}: GenerateReportModalProps) {
  const { t } = useLocale();

  const [templateId, setTemplateId] = useState(
    selectedTemplate?.id || templates[0]?.id || ""
  );
  const [siteId, setSiteId] = useState("");
  const [format, setFormat] = useState<ReportFileType>("PDF");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;

    await onSubmit({
      templateId,
      siteId: siteId || undefined,
      reportType: "CUSTOM",
      periodStart: new Date(startDate).toISOString(),
      periodEnd: new Date(endDate).toISOString(),
      format,
    });

    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("reports.generate.modalTitle")}
      description="Chọn mẫu báo cáo, phạm vi công trường và khoảng thời gian xuất dữ liệu"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("reports.generate.template")}
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.fileType})
              </option>
            ))}
          </select>
        </div>

        {/* Format Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("reports.generate.format")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat("PDF")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                format === "PDF"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-[var(--neu-border)] bg-[var(--neu-surface)] text-[var(--neu-text-secondary)]"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Tài liệu PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setFormat("EXCEL")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                format === "EXCEL"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-[var(--neu-border)] bg-[var(--neu-surface)] text-[var(--neu-text-secondary)]"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Bảng Excel (XLSX)</span>
            </button>
          </div>
        </div>

        {/* Site Scope Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("reports.generate.site")}
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("reports.toolbar.allSites")}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--neu-text-primary)]">
              {t("reports.generate.from")}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--neu-text-primary)]">
              {t("reports.generate.to")}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--neu-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("reports.generate.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
