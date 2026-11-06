
"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  XCircle,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { reportingService } from "@/services/reporting.service";
import type { ReportGenerationDto } from "@/types";

export interface ReportHistoryTableProps {
  history: ReportGenerationDto[];
  loading?: boolean;
}

export function ReportHistoryTable({
  history,
  loading = false,
}: ReportHistoryTableProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName } = useEntityLookup();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (item: ReportGenerationDto) => {
    setDownloadingId(item.id);

    try {
      await reportingService.downloadReportFile(item);

      toast.success(
        isVietnamese
          ? `Đã tải xuống thành công tài liệu "${item.fileName || "báo cáo"}"`
          : `Successfully downloaded "${item.fileName || "report"}"`
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isVietnamese
            ? "Không thể tải về tài liệu. Vui lòng kiểm tra quyền hạn hoặc thử lại sau."
            : "Unable to download document. Please check permissions or try again.")
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      COMPLETED: {
        label: isVietnamese ? "Hoàn tất" : "Completed",
        icon: CheckCircle2,
        style: "text-primary bg-primary/10",
      },
      PROCESSING: {
        label: isVietnamese ? "Đang xử lý" : "Processing",
        icon: Loader2,
        style: "text-accent-foreground bg-accent/20",
      },
      PENDING: {
        label: isVietnamese ? "Đang chờ" : "Pending",
        icon: Clock3,
        style: "text-muted-foreground bg-muted/70",
      },
      FAILED: {
        label: isVietnamese ? "Thất bại" : "Failed",
        icon: XCircle,
        style: "text-muted-foreground bg-muted/70",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ??
      statusConfig.FAILED;

    const Icon = config.icon;
    const isProcessing = status === "PROCESSING";

    return (
      <span
        className={`
          inline-flex items-center gap-1.5 whitespace-nowrap
          rounded-lg px-2.5 py-1
          text-[10px] font-bold
          shadow-[2px_2px_5px_rgba(0,0,0,0.06),-2px_-2px_5px_rgba(255,255,255,0.7)]
          dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3)]
          ${config.style}
        `}
      >
        <Icon
          className={`h-3 w-3 ${isProcessing ? "animate-spin" : ""}`}
        />
        {config.label}
      </span>
    );
  };

  return (
    <section
      className="
        relative space-y-5 overflow-hidden rounded-[22px]
        border border-border/20 bg-background p-4 sm:p-5
        shadow-[6px_6px_15px_rgba(0,0,0,0.08),-5px_-5px_14px_rgba(255,255,255,0.75)]
        dark:shadow-[6px_6px_15px_rgba(0,0,0,0.35),-3px_-3px_9px_rgba(255,255,255,0.035)]
      "
    >
      {/* Decorative accent */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl bg-background text-primary
              shadow-[3px_3px_7px_rgba(0,0,0,0.09),-3px_-3px_7px_rgba(255,255,255,0.8)]
              dark:shadow-[3px_3px_7px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.04)]
            "
          >
            <History className="h-[18px] w-[18px]" />
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold tracking-tight text-foreground">
              {t("reports.history.title")}
            </h4>
            <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
              {t("reports.history.desc")}
            </p>
          </div>
        </div>

        <span
          className="
            flex h-8 shrink-0 items-center gap-1.5 rounded-lg
            bg-background px-3 text-[11px] font-bold text-primary
            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
            dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35)]
          "
        >
          <FileText className="h-3.5 w-3.5" />
          {history.length}
        </span>
      </div>

      {/* Inset Table Container */}
      <div
        className="
          relative overflow-hidden rounded-[16px]
          bg-background
          shadow-[inset_3px_3px_8px_rgba(0,0,0,0.055),inset_-3px_-3px_8px_rgba(255,255,255,0.7)]
          dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.3),inset_-2px_-2px_6px_rgba(255,255,255,0.025)]
        "
      >
        {loading ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background text-primary shadow-[inset_3px_3px_6px_rgba(0,0,0,0.09),inset_-3px_-3px_6px_rgba(255,255,255,0.7)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("common.loading")}
            </span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-[4px_4px_9px_rgba(0,0,0,0.08),-4px_-4px_9px_rgba(255,255,255,0.7)] dark:shadow-[3px_3px_8px_rgba(0,0,0,0.3)]">
              <History className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {t("reports.history.empty")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Lịch sử xuất báo cáo sẽ hiển thị tại đây."
                : "Your generated reports will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-xs">
              {/* Table Head */}
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3.5 font-bold">
                    {t("reports.history.fileName")}
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    {t("reports.history.type")}
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    {t("reports.history.site")}
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    {t("reports.history.createdAt")}
                  </th>
                  <th className="px-3 py-3.5 font-bold">
                    {t("reports.history.status")}
                  </th>
                  <th className="px-4 py-3.5 text-right font-bold">
                    {t("reports.history.actions")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => {
                  const fileType = item.fileType || item.template?.fileType;

                  const isExcel =
                    fileType === "EXCEL" ||
                    fileType === "CSV" ||
                    item.fileName?.toLowerCase().endsWith(".xlsx") ||
                    item.fileName?.toLowerCase().endsWith(".csv");

                  const isCompleted = item.status === "COMPLETED";
                  const isDownloading = downloadingId === item.id;

                  const date = new Date(
                    item.generatedAt || item.createdAt
                  ).toLocaleString(locale === "vi-VN" ? "vi-VN" : "en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const resolvedSiteName =
                    item.siteName ||
                    (item.siteId
                      ? getSiteName(item.siteId, item.siteId.slice(0, 8))
                      : isVietnamese
                        ? "Tất cả công trường"
                        : "All Sites");

                  return (
                    <tr
                      key={item.id}
                      className="
                        group transition-colors duration-200
                        hover:bg-primary/[0.035]
                        [&:not(:last-child)>td]:border-b
                        [&:not(:last-child)>td]:border-border/20
                      "
                    >
                      {/* File */}
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="
                              flex h-9 w-9 shrink-0 items-center justify-center
                              rounded-xl bg-background text-primary
                              shadow-[inset_2px_2px_5px_rgba(0,0,0,0.09),inset_-2px_-2px_5px_rgba(255,255,255,0.75)]
                              dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35)]
                            "
                          >
                            {isExcel ? (
                              <FileSpreadsheet className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="max-w-[230px] truncate text-[11px] font-bold text-foreground"
                              title={item.fileName || undefined}
                            >
                              {item.fileName ||
                                `report_${item.id.slice(0, 8)}.pdf`}
                            </p>
                            {item.template?.name && (
                              <p className="mt-1 max-w-[230px] truncate text-[10px] text-muted-foreground">
                                {item.template.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3.5">
                        <span className="inline-flex rounded-md bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)]">
                          {item.reportType}
                        </span>
                      </td>

                      {/* Site */}
                      <td className="px-3 py-3.5">
                        <span
                          className="block max-w-[150px] truncate text-[11px] font-medium text-foreground/80"
                          title={resolvedSiteName}
                        >
                          {resolvedSiteName}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {date}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        {isCompleted ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(item)}
                            disabled={isDownloading}
                            className="
                              h-8 gap-1.5 rounded-lg px-3
                              bg-primary/10 text-primary
                              text-[10px] font-bold
                              shadow-[2px_2px_5px_rgba(0,0,0,0.07),-2px_-2px_5px_rgba(255,255,255,0.7)]
                              transition-all duration-200
                              hover:bg-primary hover:text-primary-foreground
                              hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.12)]
                              active:scale-[0.97]
                              disabled:opacity-50
                              dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3)]
                            "
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {t("reports.history.download")}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-[10px] font-medium italic text-muted-foreground">
                            {isVietnamese ? "Chờ hoàn tất" : "Awaiting"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {!loading && history.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-medium text-muted-foreground">
            {isVietnamese ? "Tổng số báo cáo" : "Total reports"}
          </span>
          <span className="rounded-lg bg-background px-3 py-1.5 text-[10px] font-extrabold tabular-nums text-primary shadow-[2px_2px_5px_rgba(0,0,0,0.06),-2px_-2px_5px_rgba(255,255,255,0.7)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3)]">
            {history.length}
          </span>
        </div>
      )}
    </section>
  );
}
