"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useLocale } from "@/providers/locale-provider";
import type { AuditSummaryDto } from "@/types";
import {
  AuditStatsDetailPanel,
  type AuditStatKey,
} from "./audit-stats-detail-panel";

export type { AuditStatKey };

export interface AuditKpiSummaryProps {
  summary?: AuditSummaryDto;
  totalLogsCount: number;
  loading?: boolean;
  selectedStat?: AuditStatKey | null;
  selectedAction?: string;
  onSelectStat?: (stat: AuditStatKey | null) => void;
  onOpenExport?: () => void;
  onOpenHelp?: () => void;
  onSwitchTab?: (tab: "all" | "configChanges") => void;
  onFilterAction?: (action: string) => void;
}

export function AuditKpiSummary({
  summary,
  totalLogsCount,
  loading = false,
  selectedStat: propSelectedStat,
  selectedAction = "",
  onSelectStat,
  onOpenExport,
  onOpenHelp,
  onSwitchTab,
  onFilterAction,
}: AuditKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] = useState<AuditStatKey | null>(null);

  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: AuditStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

  const total = summary?.totalLogs ?? totalLogsCount;
  const configChanges = summary?.configChangesCount ?? summary?.categoryCounts?.config ?? 0;

  const configRatio = total > 0 ? Math.min(100, Number(((configChanges / total) * 100).toFixed(1))) : 0;

  return (
    <div className="space-y-4">
      {/* Unified 2-in-1 VIP Tactile Bento Console */}
      <section
        aria-label={t("audit.kpi.header")}
        className="animate-stat-enter relative overflow-hidden rounded-[26px] sm:rounded-[32px] border border-white/80 bg-background p-1.5 shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] dark:border-white/10"
      >
        {/* INNER MACHINED BEZEL SHELL */}
        <div className="relative overflow-hidden rounded-[22px] sm:rounded-[27px] border border-[var(--shadow-dark)]/15 bg-background/95 p-4 sm:p-6">
          {/* 1. Tactical Micro-Grid Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06] [background-image:radial-gradient(hsl(var(--primary))_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_80%)]"
          />

          {/* 2. Top Specular Laser Rim (Primary -> Accent) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-accent opacity-80"
          />

          {/* 3. Ambient Plasma Orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/15 blur-3xl"
          />

          {/* ================= HEADER DECK ================= */}
          <div className="relative flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-[var(--shadow-dark)]/20">
            <div className="flex items-center gap-2.5">
              {/* Live Radar Beacon */}
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_8px_hsl(var(--primary))]" />
              </span>

              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-foreground/85">
                {t("audit.kpi.header")}
              </span>
            </div>

            {/* Header Actions: WORM Badge */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Recessed Security Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-accent/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>{t("audit.badge")}</span>
              </span>
            </div>
          </div>

          {/* ================= TWO TACTILE SWITCHABLE STAT ZONES ================= */}
          <div className="relative mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
            {/* ZONE 1: Tổng bản ghi kiểm toán */}
            <button
              type="button"
              onClick={() => handleToggle("totalLogs")}
              aria-expanded={activeStat === "totalLogs"}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-4 sm:p-5 text-left transition-all duration-300 cursor-pointer ${activeStat === "totalLogs"
                  ? "border border-primary/40 bg-background shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light),0_0_20px_hsl(var(--primary)/0.12)]"
                  : "border border-white/75 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[7px_9px_16px_var(--shadow-dark),-7px_-7px_16px_var(--shadow-light)] dark:border-white/10"
                }`}
            >
              {/* Active Top Accent Bar */}
              <div
                aria-hidden="true"
                className={`absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-primary to-accent transition-opacity duration-300 ${activeStat === "totalLogs" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                  }`}
              />

              <div className="flex items-start justify-between gap-3 w-full">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      {t("audit.kpi.totalLogs")}
                    </span>
                  </div>

                  {loading ? (
                    <Skeleton className="my-2.5 h-10 w-32 rounded-xl" />
                  ) : (
                    <div className="mt-2 font-mono text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-primary drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] dark:drop-shadow-[0_2px_6px_hsl(var(--primary)/0.3)]">
                      <AnimatedNumber value={total} />
                    </div>
                  )}

                  <p className="mt-1.5 text-xs font-medium text-muted-foreground line-clamp-1">
                    {t("audit.stats.totalLogsDesc")}
                  </p>
                </div>

                {/* Dual-tier Tactile Icon Housing */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${activeStat === "totalLogs"
                      ? "border-primary/30 bg-gradient-to-br from-primary/20 to-accent/20 text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] scale-95"
                      : "border-white/80 bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] group-hover:scale-105 dark:border-white/10"
                    }`}
                >
                  <FileText className="h-5 w-5" strokeWidth={2.2} />
                </div>
              </div>

              {/* Zone Footer Control */}
              <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-[var(--shadow-dark)]/15 w-full">
                <span className="min-w-0 text-[11px] font-medium text-muted-foreground">
                  {isVietnamese ? "Phân tích hành động & nhân sự" : "Action & actor analytics"}
                </span>

                <span
                  className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition-all ${activeStat === "totalLogs"
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.35)]"
                      : "bg-background text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] group-hover:bg-primary/10"
                    }`}
                >
                  {activeStat === "totalLogs" ? (
                    <>
                      <span>{t("audit.stats.collapse")}</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>{t("audit.stats.viewDetail")}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </span>
              </div>
            </button>

            {/* ZONE 2: Thay đổi cấu hình */}
            <button
              type="button"
              onClick={() => handleToggle("configChanges")}
              aria-expanded={activeStat === "configChanges"}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-4 sm:p-5 text-left transition-all duration-300 cursor-pointer ${activeStat === "configChanges"
                  ? "border border-primary/40 bg-background shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light),0_0_20px_hsl(var(--primary)/0.12)]"
                  : "border border-white/75 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[7px_9px_16px_var(--shadow-dark),-7px_-7px_16px_var(--shadow-light)] dark:border-white/10"
                }`}
            >
              {/* Active Top Accent Bar */}
              <div
                aria-hidden="true"
                className={`absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-accent to-primary transition-opacity duration-300 ${activeStat === "configChanges" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                  }`}
              />

              <div className="flex items-start justify-between gap-3 w-full">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      {t("audit.kpi.configChanges")}
                    </span>
                    {!loading && total > 0 && (
                      <span className="rounded-full border border-accent/45 bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-black text-foreground">
                        {configRatio}%
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <Skeleton className="my-2.5 h-10 w-28 rounded-xl" />
                  ) : (
                    <div className="mt-2 font-mono text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                      <AnimatedNumber value={configChanges} />
                    </div>
                  )}

                  <p className="mt-1.5 text-xs font-medium text-muted-foreground line-clamp-1">
                    {t("audit.stats.configChangesDesc")}
                  </p>
                </div>

                {/* Dual-tier Tactile Icon Housing */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${activeStat === "configChanges"
                      ? "border-accent/50 bg-accent/20 text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] scale-95"
                      : "border-white/80 bg-background text-primary shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] group-hover:scale-105 dark:border-white/10"
                    }`}
                >
                  <Settings className="h-5 w-5" strokeWidth={2.2} />
                </div>
              </div>

              {/* Zone Footer Control */}
              <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-[var(--shadow-dark)]/15 w-full">
                <span className="min-w-0 text-[11px] font-medium text-muted-foreground">
                  {isVietnamese ? "Đối chiếu biến động Before / After" : "Before / After JSON Diff trail"}
                </span>

                <span
                  className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition-all ${activeStat === "configChanges"
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.35)]"
                      : "bg-background text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] group-hover:bg-primary/10"
                    }`}
                >
                  {activeStat === "configChanges" ? (
                    <>
                      <span>{t("audit.stats.collapse")}</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>{t("audit.stats.viewDetail")}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Expandable Detail Panel */}
      {activeStat && (
        <AuditStatsDetailPanel
          activeStat={activeStat}
          summary={summary}
          totalLogsCount={totalLogsCount}
          selectedAction={selectedAction}
          onClose={() => handleToggle(activeStat)}
          onOpenExport={onOpenExport}
          onOpenHelp={onOpenHelp}
          onSwitchTab={onSwitchTab}
          onFilterAction={onFilterAction}
        />
      )}
    </div>
  );
}
