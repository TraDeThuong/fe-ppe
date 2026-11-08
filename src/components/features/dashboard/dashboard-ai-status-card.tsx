"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Cpu,
  Sparkles,
  Gauge,
  Zap,
  Crosshair,
  Activity,
  Layers3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export interface DashboardAiStatusCardProps {
  activeVersion?: AiModelVersionDto | null;
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function DashboardAiStatusCard({
  activeVersion,
  loading = false,
  error = false,
  className = "",
}: DashboardAiStatusCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const isModelActive = Boolean(
    activeVersion &&
      activeVersion.version &&
      ["ACTIVE", "DEPLOYED"].includes(activeVersion.status),
  );

  const modelName = isModelActive
    ? activeVersion?.metrics?.modelName || "—"
    : isVietnamese
      ? "Chưa kích hoạt mô hình"
      : "No active model deployed";

  const versionTag = isModelActive ? activeVersion?.version : "--";

  const mapValue =
    typeof activeVersion?.metrics?.mAP50 === "number" &&
    Number.isFinite(activeVersion.metrics.mAP50)
      ? `${(activeVersion.metrics.mAP50 * 100).toFixed(1)}%`
      : "--";

  const latencyValue =
    typeof activeVersion?.metrics?.latencyMs === "number" &&
    Number.isFinite(activeVersion.metrics.latencyMs)
      ? `${activeVersion.metrics.latencyMs}ms`
      : "--";

  const fpsValue =
    typeof activeVersion?.metrics?.fps === "number" &&
    Number.isFinite(activeVersion.metrics.fps)
      ? `${activeVersion.metrics.fps} FPS`
      : "--";

  const frameworkValue = isModelActive
    ? activeVersion?.framework || "—"
    : "—";

  if (error) {
    return (
      <div
        className={`relative overflow-hidden rounded-[24px] border border-border/40 bg-surface p-5 shadow-[8px_9px_20px_rgba(0,0,0,0.07),-6px_-6px_16px_rgba(255,255,255,0.75)] dark:border-white/[0.06] dark:bg-card dark:shadow-[7px_8px_18px_rgba(0,0,0,0.3),-3px_-3px_10px_rgba(255,255,255,0.02)] ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-[inset_2px_2px_5px_rgba(0,0,0,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] dark:bg-background dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.35),inset_-1px_-1px_4px_rgba(255,255,255,0.03)]">
            <Cpu className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-foreground">
              {t("dashboard.aiStatus.title")}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dashboard.data.error")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: t("dashboard.aiStatus.latency"),
      value: latencyValue,
      icon: Gauge,
      color: "text-primary",
    },
    {
      label: "mAP@50",
      value: mapValue,
      icon: Crosshair,
      color: "text-accent",
    },
    {
      label: t("dashboard.aiStatus.throughput"),
      value: fpsValue,
      icon: Zap,
      color: "text-primary",
    },
  ];

  return (
    <section
      className={`relative isolate w-full overflow-hidden rounded-[26px] border border-border/40 bg-surface p-4 shadow-[9px_10px_24px_rgba(0,0,0,0.08),-7px_-7px_20px_rgba(255,255,255,0.8)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_10px_24px_rgba(0,0,0,0.32),-3px_-3px_12px_rgba(255,255,255,0.025)] sm:p-5 ${className}`}
    >
      {/* Decorative ambient highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-52 w-52 rounded-full bg-primary/[0.07] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/[0.08]"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-surface text-primary shadow-[4px_4px_9px_rgba(0,0,0,0.09),-4px_-4px_9px_rgba(255,255,255,0.85)] dark:border-primary/20 dark:bg-card dark:shadow-[4px_4px_9px_rgba(0,0,0,0.3),-2px_-2px_7px_rgba(255,255,255,0.03)]">
            <Cpu className="h-5 w-5" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-foreground dark:border-card">
              <Sparkles className="h-2 w-2" />
            </span>
          </div>

          <div className="min-w-0">
            <h4 className="flex items-center gap-1.5 truncate text-sm font-extrabold tracking-tight text-foreground">
              {t("dashboard.aiStatus.title")}
            </h4>
            <p className="mt-0.5 truncate text-[10px] font-medium tracking-wide text-muted-foreground">
              {t("dashboard.ai.declared")}
            </p>
          </div>
        </div>

        <Link
          href="/ai-metrics"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/15 bg-primary/[0.07] px-3 py-2 text-[11px] font-bold text-primary shadow-[2px_2px_5px_rgba(0,0,0,0.04),-2px_-2px_5px_rgba(255,255,255,0.7)] transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-[3px_4px_8px_rgba(0,0,0,0.08)] active:translate-y-0 dark:border-primary/20 dark:bg-primary/10 dark:shadow-none"
        >
          {isVietnamese ? "Chi tiết" : "Metrics"}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* Active model */}
      <div className="relative mt-5 overflow-hidden rounded-[20px] border border-border/40 bg-background/70 p-4 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.07),inset_-3px_-3px_8px_rgba(255,255,255,0.75)] dark:border-white/[0.05] dark:bg-background/50 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.3),inset_-1px_-1px_5px_rgba(255,255,255,0.025)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/[0.07] blur-2xl"
        />

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers3 className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">
              {t("dashboard.aiStatus.activeModel")}
            </span>
          </div>

          <Badge
            variant="outline"
            className={
              isModelActive
                ? "rounded-full border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-extrabold text-primary"
                : "rounded-full border-border/60 bg-muted/20 px-2.5 py-1 text-[9px] font-bold text-muted-foreground"
            }
          >
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                isModelActive
                  ? "bg-primary shadow-[0_0_6px_rgba(90,150,60,0.65)]"
                  : "bg-muted-foreground/50"
              }`}
            />
            {isModelActive
              ? isVietnamese
                ? "Hoạt động"
                : "Active"
              : isVietnamese
                ? "Chưa kích hoạt"
                : "Inactive"}
          </Badge>
        </div>

        <div className="relative mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black tracking-tight text-foreground sm:text-xl">
              {loading ? (
                <Skeleton className="my-1 h-6 w-36 rounded-lg inline-block align-middle" />
              ) : (
                modelName
              )}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-surface px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground shadow-[2px_2px_4px_rgba(0,0,0,0.06),-2px_-2px_4px_rgba(255,255,255,0.7)] dark:bg-card dark:shadow-none">
                {`v${versionTag}`}
              </span>
              <span className="text-[10px] text-muted-foreground">/</span>
              <span className="font-mono text-[10px] font-bold text-primary">
                {frameworkValue}
              </span>
            </div>
          </div>

          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-surface text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.3),-2px_-2px_6px_rgba(255,255,255,0.025)] sm:flex">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            {isVietnamese ? "Hiệu suất mô hình" : "Model Performance"}
          </span>
          <span className="text-[9px] font-semibold text-muted-foreground/70">
            {isVietnamese ? "Real-time metrics" : "Real-time metrics"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="group relative min-w-0 rounded-2xl border border-border/30 bg-background/70 px-2 py-3 text-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] transition-all duration-200 hover:border-primary/20 dark:border-white/[0.04] dark:bg-background/40 dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28),inset_-1px_-1px_4px_rgba(255,255,255,0.02)]"
              >
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted-foreground shadow-[2px_2px_4px_rgba(0,0,0,0.07),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:bg-card dark:shadow-none">
                  <Icon className={`h-3.5 w-3.5 ${metric.color}`} />
                </div>

                <p className="mt-2 truncate text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {metric.label}
                </p>

                <div className={`mt-1 truncate font-mono text-sm font-black tracking-tight sm:text-base ${metric.color}`}>
                  {loading ? (
                    <Skeleton className="mx-auto my-0.5 h-4 w-12 rounded" />
                  ) : (
                    metric.value
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}