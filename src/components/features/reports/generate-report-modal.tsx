"use client";

import { useEffect, useMemo, useState } from "react";
import { FileCode2, FileSpreadsheet, FileText, Loader2, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { GenerateReportDto, ReportTemplateDto, SiteItem } from "@/types";

export interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ReportTemplateDto[];
  sites: SiteItem[];
  selectedTemplate?: ReportTemplateDto | null;
  defaultSiteId?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  onSubmit: (dto: GenerateReportDto) => Promise<void>;
  loading?: boolean;
}

function inferReportTypeFromCode(code?: string): string {
  if (!code) return "DAILY";
  const upper = code.toUpperCase();
  if (upper.includes("WEEKLY")) return "WEEKLY";
  if (upper.includes("MONTHLY")) return "MONTHLY";
  if (upper.includes("VIOLATION")) return "VIOLATION_SUMMARY";
  if (upper.includes("AI")) return "AI_PERFORMANCE";
  return "DAILY";
}

export function GenerateReportModal({
  open,
  onOpenChange,
  templates,
  sites,
  selectedTemplate,
  defaultSiteId = "",
  defaultStartDate = "",
  defaultEndDate = "",
  onSubmit,
  loading = false,
}: GenerateReportModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const activeTemplates = useMemo(
    () => templates.filter((tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE"),
    [templates]
  );

  const [templateId, setTemplateId] = useState(
    selectedTemplate?.id || activeTemplates[0]?.id || ""
  );
  const [siteId, setSiteId] = useState(defaultSiteId || sites[0]?.id || "");
  const [reportType, setReportType] = useState("DAILY");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const currentTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === templateId) || null,
    [templates, templateId]
  );
  const resolvedFormat = (currentTemplate?.fileType || "PDF").toUpperCase();

  useEffect(() => {
    if (open) {
      const targetTpl =
        (selectedTemplate && (!selectedTemplate.status || selectedTemplate.status.toUpperCase() === "ACTIVE")
          ? selectedTemplate
          : activeTemplates[0]) || null;
      if (targetTpl) {
        setTemplateId(targetTpl.id);
        setReportType(inferReportTypeFromCode(targetTpl.code));
      } else {
        setTemplateId("");
      }
      if (defaultSiteId) {
        setSiteId(defaultSiteId);
      } else if (!siteId && sites[0]?.id) {
        setSiteId(sites[0].id);
      }
      if (defaultStartDate) {
        setStartDate(defaultStartDate);
      }
      if (defaultEndDate) {
        setEndDate(defaultEndDate);
      }
    }
  }, [open, selectedTemplate, activeTemplates, defaultSiteId, sites, siteId, defaultStartDate, defaultEndDate]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const found = templates.find((tpl) => tpl.id === id);
    if (found) {
      setReportType(inferReportTypeFromCode(found.code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSiteId = siteId || sites[0]?.id;
    if (!templateId || !resolvedSiteId) return;

    await onSubmit({
      templateId,
      siteId: resolvedSiteId,
      reportType,
      periodStart: startDate,
      periodEnd: endDate,
    });

    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("reports.generate.modalTitle")}
      description={
        isVietnamese
          ? "Chọn mẫu báo cáo, phạm vi công trường và khoảng thời gian xuất dữ liệu"
          : "Choose report template, site scope, and export period"
      }
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            form="generate-report-form"
            type="submit"
            variant="primary"
            disabled={loading || !templateId || (!siteId && sites.length === 0)}
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
      }
    >
      <form id="generate-report-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Template Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("reports.generate.template")}
          </label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {templates.length === 0 && (
              <option value="">
                {isVietnamese ? "Chưa có mẫu báo cáo" : "No templates available"}
              </option>
            )}
            {templates.map((tpl) => {
              const isInactive =
                Boolean(tpl.status) && tpl.status.toUpperCase() !== "ACTIVE";
              return (
                <option key={tpl.id} value={tpl.id} disabled={isInactive}>
                  {tpl.name} ({tpl.fileType}){isInactive ? ` — ${t("reports.templates.inactiveBadge")}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Report Type Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {isVietnamese ? "Loại kỳ báo cáo" : "Report Type"}
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="DAILY">{isVietnamese ? "Báo cáo Ngày (DAILY)" : "Daily Report (DAILY)"}</option>
            <option value="WEEKLY">{isVietnamese ? "Báo cáo Tuần (WEEKLY)" : "Weekly Report (WEEKLY)"}</option>
            <option value="MONTHLY">{isVietnamese ? "Báo cáo Tháng (MONTHLY)" : "Monthly Report (MONTHLY)"}</option>
            <option value="VIOLATION_SUMMARY">{isVietnamese ? "Tổng hợp Vi phạm (VIOLATION_SUMMARY)" : "Violation Summary"}</option>
            <option value="AI_PERFORMANCE">{isVietnamese ? "Hiệu năng AI (AI_PERFORMANCE)" : "AI Performance"}</option>
          </select>
        </div>

        {/* Output Format (Read-only, determined by selected template per BE SEC-35) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("reports.generate.format")}
          </label>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--neu-border)] bg-[var(--neu-inset)] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              {resolvedFormat === "EXCEL" || resolvedFormat === "CSV" ? (
                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
              ) : resolvedFormat === "JSON" ? (
                <FileCode2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-primary shrink-0" />
              )}
              <span className="text-xs text-[var(--neu-text-secondary)]">
                {t("reports.generate.formatByTemplate")}
              </span>
            </div>
            <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-primary">
              {resolvedFormat}
            </span>
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
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </form>
    </Modal>
  );
}
