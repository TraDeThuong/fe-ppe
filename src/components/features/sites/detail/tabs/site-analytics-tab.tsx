"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Flame,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GenerateReportModal,
  ReportCameraRanking,
  ReportHistoryTable,
  ReportPreviewModal,
  ReportTrendChart,
  type TrendGroupBy,
} from "@/components/features/reports";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCameraRankings,
  useGenerateReport,
  useHourlyRisk,
  useReportHistory,
  useReportSummary,
  useReportTemplates,
  useViolationDistribution,
  useViolationTrends,
} from "@/hooks/reporting";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import type { GenerateReportDto, ReportGenerationDto, SiteItem } from "@/types";

export interface SiteAnalyticsTabProps {
  site: SiteItem;
}

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysYmd(daysAgo: number): string {
  return formatYmd(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));
}

export function SiteAnalyticsTab({ site }: SiteAnalyticsTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user: currentUser } = useAuth();
  const can = useCan();
  const canExport = can("PPE_REPORTING_EXPORT");
  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  // Date range filter (BE reporting enforces max 90 days)
  const [presetDays, setPresetDays] = useState<7 | 30 | 90 | "CUSTOM">(30);
  const [startDate, setStartDate] = useState<string>(() => addDaysYmd(30));
  const [endDate, setEndDate] = useState<string>(() => addDaysYmd(0));
  const [groupBy, setGroupBy] = useState<TrendGroupBy>("DAY");
  const [hourlyDate, setHourlyDate] = useState<string>(() => addDaysYmd(0));

  // Modals
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportGenerationDto | null>(null);

  const handleSelectPreset = (days: 7 | 30 | 90) => {
    setPresetDays(days);
    setStartDate(addDaysYmd(days));
    setEndDate(addDaysYmd(0));
  };

  // Real aggregated queries from reporting-service
  const filterParams = useMemo(
    () => ({
      siteId: site.id,
      startDate,
      endDate,
    }),
    [site.id, startDate, endDate],
  );

  const { data: summary, isLoading: isSummaryLoading } =
    useReportSummary(filterParams);
  const { data: violationStats = [], isLoading: isDistributionLoading } =
    useViolationDistribution(filterParams);
  const { data: trends = [], isLoading: isTrendsLoading } = useViolationTrends({
    ...filterParams,
    groupBy,
  });
  const { data: hourlyRisk, isLoading: isHourlyLoading } = useHourlyRisk({
    siteId: site.id,
    date: hourlyDate,
  });
  const { data: cameraRankings = [], isLoading: isRankingsLoading } =
    useCameraRankings({
      ...filterParams,
      limit: 10,
    });
  const { data: reportHistoryData, isLoading: isHistoryLoading } =
    useReportHistory({
      siteId: site.id,
      page: 1,
      limit: 10,
    });

  const { data: templates = [] } = useReportTemplates({ enabled: canExport });
  const generateReportMutation = useGenerateReport();

  const isLoading = isSummaryLoading || isDistributionLoading;

  const totalIncidents = useMemo(() => {
    if (summary && summary.totalIncidents > 0) return summary.totalIncidents;
    return violationStats.reduce((sum, item) => sum + item.count, 0);
  }, [summary, violationStats]);

  const activeTemplates = useMemo(
    () =>
      templates.filter(
        (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE",
      ),
    [templates],
  );

  const triggerGenerateAndDownload = async (dto: GenerateReportDto) => {
    const generated = await generateReportMutation.mutateAsync(dto);
    try {
      await reportingService.downloadReportFile(generated);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã tạo báo cáo, nhưng không thể tự tải xuống."
            : "Report generated, but download failed.",
      );
    }
  };

  const handleQuickExport = async (targetFormat: "PDF" | "EXCEL") => {
    const matchingTemplate = activeTemplates.find(
      (tpl) => (tpl.fileType || "").toUpperCase() === targetFormat,
    );

    if (!matchingTemplate) {
      if (activeTemplates.length === 0) {
        toast.error(
          isVietnamese
            ? "Chưa có mẫu báo cáo ACTIVE nào trong hệ thống."
            : "No active report templates available.",
        );
        return;
      }
      // Open modal so user can pick an available template
      setGenerateModalOpen(true);
      return;
    }

    try {
      await triggerGenerateAndDownload({
        templateId: matchingTemplate.id,
        siteId: site.id,
        reportType: "VIOLATION_SUMMARY",
        periodStart: startDate,
        periodEnd: endDate,
      });
    } catch {
      // Handled by mutation toast
    }
  };

  const violationCounts = useMemo(
    () =>
      violationStats.map((item) => ({
        type: item.violationType || "OTHER",
        count: item.count,
        rate: Math.min(
          100,
          typeof item.percentage === "number" && item.percentage > 0
            ? Math.round(item.percentage)
            : totalIncidents > 0
              ? Math.round((item.count / totalIncidents) * 100)
              : 0,
        ),
      })),
    [violationStats, totalIncidents],
  );

  const severityRows = useMemo(() => {
    const bd = summary?.severityBreakdown;
    if (!bd) return [];
    return (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((key) => ({
      key,
      ...bd[key],
    }));
  }, [summary?.severityBreakdown]);

  return (
    <div className="space-y-6">
      {/* 1. Top Banner: Date Filter + Export Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {isVietnamese
                ? "Báo cáo Tuân thủ An toàn Công trường (Safety Intelligence)"
                : "Site Safety Compliance Intelligence Report"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Dữ liệu thống kê sự cố, SLA xử lý và rủi ro theo ca trực tổng hợp từ Reporting Service."
                : "Real safety compliance, SLA/MTTR, shift risk, and camera analytics from Reporting Service."}
            </p>
          </div>

          {canExport && (
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGenerateModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-3"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Tùy chọn mẫu" : "Custom Report"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={generateReportMutation.isPending}
                onClick={() => void handleQuickExport("EXCEL")}
                className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-2.5 sm:px-3 text-muted-foreground hover:text-foreground"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>{isVietnamese ? "Xuất Excel" : "Export Excel"}</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={generateReportMutation.isPending}
                onClick={() => void handleQuickExport("PDF")}
                className="flex items-center gap-1.5 rounded-xl text-xs h-8 px-2.5 sm:px-3"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>{isVietnamese ? "Tải Báo cáo PDF" : "Download PDF"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Date Range Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/20 pt-3 text-xs">
          <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-background/60 p-1">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleSelectPreset(days)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  presetDays === days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days} {isVietnamese ? "ngày" : "days"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => {
                setPresetDays("CUSTOM");
                setStartDate(e.target.value);
              }}
              className="rounded-xl border border-border/40 bg-background/60 px-2.5 py-1 font-mono text-[11px]"
            />
            <span className="text-muted-foreground">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setPresetDays("CUSTOM");
                setEndDate(e.target.value);
              }}
              className="rounded-xl border border-border/40 bg-background/60 px-2.5 py-1 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* 2. Summary Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isVietnamese ? "Tỷ lệ tuân thủ" : "Compliance Rate"}</span>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-foreground">
            {(summary && summary.totalIncidents > 0 ? summary.complianceRate : 100).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isVietnamese ? "Tổng sự cố kỳ này" : "Period Incidents"}</span>
            <Activity className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-foreground">
            {totalIncidents}
          </p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isVietnamese ? "Tỷ lệ báo động giả" : "False Alarm Rate"}</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-foreground">
            {(summary?.falseAlarmRate ?? 0).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isVietnamese ? "MTTR trung bình" : "Mean Time to Resolve"}</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-foreground">
            {(summary?.meanTimeToResolveHours ?? 0).toFixed(2)}h
          </p>
        </div>
      </div>

      {/* 3. Trend Chart */}
      <ReportTrendChart
        trends={trends}
        loading={isTrendsLoading}
        dateRangeLabel={`${startDate} → ${endDate}`}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* 4. Violation Breakdown + Resolution & SLA Overview */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-surface-elevated/40" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Breakdown by violation type */}
          <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-sm dark:border-black/60 dark:bg-card/90">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Phân loại Vi phạm Thực tế" : "Violation Breakdown"}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-primary font-bold">
                {isVietnamese
                  ? `Tổng cộng: ${totalIncidents} sự cố`
                  : `Total: ${totalIncidents} incidents`}
              </span>
            </div>

            {violationCounts.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {isVietnamese
                  ? "Chưa ghi nhận sự cố trong khoảng thời gian này."
                  : "No incidents recorded in this date range."}
              </p>
            ) : (
              <div className="space-y-3.5">
                {violationCounts.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{item.type}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground">
                          {item.count} {isVietnamese ? "vụ" : "cases"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          ({item.rate}%)
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Status & SLA Breakdown */}
          <div className="space-y-4 rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-sm dark:border-black/60 dark:bg-card/90">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h4 className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Trạng thái Xử lý & Chỉ tiêu SLA"
                    : "Resolution Status & SLA Compliance"}
                </h4>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Chờ xử lý (Pending)" : "Pending Review"}
                </span>
                <span className="font-mono font-bold text-danger">
                  {summary?.openIncidents ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Đã xác nhận / Đã xử lý" : "Confirmed / Resolved"}
                </span>
                <span className="font-mono font-bold text-primary">
                  {(summary?.resolvedIncidents ?? 0) + (summary?.trueViolations ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated">
                <span className="text-muted-foreground">
                  {isVietnamese ? "Báo động giả (Dismissed)" : "False Alarm (Dismissed)"}
                </span>
                <span className="font-mono font-bold text-muted-foreground">
                  {summary?.falseAlarms ?? 0}
                </span>
              </div>
            </div>

            {severityRows.length > 0 && (
              <div className="border-t border-border/20 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "MTTR thực tế vs Mục tiêu SLA" : "Actual MTTR vs Target SLA"}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {severityRows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-xl border border-border/25 bg-background/50 px-2.5 py-1.5"
                    >
                      <span className="font-mono font-bold">{row.key}</span>
                      <span className="font-mono text-muted-foreground">
                        {row.actualMttrMinutes}m / {row.targetSlaMinutes}m ({row.resolved}/{row.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. 24-Hour Risk & 3-Shift Breakdown */}
      <section className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-sm dark:border-black/60 dark:bg-card/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Phân tích Rủi ro 24 Giờ & 3 Ca Trực"
                  : "24-Hour Risk & Shift Breakdown"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {hourlyRisk
                  ? isVietnamese
                    ? `Giờ cao điểm: ${String(hourlyRisk.summary.peakHour).padStart(2, "0")}:00 • Ca rủi ro nhất: ${hourlyRisk.summary.peakShift}`
                    : `Peak hour: ${String(hourlyRisk.summary.peakHour).padStart(2, "0")}:00 • Peak shift: ${hourlyRisk.summary.peakShift}`
                  : isVietnamese
                    ? "Thống kê mật độ vi phạm theo khung giờ trong ngày"
                    : "Violation density across 24 hours and 3 shifts"}
              </p>
            </div>
          </div>

          <input
            type="date"
            value={hourlyDate}
            onChange={(e) => setHourlyDate(e.target.value)}
            aria-label={isVietnamese ? "Ngày phân tích theo giờ" : "Hourly risk date"}
            className="rounded-xl border border-border/40 bg-background/60 px-2.5 py-1 font-mono text-xs"
          />
        </div>

        {isHourlyLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-elevated/40" />
        ) : hourlyRisk ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                hourlyRisk.shifts.morning,
                hourlyRisk.shifts.afternoon,
                hourlyRisk.shifts.night,
              ].map((shift) => (
                <div
                  key={shift.name}
                  className="rounded-xl border border-border/30 bg-background/50 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{shift.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {shift.timeRange}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-black text-foreground">
                      {shift.totalIncidents}
                    </p>
                    <span
                      className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        shift.riskLevel === "CRITICAL"
                          ? "bg-danger/15 text-danger"
                          : shift.riskLevel === "HIGH"
                            ? "bg-amber-500/15 text-amber-600"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {shift.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 24-hour compact bar strip */}
            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end h-20 rounded-xl bg-background/40 p-2.5 border border-border/20">
              {hourlyRisk.hourly.map((h) => {
                const maxCount = Math.max(
                  1,
                  ...hourlyRisk.hourly.map((item) => item.count),
                );
                const heightPct = h.count > 0 ? Math.max(18, Math.round((h.count / maxCount) * 100)) : 6;
                return (
                  <div
                    key={h.hour}
                    title={`${h.label}: ${h.count} (${h.riskLevel})`}
                    className="flex flex-col items-center justify-end h-full gap-1"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        h.count === 0
                          ? "bg-muted-foreground/20"
                          : h.riskLevel === "CRITICAL"
                            ? "bg-danger"
                            : h.riskLevel === "HIGH"
                              ? "bg-amber-500"
                              : "bg-primary"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    {h.hour % 4 === 0 && (
                      <span className="font-mono text-[8px] text-muted-foreground">
                        {String(h.hour).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* 6. Camera Violation Ranking */}
      <ReportCameraRanking
        rankings={cameraRankings}
        loading={isRankingsLoading}
      />

      {/* 7. Site Report History */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground px-1">
          {isVietnamese
            ? "Lịch sử Xuất Báo cáo của Công trường"
            : "Site Report Generation History"}
        </h4>
        <ReportHistoryTable
          history={reportHistoryData?.items ?? []}
          loading={isHistoryLoading}
          onPreview={(rep) => setPreviewReport(rep)}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
        />
      </div>

      {/* Modals */}
      <GenerateReportModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        templates={templates}
        sites={[site]}
        defaultSiteId={site.id}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        onSubmit={triggerGenerateAndDownload}
        loading={generateReportMutation.isPending}
      />

      <ReportPreviewModal
        open={Boolean(previewReport)}
        onOpenChange={(open) => {
          if (!open) setPreviewReport(null);
        }}
        report={previewReport}
        onDownload={(rep) => void reportingService.downloadReportFile(rep)}
      />
    </div>
  );
}
