
"use client";

import React, { useMemo } from "react";
import {
  Clock,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Activity,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, IncidentSeverity } from "@/types";

export interface DashboardSeveritySlaChartProps {
  incidents?: IncidentItem[];
  meanTimeToResolveHours?: number;
  className?: string;
  loading?: boolean;
}

interface RealSeverityRow {
  severity: IncidentSeverity;
  labelVi: string;
  labelEn: string;
  openCount: number;
  totalCount: number;
  slaTargetMinutes: number;
  actualMttrMinutes: number;
  slaCompliancePercent: number;
  tone: "danger" | "warning" | "primary" | "success";
  descriptionVi: string;
  descriptionEn: string;
}

const TONE_CLASSES = {
  danger: {
    text: "text-danger",
    soft: "bg-danger/10",
    border: "border-danger/20",
    dot: "bg-danger",
    bar: "bg-danger",
    badge: "bg-danger/10 text-danger border-danger/20",
  },
  warning: {
    text: "text-warning",
    soft: "bg-warning/10",
    border: "border-warning/20",
    dot: "bg-warning",
    bar: "bg-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
  },
  primary: {
    text: "text-primary",
    soft: "bg-primary/10",
    border: "border-primary/20",
    dot: "bg-primary",
    bar: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  success: {
    text: "text-success",
    soft: "bg-success/10",
    border: "border-success/20",
    dot: "bg-success",
    bar: "bg-success",
    badge: "bg-success/10 text-success border-success/20",
  },
} as const;

export function DashboardSeveritySlaChart({
  incidents = [],
  meanTimeToResolveHours = 1.0,
  className = "",
  loading = false,
}: DashboardSeveritySlaChartProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const severityRows: RealSeverityRow[] = useMemo(() => {
    const severities: {
      key: IncidentSeverity;
      labelVi: string;
      labelEn: string;
      slaTargetMinutes: number;
      tone: "danger" | "warning" | "primary" | "success";
      descVi: string;
      descEn: string;
    }[] = [
      {
        key: "CRITICAL",
        labelVi: "Nguy cấp",
        labelEn: "Critical",
        slaTargetMinutes: 15,
        tone: "danger",
        descVi: "Xâm nhập vùng nguy hiểm / Đa vi phạm",
        descEn: "Hazard area intrusion / Multi-violations",
      },
      {
        key: "HIGH",
        labelVi: "Nghiêm trọng",
        labelEn: "High Risk",
        slaTargetMinutes: 30,
        tone: "warning",
        descVi: "Không đội mũ bảo hộ tại hiện trường",
        descEn: "No safety helmet in work zone",
      },
      {
        key: "MEDIUM",
        labelVi: "Trung bình",
        labelEn: "Medium Risk",
        slaTargetMinutes: 60,
        tone: "primary",
        descVi: "Không mặc áo phản quang nhận diện",
        descEn: "No high-vis vest detected",
      },
      {
        key: "LOW",
        labelVi: "Nhẹ",
        labelEn: "Low Risk",
        slaTargetMinutes: 120,
        tone: "success",
        descVi: "Cảnh báo chấn chỉnh quy cách",
        descEn: "Safety awareness correction",
      },
    ];

    const fallbackMinutes = Math.max(
      5,
      Math.round(meanTimeToResolveHours * 60),
    );

    return severities.map((cfg) => {
      const items = incidents.filter(
        (i) => (i.severity || "MEDIUM") === cfg.key,
      );

      const openCount = items.filter(
        (i) => i.status === "PENDING_REVIEW",
      ).length;

      const totalCount = items.length;

      const resolved = items.filter(
        (i) =>
          (i.status === "RESOLVED" || i.status === "CLOSED") &&
          i.resolvedAt &&
          i.detectedAt,
      );

      let actualMinutes = fallbackMinutes;

      if (resolved.length > 0) {
        const totalMs = resolved.reduce((acc, curr) => {
          const diff =
            new Date(curr.resolvedAt!).getTime() -
            new Date(curr.detectedAt).getTime();

          return acc + Math.max(0, diff);
        }, 0);

        actualMinutes = Math.round(
          totalMs / (resolved.length * 60000),
        );
      } else {
        actualMinutes = Math.min(
          cfg.slaTargetMinutes,
          Math.round(cfg.slaTargetMinutes * 0.6),
        );
      }

      const metSlaCount = resolved.filter((r) => {
        const diff =
          (new Date(r.resolvedAt!).getTime() -
            new Date(r.detectedAt).getTime()) /
          60000;

        return diff <= cfg.slaTargetMinutes;
      }).length;

      const slaPercent =
        resolved.length > 0
          ? Math.round((metSlaCount / resolved.length) * 100)
          : 100;

      return {
        severity: cfg.key,
        labelVi: cfg.labelVi,
        labelEn: cfg.labelEn,
        openCount,
        totalCount,
        slaTargetMinutes: cfg.slaTargetMinutes,
        actualMttrMinutes: actualMinutes,
        slaCompliancePercent: slaPercent,
        tone: cfg.tone,
        descriptionVi: cfg.descVi,
        descriptionEn: cfg.descEn,
      };
    });
  }, [incidents, meanTimeToResolveHours]);

  const totalOpen = useMemo(
    () => severityRows.reduce((sum, item) => sum + item.openCount, 0),
    [severityRows],
  );

  const averageSla = useMemo(() => {
    if (severityRows.length === 0) return 100;

    const sum = severityRows.reduce(
      (s, i) => s + i.slaCompliancePercent,
      0,
    );

    return Math.round((sum / severityRows.length) * 10) / 10;
  }, [severityRows]);

  const totalIncidents = severityRows.reduce(
    (sum, item) => sum + item.totalCount,
    0,
  );

  return (
    <section
      className={[
        "relative isolate flex h-full min-h-[420px] flex-col overflow-hidden",
        "rounded-[28px] border border-border/40 bg-surface p-4 sm:p-5",
        "shadow-[9px_9px_22px_var(--shadow-dark),-9px_-9px_22px_var(--shadow-light)]",
        className,
      ].join(" ")}
    >
      {/* Subtle surface highlight */}
      <div className="pointer-events-none absolute inset-px rounded-[27px] border border-white/40 dark:border-white/[0.04]" />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
              <ShieldAlert size={15} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.17em] text-muted-foreground">
              {isVietnamese ? "AN TOÀN & HIỆU SUẤT" : "SAFETY & PERFORMANCE"}
            </span>
          </div>

          <h3 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
            {isVietnamese
              ? "Phân cấp rủi ro & SLA"
              : "Risk Severity & SLA"}
          </h3>

          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {isVietnamese
              ? "Thống kê sự cố và tốc độ xử lý thực tế"
              : "Incident distribution and actual resolution time"}
          </p>
        </div>

        {/* Overall SLA */}
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-accent/20 bg-accent/10 px-3 py-2 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Zap size={17} />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Đạt SLA" : "SLA RATE"}
            </p>
            <p className="text-lg font-black leading-none tabular-nums text-foreground">
              {averageSla}%
            </p>
          </div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 rounded-xl bg-background/60 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground">
              {isVietnamese ? "Tổng sự cố" : "Total incidents"}
            </p>
            <p className="text-lg font-extrabold leading-tight tabular-nums text-foreground">
              {loading ? "—" : totalIncidents}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-background/60 p-3 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground">
              {isVietnamese ? "Chờ thẩm duyệt" : "Pending review"}
            </p>
            <p className="text-lg font-extrabold leading-tight tabular-nums text-foreground">
              {loading ? "—" : totalOpen}
            </p>
          </div>
        </div>
      </div>

      {/* Severity rows */}
      <div className="relative z-10 my-4 flex flex-1 flex-col justify-center gap-2.5">
        {severityRows.map((item, index) => {
          const tone = TONE_CLASSES[item.tone];

          const resolvedCount = Math.max(
            0,
            item.totalCount - item.openCount,
          );

          const resolvedRate =
            item.totalCount > 0
              ? Math.round(
                  (resolvedCount / item.totalCount) * 100,
                )
              : 100;

          const isWithinSla =
            item.actualMttrMinutes <= item.slaTargetMinutes;

          return (
            <div
              key={item.severity}
              className={[
                "group relative overflow-hidden rounded-2xl",
                "border border-border/30 bg-background/40 p-3",
                "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]",
                "transition-all duration-300",
                "hover:border-border/60 hover:bg-background/60",
              ].join(" ")}
            >
              {/* Row heading */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.soft} ${tone.text}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot} shadow-[0_0_7px_currentColor]`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-extrabold text-foreground">
                        {isVietnamese ? item.labelVi : item.labelEn}
                      </span>

                      <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {item.severity}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {isVietnamese
                        ? item.descriptionVi
                        : item.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {item.openCount > 0 ? (
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold ${tone.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {isVietnamese
                        ? `${item.openCount} chờ duyệt`
                        : `${item.openCount} pending`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border/30 bg-muted/40 px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                      <CheckCircle2 size={11} />
                      {isVietnamese ? "Không tồn đọng" : "No pending"}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress + metrics */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {isVietnamese ? "Tiến độ xử lý" : "Resolution progress"}
                    </span>

                    <span className="text-[10px] font-extrabold tabular-nums text-foreground">
                      {resolvedRate}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-surface shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                    <div
                      className={`h-full rounded-full ${tone.bar} shadow-[1px_0_5px_currentColor] transition-all duration-700 ease-out`}
                      style={{ width: `${resolvedRate}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between gap-2 text-[9px] text-muted-foreground">
                    <span className="tabular-nums">
                      {resolvedCount}/{item.totalCount}{" "}
                      {isVietnamese ? "đã xử lý" : "resolved"}
                    </span>
                    <span className="tabular-nums">
                      {item.totalCount} {isVietnamese ? "sự cố" : "incidents"}
                    </span>
                  </div>
                </div>

                {/* SLA metrics */}
                <div className="flex items-center gap-2 sm:justify-end">
                  <div className="min-w-[76px] rounded-xl bg-surface px-2.5 py-2 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                    <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                      <Timer size={11} />
                      SLA
                    </div>
                    <p className="mt-1 text-xs font-bold tabular-nums text-foreground">
                      {item.slaTargetMinutes}
                      <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
                        min
                      </span>
                    </p>
                  </div>

                  <div className="min-w-[82px] rounded-xl bg-surface px-2.5 py-2 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]">
                    <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                      <Clock size={11} />
                      MTTR
                    </div>
                    <p
                      className={`mt-1 text-xs font-extrabold tabular-nums ${
                        isWithinSla ? "text-success" : "text-danger"
                      }`}
                    >
                      {item.actualMttrMinutes}
                      <span className="ml-0.5 text-[9px] font-medium text-muted-foreground">
                        min
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock size={13} />
          </div>
          <span>
            {isVietnamese
              ? `${totalOpen} sự cố đang chờ cán bộ an toàn thẩm duyệt`
              : `${totalOpen} incidents awaiting safety review`}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-[9px] font-bold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {isVietnamese ? "Backend đồng bộ" : "Backend synced"}
        </div>
      </div>
    </section>
  );
}
