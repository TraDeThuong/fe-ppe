"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  GitMerge,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Wrench,
} from "lucide-react";
import { AnimatedNumber, useAnimatedProgress } from "@/components/ui/animated-number";
import { useLocale } from "@/providers/locale-provider";
import type {
  ResolutionFunnelSummary,
  SiteComparisonStat,
} from "@/lib/report-analytics-data";

export type FunnelCardViewMode = "funnel" | "sites";

export interface ReportResolutionFunnelCardProps {
  funnel: ResolutionFunnelSummary;
  siteStats: SiteComparisonStat[];
  selectedSiteId?: string;
  onSelectSite?: (siteId: string) => void;
  loading?: boolean;
}

interface StageDisplayRow {
  key: "detected" | "pendingReview" | "awaitingDispatch" | "remediating" | "completed";
  label: string;
  sublabel: string;
  count: number;
  percentOfDetected: number;
  barClass: string;
  iconBgClass: string;
  icon: typeof Filter;
}

function formatMttrLabel(hours: number, isVietnamese: boolean): string {
  if (!hours || hours <= 0) return "—";
  if (hours < 1) {
    return `${Math.max(1, Math.round(hours * 60))} ${isVietnamese ? "phút" : "m"}`;
  }
  return `${hours.toFixed(1)} ${isVietnamese ? "giờ" : "h"}`;
}

/**
 * Row 2 Left (5 cols): Violation Resolution Funnel & Multi-Site Comparison switchable card.
 */
export function ReportResolutionFunnelCard({
  funnel,
  siteStats,
  selectedSiteId = "",
  onSelectSite,
  loading = false,
}: ReportResolutionFunnelCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [viewMode, setViewMode] = useState<FunnelCardViewMode>("funnel");
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const progressScale = useAnimatedProgress(100, {
    enabled: !loading && funnel.totalDetected > 0,
  });

  const stageRows = useMemo<StageDisplayRow[]>(() => {
    const total = Math.max(1, funnel.totalDetected);
    const pct = (count: number) => Math.round((count / total) * 100);

    return [
      {
        key: "detected",
        label: isVietnamese ? "AI Phát hiện" : "AI Detected",
        sublabel: isVietnamese ? "Tổng sự kiện ghi nhận trong kỳ" : "Total events captured in period",
        count: funnel.totalDetected,
        percentOfDetected: funnel.totalDetected > 0 ? 100 : 0,
        barClass: "bg-gradient-to-r from-primary/80 to-primary",
        iconBgClass: "bg-primary/12 text-primary",
        icon: ShieldAlert,
      },
      {
        key: "pendingReview",
        label: isVietnamese ? "Chờ thẩm duyệt" : "Pending Review",
        sublabel: isVietnamese ? "Đợi Quản lý xác nhận / bác bỏ" : "Awaiting manager triage",
        count: funnel.pendingReview,
        percentOfDetected: pct(funnel.pendingReview),
        barClass: "bg-accent/70",
        iconBgClass: "bg-accent/12 text-accent",
        icon: Clock,
      },
      {
        key: "awaitingDispatch",
        label: isVietnamese ? "Chờ điều phối" : "Awaiting Dispatch",
        sublabel: isVietnamese ? "Đã xác nhận, chưa giao cán bộ" : "Confirmed, unassigned",
        count: funnel.awaitingDispatch,
        percentOfDetected: pct(funnel.awaitingDispatch),
        barClass: "bg-accent",
        iconBgClass: "bg-accent/15 text-accent",
        icon: AlertTriangle,
      },
      {
        key: "remediating",
        label: isVietnamese ? "Đang khắc phục" : "Remediating",
        sublabel: isVietnamese ? "Cán bộ an toàn đang xử lý" : "Assigned to safety officer",
        count: funnel.remediating,
        percentOfDetected: pct(funnel.remediating),
        barClass: "bg-primary/60",
        iconBgClass: "bg-primary/12 text-primary",
        icon: Wrench,
      },
      {
        key: "completed",
        label: isVietnamese ? "Đã khắc phục / Đóng" : "Resolved / Closed",
        sublabel: isVietnamese
          ? `${funnel.awaitingAcceptance} chờ nghiệm thu • ${funnel.closed} đã đóng`
          : `${funnel.awaitingAcceptance} awaiting acceptance • ${funnel.closed} closed`,
        count: funnel.completedTotal,
        percentOfDetected: pct(funnel.completedTotal),
        barClass: "bg-primary",
        iconBgClass: "bg-primary/15 text-primary",
        icon: CheckCircle2,
      },
    ];
  }, [funnel, isVietnamese]);

  const bottleneckLabel = useMemo(() => {
    switch (funnel.bottleneckStage) {
      case "pendingReview":
        return isVietnamese ? "Chờ thẩm duyệt" : "Pending Review";
      case "awaitingDispatch":
        return isVietnamese ? "Chờ điều phối" : "Awaiting Dispatch";
      case "remediating":
        return isVietnamese ? "Đang khắc phục" : "Remediating";
      case "awaitingAcceptance":
        return isVietnamese ? "Chờ nghiệm thu" : "Awaiting Acceptance";
      default:
        return isVietnamese ? "Không tồn đọng" : "No Backlog";
    }
  }, [funnel.bottleneckStage, isVietnamese]);

  const activeBacklogCount =
    funnel.pendingReview + funnel.awaitingDispatch + funnel.remediating + funnel.awaitingAcceptance;

  const selectedStageDetail = useMemo(() => {
    if (!activeStage) return null;
    const found = stageRows.find((s) => s.key === activeStage);
    if (!found) return null;

    let targetHref = "/incidents";
    let actionLabel = isVietnamese ? "Xem danh sách sự cố" : "View incidents";
    if (activeStage === "pendingReview") {
      targetHref = "/incidents?status=PENDING_REVIEW";
      actionLabel = isVietnamese ? "Thẩm duyệt ngay" : "Review pending";
    } else if (activeStage === "awaitingDispatch" || activeStage === "remediating") {
      targetHref = "/incidents/assignments";
      actionLabel = isVietnamese ? "Mở bảng điều phối" : "Open dispatch";
    } else if (activeStage === "completed") {
      targetHref = "/incidents?status=RESOLVED";
      actionLabel = isVietnamese ? "Xem hồ sơ đã xử lý" : "View resolved";
    }

    return { ...found, targetHref, actionLabel };
  }, [activeStage, stageRows, isVietnamese]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[460px] w-full flex-col justify-between rounded-[24px] bg-surface p-5 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-5 w-44 rounded-lg bg-muted" />
              <div className="h-3 w-56 rounded-lg bg-muted/70" />
            </div>
            <div className="h-9 w-36 rounded-xl bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-2xl bg-muted/60" />
            <div className="h-16 rounded-2xl bg-muted/60" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        relative flex h-full w-full flex-col justify-between overflow-hidden
        rounded-[24px] sm:rounded-[30px]
        border border-white/80 bg-background p-1.5
        shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]
        dark:border-white/10
      "
    >
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[20px] sm:rounded-[25px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-5">
        {/* Micro-grid & ambient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_80%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
        />

        {/* HEADER */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-[var(--shadow-dark)]/20 pb-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-background shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)] dark:border-white/10">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/25 text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]">
                {viewMode === "funnel" ? (
                  <GitMerge size={18} strokeWidth={2.3} />
                ) : (
                  <Building2 size={18} strokeWidth={2.3} />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm sm:text-base font-black tracking-tight text-foreground">
                {viewMode === "funnel"
                  ? t("reports.charts.funnelTitle")
                  : t("reports.charts.siteCompareTitle")}
              </h3>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {viewMode === "funnel"
                  ? t("reports.charts.funnelDesc")
                  : t("reports.charts.siteCompareDesc")}
              </p>
            </div>
          </div>

          {/* Switcher: Funnel / Sites */}
          <div
            role="tablist"
            aria-label={isVietnamese ? "Chế độ hiển thị" : "Display mode"}
            className="flex shrink-0 items-center gap-1 rounded-2xl border border-black/[0.04] bg-background/80 p-1 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "funnel"}
              onClick={() => setViewMode("funnel")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "funnel"
                  ? "bg-primary text-primary-foreground shadow-[2px_2px_6px_var(--shadow-dark)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Phễu xử lý" : "Funnel"}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "sites"}
              onClick={() => setViewMode("sites")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "sites"
                  ? "bg-primary text-primary-foreground shadow-[2px_2px_6px_var(--shadow-dark)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Công trường" : "Sites"}</span>
              {siteStats.length > 0 && (
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none ${
                    viewMode === "sites"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {siteStats.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* BODY */}
        {viewMode === "funnel" ? (
          <div className="relative mt-4 flex flex-1 flex-col justify-between gap-3.5">
            {/* Top 2 Summary Wells */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-white/50 bg-background/80 px-3.5 py-2.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Tỷ lệ khắc phục vi phạm thật" : "True Violation Resolution"}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-lg sm:text-xl font-black tabular-nums text-primary">
                    <AnimatedNumber value={funnel.resolutionRate} suffix="%" />
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                    ({funnel.completedTotal}/{funnel.trueViolationsTotal})
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/50 bg-background/80 px-3.5 py-2.5 shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)] dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Điểm nghẽn hiện tại" : "Primary Bottleneck"}
                </p>
                <div className="mt-1 flex items-center justify-between gap-1.5">
                  <span className="truncate text-xs sm:text-sm font-extrabold text-foreground">
                    {bottleneckLabel}
                  </span>
                  {funnel.bottleneckCount > 0 && (
                    <span className="shrink-0 rounded-lg bg-accent/15 px-2 py-0.5 font-mono text-xs font-black tabular-nums text-accent">
                      {funnel.bottleneckCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 5-Stage Horizontal Funnel Bars */}
            {funnel.totalDetected > 0 ? (
              <div className="space-y-2.5">
                {stageRows.map((stage) => {
                  const Icon = stage.icon;
                  const isActive = activeStage === stage.key;
                  const widthPct = Math.max(
                    stage.count > 0 ? 6 : 0,
                    (stage.percentOfDetected * progressScale) / 100,
                  );

                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setActiveStage(isActive ? null : stage.key)}
                      className={`group w-full rounded-2xl border p-2.5 text-left transition-all cursor-pointer ${
                        isActive
                          ? "border-primary/40 bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                          : "border-white/60 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/25 dark:border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${stage.iconBgClass}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-extrabold text-foreground">
                              {stage.label}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {stage.sublabel}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="font-mono text-sm font-black tabular-nums text-foreground">
                            {stage.count.toLocaleString()}
                          </span>
                          <span className="ml-1.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                            {stage.percentOfDetected}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${stage.barClass}`}
                          style={{ width: `${Math.min(100, widthPct)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center">
                <ShieldCheck className="h-8 w-8 text-primary/50" />
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Chưa có sự cố nào trong khoảng thời gian này"
                    : "No incidents recorded in this timeframe"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Thử mở rộng phạm vi ngày hoặc chọn Tất cả công trường"
                    : "Try expanding the date range or selecting All Sites"}
                </p>
              </div>
            )}

            {/* Selected Stage Detail Callout */}
            {selectedStageDetail && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/[0.06] px-3.5 py-2 text-[11px]">
                <div className="min-w-0">
                  <span className="font-extrabold text-foreground">
                    {selectedStageDetail.label}:{" "}
                  </span>
                  <span className="font-mono font-black text-primary">
                    {selectedStageDetail.count}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({selectedStageDetail.percentOfDetected}%{" "}
                    {isVietnamese ? "tổng sự kiện" : "of detected"})
                  </span>
                </div>
                <Link
                  href={selectedStageDetail.targetHref}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  <span>{selectedStageDetail.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Footer: False Alarms & Quick Dispatch Link */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/50 bg-background/80 px-3.5 py-2.5 shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5">
              <div className="flex items-center gap-2 text-[11px]">
                <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">
                  {isVietnamese ? "Cảnh báo sai (DISMISSED):" : "False Alarms (DISMISSED):"}
                </span>
                <span className="font-mono font-extrabold tabular-nums text-foreground">
                  {funnel.dismissed}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({funnel.falseAlarmRate}%)
                </span>
              </div>

              {activeBacklogCount > 0 && (
                <Link
                  href="/incidents/assignments"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  <span>
                    {isVietnamese
                      ? `Điều phối ${activeBacklogCount} việc tồn`
                      : `Triage ${activeBacklogCount} open`}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* SITE COMPARISON VIEW */
          <div className="relative mt-4 flex flex-1 flex-col justify-between gap-3">
            {siteStats.length > 0 ? (
              <div className="max-h-[385px] space-y-2.5 overflow-y-auto pr-1">
                {siteStats.map((site, idx) => {
                  const isSelected = selectedSiteId === site.siteId;
                  return (
                    <div
                      key={site.siteId}
                      onClick={() => {
                        if (onSelectSite) {
                          onSelectSite(isSelected ? "" : site.siteId);
                        }
                      }}
                      className={`rounded-2xl border p-3 transition-all ${
                        onSelectSite ? "cursor-pointer" : ""
                      } ${
                        isSelected
                          ? "border-primary/45 bg-background shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
                          : "border-white/60 bg-background/90 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] hover:border-primary/30 dark:border-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-black ${
                              idx === 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs font-extrabold text-foreground">
                                {site.siteName}
                              </p>
                              {site.siteCode && (
                                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                                  {site.siteCode}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                              {isVietnamese
                                ? `${site.totalIncidents} sự cố • ${site.confirmedActive} đang xử lý • ${site.resolvedCount} đã xong`
                                : `${site.totalIncidents} total • ${site.confirmedActive} active • ${site.resolvedCount} resolved`}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-black tabular-nums text-primary">
                            {site.complianceRate.toFixed(1)}%
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isVietnamese ? "Tuân thủ" : "Compliance"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-background shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(4, site.complianceRate))}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground tabular-nums">
                        <span>
                          {isVietnamese ? "Hoàn tất:" : "Resolved:"}{" "}
                          <strong className="text-foreground">{site.resolutionRate}%</strong>
                        </span>
                        <span>
                          {isVietnamese ? "Chờ duyệt:" : "Pending:"}{" "}
                          <strong className="text-foreground">{site.pendingReview}</strong>
                        </span>
                        <span>
                          MTTR:{" "}
                          <strong className="text-foreground">
                            {formatMttrLabel(site.meanTimeToResolveHours, isVietnamese)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center">
                <Building2 className="h-8 w-8 text-primary/50" />
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Chưa có dữ liệu công trường để so sánh"
                    : "No site data available to compare"}
                </p>
              </div>
            )}

            {onSelectSite && siteStats.length > 1 && (
              <div className="rounded-2xl border border-white/50 bg-background/80 px-3.5 py-2 text-[10px] font-medium text-muted-foreground shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/5">
                {selectedSiteId
                  ? isVietnamese
                    ? "Đang lọc theo 1 công trường — bấm lại vào thẻ đang chọn để xem tất cả."
                    : "Filtered to 1 site — click the selected site again to reset."
                  : isVietnamese
                    ? "Mẹo: Bấm vào từng công trường để lọc nhanh toàn bộ trang Thống kê."
                    : "Tip: Click any site card to filter the entire Analytics tab."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
