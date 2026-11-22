"use client";

import { Loader2, Rocket, Sparkles, Zap } from "lucide-react";
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

  const currentMap =
    typeof activeVersion?.metrics?.mAP50 === "number"
      ? `${(activeVersion.metrics.mAP50 * 100).toFixed(1)}%`
      : "--";
  const candidateMap =
    typeof candidateVersion.metrics?.mAP50 === "number"
      ? `${(candidateVersion.metrics.mAP50 * 100).toFixed(1)}%`
      : "--";

  const currentLatency =
    typeof activeVersion?.metrics?.latencyMs === "number"
      ? `${activeVersion.metrics.latencyMs.toFixed(1)} ms`
      : "--";
  const candidateLatency =
    typeof candidateVersion.metrics?.latencyMs === "number"
      ? `${candidateVersion.metrics.latencyMs.toFixed(1)} ms`
      : "--";

  const handleConfirm = async () => {
    await onConfirm(candidateVersion.modelId, candidateVersion.id);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      preventClose={loading}
      icon={<Rocket className="h-5 w-5 text-primary" />}
      title={t("aiMetrics.deploy.modalTitle")}
      description={t("aiMetrics.deploy.confirmPrompt")}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t("aiMetrics.deploy.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            <span>{t("aiMetrics.deploy.submit")}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Comparison Card */}
        <div className="space-y-3 rounded-xl border border-border/40 bg-surface/80 p-3.5 sm:p-4">
          <h5 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{t("aiMetrics.deploy.compare")}</span>
          </h5>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            {/* Current */}
            <div className="min-w-0 space-y-2 rounded-xl border border-border/30 bg-surface p-3">
              <span className="block text-[11px] font-medium text-muted-foreground">
                {t("aiMetrics.deploy.current")}
              </span>
              <div className="break-words font-bold text-foreground text-sm">
                {activeVersion?.version || "--"}
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>mAP@50: <span className="font-semibold text-foreground">{currentMap}</span></div>
                <div>{isVietnamese ? "Độ trễ:" : "Latency:"} <span className="font-semibold text-foreground">{currentLatency}</span></div>
                <div className="break-words">Framework: {activeVersion?.framework || "--"}</div>
              </div>
            </div>

            {/* Candidate */}
            <div className="min-w-0 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <span className="block text-[11px] font-bold text-primary">
                {t("aiMetrics.deploy.candidate")}
              </span>
              <div className="break-words font-bold text-primary text-sm">
                {candidateVersion.version}
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>
                  mAP@50: <span className="font-bold text-emerald-600 dark:text-emerald-400">{candidateMap}</span>
                </div>
                <div>
                  {isVietnamese ? "Độ trễ:" : "Latency:"} <span className="font-bold text-emerald-600 dark:text-emerald-400">{candidateLatency}</span>
                </div>
                <div className="break-words">Framework: {candidateVersion.framework}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hot-swap Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-600 dark:text-emerald-400">
          <Zap className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 break-words">
            {isVietnamese
              ? "Hệ thống sẽ nạp nóng trọng số (Zero-downtime hot-swap) vào GPU worker mà không làm ngắt quãng luồng hình ảnh camera."
              : "The system will hot-swap weights (zero downtime) into GPU workers without interrupting camera video streams."}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
