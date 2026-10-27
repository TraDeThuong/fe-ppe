"use client";

import { CheckCircle2, Cpu, HardDrive, Layers, Sparkles } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export interface ActiveModelBannerProps {
  activeVersion?: AiModelVersionDto | null;
  loading?: boolean;
}

export function ActiveModelBanner({
  activeVersion,
  loading = false,
}: ActiveModelBannerProps) {
  const { t } = useLocale();

  const version = activeVersion?.version || "v2.1.0-STABLE";
  const framework = activeVersion?.framework || "TENSORRT";
  const inputSize = activeVersion?.inputSize || "640x640";
  const deployedAt = activeVersion?.deployedAt
    ? new Date(activeVersion.deployedAt).toLocaleDateString("vi-VN")
    : "20/10/2026";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface to-primary/5 p-4 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Model Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)]">
            <Cpu className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {t("aiMetrics.governance.activeBadge")}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                YOLOv8n-PPE Detection
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {loading ? "Đang tải phiên bản..." : `Phiên bản: ${version}`}
            </h3>
          </div>
        </div>

        {/* Right: Telemetry Specs Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface/80 px-3 py-1.5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{t("aiMetrics.activeBanner.framework")}:</span>
            <span className="font-semibold text-foreground">{framework} FP16</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface/80 px-3 py-1.5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{t("aiMetrics.activeBanner.inputSize")}:</span>
            <span className="font-semibold text-foreground">{inputSize}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface/80 px-3 py-1.5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">{t("aiMetrics.activeBanner.deployedAt")}:</span>
            <span className="font-semibold text-foreground">{deployedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
