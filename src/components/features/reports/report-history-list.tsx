"use client";

import { useState } from "react";
import {
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { reportingService } from "@/services/reporting.service";
import {
  canAccessGeneratedReport,
  detectReportFormat,
} from "@/lib/report-analytics-data";
import { toast } from "@/lib/toast";
import type { ReportGenerationDto, SiteItem } from "@/types";

export interface ReportHistoryListProps {
  history: ReportGenerationDto[];
  selectedReportId: string | null;
  onSelectReport: (report: ReportGenerationDto) => void;
  loading?: boolean;
  fetching?: boolean;
  onRefresh: () => void;
  sites: SiteItem[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  canReadReports?: boolean;
  userSiteIds?: string[];
}

export function ReportHistoryList({
  history,
  selectedReportId,
  onSelectReport,
  loading = false,
  fetching = false,
  onRefresh,
  sites,
  selectedSiteId,
  onSiteChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  page,
  pageCount,
  total,
  onPageChange,
  currentUserId,
  isAdmin = false,
  canReadReports = true,
  userSiteIds,
}: ReportHistoryListProps) {
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
          ? `Đã tải xuống "${item.fileName || "báo cáo"}"`
          : `Downloaded "${item.fileName || "report"}"`,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể tải về báo cáo."
            : "Unable to download report.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const renderStatusPill = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {isVietnamese ? "Hoàn tất" : "Completed"}
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isVietnamese ? "Đang xử lý" : "Processing"}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            {isVietnamese ? "Đang chờ" : "Pending"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            <XCircle className="h-3 w-3" />
            {isVietnamese ? "Thất bại" : "Failed"}
          </span>
        );
    }
  };

  return (
    <section
      aria-label={t("reports.history.title")}
      className={`flex min-h-[600px] flex-col justify-between rounded-[26px] border border-white/50 dark:border-white/5 p-4 ${NM.chassis}`}
    >
      <div className="space-y-3.5">
        {/* Header & Tactile Refresh Button */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.65)]" />
            <div>
              <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                {t("reports.history.title")}
              </h3>
              <p className="text-[11px] font-medium text-muted-foreground/90">
                {isVietnamese
                  ? `${total} hồ sơ báo cáo · Nhấn để xem trực tiếp`
                  : `${total} report records · Click to inspect inline`}
              </p>
            </div>
          </div>

          <RefreshIconButton
            onRefresh={onRefresh}
            isRefreshing={fetching}
            title={t("common.refresh")}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/50 dark:border-white/10 text-foreground/80 cursor-pointer disabled:opacity-50 ${NM.extruded} hover:text-primary active:scale-90`}
            iconClassName="h-3.5 w-3.5"
          />
        </div>

        {/* Recessed Filter Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative col-span-2">
            <select
              value={selectedSiteId}
              onChange={(e) => onSiteChange(e.target.value)}
              aria-label={t("reports.history.site")}
              className={`h-8.5 w-full appearance-none rounded-xl border border-transparent bg-background/70 pl-3 pr-7 text-[11px] font-bold text-foreground transition-all cursor-pointer focus:border-primary/40 focus:outline-none ${NM.recessed}`}
            >
              <option value="">{t("reports.toolbar.allSites")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
              ▼
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              aria-label={t("reports.history.type")}
              className={`h-8.5 w-full appearance-none rounded-xl border border-transparent bg-background/70 pl-2.5 pr-6 text-[11px] font-bold text-foreground transition-all cursor-pointer focus:border-primary/40 focus:outline-none ${NM.recessed}`}
            >
              <option value="">
                {t("reports.history.type")}: {t("table.all")}
              </option>
              {["DAILY", "WEEKLY", "MONTHLY", "VIOLATION_SUMMARY", "AI_PERFORMANCE"].map(
                (val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ),
              )}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
              ▼
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label={t("reports.history.status")}
              className={`h-8.5 w-full appearance-none rounded-xl border border-transparent bg-background/70 pl-2.5 pr-6 text-[11px] font-bold text-foreground transition-all cursor-pointer focus:border-primary/40 focus:outline-none ${NM.recessed}`}
            >
              <option value="">
                {t("reports.history.status")}: {t("table.all")}
              </option>
              {["COMPLETED", "PROCESSING", "PENDING", "FAILED"].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
              ▼
            </span>
          </div>
        </div>

        {/* Scrollable Master List Well */}
        <div
          className={`max-h-[470px] space-y-2 overflow-y-auto rounded-2xl p-2.5 ${NM.recessed}`}
        >
          {loading ? (
            <div className="flex h-[320px] items-center justify-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${NM.extruded}`}>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center px-4 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${NM.extruded}`}>
                <FileText className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="mt-3 text-xs font-bold text-foreground/80">
                {t("reports.history.empty")}
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isSelected = selectedReportId === item.id;
              const format = detectReportFormat(item);
              const isCompleted = item.status === "COMPLETED";
              const canAccess = canAccessGeneratedReport(item, currentUserId, isAdmin, {
                canReadReports,
                siteIds: userSiteIds,
              });
              const siteLabel =
                item.siteName ||
                (item.siteId
                  ? getSiteName(item.siteId, item.siteId.slice(0, 8))
                  : isVietnamese
                    ? "Tất cả công trường"
                    : "All Sites");
              const dateLabel = new Date(
                item.generatedAt || item.createdAt,
              ).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectReport(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectReport(item);
                    }
                  }}
                  className={`group relative flex cursor-pointer items-start justify-between gap-2 rounded-2xl p-2.5 text-left transition-all duration-200 select-none ${isSelected
                      ? `${NM.extruded} bg-background/75 border border-primary/35`
                      : "border border-transparent bg-white/25 dark:bg-white/[0.02] hover:bg-white/50 dark:hover:bg-white/[0.05]"
                    }`}
                >
                  {/* Thanh LED phát sáng bên trái khi Active */}
                  {isSelected && (
                    <span className="absolute inset-y-2.5 left-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.75)]" />
                  )}

                  <div
                    className={`flex min-w-0 flex-1 items-start gap-2.5 transition-all ${isSelected ? "pl-1.5" : ""
                      }`}
                  >
                    {/* Hốc Icon */}
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${isSelected
                          ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.55)]"
                          : `${NM.recessed} text-primary group-hover:scale-105`
                        }`}
                    >
                      {format === "EXCEL" || format === "CSV" ? (
                        <FileSpreadsheet className="h-4 w-4" />
                      ) : format === "JSON" ? (
                        <FileCode2 className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>

                    {/* Nội dung chính */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={`truncate text-xs font-extrabold tracking-tight transition-colors ${isSelected
                            ? "text-primary"
                            : "text-foreground group-hover:text-primary"
                          }`}
                      >
                        {item.template?.name || item.fileName || `report_${item.id.slice(0, 8)}`}
                      </p>

                      {/* Badges khắc chìm */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                          {item.reportType}
                        </span>
                        <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)]">
                          {format}
                        </span>
                        {renderStatusPill(item.status)}
                      </div>

                      {/* Metadata gọn */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[10px] text-muted-foreground/90">
                        <span className="inline-flex max-w-[130px] items-center gap-1 truncate font-medium">
                          <Building2 className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                          <span className="truncate">{siteLabel}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[9.5px]">
                          <CalendarRange className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
                          {String(item.periodStart).slice(0, 10)} → {String(item.periodEnd).slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Thời gian + Nút tải xuống nổi */}
                  <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
                    <span className="rounded-md bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground">
                      {dateLabel}
                    </span>

                    {isCompleted && (
                      <button
                        type="button"
                        disabled={!canAccess || downloadingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(item);
                        }}
                        title={
                          !canAccess
                            ? t("reports.history.restrictedAccess")
                            : t("reports.history.download")
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/40 dark:border-white/10 text-primary transition-all cursor-pointer disabled:opacity-40 ${isSelected
                            ? `${NM.recessed} hover:bg-primary hover:text-primary-foreground`
                            : `${NM.extruded} hover:bg-primary hover:text-primary-foreground`
                          } active:scale-90`}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tactile Pagination Footer */}
      {pageCount > 1 && (
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ${NM.recessed}`}
        >
          <span className="font-mono text-[11px] font-bold text-muted-foreground">
            {isVietnamese ? "Trang" : "Page"}{" "}
            <span className="text-foreground">{page}</span> / {pageCount}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/50 dark:border-white/10 text-foreground transition-all cursor-pointer disabled:opacity-40 ${NM.extruded} hover:text-primary active:scale-90`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/50 dark:border-white/10 text-foreground transition-all cursor-pointer disabled:opacity-40 ${NM.extruded} hover:text-primary active:scale-90`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
