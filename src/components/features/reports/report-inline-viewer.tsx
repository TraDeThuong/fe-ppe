"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CalendarRange,
  Camera,
  CheckCircle2,
  Clock,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers,
  Loader2,
  Lock,
  Maximize2,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  TableProperties,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  canAccessGeneratedReport,
  detectReportFormat,
} from "@/lib/report-analytics-data";
import { toast } from "@/lib/toast";
import type {
  CameraStatDto,
  ReportGenerationDto,
  StatisticsSummaryDto,
  ViolationTypeStatDto,
} from "@/types";

export interface ReportInlineViewerProps {
  report: ReportGenerationDto | null;
  currentUserId?: string;
  isAdmin?: boolean;
  onOpenModalPreview?: (report: ReportGenerationDto) => void;
}

type ViewerMode = "visual" | "document";
type VisualSectionTab = "summary" | "violations" | "cameras" | "structure";

function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 50)
    .map((line) =>
      line
        .split(",")
        .map((cell) => cell.trim().replace(/^"(.*)"$/, "$1")),
    );
}

function getViolationMeta(type: string, isVietnamese: boolean) {
  switch (type) {
    case "NO_HELMET":
      return {
        label: isVietnamese ? "Không đội mũ bảo hộ" : "No Safety Helmet",
        icon: HardHat,
        bar: "bg-rose-500",
        badge: "bg-rose-500/10 text-rose-500",
      };
    case "NO_VEST":
      return {
        label: isVietnamese ? "Không mặc áo phản quang" : "No High-Vis Vest",
        icon: Shirt,
        bar: "bg-amber-500",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      };
    case "RESTRICTED_AREA":
      return {
        label: isVietnamese ? "Xâm nhập vùng cấm" : "Restricted Zone",
        icon: AlertOctagon,
        bar: "bg-primary",
        badge: "bg-primary/10 text-primary",
      };
    case "MULTI_VIOLATION":
      return {
        label: isVietnamese ? "Đa vi phạm PPE" : "Multiple PPE Violations",
        icon: Layers,
        bar: "bg-accent",
        badge: "bg-accent/15 text-accent",
      };
    default:
      return {
        label: type,
        icon: ShieldAlert,
        bar: "bg-primary/70",
        badge: "bg-muted text-foreground",
      };
  }
}

export function ReportInlineViewer({
  report,
  currentUserId,
  isAdmin = false,
  onOpenModalPreview,
}: ReportInlineViewerProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName, getCamera } = useEntityLookup();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [periodData, setPeriodData] = useState<{
    summary: StatisticsSummaryDto;
    distribution: ViolationTypeStatDto[];
    rankings: CameraStatDto[];
  } | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("visual");
  const [visualTab, setVisualTab] = useState<VisualSectionTab>("summary");
  const [downloading, setDownloading] = useState(false);

  const format = report ? detectReportFormat(report) : "PDF";
  const isCompleted = report?.status === "COMPLETED";
  const canAccess = report
    ? canAccessGeneratedReport(report, currentUserId, isAdmin)
    : false;

  const resolvedSiteName = useMemo(() => {
    if (!report) return "";
    return (
      report.siteName ||
      (report.siteId
        ? getSiteName(report.siteId, report.siteId.slice(0, 8))
        : isVietnamese
          ? "Tất cả công trường"
          : "All Sites")
    );
  }, [report, getSiteName, isVietnamese]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setError(null);
    setTextContent(null);
    setPeriodData(null);
    setViewerMode("visual");
    setVisualTab("summary");
    setPdfBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (!report || !isCompleted || !canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const startDate = String(report.periodStart || "").slice(0, 10) || undefined;
    const endDate = String(report.periodEnd || "").slice(0, 10) || undefined;
    const filter = {
      siteId: report.siteId || undefined,
      startDate,
      endDate,
    };

    const loadPeriodSnapshot = Promise.all([
      reportingService.getSummary(filter),
      reportingService.getViolationDistribution(filter),
      reportingService.getCameraRankings({ ...filter, limit: 8 }),
    ]);

    if (format === "PDF") {
      Promise.all([
        loadPeriodSnapshot,
        reportingService.getReportContentBlob(report.id).catch(() => null),
      ])
        .then(([[summary, distribution, rankings], blob]) => {
          if (!active) return;
          setPeriodData({ summary, distribution, rankings });
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(objectUrl);
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(
            err instanceof Error
              ? err.message
              : isVietnamese
                ? "Không thể tải nội dung xem trước báo cáo."
                : "Unable to load report preview.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (format === "CSV" || format === "JSON") {
      reportingService
        .getReportContentBlob(report.id)
        .then(async (blob) => {
          const text = await blob.text();
          if (!active) return;
          setTextContent(text);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(
            err instanceof Error
              ? err.message
              : isVietnamese
                ? "Không thể đọc nội dung tệp báo cáo."
                : "Unable to read report file content.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      loadPeriodSnapshot
        .then(([summary, distribution, rankings]) => {
          if (!active) return;
          setPeriodData({ summary, distribution, rankings });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(
            err instanceof Error
              ? err.message
              : isVietnamese
                ? "Không thể tải số liệu tổng hợp cho bảng tính Excel."
                : "Unable to load summary metrics for Excel preview.",
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [report?.id, isCompleted, canAccess, format, isVietnamese]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await reportingService.downloadReportFile(report);
      toast.success(
        isVietnamese
          ? `Đã tải xuống "${report.fileName || "báo cáo"}"`
          : `Downloaded "${report.fileName || "report"}"`,
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
      setDownloading(false);
    }
  };

  if (!report) {
    return (
      <div
        className={`relative flex min-h-[600px] flex-col items-center justify-center overflow-hidden rounded-[26px] p-8 text-center ${NM.chassis}`}
      >
        <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary ${NM.recessed}`}
        >
          <FileText className="h-7 w-7" />
        </div>
        <h3 className="text-sm font-extrabold text-foreground">
          {t("reports.viewer.emptyTitle")}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {t("reports.viewer.emptyDesc")}
        </p>
      </div>
    );
  }

  const periodStartStr = String(report.periodStart || "").slice(0, 10);
  const periodEndStr = String(report.periodEnd || "").slice(0, 10);
  const generatedTimeStr = new Date(
    report.generatedAt || report.createdAt,
  ).toLocaleString(isVietnamese ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const csvRows = format === "CSV" && textContent ? parseCsvRows(textContent) : [];
  const totalDistCount =
    periodData?.distribution.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const maxCameraViolations = Math.max(
    ...(periodData?.rankings.map((r) => r.totalViolations) ?? [0]),
    1,
  );

  return (
    <section
      aria-label={t("reports.viewer.ariaLabel")}
      className={`relative flex min-h-[620px] flex-col overflow-hidden rounded-[26px] border border-white/50 dark:border-white/5 p-4 sm:p-5 lg:p-6 ${NM.chassis}`}
    >
      {/* Top Specular Highlight Rim */}
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Document Header Card */}
      <div className="space-y-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Tactile File Emblem + Title */}
          <div className="flex min-w-0 items-start gap-3.5">
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 dark:border-white/10 ${NM.extruded}`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
              >
                {format === "EXCEL" || format === "CSV" ? (
                  <FileSpreadsheet className="h-5 w-5" />
                ) : format === "JSON" ? (
                  <FileCode2 className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              {/* LED Status Indicator */}
              <span
                className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background ${isCompleted
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]"
                    : report.status === "FAILED"
                      ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.75)]"
                      : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.75)] animate-pulse"
                  }`}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-extrabold tracking-tight text-foreground">
                  {report.template?.name ||
                    report.fileName ||
                    `report_${report.id.slice(0, 8)}`}
                </h3>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                  {report.reportType}
                </span>
                <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] font-extrabold text-accent shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)]">
                  {format}
                </span>
              </div>

              <p className="truncate font-mono text-[11px] text-muted-foreground/85">
                {report.fileName || `report_${report.id.slice(0, 8)}.${format.toLowerCase()}`}
              </p>
            </div>
          </div>

          {/* Right Action Cluster (Tactile Neumorphic Buttons) */}
          {isCompleted && canAccess && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {format === "PDF" && pdfBlobUrl && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(pdfBlobUrl, "_blank", "noopener,noreferrer")
                  }
                  className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-white/50 dark:border-white/10 px-3 text-[11px] font-bold text-foreground transition-all cursor-pointer ${NM.extruded} hover:text-primary active:scale-95`}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  <span>{t("reports.preview.openNewTab")}</span>
                </button>
              )}

              {onOpenModalPreview && (
                <button
                  type="button"
                  onClick={() => onOpenModalPreview(report)}
                  className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-white/50 dark:border-white/10 px-3 text-[11px] font-bold text-foreground transition-all cursor-pointer ${NM.extruded} hover:text-primary active:scale-95`}
                >
                  <Maximize2 className="h-3.5 w-3.5 text-primary" />
                  <span>{isVietnamese ? "Mở rộng" : "Expand"}</span>
                </button>
              )}

              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[11px] font-bold text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all cursor-pointer hover:brightness-105 active:scale-95 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{t("reports.history.download")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Recessed 4-Pill Metadata Strip */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            {
              icon: Building2,
              iconColor: "text-primary",
              label: isVietnamese ? "Công trường" : "Site",
              value: resolvedSiteName,
              mono: false,
            },
            {
              icon: CalendarRange,
              iconColor: "text-primary",
              label: isVietnamese ? "Kỳ báo cáo" : "Period",
              value: `${periodStartStr} → ${periodEndStr}`,
              mono: true,
            },
            {
              icon: Clock3,
              iconColor: "text-accent",
              label: isVietnamese ? "Phát hành" : "Generated",
              value: generatedTimeStr,
              mono: true,
            },
            {
              icon: Sparkles,
              iconColor: "text-primary",
              label: isVietnamese ? "Mẫu / Phiên bản" : "Template",
              value: `${report.template?.code || report.reportType}${report.template?.version
                  ? ` · v${report.template.version.replace(/^v/i, "")}`
                  : ""
                }`,
              mono: true,
            },
          ].map((meta) => {
            const MetaIcon = meta.icon;
            return (
              <div
                key={meta.label}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 ${NM.recessed}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/40 dark:border-white/5 ${NM.extruded}`}
                >
                  <MetaIcon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/85">
                    {meta.label}
                  </p>
                  <p
                    className={`truncate text-[11px] font-bold text-foreground ${meta.mono ? "font-mono" : ""
                      }`}
                  >
                    {meta.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mode Switcher Bar (for PDF or Excel/Data views) */}
        {isCompleted && canAccess && !loading && !error && (format === "PDF" || format === "EXCEL") && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {format === "PDF" ? (
              <div className={`inline-flex items-center gap-1 rounded-xl p-1 ${NM.recessed}`}>
                <button
                  type="button"
                  onClick={() => setViewerMode("visual")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${viewerMode === "visual"
                      ? `${NM.extruded} bg-background/80 text-primary border border-primary/25`
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Bản Tóm tắt Trực quan" : "Executive Snapshot"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewerMode("document")}
                  disabled={!pdfBlobUrl}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-45 ${viewerMode === "document"
                      ? `${NM.extruded} bg-background/80 text-primary border border-primary/25`
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Tài liệu PDF Gốc" : "Original PDF"}</span>
                </button>
              </div>
            ) : (
              <div />
            )}

            {(format === "EXCEL" || viewerMode === "visual") && (
              <div className={`inline-flex flex-wrap gap-1 rounded-xl p-1 ${NM.recessed}`}>
                {(
                  [
                    { id: "summary", label: isVietnamese ? "1. Tổng quan KPI" : "1. KPI Overview" },
                    { id: "violations", label: isVietnamese ? "2. Loại Vi phạm" : "2. Violations" },
                    { id: "cameras", label: isVietnamese ? "3. Điểm nóng Camera" : "3. Camera Hotspots" },
                    { id: "structure", label: isVietnamese ? "4. Hồ sơ Tệp" : "4. File Specs" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVisualTab(tab.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${visualTab === tab.id
                        ? `${NM.extruded} bg-background/80 text-primary border border-primary/25`
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grooved Neumorphic Divider */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border/60 to-transparent shadow-[0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none" />
      </div>

      {/* Inline Content Body */}
      <div className="flex-1">
        {!isCompleted ? (
          <div
            className={`flex h-[440px] flex-col items-center justify-center rounded-2xl p-6 text-center ${NM.recessed}`}
          >
            {report.status === "FAILED" ? (
              <>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${NM.extruded}`}>
                  <XCircle className="h-7 w-7 text-destructive" />
                </div>
                <p className="mt-3.5 text-sm font-extrabold text-foreground">
                  {isVietnamese ? "Tạo báo cáo thất bại" : "Report generation failed"}
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  {report.errorMessage ||
                    (isVietnamese
                      ? "Đã xảy ra lỗi khi sinh tệp báo cáo."
                      : "An error occurred while generating the document.")}
                </p>
              </>
            ) : (
              <>
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${NM.extruded}`}>
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
                <p className="mt-3.5 text-sm font-extrabold text-foreground">
                  {isVietnamese ? "Báo cáo đang được xử lý..." : "Report is being generated..."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Nội dung xem trực tiếp sẽ tự động hiển thị ngay khi hoàn tất."
                    : "Inline preview will appear automatically once completed."}
                </p>
              </>
            )}
          </div>
        ) : !canAccess ? (
          <div
            className={`flex h-[440px] flex-col items-center justify-center rounded-2xl p-6 text-center ${NM.recessed}`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${NM.extruded}`}>
              <Lock className="h-7 w-7 text-amber-500" />
            </div>
            <p className="mt-3.5 text-sm font-extrabold text-foreground">
              {isVietnamese ? "Giới hạn quyền truy cập tài liệu" : "Document access restricted"}
            </p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {t("reports.history.restrictedAccess")}
            </p>
          </div>
        ) : loading ? (
          <div
            className={`flex h-[460px] flex-col items-center justify-center rounded-2xl p-6 ${NM.recessed}`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${NM.extruded}`}>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="mt-3.5 text-xs font-bold text-muted-foreground">
              {isVietnamese
                ? "Đang nạp nội dung báo cáo trực tiếp..."
                : "Loading inline report preview..."}
            </p>
          </div>
        ) : error ? (
          <div
            className={`flex h-[440px] flex-col items-center justify-center rounded-2xl p-6 text-center ${NM.recessed}`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${NM.extruded}`}>
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="mt-3.5 text-xs font-bold text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleDownload}
              className={`mt-4 inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-white/50 dark:border-white/10 px-3.5 text-xs font-bold text-foreground transition-all cursor-pointer ${NM.extruded} hover:text-primary active:scale-95`}
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>{t("reports.preview.downloadFile")}</span>
            </button>
          </div>
        ) : format === "CSV" && csvRows.length > 0 ? (
          <div className={`overflow-auto rounded-2xl p-3 ${NM.recessed}`}>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-background/40">
                  {csvRows[0].map((header, idx) => (
                    <th key={idx} className="px-3 py-2.5 font-extrabold text-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(1).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-border/20 transition-colors hover:bg-white/30 dark:hover:bg-white/[0.03]"
                  >
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : format === "JSON" && textContent ? (
          <pre className={`max-h-[520px] overflow-auto rounded-2xl p-4 font-mono text-xs text-foreground ${NM.recessed}`}>
            {textContent}
          </pre>
        ) : format === "PDF" && viewerMode === "document" && pdfBlobUrl ? (
          <div className={`space-y-2.5 rounded-2xl p-3 ${NM.recessed}`}>
            <div className="overflow-hidden rounded-xl border border-border/40 bg-white shadow-md">
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0&view=FitH`}
                title={report.fileName || "PDF Report Preview"}
                className="h-[540px] w-full bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
              <span>
                {isVietnamese
                  ? "Đang xem bản in PDF gốc (đã ẩn thanh công cụ mặc định để gọn màn hình)"
                  : "Viewing embedded PDF document"}
              </span>
              {onOpenModalPreview && (
                <button
                  type="button"
                  onClick={() => onOpenModalPreview(report)}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  {isVietnamese ? "Mở trình xem đầy đủ →" : "Open full viewer →"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Visual Executive Report Canvas (Default for PDF & Excel) */
          <div className="space-y-4">
            {visualTab === "summary" && periodData && (
              <div className="space-y-4">
                {/* 4 Raised Tactile KPI Pods */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: isVietnamese ? "Tổng sự cố" : "Total Incidents",
                      value: periodData.summary.totalIncidents,
                      sub: isVietnamese ? "Trong kỳ báo cáo" : "In period",
                      icon: AlertTriangle,
                      color: "text-foreground",
                      iconBg: "text-primary",
                    },
                    {
                      label: isVietnamese ? "Vi phạm xác nhận" : "Confirmed",
                      value: periodData.summary.trueViolations,
                      sub: isVietnamese ? "Cần xử lý PPE" : "Verified breaches",
                      icon: ShieldAlert,
                      color: "text-rose-500",
                      iconBg: "text-rose-500",
                    },
                    {
                      label: isVietnamese ? "Đã khắc phục" : "Resolved",
                      value: periodData.summary.resolvedIncidents,
                      sub: `MTTR ${periodData.summary.meanTimeToResolveHours.toFixed(1)}h`,
                      icon: CheckCircle2,
                      color: "text-emerald-600 dark:text-emerald-400",
                      iconBg: "text-emerald-500",
                    },
                    {
                      label: isVietnamese ? "Tỷ lệ tuân thủ" : "Compliance",
                      value: `${periodData.summary.complianceRate.toFixed(1)}%`,
                      sub: `${periodData.summary.openIncidents} ${isVietnamese ? "chờ duyệt" : "pending"}`,
                      icon: TrendingUp,
                      color: "text-primary",
                      iconBg: "text-primary",
                    },
                  ].map((pod) => {
                    const Icon = pod.icon;
                    return (
                      <div
                        key={pod.label}
                        className={`relative overflow-hidden rounded-2xl border border-white/50 dark:border-white/5 p-3.5 transition-transform duration-200 hover:-translate-y-0.5 ${NM.extruded}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {pod.label}
                          </span>
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-xl ${NM.recessed} ${pod.iconBg}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <p className={`mt-2 font-mono text-2xl font-black tabular-nums ${pod.color}`}>
                          {pod.value}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-muted-foreground/85">
                          {pod.sub}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Compliance Gauge & Status Breakdown */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className={`space-y-3 rounded-2xl p-4 lg:col-span-7 ${NM.recessed}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${NM.extruded}`}>
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-extrabold text-foreground">
                          {isVietnamese
                            ? "Phân bổ Trạng thái Hồ sơ An toàn"
                            : "Safety Incident Status Breakdown"}
                        </span>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                        {periodData.summary.totalIncidents} {isVietnamese ? "sự cố" : "cases"}
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {[
                        {
                          label: isVietnamese ? "Chờ thẩm duyệt" : "Pending Review",
                          count: periodData.summary.openIncidents,
                          bar: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]",
                        },
                        {
                          label: isVietnamese ? "Vi phạm đã xác nhận" : "Confirmed Violations",
                          count: periodData.summary.trueViolations,
                          bar: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]",
                        },
                        {
                          label: isVietnamese ? "Đã giải quyết / Đóng" : "Resolved / Closed",
                          count: periodData.summary.resolvedIncidents,
                          bar: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]",
                        },
                        {
                          label: isVietnamese ? "Cảnh báo sai (Dismissed)" : "False Alarms",
                          count: periodData.summary.falseAlarms,
                          bar: "bg-muted-foreground/50",
                        },
                      ].map((row) => {
                        const pct =
                          periodData.summary.totalIncidents > 0
                            ? Math.round((row.count / periodData.summary.totalIncidents) * 100)
                            : 0;
                        return (
                          <div key={row.label} className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-foreground/85">{row.label}</span>
                              <span className="font-mono font-bold text-muted-foreground">
                                {row.count} <span className="text-foreground/70">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-background/80 p-0.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.14)]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${row.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`flex flex-col justify-between space-y-3 rounded-2xl p-4 lg:col-span-5 ${NM.recessed}`}>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${NM.extruded}`}>
                          <Clock className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <span>
                          {isVietnamese ? "Chỉ số Đánh giá Chất lượng" : "Quality Benchmarks"}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        <div
                          className={`flex items-center justify-between rounded-xl border border-white/40 dark:border-white/5 px-3 py-2.5 ${NM.extruded}`}
                        >
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {isVietnamese ? "Tỷ lệ tuân thủ" : "Compliance Rate"}
                          </span>
                          <strong className="font-mono text-primary">
                            {periodData.summary.complianceRate.toFixed(1)}%
                          </strong>
                        </div>
                        <div
                          className={`flex items-center justify-between rounded-xl border border-white/40 dark:border-white/5 px-3 py-2.5 ${NM.extruded}`}
                        >
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {isVietnamese ? "Thời gian khắc phục TB" : "Mean Resolution (MTTR)"}
                          </span>
                          <strong className="font-mono text-foreground">
                            {periodData.summary.meanTimeToResolveHours.toFixed(2)}h
                          </strong>
                        </div>
                        <div
                          className={`flex items-center justify-between rounded-xl border border-white/40 dark:border-white/5 px-3 py-2.5 ${NM.extruded}`}
                        >
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {isVietnamese ? "Tỷ lệ cảnh báo sai" : "False Alarm Rate"}
                          </span>
                          <strong className="font-mono text-foreground">
                            {periodData.summary.falseAlarmRate.toFixed(1)}%
                          </strong>
                        </div>
                      </div>
                    </div>

                    {format === "PDF" && pdfBlobUrl && (
                      <button
                        type="button"
                        onClick={() => setViewerMode("document")}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/50 dark:border-white/10 py-2 text-[11px] font-bold text-primary transition-all cursor-pointer ${NM.extruded} hover:brightness-105 active:scale-95`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>
                          {isVietnamese ? "Chuyển sang xem Bản in PDF Gốc" : "Switch to Original PDF"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {visualTab === "violations" && periodData && (
              <div className={`space-y-3 rounded-2xl p-4 ${NM.recessed}`}>
                {periodData.distribution.length === 0 ? (
                  <p className="py-12 text-center text-xs font-semibold text-muted-foreground">
                    {isVietnamese
                      ? "Không phát sinh vi phạm PPE nào trong kỳ báo cáo này."
                      : "No PPE violations recorded during this report period."}
                  </p>
                ) : (
                  periodData.distribution.map((row) => {
                    const meta = getViolationMeta(row.violationType, isVietnamese);
                    const Icon = meta.icon;
                    const pct =
                      totalDistCount > 0
                        ? (row.count / totalDistCount) * 100
                        : row.percentage;
                    return (
                      <div
                        key={row.violationType}
                        className={`rounded-2xl border border-white/50 dark:border-white/5 p-3.5 transition-transform duration-200 hover:-translate-y-0.5 ${NM.extruded}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.badge}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-foreground">
                                {meta.label}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {row.violationType}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-500">
                              CRIT {row.severityBreakdown.CRITICAL}
                            </span>
                            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              HIGH {row.severityBreakdown.HIGH}
                            </span>
                            <span className="font-mono text-sm font-black text-foreground">
                              {row.count}
                            </span>
                            <span className="font-mono text-xs font-bold text-primary">
                              ({pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-background/80 p-0.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.14)]">
                          <div
                            className={`h-full rounded-full ${meta.bar}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {visualTab === "cameras" && periodData && (
              <div className={`space-y-2.5 rounded-2xl p-4 ${NM.recessed}`}>
                {periodData.rankings.length === 0 ? (
                  <p className="py-12 text-center text-xs font-semibold text-muted-foreground">
                    {isVietnamese
                      ? "Chưa có thống kê camera trong kỳ báo cáo này."
                      : "No camera statistics available for this period."}
                  </p>
                ) : (
                  periodData.rankings.map((row, idx) => {
                    const cam = getCamera(row.cameraId);
                    const camLabel =
                      row.cameraName ||
                      (cam ? `${cam.name} (${cam.code})` : `Camera #${row.cameraId.slice(0, 8)}`);
                    const widthPct = Math.round(
                      (row.totalViolations / maxCameraViolations) * 100,
                    );
                    return (
                      <div
                        key={row.cameraId}
                        className={`rounded-2xl border border-white/50 dark:border-white/5 p-3 transition-transform duration-200 hover:-translate-y-0.5 ${NM.extruded}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black text-primary ${NM.recessed}`}
                            >
                              #{idx + 1}
                            </span>
                            <Camera className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-xs font-extrabold text-foreground">
                              {camLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-muted-foreground">
                              {isVietnamese ? "Xác nhận" : "Conf"}:{" "}
                              <strong className="text-foreground">{row.confirmedCount}</strong>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {isVietnamese ? "Xử lý" : "Res"}:{" "}
                              <strong>{row.resolvedCount}</strong>
                            </span>
                            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-bold text-rose-500">
                              {row.totalViolations}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/80 p-0.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.14)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-rose-500"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {visualTab === "structure" && (
              <div className={`grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 ${NM.recessed}`}>
                {[
                  {
                    index: "01",
                    title: t("reports.preview.sheet1"),
                    desc: isVietnamese
                      ? "Tổng số vi phạm, tỷ lệ tuân thủ, MTTR trung bình và tỷ lệ cảnh báo sai trong kỳ."
                      : "Total violations, compliance index, mean resolution time, and false alarm rate.",
                  },
                  {
                    index: "02",
                    title: t("reports.preview.sheet2"),
                    desc: isVietnamese
                      ? "Chi tiết từng loại vi phạm PPE kèm phân tầng mức độ nghiêm trọng Critical/High/Medium/Low."
                      : "PPE breach distribution segmented by Critical/High/Medium/Low severity.",
                  },
                  {
                    index: "03",
                    title: t("reports.preview.sheet3"),
                    desc: isVietnamese
                      ? "Danh sách các camera ghi nhận nhiều sự cố nhất và tiến độ khắc phục theo từng vị trí."
                      : "Top camera hotspots ranked by incident volume and remediation progress.",
                  },
                  {
                    index: "04",
                    title: t("reports.preview.sheet4"),
                    desc: isVietnamese
                      ? "Chuỗi thời gian biến thiên vi phạm theo ngày/tuần phục vụ đối chiếu thanh tra HSE."
                      : "Chronological daily/weekly incident trends for HSE compliance audit trails.",
                  },
                ].map((sheet) => (
                  <div
                    key={sheet.index}
                    className={`rounded-2xl border border-white/50 dark:border-white/5 p-4 transition-transform duration-200 hover:-translate-y-0.5 ${NM.extruded}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[11px] font-black text-primary ${NM.recessed}`}
                      >
                        {sheet.index}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                        <TableProperties className="h-3.5 w-3.5 text-primary" />
                        <span>{sheet.title}</span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                      {sheet.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
