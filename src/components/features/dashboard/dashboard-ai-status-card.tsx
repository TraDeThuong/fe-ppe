"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Gauge, Layers, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export interface DashboardAiStatusCardProps {
  activeVersion?: AiModelVersionDto | null;
  loading?: boolean;
}

export function DashboardAiStatusCard({
  activeVersion,
  loading = false,
}: DashboardAiStatusCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const isModelActive = Boolean(activeVersion && activeVersion.version);

  const modelName = isModelActive
    ? activeVersion?.metrics?.modelName || `YOLO11m-PPE ${activeVersion?.version}`
    : (isVietnamese ? "Chưa kích hoạt mô hình" : "No active model deployed");

  const versionTag = isModelActive ? activeVersion?.version : "--";
  const mapValue = activeVersion?.metrics?.mAP50
    ? `${(activeVersion.metrics.mAP50 * 100).toFixed(1)}%`
    : "--";
  const latencyValue = activeVersion?.metrics?.latencyMs
    ? `${activeVersion.metrics.latencyMs}ms`
    : "--";
  const fpsValue = activeVersion?.metrics?.fps
    ? `${activeVersion.metrics.fps} FPS`
    : "--";
  const frameworkValue = isModelActive ? (activeVersion?.framework || "TensorRT / FP16") : "--";

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-2xl bg-surface p-4 sm:p-5 shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)] border border-border/20">
      {/* Specular highlight rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
              {t("dashboard.aiStatus.title")}
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Edge Computer Vision Pipeline
            </p>
          </div>
        </div>

        <Link
          href="/ai-metrics"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>{isVietnamese ? "Chi tiết" : "Metrics"}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Active Model Name & Version */}
      <div className="mt-3.5 rounded-xl border border-border/30 bg-background/60 p-3 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("dashboard.aiStatus.activeModel")}
          </span>
          <Badge
            variant="outline"
            className={
              isModelActive
                ? "border-success/30 bg-success/10 text-[10px] font-bold text-success"
                : "border-muted/30 bg-muted/20 text-[10px] font-bold text-muted-foreground"
            }
          >
            {isModelActive
              ? `● ${isVietnamese ? "Hoạt động" : "Active"}`
              : `○ ${isVietnamese ? "Chưa kích hoạt" : "Inactive"}`}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-sm font-black text-foreground truncate">
          {loading ? "..." : `${modelName}`}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
          <span>Version: {versionTag}</span>
          <span>•</span>
          <span className="text-primary font-semibold">{frameworkValue}</span>
        </div>
      </div>

      {/* 3 Metric Inset Pills */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* Latency */}
        <div className="rounded-xl border border-white/50 bg-background/80 p-2 text-center shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:border-white/10">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            {t("dashboard.aiStatus.latency")}
          </span>
          <p className="mt-0.5 font-mono text-xs sm:text-sm font-black text-foreground">
            {loading ? "..." : latencyValue}
          </p>
        </div>

        {/* Accuracy mAP */}
        <div className="rounded-xl border border-white/50 bg-background/80 p-2 text-center shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:border-white/10">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            mAP@50
          </span>
          <p className="mt-0.5 font-mono text-xs sm:text-sm font-black text-success">
            {loading ? "..." : mapValue}
          </p>
        </div>

        {/* Throughput FPS */}
        <div className="rounded-xl border border-white/50 bg-background/80 p-2 text-center shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] dark:border-white/10">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            {t("dashboard.aiStatus.throughput")}
          </span>
          <p className="mt-0.5 font-mono text-xs sm:text-sm font-black text-primary">
            {fpsValue}
          </p>
        </div>
      </div>
    </div>
  );
}
