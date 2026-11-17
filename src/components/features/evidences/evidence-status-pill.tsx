"use client";

import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { useEvidenceIntegrity } from "@/hooks/incidents";
import { isChecksumVerifyValid } from "@/lib/evidence-utils";
import { useLocale } from "@/providers/locale-provider";
import type { BoundingBox } from "@/types";

export interface EvidenceIntegrityPillProps {
  evidenceId: string;
  expectedChecksum?: string | null;
  isVerifying?: boolean;
  onVerify?: () => void;
  compact?: boolean;
}

/**
 * Reactive SHA-256 status pill subscribed to React Query's integrity cache.
 * Renders verified/tampered/ready/missing states consistently across Grid, Pair, and Table views.
 */
export function EvidenceIntegrityPill({
  evidenceId,
  expectedChecksum,
  isVerifying = false,
  onVerify,
  compact = false,
}: EvidenceIntegrityPillProps) {
  const { t } = useLocale();
  const { data: verifyResult } = useEvidenceIntegrity(evidenceId, false);

  if (isVerifying) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span>{t("evidences.integrity.verifying")}</span>}
      </span>
    );
  }

  if (verifyResult) {
    const valid = isChecksumVerifyValid(verifyResult);
    if (valid) {
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
          title={`SHA-256: ${verifyResult.actualChecksum}`}
        >
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span>{t("evidences.integrity.verified")}</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger animate-pulse"
        title={`Expected ${verifyResult.expectedChecksum} vs Actual ${verifyResult.actualChecksum}`}
      >
        <ShieldAlert className="h-3 w-3 shrink-0" />
        <span>{t("evidences.integrity.tampered")}</span>
      </span>
    );
  }

  if (!expectedChecksum) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        title={t("evidences.integrity.missingHint")}
      >
        <ShieldOff className="h-3 w-3 shrink-0" />
        {!compact && <span>{t("evidences.integrity.missing")}</span>}
      </span>
    );
  }

  if (onVerify) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVerify();
        }}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info transition-colors hover:bg-info/20"
        title={t("evidences.integrity.clickToVerify")}
      >
        <ShieldCheck className="h-3 w-3 shrink-0" />
        <span>{compact ? "SHA-256" : t("evidences.integrity.ready")}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-info/25 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
      <ShieldCheck className="h-3 w-3 shrink-0" />
      <span>{compact ? "SHA-256" : t("evidences.integrity.ready")}</span>
    </span>
  );
}

export interface EvidenceAiHudOverlayProps {
  boxes: BoundingBox[];
  compact?: boolean;
  showLabels?: boolean;
}

/**
 * Crisp SVG L-bracket HUD overlay for AI PPE detection bounding boxes.
 */
export function EvidenceAiHudOverlay({
  boxes,
  compact = false,
  showLabels = true,
}: EvidenceAiHudOverlayProps) {
  if (!boxes || boxes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        {boxes.map((box, idx) => {
          const cx = Math.min(box.width * 0.24, 4.5);
          const cy = Math.min(box.height * 0.24, 4.5);
          const strokeW = compact ? 1.1 : 0.75;
          return (
            <g key={`${idx}-${box.x}-${box.y}`}>
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                fill="rgba(244, 63, 94, 0.08)"
                stroke="#f43f5e"
                strokeWidth={compact ? 0.45 : 0.3}
                strokeDasharray="1.8 1.2"
              />
              <path
                d={`M ${box.x} ${box.y + cy} L ${box.x} ${box.y} L ${box.x + cx} ${box.y}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              <path
                d={`M ${box.x + box.width - cx} ${box.y} L ${box.x + box.width} ${box.y} L ${box.x + box.width} ${box.y + cy}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              <path
                d={`M ${box.x} ${box.y + box.height - cy} L ${box.x} ${box.y + box.height} L ${box.x + cx} ${box.y + box.height}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              <path
                d={`M ${box.x + box.width - cx} ${box.y + box.height} L ${box.x + box.width} ${box.y + box.height} L ${box.x + box.width} ${box.y + box.height - cy}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {showLabels &&
        !compact &&
        boxes.map((box, idx) => {
          const topPct = box.y < 8 ? box.y + 1.5 : Math.max(1, box.y - 6);
          const leftPct = Math.max(1, Math.min(72, box.x));
          const confText =
            typeof box.confidence === "number"
              ? ` ${Math.round(box.confidence <= 1 ? box.confidence * 100 : box.confidence)}%`
              : "";
          return (
            <span
              key={`lbl-${idx}`}
              style={{ top: `${topPct}%`, left: `${leftPct}%` }}
              className="absolute rounded bg-rose-600/90 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-tight text-white shadow"
            >
              {(box.label || "VIOLATION") + confText}
            </span>
          );
        })}
    </div>
  );
}
