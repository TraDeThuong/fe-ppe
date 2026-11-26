"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { GenerateReportModal } from "@/components/features/reports/generate-report-modal";
import {
  ReportTrendChart,
  type TrendGroupBy,
} from "@/components/features/reports/report-trend-chart";
import { useAuth } from "@/contexts/AuthContext";
import { useGenerateReport } from "@/hooks/reporting/use-generate-report";
import { useReportTemplates } from "@/hooks/reporting/use-report-templates";
import {
  useAnalyticsToday,
  useSiteAnalytics,
} from "@/hooks/sites/use-site-analytics";
import { useCan } from "@/hooks/use-can";
import {
  analyticsPeriod,
  analyticsPreset,
  isAccessError,
  type AnalyticsCollection,
} from "@/lib/site-analytics-data";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { reportingService } from "@/services/reporting.service";
import type { GenerateReportDto, SiteItem } from "@/types";

export interface SiteAnalyticsTabProps {
  site: SiteItem;
}

/* =========================================================
   NEUMORPHISM DESIGN TOKENS
========================================================= */
const nmSurface =
  "rounded-[24px] border border-white/60 bg-surface p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]";

const nmInset =
  "rounded-[18px] bg-background/60 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]";

const nmBtnOutline =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3.5 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] disabled:pointer-events-none disabled:opacity-50 dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]";

const nmBtnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:shadow-[4px_4px_14px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.05)]";

const nmDateInput =
  "rounded-[11px] border border-white/60 bg-surface px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]";

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${nmSurface} flex flex-col justify-between space-y-4`}>
      <div className="relative flex items-start gap-3 pb-3.5 before:absolute before:inset-x-0 before:bottom-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-primary/[0.08] text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h4 className="text-[13px] font-extrabold tracking-tight text-foreground">
            {title}
          </h4>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-3.5">{children}</div>
    </section>
  );
}

function AnalyticsStatus({
  permitted,
  valid,
  query,
  retry,
}: {
  permitted: boolean;
  valid: boolean;
  query: {
    isFetching: boolean;
    error: Error | null;
    data?: Partial<AnalyticsCollection> | unknown;
  };
  retry: () => void;
}) {
  const { locale } = useLocale();
  const vi = locale === "vi-VN";
  const maybeCollection =
    query.data &&
    typeof query.data === "object" &&
    "complete" in query.data
      ? (query.data as AnalyticsCollection)
      : undefined;
  let message: string | null = null;
  if (!permitted || isAccessError(query.error))
    message = vi
      ? "Bạn không có quyền đọc dữ liệu thống kê của công trường này."
      : "You do not have permission to read this site's statistics.";
  else if (!valid)
    message = vi
      ? "Chọn ngày hợp lệ, không ở tương lai, từ ngày không sau đến ngày và tối đa 90 ngày."
      : "Choose valid dates, not in the future, in order and within 90 calendar days.";
  else if (query.error)
    message = vi
      ? "Không thể tải dữ liệu thống kê. Vui lòng thử lại."
      : "Unable to load statistics. Please retry.";
  else if (maybeCollection && !maybeCollection.complete) {
    const issue = maybeCollection.issue;
    message = vi
      ? `Chưa đủ dữ liệu (${issue}). Hãy thu hẹp khoảng ngày hoặc thử lại.`
      : `Incomplete data (${issue}). Narrow the date range or retry; no partial totals are displayed.`;
  } else if (query.isFetching && !query.data)
    message = vi
      ? "Đang tải số liệu thống kê công trường…"
      : "Loading site statistics…";
  else if (query.isFetching)
    message = vi ? "Đang cập nhật dữ liệu…" : "Updating data…";
  if (!message) return null;

  return (
    <div
      role="status"
      className={`${nmInset} flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            query.isFetching
              ? "animate-ping bg-primary"
              : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
          }`}
        />
        <p className="font-medium">{message}</p>
      </div>
      {permitted && valid && !isAccessError(query.error) && (
        <button
          type="button"
          disabled={query.isFetching}
          onClick={retry}
          className={nmBtnOutline}
        >
          {vi ? "Làm mới" : "Refresh"}
        </button>
      )}
    </div>
  );
}

export function SiteAnalyticsTab({ site }: SiteAnalyticsTabProps) {
  const { user } = useAuth();
  return <SiteAnalyticsContent key={`${user?.id}:${site.id}`} site={site} />;
}

function SiteAnalyticsContent({ site }: SiteAnalyticsTabProps) {
  const { locale } = useLocale();
  const vi = locale === "vi-VN";
  const { user, status } = useAuth();
  const can = useCan();
  const ready = status === "authenticated" && !!user;
  const canReadReports = ready && can("PPE_REPORTING_READ");
  const canExport = canReadReports && can("PPE_REPORTING_EXPORT");
  const today = useAnalyticsToday();
  const [presetDays, setPresetDays] = useState<7 | 30 | 90 | "CUSTOM">(30);
  const [customStart, setCustomStart] = useState(
    () => analyticsPreset(30, today).startDate
  );
  const [customEnd, setCustomEnd] = useState(today);
  const range =
    presetDays === "CUSTOM"
      ? { startDate: customStart, endDate: customEnd }
      : analyticsPreset(presetDays, today);
  const { startDate, endDate } = range;
  const [groupBy, setGroupBy] = useState<TrendGroupBy>("DAY");
  const [selectedHourlyDate, setHourlyDate] = useState<string | null>(null);
  const hourlyDate = selectedHourlyDate ?? today;
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const { period, hourPeriod, periodQuery, hourSource, analytics, hourly } =
    useSiteAnalytics({
      userId: user?.id,
      siteId: site.id,
      startDate,
      endDate,
      hourlyDate,
      groupBy,
      today,
      enabled: canReadReports,
    });
  const { data: templates = [], isLoading: templatesLoading } =
    useReportTemplates({ enabled: canExport });
  const activeTemplates = useMemo(
    () =>
      templates.filter(
        (tpl) => !tpl.status || tpl.status.toUpperCase() === "ACTIVE"
      ),
    [templates]
  );
  const sites = useMemo(() => [site], [site]);
  const generate = useGenerateReport({ notifySuccess: false });
  const [downloadingGenerated, setDownloadingGenerated] = useState(false);
  const exportBusy = generate.isPending || downloadingGenerated;

  const triggerGenerateAndDownload = async (dto: GenerateReportDto) => {
    if (
      !canExport ||
      dto.siteId !== site.id ||
      !analyticsPeriod(dto.periodStart, dto.periodEnd, today)
    ) {
      throw new Error(
        vi
          ? "Không thể xuất báo cáo: kiểm tra quyền và khoảng ngày (tối đa 90 ngày)."
          : "Check report permissions and dates (maximum 90 days)."
      );
    }
    const generated = await generate.mutateAsync(dto);
    if (generated.status === "FAILED") {
      toast.error(
        generated.errorMessage ||
          (vi
            ? "Tạo báo cáo thất bại. Xem chi tiết trong lịch sử."
            : "Report generation failed. Check history for details.")
      );
      return;
    }
    if (generated.status !== "COMPLETED") {
      toast.info(
        vi
          ? "Yêu cầu đã được ghi nhận. Xem trạng thái trong lịch sử báo cáo."
          : "Request recorded. Check its status in report history."
      );
      return;
    }
    setDownloadingGenerated(true);
    try {
      await reportingService.downloadReportFile(generated);
      toast.success(
        vi
          ? "Đã tạo và tải báo cáo thành công."
          : "Report generated and downloaded successfully."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : vi
            ? "Đã tạo báo cáo nhưng tải tệp thất bại. Có thể thử lại trong lịch sử."
            : "Report created, but download failed. Retry from history."
      );
    } finally {
      setDownloadingGenerated(false);
    }
  };

  const quickExport = async (format: "PDF" | "EXCEL") => {
    if (!period || !canExport || exportBusy) return;
    const template = activeTemplates.find(
      (tpl) => tpl.fileType.toUpperCase() === format
    );
    if (!template) {
      if (activeTemplates.length) setGenerateModalOpen(true);
      else
        toast.error(
          vi
            ? "Chưa có mẫu báo cáo đang hoạt động."
            : "No active report template available."
        );
      return;
    }
    try {
      await triggerGenerateAndDownload({
        templateId: template.id,
        siteId: site.id,
        reportType: "VIOLATION_SUMMARY",
        periodStart: startDate,
        periodEnd: endDate,
      });
    } catch {
      /* Generation errors are reported by the mutation. */
    }
  };

  const percentage = (value: number | null | undefined) =>
    value == null ? "—" : `${value.toFixed(1)}%`;

  const typeLabels: Record<string, string> = vi
    ? {
        NO_HELMET: "Không đội mũ bảo hộ",
        NO_VEST: "Không mặc áo phản quang",
        RESTRICTED_AREA: "Xâm nhập vùng cấm",
        MULTI_VIOLATION: "Nhiều vi phạm",
        OTHER: "Khác",
      }
    : {
        NO_HELMET: "No helmet",
        NO_VEST: "No safety vest",
        RESTRICTED_AREA: "Restricted area",
        MULTI_VIOLATION: "Multiple violations",
        OTHER: "Other",
      };

  const shiftLabels = vi
    ? { morning: "Ca Sáng", afternoon: "Ca Chiều", night: "Ca Đêm" }
    : { morning: "Morning", afternoon: "Afternoon", night: "Night" };

  const riskLabels: Record<string, string> = vi
    ? { LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao", CRITICAL: "Khẩn cấp" }
    : { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };

  const maxHourly = Math.max(
    1,
    ...(hourly?.hourly.map((h) => h.count) ?? [])
  );

  return (
    <div className="space-y-6">
      {/* =========================================================
          1. HEADER & FILTER CONTROL BAR
      ========================================================= */}
      <section className={`${nmSurface} space-y-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            {/* Extruded Icon Pod */}
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] border border-white/70 bg-surface text-primary shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_rgba(255,255,255,0.9)] dark:border-white/[0.07] dark:bg-card dark:shadow-[5px_5px_12px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary/[0.08] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)]">
                <BarChart3 className="h-4.5 w-4.5 stroke-[2]" />
              </div>
            </div>

            <div className="pt-0.5">
              <h3 className="text-[15px] font-extrabold tracking-tight text-foreground sm:text-base">
                {vi
                  ? "Báo cáo Phân tích An toàn Công trường"
                  : "Site Safety Analytics"}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {vi
                  ? "Tổng hợp đầy đủ sự cố; biểu đồ vi phạm chỉ tính hồ sơ đã xác nhận, gồm đã khắc phục."
                  : "Complete incident aggregation; violation charts include confirmed and resolved cases."}
              </p>
            </div>
          </div>

          {canExport && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!period || exportBusy || templatesLoading}
                onClick={() => setGenerateModalOpen(true)}
                className={nmBtnOutline}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{vi ? "Tùy chọn mẫu" : "Custom report"}</span>
              </button>
              <button
                type="button"
                disabled={!period || exportBusy || templatesLoading}
                onClick={() => void quickExport("EXCEL")}
                className={nmBtnOutline}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{vi ? "Xuất Excel" : "Export Excel"}</span>
              </button>
              <button
                type="button"
                disabled={!period || exportBusy || templatesLoading}
                onClick={() => void quickExport("PDF")}
                className={nmBtnPrimary}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{vi ? "Tải Báo cáo PDF" : "Download PDF"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Recessed Filter Bar */}
        <div
          className={`${nmInset} flex flex-wrap items-center justify-between gap-3 p-2.5`}
        >
          {/* Segmented Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {([7, 30, 90] as const).map((days) => {
              const active = presetDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPresetDays(days)}
                  className={`rounded-[11px] px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                    active
                      ? "border border-white/70 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.9)] dark:border-white/[0.08] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.6)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {days} {vi ? "ngày" : "days"}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <input
              type="date"
              aria-label={vi ? "Từ ngày" : "Start date"}
              className={nmDateInput}
              value={startDate}
              max={endDate < today ? endDate : today}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setCustomEnd(endDate);
                setPresetDays("CUSTOM");
              }}
            />
            <span className="font-mono text-xs font-bold text-muted-foreground">
              →
            </span>
            <input
              type="date"
              aria-label={vi ? "Đến ngày" : "End date"}
              className={nmDateInput}
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => {
                setCustomStart(startDate);
                setCustomEnd(e.target.value);
                setPresetDays("CUSTOM");
              }}
            />
          </div>
        </div>

        {canExport && (
          <p className="px-1 text-[11px] text-muted-foreground">
            {vi
              ? "Tệp PDF/Excel sử dụng nguồn thống kê của máy chủ và có thể khác số liệu sự cố trên các card."
              : "PDF/Excel uses server statistics and may differ from the incident-based cards."}
          </p>
        )}
      </section>

      {/* =========================================================
          2. STATUS BANNER
      ========================================================= */}
      <AnalyticsStatus
        permitted={canReadReports}
        valid={!!period}
        query={periodQuery}
        retry={() => void periodQuery.refetch()}
      />

      {/* =========================================================
          3. KPI SUMMARY CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: vi
              ? "Tỷ lệ phát hiện được xác nhận"
              : "Confirmed detection rate",
            value: percentage(analytics?.confirmedRate),
            Icon: ShieldCheck,
            accent: "text-primary",
          },
          {
            label: vi ? "Tổng sự cố kỳ này" : "Period incidents",
            value: analytics?.totalIncidents ?? "—",
            Icon: Activity,
            accent: "text-foreground",
          },
          {
            label: vi
              ? "Tỷ lệ báo động giả / đã duyệt"
              : "False alarms / reviewed",
            value: percentage(analytics?.falseAlarmRate),
            Icon: BarChart3,
            accent: "text-amber-600 dark:text-amber-400",
          },
          {
            label: vi ? "MTTR trung bình" : "Mean time to resolve",
            value:
              analytics?.mttrMinutes == null
                ? "—"
                : `${(analytics.mttrMinutes / 60).toFixed(2)}h`,
            Icon: Clock,
            accent: "text-primary",
          },
        ].map(({ label, value, Icon, accent }) => (
          <div
            key={label}
            className={`${nmSurface} flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11.5px] font-bold leading-snug text-muted-foreground">
                {label}
              </span>
              {/* Inset Icon Pod */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-background/70 text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:bg-black/35 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7)]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p
              className={`mt-3 font-mono text-2xl font-black tracking-tight tabular-nums ${accent}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* =========================================================
          4. TREND CHART & BREAKDOWN CARDS
      ========================================================= */}
      {analytics && (
        <>
          {analytics.totalIncidents === 0 && (
            <div
              role="status"
              className={`${nmInset} px-4 py-3 text-center text-xs font-medium text-muted-foreground`}
            >
              {vi
                ? "Chưa ghi nhận sự cố trong khoảng thời gian này."
                : "No incidents recorded in this period."}
            </div>
          )}

          {/* Wrapped Trend Chart inside Neumorphic Frame */}
          <div className={nmSurface}>
            <ReportTrendChart
              style={{ height: "auto" }}
              trends={analytics.trends}
              dateRangeLabel={`${startDate} → ${endDate}`}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              nullableResolutionRate
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left Card: Confirmed Violation Breakdown */}
            <Card
              title={
                vi
                  ? "Phân loại Vi phạm Thực tế"
                  : "Confirmed violation breakdown"
              }
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              {/* Recessed Total Highlight Pill */}
              <div
                className={`${nmInset} flex items-center justify-between px-4 py-2.5`}
              >
                <span className="text-xs font-bold text-muted-foreground">
                  {vi
                    ? "Tổng vi phạm đã xác nhận"
                    : "Total confirmed violations"}
                </span>
                <span className="rounded-lg border border-white/60 bg-surface px-2.5 py-0.5 font-mono text-xs font-black text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]">
                  {analytics.trueViolations}
                </span>
              </div>

              {!analytics.distribution.length ? (
                <div
                  className={`${nmInset} flex min-h-[160px] items-center justify-center p-6 text-center text-xs text-muted-foreground`}
                >
                  {vi
                    ? "Chưa có vi phạm đã xác nhận trong kỳ."
                    : "No confirmed violations in this period."}
                </div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {analytics.distribution.map((row) => (
                    <div key={row.type} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-foreground">
                          {typeLabels[row.type]}
                        </span>
                        <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                          <strong className="text-foreground">
                            {row.count}
                          </strong>{" "}
                          ({row.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      {/* Grooved Progress Track */}
                      <div className="h-2.5 overflow-hidden rounded-full bg-background/80 p-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-black/45 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.75)]">
                        <div
                          className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)] transition-all duration-500"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Right Card: Resolution Status & SLA */}
            <Card
              title={
                vi
                  ? "Trạng thái Xử lý & Chỉ tiêu SLA"
                  : "Resolution status & SLA targets"
              }
              icon={<Clock className="h-4 w-4" />}
            >
              <div className="space-y-2">
                {[
                  [vi ? "Chờ duyệt" : "Pending review", analytics.pending],
                  [
                    vi
                      ? "Đã xác nhận, chưa khắc phục"
                      : "Confirmed, unresolved",
                    analytics.confirmed,
                  ],
                  [
                    vi
                      ? "Đã khắc phục (gồm hồ sơ đã đóng)"
                      : "Resolved (including closed)",
                    analytics.resolved,
                  ],
                  [
                    vi
                      ? "Báo động giả (gồm hồ sơ đã đóng)"
                      : "False alarms (including closed)",
                    analytics.dismissed,
                  ],
                  [vi ? "Chưa xác định" : "Unknown", analytics.unknown],
                ].map(([label, count]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 rounded-[14px] bg-background/60 px-3.5 py-2.5 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.65)]"
                  >
                    <span className="font-medium text-muted-foreground">
                      {label}
                    </span>
                    <strong className="rounded-lg border border-white/60 bg-surface px-2 py-0.5 font-mono text-xs font-black tabular-nums text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_4px_rgba(0,0,0,0.5)]">
                      {count}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="relative pt-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent">
                <p className="text-[11.5px] font-extrabold text-foreground">
                  {vi
                    ? "MTTR thực tế / Mục tiêu SLA tham chiếu"
                    : "Actual MTTR / Reference SLA target"}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  {vi
                    ? "SLA tham chiếu theo mức độ, chưa phải cấu hình riêng công trường. MTTR chỉ dùng thời điểm khắc phục hợp lệ."
                    : "Reference targets by severity, not site-specific settings. MTTR uses valid resolution timestamps only."}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {analytics.severityRows.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-[15px] border border-white/60 bg-surface p-3 text-[11px] shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-foreground">
                          {row.key === "OTHER" ? typeLabels.OTHER : row.key}
                        </p>
                        <span className="font-mono text-xs font-black text-primary">
                          {row.actualMttrMinutes == null
                            ? "—"
                            : `${row.actualMttrMinutes.toFixed(1)}m`}{" "}
                          <span className="font-normal text-muted-foreground">
                            /{" "}
                            {row.targetSlaMinutes == null
                              ? "—"
                              : `${row.targetSlaMinutes}m`}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        {row.resolved}/{row.count}{" "}
                        {vi ? "đã khắc phục" : "resolved"} ·{" "}
                        {row.resolutionSamples}{" "}
                        {vi ? "mẫu MTTR" : "MTTR samples"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* =========================================================
          5. 24-HOUR RISK & SHIFT BREAKDOWN
      ========================================================= */}
      <Card
        title={
          vi
            ? "Phân tích Rủi ro 24 Giờ & 3 Ca Trực"
            : "24-hour risk & shift breakdown"
        }
        subtitle={
          vi
            ? "Vi phạm đã xác nhận trong ngày lịch Việt Nam; chọn ngày riêng với bộ lọc kỳ."
            : "Confirmed violations in a Vietnam calendar day; independent of the period filter."
        }
        icon={<Activity className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {hourly ? (
            <div className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-background/60 px-3 py-1.5 text-xs shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:bg-black/30 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.65)]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
              <span className="font-medium text-muted-foreground">
                {hourly.peakHour == null || hourly.peakShift == null
                  ? vi
                    ? "Chưa có vi phạm đã xác nhận; chưa xác định giờ/ca cao điểm."
                    : "No confirmed violations; no peak hour or shift."
                  : `${vi ? "Giờ cao điểm" : "Peak hour"}: ${String(hourly.peakHour).padStart(2, "0")}:00 · ${vi ? "Ca cao điểm" : "Peak shift"}: ${shiftLabels[hourly.peakShift]}`}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground">
              {vi ? "Ngày xem:" : "Date:"}
            </span>
            <input
              type="date"
              aria-label={vi ? "Ngày phân tích theo giờ" : "Hourly risk date"}
              className={nmDateInput}
              max={today}
              value={hourlyDate}
              onChange={(e) => setHourlyDate(e.target.value)}
            />
          </div>
        </div>

        <AnalyticsStatus
          permitted={canReadReports}
          valid={!!hourPeriod}
          query={hourSource}
          retry={() => void hourSource.refetch()}
        />

        {hourly && (
          <div className="space-y-4">
            {/* 3 Shift Extruded Pods */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {(["morning", "afternoon", "night"] as const).map((key) => {
                const shift = hourly.shifts[key];
                const isCrit = shift.riskLevel === "CRITICAL";
                const isHigh = shift.riskLevel === "HIGH";
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-[18px] border border-white/60 bg-surface p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] dark:border-white/[0.05] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-foreground">
                        {shiftLabels[key]}
                      </p>
                      <p className="mt-1 inline-block rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:bg-black/30">
                        {shift.timeRange}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-black tabular-nums text-foreground">
                        {shift.totalIncidents}
                      </p>
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-[inset_1px_1px_3px_var(--shadow-dark)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.7)] ${
                          isCrit
                            ? "bg-danger/10 text-danger"
                            : isHigh
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isCrit
                              ? "bg-danger"
                              : isHigh
                                ? "bg-amber-500"
                                : "bg-primary"
                          }`}
                        />
                        {riskLabels[shift.riskLevel]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deep Inset 24h Histogram Well */}
            <div className={`${nmInset} overflow-x-auto p-3.5`}>
              <div className="grid h-32 min-w-[540px] grid-cols-[repeat(24,minmax(0,1fr))] gap-1.5">
                {hourly.hourly.map((h) => (
                  <div
                    key={h.hour}
                    title={`${h.label}: ${h.count} (${riskLabels[h.riskLevel]})`}
                    className="group flex h-full flex-col items-center justify-end gap-1.5"
                  >
                    <div className="flex w-full flex-1 items-end rounded-t-md bg-background/40 px-0.5 dark:bg-black/20">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 ${
                          !h.count
                            ? "bg-muted-foreground/20"
                            : h.riskLevel === "CRITICAL"
                              ? "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.45)]"
                              : h.riskLevel === "HIGH"
                                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]"
                                : "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
                        }`}
                        style={{
                          height: h.count
                            ? `${(h.count / maxHourly) * 100}%`
                            : "3px",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[9px] font-bold text-muted-foreground">
                      {h.hour % 4 === 0
                        ? String(h.hour).padStart(2, "0")
                        : "\u00A0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* =========================================================
          6. MODALS
      ========================================================= */}
      {canExport && (
        <GenerateReportModal
          open={generateModalOpen}
          onOpenChange={setGenerateModalOpen}
          templates={activeTemplates}
          sites={sites}
          defaultSiteId={site.id}
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          onSubmit={triggerGenerateAndDownload}
          loading={exportBusy}
          validatePeriod={(start, end) =>
            !!analyticsPeriod(start, end, today)
          }
        />
      )}
    </div>
  );
}