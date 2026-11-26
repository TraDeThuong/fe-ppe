"use client";

import { CheckCircle2, Clock, Hourglass, ShieldAlert, ShieldCheck } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { AnimatedMetricValue, AnimatedNumber } from "@/components/ui/animated-number";
import type { DashboardAnalytics } from "@/types/dashboard.types";
import { DashboardPanel } from "../dashboard-data-state";
import {
  DashboardChartExplainButton,
  type ChartExplainContent,
} from "./dashboard-chart-explain-modal";

export interface DashboardSeveritySlaChartProps {
  analytics: DashboardAnalytics;
  className?: string;
  variant?: "full" | "grid";
}

const SEVERITY_TONES: Record<
  string,
  {
    dot: string;
    rail: string;
    pill: string;
  }
> = {
  CRITICAL: {
    dot: "bg-danger",
    rail: "bg-danger",
    pill: "border-danger/30 bg-danger/10 text-danger",
  },
  HIGH: {
    dot: "bg-warning",
    rail: "bg-warning",
    pill: "border-warning/30 bg-warning/10 text-warning",
  },
  MEDIUM: {
    dot: "bg-accent",
    rail: "bg-accent",
    pill: "border-accent/35 bg-accent/15 text-accent-foreground dark:text-accent",
  },
  LOW: {
    dot: "bg-info",
    rail: "bg-info",
    pill: "border-info/30 bg-info/10 text-info",
  },
  OTHER: {
    dot: "bg-muted-foreground",
    rail: "bg-muted-foreground/50",
    pill: "border-border/50 bg-muted/40 text-muted-foreground",
  },
};

export function DashboardSeveritySlaChart({
  analytics,
  className,
}: DashboardSeveritySlaChartProps) {
  const { t, number, locale } = useLocale();
  const isVi = locale === "vi-VN";

  const formatMttr = (value: number | null) =>
    value === null
      ? "—"
      : `${number.format(Math.round(value * 10) / 10)} ${t("dashboard.charts.minutes")}`;

  const statuses = [
    { field: "pending", label: "pending", color: "bg-warning/80" },
    { field: "confirmed", label: "confirmed", color: "bg-accent" },
    { field: "resolved", label: "resolved", color: "bg-primary" },
    { field: "dismissed", label: "dismissed", color: "bg-muted-foreground/40" },
  ] as const;

  const backlogCount = analytics.severities.reduce(
    (sum, row) => sum + row.pending + row.confirmed,
    0,
  );
  const pendingTotal = analytics.severities.reduce(
    (sum, row) => sum + row.pending,
    0,
  );
  const confirmedTotal = analytics.severities.reduce(
    (sum, row) => sum + row.confirmed,
    0,
  );
  const resolvedCount = analytics.severities.reduce(
    (sum, row) => sum + row.resolved,
    0,
  );
  const dismissedCount = analytics.severities.reduce(
    (sum, row) => sum + row.dismissed,
    0,
  );
  const criticalRow = analytics.severities.find((r) => r.key === "CRITICAL");
  const highRow = analytics.severities.find((r) => r.key === "HIGH");
  const criticalBacklog =
    (criticalRow?.pending ?? 0) + (criticalRow?.confirmed ?? 0);
  const highBacklog = (highRow?.pending ?? 0) + (highRow?.confirmed ?? 0);

  const slaRows = analytics.severities.filter(
    (r): r is typeof r & { targetSlaMinutes: number } =>
      typeof r.targetSlaMinutes === "number" && r.targetSlaMinutes > 0,
  );
  const anySlaTarget = slaRows.length > 0;
  const breachedSlaRows = slaRows.filter(
    (r) => r.mttrMinutes !== null && r.mttrMinutes > r.targetSlaMinutes,
  );
  const slaSummaryChips = slaRows
    .map((r) =>
      t("dashboard.charts.slaTargetShort", {
        minutes: number.format(r.targetSlaMinutes),
      }).replace(/^SLA\s+/, ""),
    )
    .join(" · ");

  const explainContent: ChartExplainContent = {
    title: t("dashboard.charts.severity"),
    subtitle: t("dashboard.charts.resolutionScope"),
    highlights: [
      {
        label: isVi ? "Tồn đọng" : "Backlog",
        value: `${number.format(backlogCount)} ${t("dashboard.charts.incidents")}`,
        tone: criticalBacklog > 0 ? "danger" : backlogCount > 0 ? "warning" : "default",
      },
      {
        label: t("dashboard.status.resolved"),
        value: `${number.format(resolvedCount)} / ${number.format(analytics.total)}`,
        tone: "primary",
      },
      {
        label: "MTTR",
        value: formatMttr(analytics.mttrMinutes),
        tone: breachedSlaRows.length > 0 ? "danger" : "default",
      },
    ],
    summary:
      analytics.total === 0
        ? isVi
          ? "Trong kỳ thống kê đang chọn chưa có sự cố nào được ghi nhận, nên hiện không có tồn đọng và chưa có dữ liệu thời gian xử lý (MTTR)."
          : "No incidents were recorded during the selected period, so there is currently no backlog or resolution time (MTTR) data."
        : isVi
          ? `Trong ${number.format(analytics.total)} sự cố của kỳ, hiện còn ${number.format(backlogCount)} sự cố tồn đọng chưa xử lý xong (${number.format(pendingTotal)} chờ duyệt, ${number.format(confirmedTotal)} đã xác nhận) và ${number.format(resolvedCount)} sự cố đã hoàn tất xử lý.`
          : `Out of ${number.format(analytics.total)} incidents in this period, ${number.format(backlogCount)} remain unresolved (${number.format(pendingTotal)} pending review, ${number.format(confirmedTotal)} confirmed) and ${number.format(resolvedCount)} have been resolved/closed.`,
    details:
      analytics.total === 0
        ? []
        : isVi
          ? [
              criticalBacklog > 0 || highBacklog > 0
                ? `Mức độ ưu tiên cao còn tồn đọng: ${number.format(criticalBacklog)} ca Nguy cấp và ${number.format(highBacklog)} ca Nghiêm trọng cần xử lý sớm.`
                : "Hiện không có sự cố Nguy cấp hoặc Nghiêm trọng nào đang bị tồn đọng.",
              analytics.mttrMinutes !== null
                ? `Thời gian xử lý trung bình (MTTR) hiện đạt ${formatMttr(analytics.mttrMinutes)}, tính trên ${number.format(analytics.resolutionSamples)} mẫu hợp lệ từ lúc phát hiện đến lúc xử lý xong.`
                : "Thời gian xử lý trung bình đang hiển thị '—' vì trong kỳ chưa có sự cố nào hoàn tất (RESOLVED/CLOSED) có đầy đủ mốc thời gian hợp lệ.",
              ...(anySlaTarget
                ? [
                    breachedSlaRows.length > 0
                      ? `Cảnh báo cam kết SLA (${slaSummaryChips}): Nhóm ${breachedSlaRows
                          .map((r) => t(`dashboard.severity.${r.key}`))
                          .join(", ")} đang có thời gian xử lý thực tế vượt ngưỡng SLA mục tiêu.`
                      : `Cam kết SLA theo mức độ (${slaSummaryChips}): Tất cả các nhóm đã đo MTTR đều đang nằm trong ngưỡng thời gian mục tiêu.`,
                  ]
                : []),
              dismissedCount > 0
                ? `Có ${number.format(dismissedCount)} cảnh báo đã bị bác bỏ (cảnh báo sai) và không tính vào thời gian xử lý MTTR.`
                : "Chưa ghi nhận cảnh báo nào bị bác bỏ trong kỳ.",
            ]
          : [
              criticalBacklog > 0 || highBacklog > 0
                ? `High-priority backlog: ${number.format(criticalBacklog)} Critical and ${number.format(highBacklog)} High incidents still need resolution.`
                : "No Critical or High severity incidents are currently in backlog.",
              analytics.mttrMinutes !== null
                ? `Average resolution time (MTTR) is ${formatMttr(analytics.mttrMinutes)}, measured across ${number.format(analytics.resolutionSamples)} valid resolved/closed samples.`
                : "MTTR shows '—' because no RESOLVED/CLOSED incidents in this period have valid detection-to-resolution timestamps yet.",
              ...(anySlaTarget
                ? [
                    breachedSlaRows.length > 0
                      ? `SLA threshold alert (${slaSummaryChips}): ${breachedSlaRows
                          .map((r) => t(`dashboard.severity.${r.key}`))
                          .join(", ")} exceeded target SLA resolution time.`
                      : `Target SLA thresholds (${slaSummaryChips}): All measured severity tiers are within target SLA windows.`,
                  ]
                : []),
              dismissedCount > 0
                ? `${number.format(dismissedCount)} alerts were dismissed as false alarms and are excluded from MTTR.`
                : "No dismissed alerts in this period.",
            ],
    meaning: isVi
      ? anySlaTarget
        ? "Card này phân loại sự cố theo 4 mức độ nguy hiểm (Nguy cấp, Nghiêm trọng, Trung bình, Nhẹ), đối chiếu trực tiếp thời gian xử lý thực tế (MTTR) với mốc cam kết SLA của từng mức để nhận diện sớm các nhóm xử lý chậm."
        : "Card này phân loại sự cố theo 4 mức độ nguy hiểm (Nguy cấp, Nghiêm trọng, Trung bình, Nhẹ), cho biết tình trạng xử lý của từng nhóm và thời gian xử lý trung bình (MTTR) từ lúc AI phát hiện đến khi khắc phục xong."
      : anySlaTarget
        ? "This card groups incidents by severity tier and compares actual Mean Time To Resolve (MTTR) directly against each tier's target SLA threshold."
        : "This card groups incidents by severity level (Critical, High, Medium, Low), shows how many are pending vs. resolved in each tier, and reports Mean Time To Resolve (MTTR) from detection to resolution.",
  };

  return (
    <DashboardPanel
      title={t("dashboard.charts.severity")}
      description={t("dashboard.charts.resolutionScope")}
      icon={<ShieldAlert className="size-4" />}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5 dark:border-primary/30 dark:bg-primary/15">
            <Clock className="size-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground">
              MTTR:
            </span>
            <span className="font-mono text-xs font-extrabold tabular-nums text-foreground">
              <AnimatedMetricValue value={formatMttr(analytics.mttrMinutes)} />
            </span>
          </div>
          <DashboardChartExplainButton
            content={explainContent}
            icon={<ShieldAlert className="size-5 text-primary" />}
          />
        </div>
      }
      className={className}
      bodyClassName="flex flex-col justify-between gap-4"
    >
      {/* Top 3-KPI Summary Strip */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2.5">
        <div className="min-w-0 rounded-2xl border border-border/35 bg-background/60 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Hourglass className="size-3 shrink-0 text-warning" />
            <span className="truncate">{t("dashboard.charts.backlog")}</span>
          </div>
          <p
            className={`mt-1 text-lg sm:text-xl font-black tracking-tight tabular-nums ${
              backlogCount > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            <AnimatedNumber value={backlogCount} format={(v) => number.format(v)} />
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {t("dashboard.status.pending")} + {t("dashboard.status.confirmed")}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-border/35 bg-background/60 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/40 dark:shadow-none">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <CheckCircle2 className="size-3 shrink-0 text-primary" />
            <span className="truncate">{t("dashboard.status.resolved")}</span>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black tracking-tight tabular-nums text-primary">
            <AnimatedNumber value={resolvedCount} format={(v) => number.format(v)} />
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground tabular-nums">
            / <AnimatedNumber value={analytics.total} format={(v) => number.format(v)} /> {t("dashboard.charts.incidents")}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 dark:border-primary/25 dark:bg-primary/10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Clock className="size-3 shrink-0 text-primary" />
            <span className="truncate">MTTR</span>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-black tracking-tight tabular-nums text-foreground">
            <AnimatedMetricValue value={formatMttr(analytics.mttrMinutes)} />
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground tabular-nums">
            <AnimatedNumber value={analytics.resolutionSamples} format={(v) => number.format(v)} />{" "}
            {t("dashboard.charts.samples")}
          </p>
        </div>
      </div>

      {/* Recessed Severity Breakdown Tray */}
      {analytics.total === 0 ? (
        <div
          className={`flex min-h-[210px] flex-1 flex-col items-center justify-center gap-3.5 rounded-[20px] bg-background/70 px-5 py-7 text-center ${NM.recessed}`}
        >
          <div
            className={`flex size-13 items-center justify-center rounded-2xl bg-background text-primary ${NM.extruded}`}
          >
            <div
              className={`flex size-9 items-center justify-center rounded-xl bg-background ${NM.recessed}`}
            >
              <ShieldCheck className="size-5" strokeWidth={2.2} />
            </div>
          </div>

          <div className="max-w-md space-y-1.5">
            <h4 className="text-sm font-black text-foreground">
              {t("dashboard.charts.severityEmptyTitle")}
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("dashboard.charts.severityEmptyDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {analytics.severities.map((row) => {
              const tone = SEVERITY_TONES[row.key] ?? SEVERITY_TONES.OTHER;
              const hasSla =
                typeof row.targetSlaMinutes === "number" &&
                row.targetSlaMinutes > 0;
              return (
                <span
                  key={row.key}
                  className={`inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground ${NM.extruded}`}
                >
                  <span className={`size-2 rounded-full ${tone.dot}`} />
                  <span>{t(`dashboard.severity.${row.key}`)}:</span>
                  <strong className="font-mono font-extrabold text-foreground">
                    0
                  </strong>
                  {hasSla && (
                    <span className="font-mono text-[10px] text-muted-foreground/80">
                      ·{" "}
                      {t("dashboard.charts.slaTargetShort", {
                        minutes: number.format(row.targetSlaMinutes!),
                      })}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-3 rounded-[20px] border border-border/40 bg-background/65 p-3.5 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)] dark:border-white/[0.06] dark:bg-background/35 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45)] sm:p-4">
        {/* Compact Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2.5 dark:border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            {statuses.map(({ field, label, color }) => (
              <span
                key={field}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <span className={`size-2 rounded-full ${color}`} />
                {t(`dashboard.status.${label}`)}
              </span>
            ))}
          </div>
          {anySlaTarget && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/70 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground dark:border-white/[0.08]">
              <span>{t("dashboard.charts.slaLegend")}:</span>
              <strong className="font-bold text-foreground">
                {slaSummaryChips}
              </strong>
            </span>
          )}
        </div>

        {/* Clean Severity Rows */}
        <div className="space-y-2.5">
          {analytics.severities.map((row) => {
            const tone = SEVERITY_TONES[row.key] ?? SEVERITY_TONES.OTHER;
            const total =
              row.pending +
              row.confirmed +
              row.resolved +
              row.dismissed +
              row.other;
            const hasIncidents = row.count > 0;
            const sharePercent =
              analytics.total > 0
                ? Math.round((row.count / analytics.total) * 100)
                : 0;
            const segmentPercent = (value: number) =>
              total > 0 ? (value / total) * 100 : 0;
            const hasSlaTarget =
              typeof row.targetSlaMinutes === "number" &&
              row.targetSlaMinutes > 0;
            const isSlaBreached =
              hasSlaTarget &&
              row.mttrMinutes !== null &&
              row.mttrMinutes > row.targetSlaMinutes!;
            const slaTargetLabel = hasSlaTarget
              ? t("dashboard.charts.slaTargetShort", {
                  minutes: number.format(row.targetSlaMinutes!),
                })
              : null;

            return (
              <div
                key={row.key}
                className={`relative overflow-hidden rounded-xl border px-3.5 py-2.5 transition-colors ${
                  hasIncidents
                    ? "border-border/40 bg-surface/90 shadow-[2px_3px_8px_rgba(0,0,0,0.03),-2px_-2px_5px_rgba(255,255,255,0.5)] dark:border-white/[0.06] dark:bg-card/50 dark:shadow-none"
                    : "border-border/25 bg-surface/40 opacity-65 dark:border-white/[0.04] dark:bg-card/20"
                }`}
              >
                {/* Semantic left indicator */}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-2.5 left-0 top-2.5 w-1 rounded-r-full ${tone.rail}`}
                />

                <div className="pl-2">
                  {/* Top Row: Severity Label + Share | Count + MTTR / SLA */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${tone.dot}`} />
                      <span className="text-xs font-extrabold text-foreground">
                        {t(`dashboard.severity.${row.key}`)}
                      </span>
                      {hasIncidents && (
                        <span className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground dark:bg-white/[0.06]">
                          <AnimatedNumber value={sharePercent} />%
                        </span>
                      )}
                      {isSlaBreached && (
                        <span className="rounded-md border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-danger">
                          {t("dashboard.charts.slaOverdue")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-black tabular-nums text-foreground">
                        <AnimatedNumber value={row.count} format={(v) => number.format(v)} />{" "}
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {t("dashboard.charts.incidents")}
                        </span>
                      </span>

                      <span className="h-3 w-px bg-border/50 dark:bg-white/10" />

                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums ${
                          isSlaBreached
                            ? "border-danger/35 bg-danger/10 text-danger"
                            : row.mttrMinutes !== null
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : "border-border/30 bg-background/60 text-muted-foreground dark:border-white/[0.06]"
                        }`}
                      >
                        <Clock className="size-2.5" />
                        <AnimatedMetricValue value={formatMttr(row.mttrMinutes)} />
                        {slaTargetLabel && (
                          <span
                            className={
                              isSlaBreached
                                ? "text-danger/90"
                                : "text-muted-foreground"
                            }
                          >
                            / {slaTargetLabel}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress Track + Inline Non-Zero Status Breakdown */}
                  {hasIncidents && (
                    <>
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-background/80 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] dark:bg-background/60">
                        {statuses.map(({ field, color }) =>
                          row[field] > 0 ? (
                            <div
                              key={field}
                              className={`${color} transition-all duration-500`}
                              style={{
                                width: `${segmentPercent(row[field])}%`,
                              }}
                            />
                          ) : null,
                        )}
                        {row.other > 0 && (
                          <div
                            className="bg-muted-foreground/45"
                            style={{ width: `${segmentPercent(row.other)}%` }}
                          />
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {statuses.map(({ field, label, color }) =>
                            row[field] > 0 ? (
                              <span
                                key={field}
                                className="inline-flex items-center gap-1 font-medium"
                              >
                                <span
                                  className={`size-1.5 rounded-full ${color}`}
                                />
                                <span>{t(`dashboard.status.${label}`)}:</span>
                                <strong className="font-bold tabular-nums text-foreground">
                                  {number.format(row[field])}
                                </strong>
                              </span>
                            ) : null,
                          )}
                          {row.other > 0 && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span>{t("dashboard.status.other")}:</span>
                              <strong className="font-bold tabular-nums text-foreground">
                                {number.format(row.other)}
                              </strong>
                            </span>
                          )}
                        </div>

                        {row.resolutionSamples > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {number.format(row.resolutionSamples)}{" "}
                            {t("dashboard.charts.samples")}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </DashboardPanel>
  );
}
