"use client";

import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Film,
  Maximize2,
  Play,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useEvidenceViewUrl } from "@/hooks/incidents/use-evidences";
import {
  extractEvidenceBoundingBoxes,
  formatEvidenceFileSize,
  formatMediaDuration,
  formatRelativeEvidenceTime,
  getViolationLabel,
  isVideoEvidenceItem,
} from "@/lib/evidence-utils";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { EvidenceIncidentSummary, EvidenceItem, IncidentItem } from "@/types";
import { EvidenceAiHudOverlay, EvidenceIntegrityPill } from "./evidence-status-pill";

export interface EvidenceCardProps {
  evidence: EvidenceItem;
  incident?: EvidenceIncidentSummary | IncidentItem | null;
  selected: boolean;
  isVerifying: boolean;
  canDelete: boolean;
  showAiOverlay?: boolean;
  onToggleSelect: (id: string) => void;
  onInspect: (evidence: EvidenceItem) => void;
  onVerify: (evidence: EvidenceItem) => void;
  onDownload: (evidence: EvidenceItem) => void;
  onDelete: (evidence: EvidenceItem) => void;
}

export function EvidenceCard({
  evidence,
  incident,
  selected,
  isVerifying,
  canDelete,
  showAiOverlay = true,
  onToggleSelect,
  onInspect,
  onVerify,
  onDownload,
  onDelete,
}: EvidenceCardProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { getCamera, getCameraCode, getSiteCode } = useEntityLookup();

  const isVideo = isVideoEvidenceItem(evidence);
  // Ảnh xem trước qua presigned VIEW URL (bucket private, có ghi EvidenceAccessLog); video không cần thumbnail.
  const { url: thumbUrl } = useEvidenceViewUrl(evidence, !isVideo);
  const cam = getCamera(evidence.cameraId);
  const resolvedSiteId = incident?.siteId ?? cam?.siteId;
  const siteCode = getSiteCode(resolvedSiteId);
  const cameraCode = getCameraCode(evidence.cameraId);
  const boxes = !isVideo && showAiOverlay ? extractEvidenceBoundingBoxes(evidence) : [];

  const resolutionLabel =
    evidence.metadata?.width && evidence.metadata?.height
      ? `${evidence.metadata.width}×${evidence.metadata.height}`
      : isVideo && evidence.metadata?.durationSeconds
        ? formatMediaDuration(evidence.metadata.durationSeconds)
        : null;

  const handleCopyChecksum = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hash = evidence.metadata?.checksum;
    if (!hash) return;
    void navigator.clipboard?.writeText(hash);
    toast.success(t("evidences.actions.hashCopied"));
  };

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-3 transition-all duration-200 ${
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)]"
          : "border-white/40 dark:border-white/[0.06] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] hover:-translate-y-0.5 hover:border-primary/40"
      }`}
    >
      <div className="space-y-2.5">
        {/* Media Preview */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onInspect(evidence)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onInspect(evidence);
            }
          }}
          className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-slate-950/90 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={t("evidences.actions.quickInspect")}
        >
          {!isVideo && thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={evidence.fileName}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-300">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-transform group-hover:scale-110">
                {isVideo ? <Play className="h-5 w-5 fill-current" /> : <Film className="h-6 w-6" />}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {isVideo ? "VIDEO CLIP" : "NO PREVIEW"}
              </span>
            </div>
          )}

          {/* Mini AI Bounding Box HUD */}
          {boxes.length > 0 && <EvidenceAiHudOverlay boxes={boxes} compact showLabels={false} />}

          {/* Subtle gradient vignette */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          {/* Top-left Type Badge */}
          <Badge
            variant={
              evidence.evidenceType === "SNAPSHOT"
                ? "danger"
                : evidence.evidenceType === "REFERENCE_SNAPSHOT"
                  ? "info"
                  : "warning"
            }
            size="sm"
            className="absolute left-2 top-2 z-20 backdrop-blur-md"
          >
            {evidence.evidenceType === "REFERENCE_SNAPSHOT"
              ? "REFERENCE"
              : evidence.evidenceType === "VIDEO_CLIP"
                ? "VIDEO"
                : "SNAPSHOT"}
          </Badge>

          {/* Top-right Selection Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(evidence.id);
            }}
            aria-label={t("evidences.batch.toggleItem")}
            className={`absolute right-2 top-2 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-white/50 bg-black/45 text-transparent opacity-80 backdrop-blur-sm group-hover:opacity-100 hover:border-white"
            }`}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </button>

          {/* Center Hover Quick-View Pill */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md">
              <Maximize2 className="h-3.5 w-3.5" />
              <span>{t("evidences.actions.quickInspect")}</span>
            </span>
          </div>

          {/* Bottom-left AI Detection chip + Bottom-right Resolution */}
          <div className="absolute inset-x-2 bottom-1.5 z-20 flex items-center justify-between gap-2">
            {boxes.length > 0 ? (
              <span className="rounded bg-rose-600/85 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-sm">
                AI HUD • {boxes.length}
              </span>
            ) : (
              <span />
            )}
            {resolutionLabel && (
              <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 backdrop-blur-sm">
                {resolutionLabel}
              </span>
            )}
          </div>
        </div>

        {/* Incident Context Strip */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {incident?.violationType ? (
              <span className="truncate rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                {getViolationLabel(incident.violationType, isVi)}
              </span>
            ) : (
              <span className="truncate font-mono text-[10px] text-muted-foreground">
                #{evidence.incidentId.slice(0, 8)}
              </span>
            )}
            {incident?.severity && <IncidentSeverityBadge severity={incident.severity} />}
          </div>

          <EvidenceIntegrityPill
            evidenceId={evidence.id}
            expectedChecksum={evidence.metadata?.checksum}
            isVerifying={isVerifying}
            onVerify={() => onVerify(evidence)}
            compact
          />
        </div>

        {/* Metadata */}
        <div className="space-y-1 text-xs">
          <p className="truncate font-bold text-foreground" title={evidence.fileName}>
            {evidence.fileName}
          </p>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">
              <span className="font-mono font-semibold text-foreground/85">{cameraCode}</span>
              {siteCode ? ` • ${siteCode}` : ""}
            </span>
            <span className="shrink-0 font-mono text-[10px]">
              {formatEvidenceFileSize(evidence.fileSize)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span title={new Date(evidence.capturedAt).toLocaleString(locale)}>
              {formatRelativeEvidenceTime(evidence.capturedAt, isVi)}
            </span>
            {evidence.metadata?.checksum && (
              <button
                type="button"
                onClick={handleCopyChecksum}
                className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10px] text-emerald-600 hover:underline dark:text-emerald-400"
                title={t("evidences.actions.copyHash")}
              >
                <span>{evidence.metadata.checksum.slice(0, 10)}…</span>
                <Copy className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Quick Actions */}
      <div className="mt-3 flex items-center gap-1 border-t border-border/25 pt-2.5">
        <Button
          size="sm"
          variant="primary"
          onClick={() => onInspect(evidence)}
          className="h-7 flex-1 gap-1 px-2 text-[11px]"
        >
          <Eye className="h-3 w-3" />
          <span>{t("evidences.actions.inspect")}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={isVerifying}
          onClick={() => onVerify(evidence)}
          title={t("evidences.actions.verifySha")}
          className="h-7 px-2"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(evidence)}
          title={t("evidences.actions.downloadOriginal")}
          className="h-7 px-2"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>

        <Link href={`/incidents/${evidence.incidentId}`} title={t("evidences.actions.openIncident")}>
          <Button size="sm" variant="outline" className="h-7 px-2">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>

        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(evidence)}
            title={t("common.delete")}
            className="h-7 px-2 text-danger hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}
