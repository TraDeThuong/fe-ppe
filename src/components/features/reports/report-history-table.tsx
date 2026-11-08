
"use client";
import { Table, TableToolbar, TableContent, TablePagination, TableRefresh } from "@/components/ui/table";
import type { TableProps } from "@/components/ui/table";

import { useState } from "react";
import { CheckCircle2, Download, Eye, FileSpreadsheet, FileText, Loader2, XCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { reportingService } from "@/services/reporting.service";
import type { ReportGenerationDto } from "@/types";

export interface ReportHistoryTableProps {
  history: ReportGenerationDto[];
  loading?: boolean;
  onPreview?: (report: ReportGenerationDto) => void;
  tableState?: Partial<TableProps<ReportGenerationDto>>;
}

export function ReportHistoryTable({
  history,
  loading = false,
  onPreview,
  tableState,
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

  return (<Table
    data={history}
    columns={[{
      id: "fileName",
      header: t("reports.history.fileName"),
      accessorFn: (item) => item.fileName,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const fileType = item.fileType || item.template?.fileType;
        const isExcel =
          fileType === "EXCEL" ||
          fileType === "CSV" ||
          item.fileName?.toLowerCase().endsWith(".xlsx") ||
          item.fileName?.toLowerCase().endsWith(".csv");
        return <div className={""}>
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
        </div>;
      }
    },
    {
      id: "reportType",
      header: t("reports.history.type"),
      accessorFn: (item) => item.reportType,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const fileType = item.fileType || item.template?.fileType;
        return <div className={""}>
          <span className="inline-flex rounded-md bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground shadow-[inset_1px_1px_3px_rgba(0,0,0,0.06)]">
            {item.reportType}
          </span>
        </div>;
      }
    },
    {
      id: "siteId",
      header: t("reports.history.site"),
      accessorFn: (item) => item.siteId,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const fileType = item.fileType || item.template?.fileType;
        const resolvedSiteName =
          item.siteName ||
          (item.siteId
            ? getSiteName(item.siteId, item.siteId.slice(0, 8))
            : isVietnamese
              ? "Tất cả công trường"
              : "All Sites");
        return <div className={""}>
          <span
            className="block max-w-[150px] truncate text-[11px] font-medium text-foreground/80"
            title={resolvedSiteName}
          >
            {resolvedSiteName}
          </span>
        </div>;
      }
    },
    {
      id: "createdAt",
      header: t("reports.history.createdAt"),
      accessorFn: (item) => item.createdAt,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const fileType = item.fileType || item.template?.fileType;
        const date = new Date(
          item.generatedAt || item.createdAt
        ).toLocaleString(locale === "vi-VN" ? "vi-VN" : "en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        return <div className={"whitespace-nowrap"}>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {date}
          </span>
        </div>;
      }
    },
    {
      id: "status",
      header: t("reports.history.status"),
      accessorFn: (item) => item.status,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const fileType = item.fileType || item.template?.fileType;
        return <div className={""}>
          {getStatusBadge(item.status)}
        </div>;
      }
    },
    {
      id: "actions",
      header: t("reports.history.actions"),
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        const isCompleted = item.status === "COMPLETED";
        const isDownloading = downloadingId === item.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {isCompleted ? (
              <>
                {onPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPreview(item)}
                    className="
                      h-8 gap-1 rounded-lg px-2.5
                      bg-surface text-foreground
                      text-[10px] font-bold
                      border border-border/40
                      shadow-[2px_2px_5px_rgba(0,0,0,0.06),-2px_-2px_5px_rgba(255,255,255,0.7)]
                      transition-all duration-200
                      hover:bg-primary/10 hover:text-primary
                      active:scale-[0.97]
                      dark:shadow-[2px_2px_5px_rgba(0,0,0,0.3)]
                    "
                    title={t("reports.history.preview")}
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">
                      {t("reports.history.preview")}
                    </span>
                  </Button>
                )}

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
                  <span>{t("reports.history.download")}</span>
                </Button>
              </>
            ) : (
              <span className="text-[10px] font-medium italic text-muted-foreground">
                {isVietnamese ? "Chờ hoàn tất" : "Awaiting"}
              </span>
            )}
          </div>
        );
      }
    }]}
    loading={loading}
    getRowId={row => row.id}
    features={{
      globalFilter: false,
      sorting: false,
      rowSelection: false,
      pagination: true
    }}
    manualFiltering
    manualSorting
    manualPagination
    emptyMessage={t("reports.history.empty")}
    {...tableState}
  >
    <TableToolbar showSearch={false} actions={<TableRefresh />} />
    <TableContent />
    <TablePagination />
  </Table>);
}
