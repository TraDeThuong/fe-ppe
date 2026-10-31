"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Flame,
  HardHat,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { reportingService } from "@/services/reporting.service";
import type {
  CameraStatDto,
  IncidentItem,
  ReportGenerationDto,
  ReportTemplateDto,
  SiteItem,
  StatisticsSummaryDto,
  TrendItemDto,
  ViolationTypeStatDto,
} from "@/types";

export type ReportStatKey = "totalViolations" | "complianceRate" | "mttr" | "reportsCount";

export interface ReportStatsDetailPanelProps {
  activeStat: ReportStatKey;
  summary?: StatisticsSummaryDto | null;
  distribution?: ViolationTypeStatDto[];
  trends?: TrendItemDto[];
  cameraRankings?: CameraStatDto[];
  templates?: ReportTemplateDto[];
  history?: ReportGenerationDto[];
  sites?: SiteItem[];
  incidents?: IncidentItem[];
  onClose: () => void;
  onGenerateReport?: (template?: ReportTemplateDto) => void;
}

export function ReportStatsDetailPanel({
  activeStat,
  summary,
  distribution = [],
  cameraRankings = [],
  templates = [],
  history = [],
  sites = [],
  incidents = [],
  onClose,
  onGenerateReport,
}: ReportStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getCamera, getSiteName, getCamerasForSite, getZonesForSite } = useEntityLookup();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Real metrics directly from API / derived state (no fake fallbacks)
  const totalViolations = summary?.totalIncidents ?? 0;
  const trueViolations = summary?.trueViolations ?? 0;
  const falseAlarms = summary?.falseAlarms ?? 0;
  const falseAlarmRate = summary?.falseAlarmRate ?? 0;
  const resolvedIncidents = summary?.resolvedIncidents ?? 0;
  const openIncidents = summary?.openIncidents ?? 0;
  const complianceRate = summary?.complianceRate ?? 0;
  const mttrHours = summary?.meanTimeToResolveHours ?? 0;
  const totalReportsCount = history.length;

  // Enrich camera rankings with real camera name from useEntityLookup
  const effectiveRankings: CameraStatDto[] = useMemo(() => {
    return cameraRankings.map((r) => {
      const cam = getCamera(r.cameraId);
      return {
        ...r,
        cameraName:
          r.cameraName ||
          (cam ? `${cam.name} (${cam.code})` : `Camera #${r.cameraId.slice(0, 8)}`),
      };
    });
  }, [cameraRankings, getCamera]);

  // Enrich history with real site name from useEntityLookup
  const effectiveHistory: ReportGenerationDto[] = useMemo(() => {
    return history.slice(0, 4).map((item) => ({
      ...item,
      siteName:
        item.siteName ||
        (item.siteId
          ? getSiteName(item.siteId, item.siteId.slice(0, 8))
          : isVietnamese
          ? "Tất cả công trường"
          : "All Sites"),
    }));
  }, [history, getSiteName, isVietnamese]);

  // Real breakdown by severity from real incidents or distribution
  const severityRows = useMemo(() => {
    const counts: Record<string, { total: number; resolved: number }> = {
      CRITICAL: { total: 0, resolved: 0 },
      HIGH: { total: 0, resolved: 0 },
      MEDIUM: { total: 0, resolved: 0 },
      LOW: { total: 0, resolved: 0 },
    };

    if (incidents.length > 0) {
      for (const inc of incidents) {
        const sev = (inc.severity || "HIGH").toUpperCase();
        if (counts[sev]) {
          counts[sev].total += 1;
          if (inc.status === "RESOLVED" || inc.status === "CLOSED") {
            counts[sev].resolved += 1;
          }
        }
      }
    } else {
      for (const dist of distribution) {
        const sb = dist.severityBreakdown;
        if (sb) {
          counts.CRITICAL.total += sb.CRITICAL || 0;
          counts.HIGH.total += sb.HIGH || 0;
          counts.MEDIUM.total += sb.MEDIUM || 0;
          counts.LOW.total += sb.LOW || 0;
        }
      }
    }

    const meta = [
      {
        level: "CRITICAL",
        description: isVietnamese ? "Khẩn cấp" : "Critical",
        sla: isVietnamese ? "< 30 phút" : "< 30 mins",
        bar: "bg-rose-500/80",
        text: "text-rose-600 dark:text-rose-400",
        dot: "bg-rose-500",
      },
      {
        level: "HIGH",
        description: isVietnamese ? "Nghiêm trọng" : "High Severity",
        sla: isVietnamese ? "< 1.5 giờ" : "< 1.5 hrs",
        bar: "bg-amber-500/80",
        text: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
      },
      {
        level: "MEDIUM",
        description: isVietnamese ? "Trung bình" : "Medium Severity",
        sla: isVietnamese ? "< 3 giờ" : "< 3 hrs",
        bar: "bg-primary/80",
        text: "text-primary",
        dot: "bg-primary",
      },
      {
        level: "LOW",
        description: isVietnamese ? "Nhắc nhở nhẹ" : "Low / Advisory",
        sla: isVietnamese ? "< 6 giờ" : "< 6 hrs",
        bar: "bg-emerald-500/80",
        text: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500",
      },
    ];

    return meta.map((m) => {
      const c = counts[m.level] || { total: 0, resolved: 0 };
      const percent = c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0;
      return {
        ...m,
        total: c.total,
        resolved: c.resolved,
        percent,
        avg: `${c.total} ${isVietnamese ? "vụ" : "cases"}`,
        status:
          c.total === 0
            ? isVietnamese
              ? "Không phát sinh"
              : "No incidents"
            : `${c.resolved}/${c.total} ${isVietnamese ? "đã xử lý" : "resolved"}`,
      };
    });
  }, [incidents, distribution, isVietnamese]);

  // Real export format counts from history
  const reportExportStats = useMemo(() => {
    let pdfCount = 0;
    let excelCount = 0;
    let completedCount = 0;

    for (const item of history) {
      const fType = (item.fileType || item.template?.fileType || "").toUpperCase();
      const fName = (item.fileName || "").toLowerCase();
      if (fType === "EXCEL" || fType === "CSV" || fName.endsWith(".xlsx") || fName.endsWith(".csv")) {
        excelCount++;
      } else {
        pdfCount++;
      }
      if (item.status === "COMPLETED") {
        completedCount++;
      }
    }

    const successRate =
      history.length > 0
        ? `${Math.round((completedCount / history.length) * 100)}%`
        : "0%";

    return { pdfCount, excelCount, completedCount, successRate };
  }, [history]);

  // Quick download helper
  const handleQuickDownload = async (item: ReportGenerationDto) => {
    setDownloadingId(item.id);
    try {
      const res = await reportingService.getReportDownloadUrl(item.id);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
        toast.success(
          isVietnamese
            ? `Đang tải xuống tài liệu "${item.fileName || "report"}"`
            : `Downloading document "${item.fileName || "report"}"`
        );
      } else {
        toast.error(
          isVietnamese ? "Không tìm thấy liên kết tải về." : "Download link not found."
        );
      }
    } catch {
      toast.error(
        isVietnamese
          ? "Không thể tải về tài liệu."
          : "Unable to download document."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const getPpeIcon = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return HardHat;
      case "NO_VEST":
        return Shirt;
      case "RESTRICTED_AREA":
        return AlertOctagon;
      default:
        return ShieldAlert;
    }
  };

  const getPpeTitle = (type: string) => {
    switch (type) {
      case "NO_HELMET":
        return isVietnamese ? "Không đội mũ bảo hộ cứng (Hard Hat)" : "Missing Hard Hat (Helmet)";
      case "NO_VEST":
        return isVietnamese ? "Không mặc áo bảo hộ phản quang (High-vis Vest)" : "Missing High-Vis Vest";
      case "RESTRICTED_AREA":
        return isVietnamese ? "Xâm nhập vùng nguy hiểm / cấm tiếp cận" : "Restricted / Danger Zone Intrusion";
      default:
        return type;
    }
  };

  const resolutionRatePct =
    totalViolations > 0 ? Math.round((resolvedIncidents / totalViolations) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-3.5 sm:mb-4 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "totalViolations" && <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "complianceRate" && <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "mttr" && <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
            {activeStat === "reportsCount" && <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalViolations" && t("reports.detail.violationsTitle")}
                {activeStat === "complianceRate" && t("reports.detail.complianceTitle")}
                {activeStat === "mttr" && t("reports.detail.mttrTitle")}
                {activeStat === "reportsCount" && t("reports.detail.reportsTitle")}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-primary border-primary/30 px-1.5 py-0 font-bold">
                {activeStat === "totalViolations" && `${totalViolations} ${isVietnamese ? "vi phạm" : "violations"}`}
                {activeStat === "complianceRate" && `${complianceRate.toFixed(1)}%`}
                {activeStat === "mttr" && `${mttrHours.toFixed(1)} ${isVietnamese ? "giờ" : "hrs"}`}
                {activeStat === "reportsCount" && `${totalReportsCount} ${isVietnamese ? "tài liệu" : "docs"}`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block mt-0.5">
              {activeStat === "totalViolations" && t("reports.detail.violationsDesc")}
              {activeStat === "complianceRate" && t("reports.detail.complianceDesc")}
              {activeStat === "mttr" && t("reports.detail.mttrDesc")}
              {activeStat === "reportsCount" && t("reports.detail.reportsDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "totalViolations" && (
            <Link href="/incidents">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("reports.detail.viewIncidents")}</span>
              </Button>
            </Link>
          )}

          {activeStat === "complianceRate" && (
            <Link href="/sites">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isVietnamese ? "Phạm vi công trường" : "Site Scope"}</span>
              </Button>
            </Link>
          )}

          {activeStat === "reportsCount" && onGenerateReport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onGenerateReport()}
              className="h-7 sm:h-8 gap-1.5 text-[11px] sm:text-xs text-primary hover:text-primary px-2.5 sm:px-3"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("reports.detail.generateNew")}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={t("reports.detail.closeAria")}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          VIEW 1: TOTAL VIOLATIONS
          ============================================================ */}
      {activeStat === "totalViolations" && (
        <div className="mt-4 space-y-4 animate-in fade-in duration-300">
          {/* KPI STATS */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: isVietnamese ? "Vi phạm xác thực" : "Confirmed Violations",
                value: trueViolations,
                icon: ShieldAlert,
                color: "text-primary",
                tone: "bg-primary/[0.07]",
                ratio: totalViolations > 0 ? (trueViolations / totalViolations) * 100 : 0,
                suffix: isVietnamese ? "vụ" : "cases",
              },
              {
                label: isVietnamese ? "Cảnh báo sai" : "False Alarms",
                value: falseAlarms,
                icon: AlertTriangle,
                color: "text-amber-600 dark:text-amber-400",
                tone: "bg-amber-500/[0.07]",
                ratio: totalViolations > 0 ? (falseAlarms / totalViolations) * 100 : 0,
                suffix: isVietnamese ? "vụ" : "cases",
              },
              {
                label: isVietnamese ? "Đã khắc phục" : "Resolved",
                value: resolvedIncidents,
                icon: CheckCircle2,
                color: "text-primary",
                tone: "bg-primary/[0.07]",
                ratio: totalViolations > 0 ? (resolvedIncidents / totalViolations) * 100 : 0,
                suffix: isVietnamese ? "vụ" : "cases",
              },
              {
                label: isVietnamese ? "Đang xử lý" : "In Progress",
                value: openIncidents,
                icon: Clock,
                color: "text-muted-foreground",
                tone: "bg-muted/50",
                ratio: totalViolations > 0 ? (openIncidents / totalViolations) * 100 : 0,
                suffix: isVietnamese ? "vụ" : "cases",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={[
                    "group relative min-w-0 overflow-hidden rounded-2xl",
                    "border border-border/40 bg-background/70",
                    "px-3.5 py-3 sm:px-4 sm:py-3.5",
                    "shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]",
                    "transition-[box-shadow,background-color] duration-200",
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/70 dark:bg-white/10" />

                  <div className="flex items-center gap-2.5">
                    <div
                      className={[
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        stat.tone,
                        "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                      ].join(" ")}
                    >
                      <Icon className={`size-[17px] ${stat.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground sm:text-xs">
                        {stat.label}
                      </p>

                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold leading-6 tracking-tight text-foreground tabular-nums sm:text-2xl">
                          {Number(stat.value).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {stat.suffix}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                    <div
                      className={`h-full rounded-full ${stat.color.replace("text-", "bg-")} transition-[width] duration-500`}
                      style={{
                        width: `${Math.min(100, Math.max(0, stat.ratio))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* NỘI DUNG PHÂN TÍCH */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
            {/* PHÂN BỐ VI PHẠM PPE */}
            <section className="min-w-0 rounded-2xl border border-border/40 bg-background/60 p-3.5 sm:p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                    <ShieldAlert className="size-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {isVietnamese ? "Cơ cấu vi phạm theo PPE" : "PPE Violation Distribution"}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {isVietnamese ? "Phân loại theo thiết bị bảo hộ" : "Classified by safety equipment"}
                    </p>
                  </div>
                </div>

                <span className="rounded-lg bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                  {distribution.length} {isVietnamese ? "nhóm lỗi" : "categories"}
                </span>
              </div>

              <div className="space-y-2">
                {distribution.map((item) => {
                  const severity = item.severityBreakdown;
                  const PpeIcon = getPpeIcon(item.violationType);

                  return (
                    <div
                      key={item.violationType}
                      className="group rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] transition-colors hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                          <PpeIcon className="size-[18px]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {getPpeTitle(item.violationType)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {item.violationType}
                          </p>
                        </div>

                        <div className="w-16 shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums text-foreground">
                            {item.count.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="ml-12 mt-2.5 h-1.5 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                        <div
                          className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                          }}
                        />
                      </div>

                      <div className="ml-12 mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="mr-0.5 text-[10px] text-muted-foreground">
                          {isVietnamese ? "Mức độ" : "Severity"}
                        </span>

                        {[
                          {
                            key: "CRITICAL",
                            short: "C",
                            value: severity?.CRITICAL ?? 0,
                            style: "text-rose-600 dark:text-rose-400 bg-rose-500/[0.06]",
                          },
                          {
                            key: "HIGH",
                            short: "H",
                            value: severity?.HIGH ?? 0,
                            style: "text-amber-700 dark:text-amber-400 bg-amber-500/[0.06]",
                          },
                          {
                            key: "MEDIUM",
                            short: "M",
                            value: severity?.MEDIUM ?? 0,
                            style: "text-primary bg-primary/[0.06]",
                          },
                          {
                            key: "LOW",
                            short: "L",
                            value: severity?.LOW ?? 0,
                            style: "text-muted-foreground bg-muted/40",
                          },
                        ].map((level) => (
                          <span
                            key={level.key}
                            title={level.key}
                            className={`inline-flex min-w-[42px] items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[10px] shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] ${level.style}`}
                          >
                            <span className="font-bold">{level.short}</span>
                            <span className="tabular-nums">{level.value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {distribution.length === 0 && (
                  <div className="rounded-xl bg-background/60 px-4 py-8 text-center shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]">
                    <ShieldAlert className="mx-auto size-6 text-muted-foreground/60" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isVietnamese ? "Chưa có dữ liệu phân loại vi phạm." : "No violation classification data available."}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[10px] text-muted-foreground">
                {isVietnamese ? "Nguồn dữ liệu: Cơ sở dữ liệu sự cố thực tế" : "Data source: Live Incident Database"}
              </p>
            </section>

            {/* ĐIỂM NÓNG RỦI RO */}
            <section className="min-w-0 space-y-3">
              {/* Tỷ lệ khắc phục */}
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                      <Flame className="size-[18px]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {isVietnamese ? "Điểm nóng rủi ro" : "Risk Hotspots"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {isVietnamese ? "Tổng quan tình trạng xử lý" : "Resolution Status Overview"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[104px_1fr] items-center gap-4">
                  <div className="relative mx-auto flex size-[100px] items-center justify-center rounded-full bg-background shadow-[inset_5px_5px_10px_var(--shadow-dark),inset_-5px_-5px_10px_var(--shadow-light)]">
                    <svg
                      viewBox="0 0 100 100"
                      className="absolute inset-0 size-full -rotate-90"
                      aria-label={`${isVietnamese ? "Tỷ lệ khắc phục" : "Resolution Rate"} ${resolutionRatePct}%`}
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="39"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="7"
                        className="text-muted/40"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="39"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="7"
                        strokeLinecap="round"
                        className="text-primary"
                        strokeDasharray={`${2 * Math.PI * 39}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 39 * (1 - Math.min(100, Math.max(0, resolutionRatePct)) / 100)
                        }`}
                      />
                    </svg>

                    <div className="relative text-center">
                      <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {resolutionRatePct}
                        <span className="text-sm">%</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {isVietnamese ? "Đã khắc phục" : "Resolved"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl bg-background/70 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                      <p className="text-[11px] text-muted-foreground">
                        {isVietnamese ? "Tỷ lệ cảnh báo sai" : "False Alarm Rate"}
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                        {Number(falseAlarmRate).toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-background/70 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                      <p className="text-[11px] text-muted-foreground">
                        {isVietnamese ? "Sự cố đã khắc phục" : "Resolved Incidents"}
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                        {resolvedIncidents.toLocaleString()}
                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                          {isVietnamese ? "vụ" : "cases"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera ưu tiên */}
              <div className="rounded-2xl border border-border/40 bg-background/60 p-3.5 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {isVietnamese ? "Camera cần ưu tiên" : "Priority Cameras"}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {isVietnamese ? "Khu vực có nhiều vi phạm nhất" : "Areas with most violations"}
                    </p>
                  </div>

                  <span className="rounded-lg bg-background px-2 py-1 text-[10px] font-semibold text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                    TOP {Math.min(2, effectiveRankings.length)}
                  </span>
                </div>

                <div className="space-y-2">
                  {effectiveRankings.slice(0, 2).map((camera, index) => (
                    <div
                      key={camera.cameraId}
                      className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
                    >
                      <div
                        className={[
                          "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums",
                          index === 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50 text-muted-foreground",
                          "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                        ].join(" ")}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {camera.cameraName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          ID: {camera.cameraId.slice(0, 8)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {camera.totalViolations.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isVietnamese ? "vi phạm" : "violations"}
                        </p>
                      </div>
                    </div>
                  ))}

                  {effectiveRankings.length === 0 && (
                    <p className="rounded-xl bg-background/60 px-3 py-5 text-center text-xs text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                      {isVietnamese ? "Chưa có dữ liệu xếp hạng camera." : "No camera ranking data available."}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 2: COMPLIANCE RATE
          ============================================================ */}
      {activeStat === "complianceRate" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* MICRO STATS */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              {
                label: isVietnamese ? "Chỉ số tuân thủ chung" : "Overall Compliance Rate",
                value: `${complianceRate.toFixed(1)}%`,
                caption: isVietnamese ? "Tiêu chuẩn ISO 45001 / OSHA" : "ISO 45001 / OSHA Standards",
                icon: ShieldCheck,
                valueClass: "text-emerald-600 dark:text-emerald-400",
                iconClass: "text-emerald-600 dark:text-emerald-400",
                iconBg: "bg-emerald-500/[0.07]",
              },
              {
                label: isVietnamese ? "Tỷ lệ cảnh báo xác thực" : "Verified Detection Rate",
                value: totalViolations > 0 ? `${(100 - falseAlarmRate).toFixed(1)}%` : "100.0%",
                caption: `${trueViolations}/${totalViolations} ${isVietnamese ? "vụ xác thực" : "verified"}`,
                icon: CheckCircle2,
                valueClass: "text-foreground",
                iconClass: "text-primary",
                iconBg: "bg-primary/[0.07]",
              },
              {
                label: isVietnamese ? "Công trường giám sát" : "Monitored Sites",
                value: `${sites.length} ${isVietnamese ? "điểm" : "sites"}`,
                caption: isVietnamese ? "Đang kết nối hệ thống" : "Connected to platform",
                icon: Award,
                valueClass: "text-foreground",
                iconClass: "text-amber-500",
                iconBg: "bg-amber-500/[0.07]",
              },
              {
                label: isVietnamese ? "Mức độ rủi ro" : "Risk Level",
                value:
                  complianceRate >= 90
                    ? isVietnamese
                      ? "Thấp"
                      : "Low"
                    : complianceRate >= 70
                    ? isVietnamese
                      ? "Trung bình"
                      : "Medium"
                    : isVietnamese
                    ? "Cao"
                    : "High",
                caption: `${openIncidents} ${isVietnamese ? "sự cố đang mở" : "open incidents"}`,
                icon: Shield,
                valueClass: "text-foreground",
                iconClass: "text-primary",
                iconBg: "bg-primary/[0.07]",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={[
                    "relative min-w-0 overflow-hidden rounded-xl",
                    "border border-border/35 bg-background/55",
                    "px-3 py-2.5 sm:px-3.5 sm:py-3",
                    "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[10px] font-medium leading-4 text-muted-foreground sm:text-[11px]">
                      {stat.label}
                    </p>

                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]`}
                    >
                      <Icon className={`size-3.5 ${stat.iconClass}`} />
                    </div>
                  </div>

                  <p
                    className={`mt-1.5 truncate text-xl font-bold leading-6 tracking-tight tabular-nums sm:text-[22px] ${stat.valueClass}`}
                  >
                    {stat.value}
                  </p>

                  <p className="mt-1 truncate text-[9px] leading-3.5 text-muted-foreground sm:text-[10px]">
                    {stat.caption}
                  </p>
                </div>
              );
            })}
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* SITE COMPLIANCE */}
            <section className="min-w-0 space-y-2.5 lg:col-span-7">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Building2 className="size-4" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-semibold text-foreground sm:text-sm">
                      {isVietnamese ? "Tuân thủ theo công trường" : "Site Compliance"}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {isVietnamese ? "Dữ liệu thực tế tại từng công trường" : "Real safety metrics across sites"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-primary/25 px-1.5 py-0 font-mono text-[10px] text-primary"
                >
                  {sites.length} {isVietnamese ? "công trường" : "sites"}
                </Badge>
              </div>

              <div className="space-y-2">
                {sites.length === 0 ? (
                  <div className="rounded-xl border border-border/35 bg-background/50 p-6 text-center text-xs text-muted-foreground">
                    {isVietnamese ? "Chưa có dữ liệu công trường." : "No sites found."}
                  </div>
                ) : (
                  sites.map((site) => {
                    const siteIncidents = incidents.filter((inc) => inc.siteId === site.id);
                    const siteTotal = siteIncidents.length;
                    const siteTrueViolations = siteIncidents.filter(
                      (inc) => inc.status !== "DISMISSED"
                    ).length;
                    const siteResolved = siteIncidents.filter(
                      (inc) => inc.status === "RESOLVED" || inc.status === "CLOSED"
                    ).length;
                    const siteRate =
                      siteTotal > 0
                        ? Number(
                            Math.max(
                              0,
                              100 -
                                ((siteTrueViolations - siteResolved * 0.5) /
                                  (siteTotal * 1.5 || 1)) *
                                  100
                            ).toFixed(1)
                          )
                        : 100;

                    const isCompliant = siteRate >= 50;
                    const camCount =
                      getCamerasForSite(site.id).length ||
                      site.cameraCount ||
                      site._count?.cameras ||
                      0;
                    const znCount =
                      getZonesForSite(site.id).length ||
                      site.zoneCount ||
                      site._count?.zones ||
                      0;

                    return (
                      <div
                        key={site.id}
                        className={[
                          "rounded-xl border border-border/35",
                          "bg-background/50 px-3 py-3 sm:px-3.5",
                          "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                            <Building2 className="size-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {site.name}
                            </p>

                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {camCount} Camera AI
                              <span className="mx-1.5 opacity-40">·</span>
                              {znCount} {isVietnamese ? "phân khu" : "zones"}
                              <span className="mx-1.5 opacity-40">·</span>
                              {siteTotal} {isVietnamese ? "sự cố" : "incidents"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`font-mono text-base font-bold tabular-nums ${
                                isCompliant
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {siteRate.toFixed(1)}%
                            </p>

                            <p className="mt-0.5 text-[9px] text-muted-foreground">
                              {isVietnamese ? "Tuân thủ" : "Compliant"}
                            </p>
                          </div>
                        </div>

                        <div className="ml-12 mt-3 h-1.5 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                              isCompliant ? "bg-emerald-500/80" : "bg-amber-500/80"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, siteRate))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-0.5">
                <Link
                  href="/sites"
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
                >
                  {isVietnamese ? "Xem tất cả công trường" : "View all sites"}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </section>

            {/* HSE RECOMMENDATIONS */}
            <section className="min-w-0 space-y-2.5 lg:col-span-5">
              <div className="flex items-center gap-2 px-0.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <ShieldCheck className="size-4" />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-foreground sm:text-sm">
                    {isVietnamese ? "Đánh giá HSE thực tế" : "Live HSE Assessment"}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {isVietnamese ? "Dựa trên dữ liệu sự cố hiện hành" : "Based on active incident data"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/35 bg-background/50 p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-4">
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.035] p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-emerald-600 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {isVietnamese ? "Tổng quan tuân thủ hiện tại" : "Current Compliance Summary"}
                      </p>

                      <p className="mt-1.5 text-[10px] leading-[1.7] text-muted-foreground">
                        {isVietnamese
                          ? `Hệ thống ghi nhận ${totalViolations} sự cố (${resolvedIncidents} đã xử lý, ${openIncidents} đang mở) với tỷ lệ tuân thủ đạt ${complianceRate.toFixed(1)}%.`
                          : `System recorded ${totalViolations} incidents (${resolvedIncidents} resolved, ${openIncidents} open) with a ${complianceRate.toFixed(1)}% compliance rate.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: MTTR (RESOLUTION TIME)
          ============================================================ */}
      {activeStat === "mttr" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* MICRO STATS */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              {
                label: isVietnamese ? "MTTR trung bình" : "Average MTTR",
                value: `${mttrHours.toFixed(1)} ${isVietnamese ? "giờ" : "hrs"}`,
                caption: isVietnamese ? "Thời gian xử lý trung bình" : "Mean time to resolve",
                icon: Clock,
                iconClass: "text-amber-500",
                iconBg: "bg-amber-500/[0.07]",
                valueClass: "text-foreground",
              },
              {
                label: isVietnamese ? "Sự cố đã xử lý" : "Resolved Incidents",
                value: `${resolvedIncidents}/${totalViolations}`,
                caption: isVietnamese ? "Đã đóng / Tổng phát sinh" : "Resolved / Total incidents",
                icon: Zap,
                iconClass: "text-primary",
                iconBg: "bg-primary/[0.07]",
                valueClass: "text-foreground",
              },
              {
                label: isVietnamese ? "Tỷ lệ xử lý hoàn tất" : "Resolution Rate",
                value: `${resolutionRatePct}%`,
                caption: isVietnamese ? "Hiệu suất đóng sự cố" : "Incident closure rate",
                icon: Timer,
                iconClass: "text-emerald-600 dark:text-emerald-400",
                iconBg: "bg-emerald-500/[0.07]",
                valueClass: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: isVietnamese ? "Sự cố đang chờ xử lý" : "Open Incidents",
                value: `${openIncidents}`,
                caption: isVietnamese ? "Cần xác minh & khắc phục" : "Pending review or action",
                icon: CheckCircle2,
                iconClass: "text-primary",
                iconBg: "bg-primary/[0.07]",
                valueClass: "text-foreground",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={[
                    "relative min-w-0 overflow-hidden rounded-xl",
                    "border border-border/35 bg-background/55",
                    "px-3 py-2.5 sm:px-3.5 sm:py-3",
                    "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[10px] font-medium leading-4 text-muted-foreground sm:text-[11px]">
                      {stat.label}
                    </p>

                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]`}
                    >
                      <Icon className={`size-3.5 ${stat.iconClass}`} />
                    </div>
                  </div>

                  <p
                    className={`mt-1.5 truncate text-xl font-bold leading-6 tracking-tight tabular-nums sm:text-[22px] ${stat.valueClass}`}
                  >
                    {stat.value}
                  </p>

                  <p className="mt-1.5 truncate text-[9px] leading-3.5 text-muted-foreground sm:text-[10px]">
                    {stat.caption}
                  </p>
                </div>
              );
            })}
          </div>

          {/* MAIN CONTENT: REAL SEVERITY BREAKDOWN */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="min-w-0 space-y-2.5 lg:col-span-12">
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Clock className="size-4" />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-foreground sm:text-sm">
                      {isVietnamese ? "Tiến độ xử lý theo mức độ nghiêm trọng" : "Resolution Progress by Severity"}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {isVietnamese ? "Số lượng sự cố thực tế và tỷ lệ đã khắc phục theo từng mức độ" : "Actual incident count and resolution rate by severity"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {severityRows.map((row) => (
                  <div
                    key={row.level}
                    className={[
                      "rounded-xl border border-border/35",
                      "bg-background/50 px-3 py-3 sm:px-3.5",
                      "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                        <span className={`size-2 rounded-full ${row.dot}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold tracking-wide text-foreground">
                          {row.level}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {row.description}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {row.avg}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">
                          SLA {row.sla}
                        </p>
                      </div>
                    </div>

                    <div className="ml-10 mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${row.bar}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, row.percent))}%`,
                          }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-muted-foreground">
                          {isVietnamese ? "Tỷ lệ khắc phục" : "Resolution Rate"}
                        </span>
                        <span className={`text-[9px] font-medium ${row.text}`}>
                          {row.percent}% · {row.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 4: REPORTS COUNT
          ============================================================ */}
      {activeStat === "reportsCount" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* MICRO STATS */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              {
                label: isVietnamese ? "Tổng hồ sơ đã phát hành" : "Total Published Dossiers",
                value: `${totalReportsCount}`,
                unit: isVietnamese ? "tài liệu" : "docs",
                caption: isVietnamese ? "Từ lịch sử xuất báo cáo" : "From export history",
                icon: FileText,
                iconClass: "text-primary",
                iconBg: "bg-primary/[0.07]",
                valueClass: "text-foreground",
              },
              {
                label: isVietnamese ? "Định dạng PDF" : "PDF Format",
                value: `${reportExportStats.pdfCount}`,
                unit: isVietnamese ? "bản in" : "prints",
                caption: isVietnamese ? "Báo cáo định dạng PDF" : "PDF documents",
                icon: FileCheck2,
                iconClass: "text-rose-500",
                iconBg: "bg-rose-500/[0.07]",
                valueClass: "text-foreground",
              },
              {
                label: isVietnamese ? "Định dạng Excel / CSV" : "Excel / CSV Format",
                value: `${reportExportStats.excelCount}`,
                unit: isVietnamese ? "bảng tính" : "sheets",
                caption: isVietnamese ? "Báo cáo bảng tính" : "Spreadsheet exports",
                icon: FileSpreadsheet,
                iconClass: "text-emerald-600 dark:text-emerald-400",
                iconBg: "bg-emerald-500/[0.07]",
                valueClass: "text-foreground",
              },
              {
                label: isVietnamese ? "Tỷ lệ xuất thành công" : "Export Success Rate",
                value: reportExportStats.successRate,
                unit: "",
                caption: `${reportExportStats.completedCount}/${totalReportsCount} ${isVietnamese ? "hoàn tất" : "completed"}`,
                icon: CheckCircle2,
                iconClass: "text-emerald-600 dark:text-emerald-400",
                iconBg: "bg-emerald-500/[0.07]",
                valueClass: "text-emerald-600 dark:text-emerald-400",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={[
                    "relative min-w-0 overflow-hidden rounded-xl",
                    "border border-border/35 bg-background/55",
                    "px-3 py-2.5 sm:px-3.5 sm:py-3",
                    "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[10px] font-medium leading-4 text-muted-foreground sm:text-[11px]">
                      {stat.label}
                    </p>

                    <div
                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]`}
                    >
                      <Icon className={`size-3.5 ${stat.iconClass}`} />
                    </div>
                  </div>

                  <div className="mt-1.5 flex min-w-0 items-baseline gap-1.5">
                    <p
                      className={`truncate text-xl font-bold leading-6 tracking-tight tabular-nums sm:text-[22px] ${stat.valueClass}`}
                    >
                      {stat.value}
                    </p>

                    {stat.unit && (
                      <span className="truncate text-[9px] text-muted-foreground">
                        {stat.unit}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[9px] leading-3.5 text-muted-foreground sm:text-[10px]">
                    {stat.caption}
                  </p>
                </div>
              );
            })}
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* REPORT TEMPLATES */}
            <section className="min-w-0 space-y-2.5 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <FileText className="size-4" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-semibold text-foreground sm:text-sm">
                      {isVietnamese ? "Mẫu báo cáo chuẩn hóa" : "Standardized Report Templates"}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {isVietnamese ? "Dữ liệu từ Backend Reporting Service" : "Loaded from Backend Reporting Service"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className="border-primary/25 px-1.5 py-0 font-mono text-[10px] text-primary"
                  >
                    {templates.length} {isVietnamese ? "mẫu" : "templates"}
                  </Badge>

                  {onGenerateReport && (
                    <button
                      type="button"
                      onClick={() => onGenerateReport()}
                      className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5 text-[10px] font-semibold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]"
                    >
                      {t("reports.toolbar.generateBtn")}
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-xl border border-border/25 bg-background/30 p-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-border/25 bg-background/50 px-2.5 py-2.5 transition-colors hover:bg-muted/[0.12]"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                      {tpl.fileType === "EXCEL" ? (
                        <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <FileText className="size-4 text-primary" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="max-w-full truncate text-xs font-semibold text-foreground">
                          {tpl.name}
                        </p>

                        <Badge
                          variant="secondary"
                          size="sm"
                          className="px-1 py-0 font-mono text-[9px]"
                        >
                          {tpl.code}
                        </Badge>

                        <Badge
                          variant="outline"
                          size="sm"
                          className="px-1 py-0 font-mono text-[9px]"
                        >
                          {tpl.fileType}
                        </Badge>
                      </div>

                      <p className="mt-1 truncate text-[10px] leading-4 text-muted-foreground">
                        {tpl.description}
                      </p>
                    </div>

                    {onGenerateReport && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onGenerateReport(tpl)}
                        className="h-8 shrink-0 gap-1 rounded-lg px-2 text-[10px] text-primary hover:bg-primary/[0.07] hover:text-primary"
                      >
                        <span className="hidden sm:inline">{isVietnamese ? "Xuất mẫu" : "Export"}</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="size-6 text-muted-foreground/50" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isVietnamese ? "Chưa có mẫu báo cáo." : "No report templates available."}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* RECENT EXPORT HISTORY */}
            <section className="min-w-0 space-y-2.5 lg:col-span-5">
              <div className="flex items-center gap-2 px-0.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                  <Download className="size-4" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-foreground sm:text-sm">
                    {isVietnamese ? "Tài liệu xuất gần đây" : "Recent Export History"}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {isVietnamese ? "Các tệp đã tạo trên hệ thống" : "Files generated on the platform"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/35 bg-background/50 p-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-3">
                <div className="max-h-[270px] space-y-2 overflow-y-auto">
                  {effectiveHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/25 bg-background/40 px-2.5 py-2.5 transition-colors hover:bg-muted/[0.12]"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                        <FileText className="size-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {item.fileName}
                        </p>

                        <p className="mt-1 truncate font-mono text-[9px] text-muted-foreground">
                          {item.siteName}
                          <span className="mx-1 opacity-40">·</span>
                          {new Date(
                            item.generatedAt || item.createdAt
                          ).toLocaleDateString(locale)}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickDownload(item)}
                        disabled={downloadingId === item.id}
                        className="size-8 shrink-0 rounded-lg border-border/35 bg-background p-0 text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-background hover:text-primary hover:shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] disabled:opacity-50"
                        title={isVietnamese ? "Tải về tài liệu" : "Download document"}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}

                  {effectiveHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="size-6 text-muted-foreground/50" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {isVietnamese ? "Chưa có lịch sử xuất báo cáo." : "No export history found."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 border-t border-border/25 pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const tableElem = document.getElementById(
                        "reports-history-section"
                      );

                      if (tableElem) {
                        tableElem.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/[0.05]"
                  >
                    {isVietnamese ? "Xem toàn bộ lịch sử xuất" : "View complete export history"}
                    <span className="font-mono">
                      ({totalReportsCount})
                    </span>
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
