"use client";

import { useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Gauge,
  HelpCircle,
  Layers,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { AiPerformanceDto } from "@/types";

export type AiMetricStatKey = "map50" | "latency" | "fps" | "samples";

export interface AiMetricsStatsDetailPanelProps {
  activeStat: AiMetricStatKey;
  performance?: AiPerformanceDto | null;
  onSelectStat: (stat: AiMetricStatKey) => void;
  onClose: () => void;
}

export function AiMetricsStatsDetailPanel({
  activeStat,
  performance,
  onSelectStat,
  onClose,
}: AiMetricsStatsDetailPanelProps) {
  const { t } = useLocale();

  // Giá trị định dạng thực tế từ API hoặc fallback
  const mapFormatted = performance
    ? `${(performance.mAP50 * 100).toFixed(1)}%`
    : "94.8%";
  const mapNum = performance ? performance.mAP50 * 100 : 94.8;

  const latencyFormatted = performance
    ? `${performance.averageLatencyMs.toFixed(1)} ms`
    : "32.4 ms";
  const latencyNum = performance ? performance.averageLatencyMs : 32.4;

  const fpsFormatted = performance
    ? `${performance.averageFps.toFixed(1)} FPS`
    : "30.2 FPS";
  const fpsNum = performance ? performance.averageFps : 30.2;

  const samplesFormatted = performance
    ? `${(performance.totalFramesProcessed / 1000000).toFixed(2)}M`
    : "1.25M";

  // Cấu hình hiển thị theo từng loại stat
  const config = useMemo(() => {
    switch (activeStat) {
      case "map50":
        return {
          icon: Zap,
          title: t("aiMetrics.detail.map50.title"),
          subtitle: t("aiMetrics.detail.map50.subtitle"),
          value: mapFormatted,
          statusText: mapNum >= 90 ? t("aiMetrics.stats.statusExcellent") : t("aiMetrics.stats.statusGood"),
          statusColor: mapNum >= 90 ? "text-emerald-500" : "text-primary",
          badgeBg: mapNum >= 90 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20",
          whatIsIt: t("aiMetrics.detail.map50.whatIsIt"),
          benchmark: t("aiMetrics.detail.map50.benchmark"),
          safetyImpact: t("aiMetrics.detail.map50.safetyImpact"),
          takeaway: t("aiMetrics.detail.map50.takeaway"),
          progressPercent: Math.min(100, Math.max(0, mapNum)),
          progressLabel: `mAP: ${mapFormatted} (Target: ≥ 90%)`,
          jumpTarget: "per-class-breakdown",
          jumpLabel: t("aiMetrics.stats.exploreBreakdown"),
        };
      case "latency":
        return {
          icon: Gauge,
          title: t("aiMetrics.detail.latency.title"),
          subtitle: t("aiMetrics.detail.latency.subtitle"),
          value: latencyFormatted,
          statusText: latencyNum <= 35 ? t("aiMetrics.stats.statusRealtime") : t("aiMetrics.stats.statusGood"),
          statusColor: latencyNum <= 35 ? "text-emerald-500" : "text-amber-500",
          badgeBg: latencyNum <= 35 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          whatIsIt: t("aiMetrics.detail.latency.whatIsIt"),
          benchmark: t("aiMetrics.detail.latency.benchmark"),
          safetyImpact: t("aiMetrics.detail.latency.safetyImpact"),
          takeaway: t("aiMetrics.detail.latency.takeaway"),
          progressPercent: Math.min(100, Math.max(0, (1 - latencyNum / 100) * 100)),
          progressLabel: `Latency: ${latencyFormatted} (Target: ≤ 40 ms)`,
          jumpTarget: "latency-timeline",
          jumpLabel: t("aiMetrics.stats.exploreLatency"),
        };
      case "fps":
        return {
          icon: Activity,
          title: t("aiMetrics.detail.fps.title"),
          subtitle: t("aiMetrics.detail.fps.subtitle"),
          value: fpsFormatted,
          statusText: fpsNum >= 28 ? t("aiMetrics.stats.statusRealtime") : t("aiMetrics.stats.statusGood"),
          statusColor: fpsNum >= 28 ? "text-emerald-500" : "text-primary",
          badgeBg: fpsNum >= 28 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20",
          whatIsIt: t("aiMetrics.detail.fps.whatIsIt"),
          benchmark: t("aiMetrics.detail.fps.benchmark"),
          safetyImpact: t("aiMetrics.detail.fps.safetyImpact"),
          takeaway: t("aiMetrics.detail.fps.takeaway"),
          progressPercent: Math.min(100, Math.max(0, (fpsNum / 35) * 100)),
          progressLabel: `Speed: ${fpsFormatted} (Standard: 25 - 30 FPS)`,
          jumpTarget: "latency-timeline",
          jumpLabel: t("aiMetrics.stats.exploreLatency"),
        };
      case "samples":
      default:
        return {
          icon: Cpu,
          title: t("aiMetrics.detail.samples.title"),
          subtitle: t("aiMetrics.detail.samples.subtitle"),
          value: samplesFormatted,
          statusText: t("aiMetrics.stats.statusContinuous"),
          statusColor: "text-emerald-500",
          badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          whatIsIt: t("aiMetrics.detail.samples.whatIsIt"),
          benchmark: t("aiMetrics.detail.samples.benchmark"),
          safetyImpact: t("aiMetrics.detail.samples.safetyImpact"),
          takeaway: t("aiMetrics.detail.samples.takeaway"),
          progressPercent: 95,
          progressLabel: `Processed: ${samplesFormatted} frames 24/7`,
          jumpTarget: "model-governance",
          jumpLabel: t("aiMetrics.governance.title"),
        };
    }
  }, [activeStat, mapFormatted, mapNum, latencyFormatted, latencyNum, fpsFormatted, fpsNum, samplesFormatted, t]);

  const CurrentIcon = config.icon;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-surface/95 p-3.5 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      {/* Header Toolbar: Icon + Title + Value + Tabs + Close Button */}
      <div className="mb-3.5 sm:mb-4 flex flex-col gap-3 border-b border-border/40 pb-3 sm:pb-3.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Metric Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
              <CurrentIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {config.title}
                </h3>
                <Badge
                  variant="outline"
                  size="sm"
                  className="font-mono text-[10px] sm:text-xs font-bold text-primary px-2 py-0.5 border-primary/30"
                >
                  {config.value}
                </Badge>
                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {config.statusText}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("aiMetrics.stats.closeAria")}
            className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-surface text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Quick-switch Metric Tabs for effortless navigation */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 hidden md:inline">
            {t("aiMetrics.stats.quickNav")}
          </span>

          <button
            type="button"
            onClick={() => onSelectStat("map50")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all shrink-0 ${
              activeStat === "map50"
                ? "bg-primary text-primary-foreground font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                : "border border-border/50 bg-surface text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>mAP@50</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStat("latency")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all shrink-0 ${
              activeStat === "latency"
                ? "bg-primary text-primary-foreground font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                : "border border-border/50 bg-surface text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            }`}
          >
            <Gauge className="h-3 w-3" />
            <span>{t("aiMetrics.kpi.latency")}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStat("fps")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all shrink-0 ${
              activeStat === "fps"
                ? "bg-primary text-primary-foreground font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                : "border border-border/50 bg-surface text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            }`}
          >
            <Activity className="h-3 w-3" />
            <span>{t("aiMetrics.kpi.fps")}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStat("samples")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all shrink-0 ${
              activeStat === "samples"
                ? "bg-primary text-primary-foreground font-bold shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                : "border border-border/50 bg-surface text-muted-foreground hover:text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>{t("aiMetrics.kpi.samples")}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-3 sm:space-y-3.5">
        {/* Core plain-language explanation (Dễ hiểu cho người dùng) */}
        <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HelpCircle className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                {t("aiMetrics.stats.conceptLabel")}
              </p>
              <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-medium">
                {config.whatIsIt}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Visual Information Highlights: 1 column on mobile, 3 columns on sm/md */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
          {/* Card 1: Benchmark & Scale */}
          <div className="rounded-xl border border-white/60 dark:border-white/10 bg-surface p-3 sm:p-3.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("aiMetrics.stats.benchmarkLabel")}
                </span>
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-foreground font-medium leading-snug mb-3">
                {config.benchmark}
              </p>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1 pt-1 border-t border-border/30">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                <span>{config.progressLabel}</span>
                <span className="font-bold text-foreground">{config.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-background/80 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                  style={{ width: `${config.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Field Safety Impact */}
          <div className="rounded-xl border border-white/60 dark:border-white/10 bg-surface p-3 sm:p-3.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("aiMetrics.stats.impactLabel")}
                </span>
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-xs text-foreground font-medium leading-snug">
                {config.safetyImpact}
              </p>
            </div>

            <div className="pt-2 border-t border-border/30 mt-3 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              <span>{config.statusText}</span>
            </div>
          </div>

          {/* Card 3: Operational Takeaway & Shortcut Link */}
          <div className="rounded-xl border border-white/60 dark:border-white/10 bg-surface p-3 sm:p-3.5 shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("aiMetrics.stats.currentStatus")}
                </span>
                <Layers className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-foreground font-medium leading-snug">
                {config.takeaway}
              </p>
            </div>

            <div className="pt-2 border-t border-border/30 mt-3">
              <button
                type="button"
                onClick={() => scrollToSection(config.jumpTarget)}
                className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors py-1"
              >
                <span>{config.jumpLabel}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
