"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, FileText, History, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
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
  const { t } = useLocale();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (item: ReportGenerationDto) => {
    setDownloadingId(item.id);
    try {
      const res = await reportingService.getReportDownloadUrl(item.id);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
        toast.success(`Đang tải xuống tài liệu "${item.fileName || "report"}"`);
      } else {
        toast.error("Không tìm thấy liên kết tải về.");
      }
    } catch {
      toast.error("Không thể tải về tài liệu. Liên kết có thể đã hết hạn.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Hoàn tất
          </span>
        );
      case "PROCESSING":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Loader2 className="h-3 w-3 animate-spin" />
            Đang sinh file...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" />
            Lỗi render
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {t("reports.history.title")}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          {t("reports.history.desc")}
        </p>
      </div>

      {/* History Table */}
      {history.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          {t("reports.history.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground">
                <th className="pb-3 font-semibold">{t("reports.history.fileName")}</th>
                <th className="pb-3 font-semibold">{t("reports.history.type")}</th>
                <th className="pb-3 font-semibold">{t("reports.history.site")}</th>
                <th className="pb-3 font-semibold">{t("reports.history.createdAt")}</th>
                <th className="pb-3 font-semibold">{t("reports.history.status")}</th>
                <th className="pb-3 text-right font-semibold">
                  {t("reports.history.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {history.map((item) => {
                const isExcel = item.fileType === "EXCEL" || item.fileName?.endsWith(".xlsx");
                const isCompleted = item.status === "COMPLETED";
                const isDownloading = downloadingId === item.id;
                const date = new Date(item.createdAt).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr key={item.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isExcel
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isExcel ? (
                            <FileSpreadsheet className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">
                          {item.fileName || "PPE_Report_Export.pdf"}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 text-muted-foreground">
                      {item.reportType}
                    </td>

                    <td className="py-3 text-muted-foreground">
                      {item.siteName || "Tất cả công trường"}
                    </td>

                    <td className="py-3 text-muted-foreground">{date}</td>

                    <td className="py-3">{getStatusBadge(item.status)}</td>

                    <td className="py-3 text-right">
                      {isCompleted ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(item)}
                          disabled={isDownloading}
                          className="gap-1.5 text-xs text-primary hover:text-primary"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span>{t("reports.history.download")}</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          Chờ hoàn tất
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
  );
}
