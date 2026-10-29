"use client";

import { ArrowRight, Check, Loader2, Rocket, Sparkles, Zap } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { AiModelVersionDto } from "@/types";

export interface DeployModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeVersion?: AiModelVersionDto | null;
  candidateVersion?: AiModelVersionDto | null;
  onConfirm: (modelId: string, versionId: string) => Promise<void>;
  loading?: boolean;
}

export function DeployModelDialog({
  open,
  onOpenChange,
  activeVersion,
  candidateVersion,
  onConfirm,
  loading = false,
}: DeployModelDialogProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (!candidateVersion) return null;

  const currentMap = activeVersion?.metrics?.mAP50
    ? `${((activeVersion.metrics.mAP50 as number) * 100).toFixed(1)}%`
    : "94.8%";
  const candidateMap = candidateVersion.metrics?.mAP50
    ? `${((candidateVersion.metrics.mAP50 as number) * 100).toFixed(1)}%`
    : "96.2%";

  const currentLatency = activeVersion?.metrics?.latencyMs
    ? `${(activeVersion.metrics.latencyMs as number).toFixed(1)} ms`
    : "32.4 ms";
  const candidateLatency = candidateVersion.metrics?.latencyMs
    ? `${(candidateVersion.metrics.latencyMs as number).toFixed(1)} ms`
    : "28.5 ms";

  const handleConfirm = async () => {
    await onConfirm(candidateVersion.modelId, candidateVersion.id);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("aiMetrics.deploy.modalTitle")}
      description={t("aiMetrics.deploy.confirmPrompt")}
    >
      <div className="space-y-4 pt-2">
        {/* Comparison Card */}
        <div className="rounded-xl border border-border/40 bg-surface/80 p-4 space-y-3">
          <h5 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("aiMetrics.deploy.compare")}
          </h5>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Current */}
            <div className="rounded-xl border border-border/30 bg-surface p-3 space-y-2">
              <span className="text-[11px] text-muted-foreground block font-medium">
                {t("aiMetrics.deploy.current")}
              </span>
              <div className="font-bold text-foreground text-sm">
                {activeVersion?.version || "v2.1.0-STABLE"}
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>mAP@50: <span className="text-foreground font-semibold">{currentMap}</span></div>
                <div>{isVietnamese ? "Độ trễ:" : "Latency:"} <span className="text-foreground font-semibold">{currentLatency}</span></div>
                <div>Framework: {activeVersion?.framework || "TENSORRT"}</div>
              </div>
            </div>

            {/* Candidate */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <span className="text-[11px] text-primary block font-bold">
                {t("aiMetrics.deploy.candidate")}
              </span>
              <div className="font-bold text-primary text-sm">
                {candidateVersion.version}
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>
                  mAP@50: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{candidateMap}</span>
                </div>
                <div>
                  {isVietnamese ? "Độ trễ:" : "Latency:"} <span className="text-emerald-600 dark:text-emerald-400 font-bold">{candidateLatency}</span>
                </div>
                <div>Framework: {candidateVersion.framework}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hot-swap Notice */}
        <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Zap className="h-4 w-4 shrink-0" />
          <span>
            {isVietnamese
              ? "Hệ thống sẽ nạp nóng trọng số (Zero-downtime hot-swap) vào GPU worker mà không làm ngắt quãng luồng hình ảnh camera."
              : "The system will hot-swap weights (zero downtime) into GPU workers without interrupting camera video streams."}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("aiMetrics.deploy.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {t("aiMetrics.deploy.submit")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
