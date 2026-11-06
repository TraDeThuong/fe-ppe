"use client";

import React from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  ListTodo,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { StatisticsSummaryDto } from "@/types";

export interface DashboardKpiRibbonProps {
  summary?: StatisticsSummaryDto | null;
  pendingCount?: number;
  totalCamerasCount?: number;
  onlineCamerasCount?: number;
  loading?: boolean;
  canViewReports?: boolean;
  userAssignedCount?: number;
  className?: string;
  onFilterPending?: () => void;
  onNavigateCameras?: () => void;
  onNavigateReports?: () => void;
  onNavigateIncidents?: () => void;
}

interface KpiTileProps {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "danger";
  progress?: number;
  progressLabel?: string;
  footer?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const TONE_STYLES = {
  primary: {
    iconBg: "bg-primary/10 text-primary border-primary/20",
    progressFill: "bg-primary",
    borderHover: "hover:border-primary/50",
  },
  success: {
    iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    progressFill: "bg-emerald-500",
    borderHover: "hover:border-emerald-500/50",
  },
  warning: {
    iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    progressFill: "bg-amber-500",
    borderHover: "hover:border-amber-500/50",
  },
  danger: {
    iconBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    progressFill: "bg-rose-500",
    borderHover: "hover:border-rose-500/50",
  },
} as const;

function KpiTile({
  title,
  value,
  icon: Icon,
  tone = "primary",
  progress,
  progressLabel,
  footer,
  onClick,
  loading = false,
}: KpiTileProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        "group relative flex flex-col justify-between rounded-2xl",
        "border border-border/40 bg-surface/75 p-3 sm:p-3.5 text-left transition-all duration-200",
        "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
        onClick
          ? "cursor-pointer hover:bg-surface hover:shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]"
          : "",
        toneStyle.borderHover,
      ].join(" ")}
    >
      {/* Top: Icon + Hover Link Arrow */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105",
            "shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]",
            toneStyle.iconBg,
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        {onClick && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 pt-0.5">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Middle: Title + Main KPI Value */}
      <div className="my-1.5">
        <span className="block text-[11px] font-semibold text-muted-foreground line-clamp-1">
          {title}
        </span>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            {loading ? "..." : value}
          </span>
        </div>
      </div>

      {/* Bottom: Progress Bar or Status Badge */}
      <div className="mt-1">
        {typeof progress === "number" ? (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/80 border border-border/20 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${toneStyle.progressFill}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
              <span>{progressLabel}</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
          </div>
        ) : footer ? (
          <div className="text-[10px] font-medium">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardKpiRibbon({
  summary,
  pendingCount = 0,
  totalCamerasCount = 0,
  onlineCamerasCount = 0,
  loading = false,
  canViewReports = true,
  userAssignedCount = 0,
  className = "",
  onFilterPending,
  onNavigateCameras,
  onNavigateReports,
  onNavigateIncidents,
}: DashboardKpiRibbonProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // When user has PPE_REPORTING_READ permissions: Display executive safety metrics
  if (canViewReports) {
    const rawCompliance = summary?.complianceRate ?? 0;
    const complianceRate = Math.min(100, Math.max(0, Math.round(rawCompliance * 10) / 10));

    const rawFalseAlarm = summary?.falseAlarmRate ?? 0;
    const falseAlarmRate = Math.min(100, Math.max(0, Math.round(rawFalseAlarm * 10) / 10));

    const cameraRatio = `${onlineCamerasCount}/${totalCamerasCount}`;
    const cameraPercent =
      totalCamerasCount > 0
        ? Math.round((onlineCamerasCount / totalCamerasCount) * 100)
        : 100;

    return (
      <section
        className={[
          "relative isolate w-full overflow-hidden rounded-[30px]",
          "border border-border/40 bg-surface p-3 sm:p-4",
          "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
          "flex flex-col justify-between",
          className,
        ].join(" ")}
      >
        {/* Outer highlight */}
        <div className="pointer-events-none absolute inset-px rounded-[29px] border border-white/50 dark:border-white/[0.06]" />

        {/* Main showcase container */}
        <div
          className={[
            "relative min-h-[410px] flex-1 flex flex-col justify-between overflow-hidden rounded-[23px]",
            "border border-border/30 bg-background/60 p-4 sm:p-5",
            "shadow-[inset_4px_4px_12px_var(--shadow-dark),inset_-4px_-4px_12px_var(--shadow-light)]",
          ].join(" ")}
        >
          {/* Ambient subtle glow matching 3D showcase */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,var(--primary)/10%,transparent_50%),radial-gradient(ellipse_at_85%_85%,var(--accent)/8%,transparent_50%)]" />

          {/* Header */}
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {isVietnamese ? "CHỈ SỐ AN TOÀN VẬN HÀNH" : "OPERATIONAL KPI"}
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {isVietnamese ? "Tổng Quan Tuân Thủ An Toàn" : "Safety Compliance Overview"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isVietnamese
                  ? "Giám sát thời gian thực từ mạng lưới camera AI"
                  : "Real-time safety surveillance across active AI camera network"}
              </p>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {complianceRate >= 90
                  ? isVietnamese
                    ? "Đạt chuẩn an toàn"
                    : "Safe Standards"
                  : isVietnamese
                    ? "Cần lưu ý"
                    : "Needs Attention"}
              </span>
            </div>
          </div>

          {/* 4 Stats Grid (Combined into 1 card) */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
            {/* 1. Tỷ lệ tuân thủ an toàn */}
            <KpiTile
              title={t("dashboard.kpi.compliance")}
              value={loading ? "..." : `${complianceRate}%`}
              icon={ShieldCheck}
              tone={complianceRate >= 90 ? "success" : "warning"}
              progress={complianceRate}
              progressLabel={isVietnamese ? "Mục tiêu ≥ 90%" : "Target ≥ 90%"}
              onClick={onNavigateReports}
              loading={loading}
            />

            {/* 2. Sự cố chờ thẩm duyệt */}
            <KpiTile
              title={t("dashboard.kpi.pending")}
              value={loading ? "..." : pendingCount}
              icon={Clock}
              tone={pendingCount > 0 ? "warning" : "success"}
              footer={
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold ${
                      pendingCount > 0 ? "text-amber-500" : "text-emerald-500"
                    }`}
                  >
                    {pendingCount > 0
                      ? isVietnamese
                        ? "Cần xử lý ngay →"
                        : "Needs action →"
                      : isVietnamese
                        ? "Đã duyệt hết ✓"
                        : "All reviewed ✓"}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {isVietnamese ? "Cần cán bộ duyệt" : "Review needed"}
                  </span>
                </div>
              }
              onClick={onFilterPending}
              loading={loading}
            />

            {/* 3. Camera AI đang giám sát */}
            <KpiTile
              title={t("dashboard.kpi.cameras")}
              value={loading ? "..." : cameraRatio}
              icon={Camera}
              tone={onlineCamerasCount === totalCamerasCount ? "primary" : "warning"}
              progress={cameraPercent}
              progressLabel={isVietnamese ? "Tỷ lệ hoạt động" : "Availability"}
              onClick={onNavigateCameras}
              loading={loading}
            />

            {/* 4. Tỷ lệ cảnh báo sai AI */}
            <KpiTile
              title={t("dashboard.kpi.falseAlarm")}
              value={loading ? "..." : `${falseAlarmRate}%`}
              icon={ShieldAlert}
              tone={falseAlarmRate <= 5 ? "success" : "danger"}
              footer={
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold ${
                      falseAlarmRate <= 5 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {falseAlarmRate <= 5
                      ? isVietnamese
                        ? "Đạt chuẩn an toàn AI (<5%)"
                        : "Within AI safety limits (<5%)"
                      : isVietnamese
                        ? "Cần hiệu chuẩn lại mô hình"
                        : "Model re-calibration needed"}
                  </span>
                </div>
              }
              onClick={onNavigateReports}
              loading={loading}
            />
          </div>

          {/* Footer Bar */}
          <div className="relative z-10 mt-2.5 pt-2 border-t border-border/30 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {isVietnamese
                  ? "Dữ liệu cập nhật tự động qua SSE"
                  : "Live data synchronized via SSE"}
              </span>
            </div>

            {onNavigateReports && (
              <button
                type="button"
                onClick={onNavigateReports}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                <span>{isVietnamese ? "Xem phân tích chi tiết" : "View analytics report"}</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Fallback for Users without PPE_REPORTING_READ (Personalized Operator / Worker view)
  return (
    <section
      className={[
        "relative isolate w-full overflow-hidden rounded-[30px]",
        "border border-border/40 bg-surface p-3 sm:p-4",
        "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
        "flex flex-col justify-between",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-px rounded-[29px] border border-white/50 dark:border-white/[0.06]" />

      <div
        className={[
          "relative min-h-[410px] flex-1 flex flex-col justify-between overflow-hidden rounded-[23px]",
          "border border-border/30 bg-background/60 p-4 sm:p-5",
          "shadow-[inset_4px_4px_12px_var(--shadow-dark),inset_-4px_-4px_12px_var(--shadow-light)]",
        ].join(" ")}
      >
        {/* Header */}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {isVietnamese ? "NHIỆM VỤ AN TOÀN HIỆN TRƯỜNG" : "FIELD OPERATIONS"}
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isVietnamese ? "Trạng Thái Giám Sát Của Bạn" : "Your Operational Status"}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isVietnamese
                ? "Theo dõi nhiệm vụ xử lý vi phạm & camera phụ trách"
                : "Assigned tasks & camera stream surveillance"}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 backdrop-blur-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary">
              {isVietnamese ? "Ca trực hoạt động" : "Shift Active"}
            </span>
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
          {/* 1. Assigned Tasks */}
          <KpiTile
            title={t("dashboard.kpi.myTasks")}
            value={loading ? "..." : userAssignedCount}
            icon={ListTodo}
            tone={userAssignedCount > 0 ? "primary" : "success"}
            footer={
              <span className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Vi phạm được phân công" : "Assigned incidents"}
              </span>
            }
            onClick={onNavigateIncidents}
            loading={loading}
          />

          {/* 2. Pending Violations */}
          <KpiTile
            title={t("dashboard.kpi.pending")}
            value={loading ? "..." : pendingCount}
            icon={Clock}
            tone="warning"
            footer={
              <span className="text-[10px] text-amber-500 font-semibold">
                {isVietnamese ? "Sự cố đang chờ duyệt" : "Awaiting review"}
              </span>
            }
            onClick={onFilterPending}
            loading={loading}
          />

          {/* 3. Active Cameras */}
          <KpiTile
            title={t("dashboard.kpi.cameras")}
            value={loading ? "..." : `${onlineCamerasCount}/${totalCamerasCount}`}
            icon={Camera}
            tone="primary"
            footer={
              <span className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Luồng RTSP trực tuyến" : "Active live streams"}
              </span>
            }
            onClick={onNavigateCameras}
            loading={loading}
          />

          {/* 4. Safety Regulations */}
          <KpiTile
            title={isVietnamese ? "Tiêu chuẩn bảo hộ" : "PPE Standards"}
            value="100%"
            icon={FileCheck2}
            tone="success"
            footer={
              <span className="text-[10px] text-emerald-500 font-semibold">
                {isVietnamese ? "Tuân thủ OSHA & TCVN" : "OSHA Compliant"}
              </span>
            }
          />
        </div>

        {/* Footer Bar */}
        <div className="relative z-10 mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {isVietnamese ? "Tuân thủ an toàn lao động" : "Labor safety compliance active"}
            </span>
          </div>

          {onNavigateIncidents && (
            <button
              type="button"
              onClick={onNavigateIncidents}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
            >
              <span>{isVietnamese ? "Xem danh sách việc" : "View task list"}</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
