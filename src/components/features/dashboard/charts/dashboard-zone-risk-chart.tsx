"use client";

import { Archive, CalendarRange, Cctv, ChevronRight, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { partitionDashboardCameras } from "@/lib/dashboard-data";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";
import type { DashboardCameraStat, DashboardPreset } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";
import {
  DashboardChartExplainButton,
  type ChartExplainContent,
} from "./dashboard-chart-explain-modal";

export interface DashboardZoneRiskChartProps {
  cameras?: CameraItem[];
  cameraStats: DashboardCameraStat[];
  catalogComplete?: boolean;
  loading?: boolean;
  incidentUnavailable?: string | null;
  catalogError?: string | null;
  onRetry?: () => void;
  periodLabel?: string;
  preset?: DashboardPreset;
  onChangePreset?: (preset: DashboardPreset) => void;
  className?: string;
  topOnly?: boolean;
  variant?: "full" | "grid";
  onSelectCamera?: (id: string) => void;
}

function StackedStatusBar({
  total,
  resolved,
  pending,
  dismissed,
}: {
  total: number;
  resolved: number;
  pending: number;
  dismissed: number;
}) {
  if (total <= 0) {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/80 dark:bg-background/50" />
    );
  }
  const resolvedPct = Math.max(0, Math.min((resolved / total) * 100, 100));
  const pendingPct = Math.max(
    0,
    Math.min((pending / total) * 100, 100 - resolvedPct),
  );
  const dismissedPct = Math.max(
    0,
    Math.min((dismissed / total) * 100, 100 - resolvedPct - pendingPct),
  );

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-background/80 dark:bg-background/50">
      {resolvedPct > 0 && (
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${resolvedPct}%` }}
        />
      )}
      {pendingPct > 0 && (
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${pendingPct}%` }}
        />
      )}
      {dismissedPct > 0 && (
        <div
          className="h-full bg-muted-foreground/40 transition-all duration-300"
          style={{ width: `${dismissedPct}%` }}
        />
      )}
    </div>
  );
}

function CameraIncidentBreakdown({
  total,
  resolved,
  pending,
  dismissed,
  noneLabel,
  incidentsLabel,
  backlogLabel,
  resolvedLabel,
  dismissedLabel,
  formatNumber,
}: {
  total: number;
  resolved: number;
  pending: number;
  dismissed: number;
  noneLabel?: string;
  incidentsLabel: string;
  backlogLabel: string;
  resolvedLabel: string;
  dismissedLabel: string;
  formatNumber: (value: number) => string;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <StackedStatusBar
        total={total}
        resolved={resolved}
        pending={pending}
        dismissed={dismissed}
      />
      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              {formatNumber(total)}{" "}
              <span className="font-normal text-muted-foreground">
                {incidentsLabel}
              </span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span
              className={
                pending > 0 ? "font-bold text-accent" : "text-muted-foreground"
              }
            >
              {formatNumber(pending)}{" "}
              <span className="font-normal text-muted-foreground">
                {backlogLabel}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="font-bold text-primary">
              {`${formatNumber(resolved)}/${formatNumber(total)}`}
            </span>
            <span className="font-sans text-muted-foreground">
              {resolvedLabel}
            </span>
            {dismissed > 0 && (
              <span className="font-sans text-muted-foreground">
                {`· ${formatNumber(dismissed)} ${dismissedLabel}`}
              </span>
            )}
          </div>
        </div>
      ) : (
        noneLabel && (
          <p className="text-[11px] text-muted-foreground">{noneLabel}</p>
        )
      )}
    </div>
  );
}

export function DashboardZoneRiskChart({
  cameras = [],
  cameraStats,
  catalogComplete = false,
  loading = false,
  incidentUnavailable = null,
  catalogError = null,
  onRetry,
  periodLabel,
  preset,
  onChangePreset,
  className,
  topOnly = false,
  variant = "grid",
  onSelectCamera,
}: DashboardZoneRiskChartProps) {
  const { t, number, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const isFull = variant === "full";

  const { rows, archived } = partitionDashboardCameras(cameras, cameraStats, {
    catalogComplete,
    topOnly,
  });

  const activeTotal = rows.reduce((sum, r) => sum + (r.stat?.total ?? 0), 0);
  const activePending = rows.reduce((sum, r) => sum + (r.stat?.pending ?? 0), 0);
  const activeResolved = rows.reduce(
    (sum, r) => sum + (r.stat?.resolved ?? 0),
    0,
  );
  const activeDismissed = rows.reduce(
    (sum, r) => sum + (r.stat?.dismissed ?? 0),
    0,
  );

  const periodTotal = activeTotal + (archived?.total ?? 0);
  const periodPending = activePending + (archived?.pending ?? 0);
  const periodResolved = activeResolved + (archived?.resolved ?? 0);
  const periodDismissed = activeDismissed + (archived?.dismissed ?? 0);

  const onlineCount = rows.filter(
    (row) => row.camera?.status === "ONLINE",
  ).length;
  const camerasWithBacklog =
    rows.filter((row) => (row.stat?.pending ?? 0) > 0).length +
    ((archived?.pending ?? 0) > 0 ? 1 : 0);

  const topActiveRow = rows.find((row) => (row.stat?.total ?? 0) > 0);
  const topCameraName = topActiveRow
    ? topActiveRow.camera?.name ||
      topActiveRow.stat?.cameraName ||
      (topActiveRow.cameraId === "OTHER"
        ? t("dashboard.type.OTHER")
        : `Camera ${topActiveRow.cameraId.slice(0, 8)}`)
    : null;

  const explainContent: ChartExplainContent = {
    title: t(topOnly ? "dashboard.charts.topCameras" : "dashboard.charts.cameras"),
    subtitle: t("dashboard.charts.cameraScope"),
    highlights: [
      {
        label: isVi ? "Camera hiện hành" : "Active cameras",
        value: catalogComplete
          ? `${number.format(onlineCount)}/${number.format(rows.length)} online`
          : `${number.format(rows.length)} cam`,
        tone: "default",
      },
      {
        label: t("dashboard.charts.incidents"),
        value: `${number.format(periodTotal)}`,
        tone: "primary",
      },
      {
        label: t("dashboard.charts.backlog"),
        value: `${number.format(periodPending)} (${number.format(camerasWithBacklog)})`,
        tone: periodPending > 0 ? "warning" : "default",
      },
    ],
    summary:
      rows.length === 0 && !archived
        ? isVi
          ? "Hiện chưa có dữ liệu camera hoặc sự cố nào thuộc phạm vi đang chọn."
          : "No cameras or incidents are currently available in the selected scope."
        : periodTotal === 0
          ? isVi
            ? `Đang theo dõi ${number.format(rows.length)} camera${catalogComplete ? ` (${number.format(onlineCount)} đang trực tuyến)` : ""}, và chưa có sự cố vi phạm nào trong kỳ.`
            : `Tracking ${number.format(rows.length)} cameras${catalogComplete ? ` (${number.format(onlineCount)} online)` : ""}, with zero PPE incidents recorded during this period.`
          : isVi
            ? `Ghi nhận ${number.format(periodTotal)} sự cố trong kỳ (${number.format(periodPending)} tồn đọng, ${number.format(periodResolved)} đã xử lý${periodDismissed > 0 ? `, ${number.format(periodDismissed)} bác bỏ` : ""}).`
            : `Recorded ${number.format(periodTotal)} incidents in period (${number.format(periodPending)} backlog, ${number.format(periodResolved)} resolved${periodDismissed > 0 ? `, ${number.format(periodDismissed)} dismissed` : ""}).`,
    details:
      rows.length === 0 && !archived
        ? []
        : isVi
          ? [
              topActiveRow && topCameraName
                ? `Camera hiện hành phát sinh nhiều nhất: "${topCameraName}" với ${number.format(topActiveRow.stat?.total ?? 0)} sự cố (${number.format(topActiveRow.stat?.pending ?? 0)} tồn đọng, ${number.format(topActiveRow.stat?.resolved ?? 0)} đã xử lý).`
                : "Các camera hiện hành chưa ghi nhận sự cố nào trong kỳ.",
              ...(archived
                ? [
                    `Ngoài ra có ${number.format(archived.total)} sự cố thuộc ${number.format(archived.cameraCount)} camera đã xóa hoặc không còn trong danh mục hiện tại (được gom thành 1 dòng lưu trữ ở cuối).`,
                  ]
                : []),
              "Thanh phân đoạn trên mỗi camera biểu thị tỷ lệ Đã xử lý (xanh), Tồn đọng (cam) và Bác bỏ (xám).",
            ]
          : [
              topActiveRow && topCameraName
                ? `Top active camera: "${topCameraName}" with ${number.format(topActiveRow.stat?.total ?? 0)} incidents (${number.format(topActiveRow.stat?.pending ?? 0)} backlog, ${number.format(topActiveRow.stat?.resolved ?? 0)} resolved).`
                : "No active cameras recorded incidents in this period.",
              ...(archived
                ? [
                    `${number.format(archived.total)} additional incidents belong to ${number.format(archived.cameraCount)} archived or deleted cameras (grouped into one summary row at the bottom).`,
                  ]
                : []),
              "The segmented bar on each row shows Resolved (green), Backlog (amber), and Dismissed (gray) proportions.",
            ],
    meaning: isVi
      ? "Card này đối chiếu danh mục camera đang hoạt động với số sự cố trong kỳ theo từng trạng thái xử lý, giúp bạn tập trung ngay vào các camera có tồn đọng mà không bị nhiễu bởi dữ liệu camera cũ đã xóa."
      : "This card pairs active fleet cameras with period incident counts by resolution status, helping you spot active backlog without noise from deleted historical cameras.",
  };

  const hasContent = rows.length > 0 || archived !== null;

  return (
    <DashboardPanel
      title={t(
        topOnly ? "dashboard.charts.topCameras" : "dashboard.charts.cameras",
      )}
      description={t("dashboard.charts.cameraScope")}
      icon={<Cctv className="size-4" />}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          {periodLabel && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-primary dark:border-primary/25 dark:bg-primary/10">
              <CalendarRange className="size-3 shrink-0" />
              <span className="max-w-[170px] truncate">{periodLabel}</span>
            </div>
          )}
          {!loading && rows.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/70 px-3 py-1.5 dark:border-white/[0.06] dark:bg-background/40">
              <span className="text-xs font-extrabold tabular-nums text-foreground">
                {catalogComplete
                  ? `${number.format(onlineCount)}/${number.format(rows.length)}`
                  : number.format(rows.length)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {catalogComplete ? "online" : "cam"}
              </span>
            </div>
          )}
          <DashboardChartExplainButton
            content={explainContent}
            icon={<Cctv className="size-5 text-primary" />}
          />
        </div>
      }
      className={className}
      bodyClassName="flex flex-col justify-between gap-3.5"
    >
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/35 bg-background/60 p-3 dark:border-white/[0.06] dark:bg-background/40"
              >
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="mt-2 h-6 w-12 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-[20px] border border-border/35 bg-background/60 p-3.5 dark:border-white/[0.06] dark:bg-background/35">
            {[0, 1, 2].map((idx) => (
              <Skeleton key={idx} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : !hasContent ? (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] border border-border/30 bg-background/50 px-4 py-12 text-center shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.05] dark:bg-background/30 dark:shadow-none">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/30 bg-surface text-primary dark:border-white/[0.06] dark:bg-card">
            <Cctv className="size-5" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {incidentUnavailable || catalogError || t("dashboard.charts.noIncidents")}
          </p>
          {(incidentUnavailable || catalogError) && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-primary hover:bg-background"
            >
              {t("dashboard.data.retry")}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Compact 3-KPI Summary Strip when violations > 0; calm callout when 0 */}
          {!incidentUnavailable &&
            (periodTotal > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-border/35 bg-background/60 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">
                    {isVi ? "Vi phạm phát hiện" : "PPE detected"}
                  </p>
                  <p className="mt-0.5 text-lg font-black tracking-tight tabular-nums text-foreground">
                    {number.format(periodTotal)}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {number.format(rows.length)} cam
                    {archived ? ` + ${number.format(archived.cameraCount)} cũ` : ""}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/35 bg-background/60 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">
                    {isVi ? "Chưa xử lý" : "Open backlog"}
                  </p>
                  <p
                    className={`mt-0.5 text-lg font-black tracking-tight tabular-nums ${
                      periodPending > 0 ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {number.format(periodPending)}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {t("dashboard.status.pending")} + {t("dashboard.status.confirmed")}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/35 bg-background/60 px-3 py-2.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
                  <p className="truncate text-[11px] font-semibold text-muted-foreground">
                    {isVi ? "Đã xử lý xong" : "Resolved"}
                  </p>
                  <p className="mt-0.5 text-lg font-black tracking-tight tabular-nums text-primary">
                    {number.format(periodResolved)}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {periodDismissed > 0
                      ? `${number.format(periodDismissed)} ${t("dashboard.charts.dismissedShort")}`
                      : `/ ${number.format(periodTotal)} ${t("dashboard.charts.violationsUnit")}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.05] px-3.5 py-2.5 dark:border-primary/25 dark:bg-primary/10">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {t("dashboard.charts.zeroViolationsInPeriod")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isVi
                        ? "Các camera bên dưới chỉ hiển thị trạng thái kết nối thiết bị hiện tại."
                        : "Camera rows below reflect live device connection status."}
                    </p>
                  </div>
                </div>
                {onChangePreset && preset === "today" && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangePreset("7d")}
                      className="cursor-pointer rounded-lg border border-primary/25 bg-surface px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10 dark:bg-card"
                    >
                      {t("dashboard.period.7d")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangePreset("month")}
                      className="cursor-pointer rounded-lg border border-border/50 bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/35 hover:text-primary dark:bg-card"
                    >
                      {t("dashboard.period.month")}
                    </button>
                  </div>
                )}
              </div>
            ))}

          {incidentUnavailable && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <span>{incidentUnavailable}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 rounded-md border border-current/25 px-2 py-0.5 font-semibold hover:bg-background/40"
                >
                  {t("dashboard.data.retry")}
                </button>
              )}
            </div>
          )}

          {/* Recessed Camera List Tray */}
          <div className="flex flex-1 flex-col gap-3 rounded-[20px] border border-border/40 bg-background/65 p-3.5 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/35 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45)]">
            {/* Compact Status Legend */}
            {!incidentUnavailable && periodTotal > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/30 pb-2 dark:border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" />
                  {t("dashboard.charts.resolvedShort")}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-accent" />
                  {t("dashboard.charts.backlogShort")}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                  {t("dashboard.charts.dismissedShort")}
                </span>
              </div>
            )}

            <div
              className={`max-h-[380px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] ${
                isFull
                  ? "grid grid-cols-1 gap-2.5 md:grid-cols-2"
                  : "space-y-2"
              }`}
            >
              {rows.map((entry) => {
                const { cameraId: id, camera, stat: row, inCatalog } = entry;
                const total = row?.total ?? 0;
                const pending = row?.pending ?? 0;
                const resolved = row?.resolved ?? 0;
                const dismissed = row?.dismissed ?? 0;

                const cameraName =
                  camera?.name ||
                  row?.cameraName ||
                  (id === "OTHER"
                    ? t("dashboard.type.OTHER")
                    : `Camera ${id.slice(0, 8)}`);

                const canSelect = Boolean(onSelectCamera && inCatalog && id !== "OTHER");
                const isOnline = camera?.status === "ONLINE";
                const isOffline = camera?.status === "OFFLINE";

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => canSelect && onSelectCamera?.(id)}
                    className={[
                      "group w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150",
                      "border-border/35 bg-surface/85 dark:border-white/[0.06] dark:bg-card/60",
                      total === 0 && !incidentUnavailable ? "opacity-80" : "",
                      canSelect
                        ? "cursor-pointer hover:border-primary/40 hover:bg-surface dark:hover:border-primary/30 dark:hover:bg-card/85"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    {/* Row 1: Identity + Live Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={[
                            "size-2 shrink-0 rounded-full",
                            isOnline
                              ? "bg-primary"
                              : isOffline
                                ? "bg-destructive"
                                : "bg-muted-foreground/45",
                          ].join(" ")}
                        />
                        <span className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                          {cameraName}
                        </span>
                        <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                          {camera?.code || `ID: ${id.slice(0, 8)}`}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            isOnline
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : isOffline
                                ? "border-destructive/25 bg-destructive/10 text-destructive"
                                : "border-border/40 bg-background/60 text-muted-foreground",
                          ].join(" ")}
                        >
                          {camera
                            ? t(`dashboard.camera.${camera.status}`)
                            : t("dashboard.camera.unknown")}
                        </span>
                        {canSelect && (
                          <ChevronRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Row 2 & 3: Stacked Status Bar + Clean Single-Line Metrics */}
                    {!incidentUnavailable && (
                      <CameraIncidentBreakdown
                        total={total}
                        resolved={resolved}
                        pending={pending}
                        dismissed={dismissed}
                        noneLabel={t("dashboard.charts.noneInPeriod")}
                        incidentsLabel={t("dashboard.charts.violationsUnit")}
                        backlogLabel={t("dashboard.charts.backlogShort")}
                        resolvedLabel={t("dashboard.charts.resolvedShort")}
                        dismissedLabel={t("dashboard.charts.dismissedShort")}
                        formatNumber={(v) => number.format(v)}
                      />
                    )}
                  </button>
                );
              })}

              {/* Collapsed Archived / Deleted Camera Incidents Row */}
              {archived && !incidentUnavailable && (
                <div
                  className={`rounded-xl border border-dashed border-border/50 bg-background/45 px-3.5 py-2.5 dark:border-white/[0.1] dark:bg-background/25 ${
                    isFull ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Archive className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-semibold text-foreground">
                        {t("dashboard.charts.archivedCameras")}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/40 bg-surface/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-card/50">
                      {number.format(archived.cameraCount)}{" "}
                      {t("dashboard.charts.archivedHint")}
                    </span>
                  </div>

                  <CameraIncidentBreakdown
                    total={archived.total}
                    resolved={archived.resolved}
                    pending={archived.pending}
                    dismissed={archived.dismissed}
                    incidentsLabel={t("dashboard.charts.violationsUnit")}
                    backlogLabel={t("dashboard.charts.backlogShort")}
                    resolvedLabel={t("dashboard.charts.resolvedShort")}
                    dismissedLabel={t("dashboard.charts.dismissedShort")}
                    formatNumber={(v) => number.format(v)}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && (!catalogComplete || catalogError) && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 dark:bg-accent/[0.08]">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {catalogError || t("dashboard.charts.catalogUnavailable")}
            </p>
          </div>
          {catalogError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-primary hover:bg-background"
            >
              {t("dashboard.data.retry")}
            </button>
          )}
        </div>
      )}
    </DashboardPanel>
  );
}
