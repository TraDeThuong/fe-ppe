"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import type { AiPerformanceStatDto } from "@/types";

export interface ReportAiPerformanceProps {
  stats?: AiPerformanceStatDto[];
  loading?: boolean;
}

export function ReportAiPerformance({
  stats = [],
  loading = false,
}: ReportAiPerformanceProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getCamera } = useEntityLookup();

  // Aggregate KPI metrics
  const aggregated = useMemo(() => {
    if (!stats || stats.length === 0) {
      return {
        avgFps: 0,
        avgLatencyMs: 0,
        maxLatencyMs: 0,
        totalFrames: 0,
      };
    }

    let sumFps = 0;
    let sumLatency = 0;
    let maxLat = 0;
    let sumFrames = 0;

    for (const item of stats) {
      sumFps += Number(item.avgFps || 0);
      sumLatency += Number(item.avgLatencyMs || 0);
      if (item.maxLatencyMs > maxLat) {
        maxLat = item.maxLatencyMs;
      }
      sumFrames += Number(item.totalFrames || 0);
    }

    return {
      avgFps: Number((sumFps / stats.length).toFixed(1)),
      avgLatencyMs: Number((sumLatency / stats.length).toFixed(1)),
      maxLatencyMs: maxLat,
      totalFrames: sumFrames,
    };
  }, [stats]);

  const getHealthBadge = (fps: number) => {
    if (fps >= 25) {
      return {
        label: t("reports.aiPerf.healthGood"),
        icon: CheckCircle2,
        style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      };
    }
    if (fps >= 15) {
      return {
        label: t("reports.aiPerf.healthFair"),
        icon: Activity,
        style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
      };
    }
    return {
      label: t("reports.aiPerf.healthPoor"),
      icon: AlertTriangle,
      style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <span>{t("reports.aiPerf.title")}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("reports.aiPerf.desc")}
          </p>
        </div>
      </div>

      {/* 4 Telemetry Bento Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* 1. Avg FPS */}
        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("reports.aiPerf.avgFps")}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading ? "..." : aggregated.avgFps}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">FPS</span>
          </div>
          <div className="mt-2">
            {(() => {
              const badge = getHealthBadge(aggregated.avgFps);
              const Icon = badge.icon;
              return (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.style}`}
                >
                  <Icon className="h-3 w-3" />
                  {badge.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* 2. Avg Latency */}
        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("reports.aiPerf.avgLatency")}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading ? "..." : aggregated.avgLatencyMs}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ms</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {isVietnamese ? "Thời gian xử lý / frame" : "Inference time / frame"}
          </p>
        </div>

        {/* 3. Max Latency */}
        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("reports.aiPerf.maxLatency")}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading ? "..." : aggregated.maxLatencyMs}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">ms</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {isVietnamese ? "Đỉnh trễ lớn nhất đo được" : "Highest recorded latency peak"}
          </p>
        </div>

        {/* 4. Total Frames */}
        <div className="rounded-2xl border border-border/40 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("reports.aiPerf.totalFrames")}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading ? "..." : aggregated.totalFrames.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isVietnamese ? "khung" : "frames"}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {isVietnamese ? "Khối lượng nạp vào mô hình" : "Frames processed by detector"}
          </p>
        </div>
      </div>

      {/* AI Telemetry Breakdown Table */}
      <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-sm">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Camera className="h-4 w-4 text-primary" />
          <span>{t("reports.aiPerf.cameraRanking")}</span>
        </h4>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-xs text-muted-foreground gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>{isVietnamese ? "Đang tải dữ liệu..." : "Loading telemetry..."}</span>
          </div>
        ) : stats.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            {t("reports.aiPerf.noData")}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-semibold text-muted-foreground">
                  <th className="pb-3 pr-4">{t("reports.aiPerf.cameraName")}</th>
                  <th className="pb-3 px-4">{t("reports.history.createdAt")}</th>
                  <th className="pb-3 px-4">{t("reports.aiPerf.avgFps")}</th>
                  <th className="pb-3 px-4">{t("reports.aiPerf.avgLatency")}</th>
                  <th className="pb-3 px-4">{t("reports.aiPerf.maxLatency")}</th>
                  <th className="pb-3 px-4">{t("reports.aiPerf.totalFrames")}</th>
                  <th className="pb-3 pl-4 text-right">{t("reports.aiPerf.health")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-medium">
                {stats.map((row) => {
                  const cam = getCamera(row.cameraId);
                  const camName = cam
                    ? `${cam.name} (${cam.code})`
                    : `Camera #${row.cameraId.slice(0, 8)}`;
                  const badge = getHealthBadge(Number(row.avgFps));
                  const Icon = badge.icon;

                  return (
                    <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                      <td className="py-3.5 pr-4 text-foreground font-semibold">
                        <div className="flex items-center gap-2">
                          <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[200px]" title={camName}>
                            {camName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground tabular-nums">
                        {row.statDate}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-bold tabular-nums">
                        {row.avgFps} FPS
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground tabular-nums">
                        {row.avgLatencyMs} ms
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground tabular-nums">
                        {row.maxLatencyMs} ms
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground tabular-nums">
                        {Number(row.totalFrames).toLocaleString()}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.style}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
