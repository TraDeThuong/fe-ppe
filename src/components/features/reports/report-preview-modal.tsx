"use client";

import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  TableProperties,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import type { ReportGenerationDto } from "@/types";

export interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportGenerationDto | null;
  onDownload: (report: ReportGenerationDto) => void;
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  report,
  onDownload,
}: ReportPreviewModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const fileType = (
    report?.fileType ||
    report?.template?.fileType ||
    ""
  ).toUpperCase();
  const fileName = report?.fileName || "";
  const isPdf =
    fileType === "PDF" ||
    fileName.toLowerCase().endsWith(".pdf") ||
    (!fileType && !fileName.toLowerCase().endsWith(".xlsx"));
  const isExcel =
    fileType === "EXCEL" ||
    fileType === "CSV" ||
    fileName.toLowerCase().endsWith(".xlsx") ||
    fileName.toLowerCase().endsWith(".csv");

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (!open || !report) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setError(null);
      return;
    }

    if (isPdf) {
      setLoading(true);
      setError(null);

      reportingService
        .getReportContentBlob(report.id)
        .then((blob) => {
          if (!active) return;
          createdUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(createdUrl);
        })
        .catch((err: any) => {
          if (!active) return;
          console.error("Failed to load PDF preview:", err);
          setError(
            err?.message ||
              (isVietnamese
                ? "Không thể tải trước tài liệu. Vui lòng thử tải về trực tiếp."
                : "Unable to preview document. Please try downloading directly.")
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, report?.id, isPdf]);

  const handleOpenNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (report) {
      onDownload(report);
    }
  };

  if (!report) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={t("reports.preview.modalTitle")}
      description={
        report.template?.name
          ? `${report.template.name} • ${report.fileName || `report_${report.id.slice(0, 8)}`}`
          : report.fileName || `report_${report.id.slice(0, 8)}`
      }
      icon={isExcel ? <FileSpreadsheet className="size-5" /> : <FileText className="size-5" />}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isPdf && pdfBlobUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t("reports.preview.openNewTab")}</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("reports.preview.downloadFile")}</span>
          </Button>
        </div>
      }
    >
      <div className="relative min-h-[480px] w-full overflow-hidden rounded-xl bg-background/50 p-1">
        {/* State: Loading */}
        {loading && (
          <div className="flex h-[550px] w-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-medium text-muted-foreground">
              {isVietnamese
                ? "Đang nạp dữ liệu tài liệu báo cáo..."
                : "Loading report document preview..."}
            </p>
          </div>
        )}

        {/* State: Error */}
        {!loading && error && (
          <div className="flex h-[400px] w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {t("reports.preview.downloadFile")}
            </Button>
          </div>
        )}

        {/* State: PDF Success Preview */}
        {!loading && !error && isPdf && pdfBlobUrl && (
          <iframe
            src={pdfBlobUrl}
            title={report.fileName || "Report Document"}
            className="h-[72vh] w-full rounded-xl border border-border/40 shadow-inner bg-white"
          />
        )}

        {/* State: Excel Preview Card */}
        {!loading && !error && isExcel && (
          <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_2px_2px_5px_rgba(0,0,0,0.08)]">
              <FileSpreadsheet className="h-8 w-8" />
            </div>

            <h4 className="mt-4 text-base font-bold text-foreground">
              {report.fileName || "safety_compliance_report.xlsx"}
            </h4>

            <p className="mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
              {t("reports.preview.excelNotice")}
            </p>

            <div className="mt-6 w-full max-w-md rounded-2xl border border-border/40 bg-surface p-4 text-left shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <TableProperties className="h-4 w-4 text-primary" />
                <span>{t("reports.preview.excelSheets")}</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{t("reports.preview.sheet1")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{t("reports.preview.sheet2")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{t("reports.preview.sheet3")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{t("reports.preview.sheet4")}</span>
                </li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleDownload}
              className="mt-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>{t("reports.preview.downloadFile")}</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
