"use client";

import { useId } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, ShieldQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { StatisticsSummaryDto } from "@/types";

const STAT_DETAILS = {
  totalViolations: { title: "reports.kpi.totalViolations", icon: AlertTriangle },
  complianceRate: { title: "reports.kpi.complianceRate", icon: CheckCircle2 },
  mttr: { title: "reports.kpi.mttr", icon: Clock },
  pendingReview: { title: "reports.kpi.pendingReview", icon: ShieldQuestion },
  reportsCount: { title: "reports.kpi.reportsCount", icon: FileText },
} as const;

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export type ReportStatKey = keyof typeof STAT_DETAILS;

export interface ReportStatsDetailPanelProps {
  activeStat: ReportStatKey;
  summary?: StatisticsSummaryDto | null;
  loading?: boolean;
  onClose: () => void;
  onViewHistory?: () => void;
}

export function ReportStatsDetailPanel({
  activeStat,
  summary,
  loading = false,
  onClose,
  onViewHistory,
}: ReportStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const titleId = useId();
  const { title, icon: Icon } = STAT_DETAILS[activeStat];

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-white/60 bg-surface/95 p-3.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10 dark:bg-card/95 sm:rounded-2xl sm:p-5 animate-in fade-in slide-in-from-top-2"
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h3 id={titleId} className="text-sm font-bold text-foreground">
            {t(title)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label={t("reports.detail.closeAria")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {activeStat === "reportsCount" ? (
        <Button type="button" variant="outline" size="sm" onClick={onViewHistory}>
          {t("reports.detail.viewHistory")}
        </Button>
      ) : loading ? (
        <p role="status" className="text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : summary ? (
        <StatSummary activeStat={activeStat} summary={summary} />
      ) : (
        <p className="text-xs text-muted-foreground">
          {locale === "vi-VN" ? "Chưa có dữ liệu thống kê." : "No statistics available."}
        </p>
      )}
    </section>
  );
}

function StatSummary({
  activeStat,
  summary,
}: {
  activeStat: Exclude<ReportStatKey, "reportsCount">;
  summary: StatisticsSummaryDto;
}) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const formatCount = (value: number) => value.toLocaleString(locale);
  const confirmed = {
    label: isVietnamese ? "Vi phạm đã xác nhận" : "Confirmed violations",
    value: formatCount(summary.trueViolations),
  };
  const resolved = {
    label: isVietnamese ? "Sự cố đã khắc phục" : "Resolved incidents",
    value: formatCount(summary.resolvedIncidents),
  };
  const falseAlarms = {
    label: isVietnamese ? "Cảnh báo sai" : "False alarms",
    value: formatCount(summary.falseAlarms),
  };

  const rows = {
    totalViolations: [
      confirmed,
      resolved,
      { label: t("reports.kpi.pendingReview"), value: formatCount(summary.openIncidents) },
      falseAlarms,
    ],
    complianceRate: [
      {
        label: isVietnamese ? "Sự cố được ghi nhận" : "Recorded incidents",
        value: formatCount(summary.totalIncidents),
      },
      confirmed,
    ],
    pendingReview: [confirmed, falseAlarms],
    mttr: [resolved],
  }[activeStat];

  if (activeStat === "mttr") {
    for (const severity of SEVERITIES) {
      const entry = summary.severityBreakdown?.[severity];
      if (!entry || entry.resolved <= 0 || entry.actualMttrMinutes <= 0) continue;
      rows.push({
        label: t(`incidents.severity.${severity.toLowerCase()}`),
        value: `${entry.actualMttrMinutes.toLocaleString(locale, { maximumFractionDigits: 1 })} ${isVietnamese ? "phút" : "min"}`,
      });
    }
  }

  return (
    <dl className="flex flex-wrap gap-2.5">
      {rows.map(({ label, value }) => (
        <div key={label} className="min-w-32 flex-1 rounded-xl border border-border/40 bg-background/60 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-bold tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
