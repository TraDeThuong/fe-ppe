"use client";

import { memo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Expand,
  ImageOff,
  User,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { formatViolationLabel } from "@/components/features/ai-test/ai-test-utils";
import { getIncidentEvidenceUrl } from "@/components/features/incidents/incident-table";
import { useLocale } from "@/providers/locale-provider";
import type { ExtractedIncidentEvidencePair } from "../camera-live-helpers";
import type { IncidentCluster } from "@/lib/incident-cluster-engine";

export interface CameraEvidenceGridCardProps {
  cluster: IncidentCluster;
  pair: ExtractedIncidentEvidencePair;
  onInspectLightbox?: () => void;
}

export const CameraEvidenceGridCard = memo(function CameraEvidenceGridCard({
  cluster,
  pair,
  onInspectLightbox,
}: CameraEvidenceGridCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const inc = cluster.primary;
  const isHigh =
    cluster.effectiveSeverity === "CRITICAL" ||
    cluster.effectiveSeverity === "HIGH";

  const fallbackThumb = getIncidentEvidenceUrl(inc) || pair.primaryUrl;
  const hasAnyImage = Boolean(pair.isPair || fallbackThumb);
  const trackDisplay =
    cluster.personTrackId != null
      ? String(cluster.personTrackId)
      : inc.trackId != null
        ? String(inc.trackId)
        : pair.lightboxItem?.trackId;

  return (
    <article
      className={`group flex flex-col justify-between gap-3 rounded-2xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${NM.extruded}`}
    >
      {/* Header: Violation Type + Track + Severity & Status */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                isHigh
                  ? "bg-accent/15 text-accent"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {formatViolationLabel(cluster.effectiveViolationType, locale)}
            </span>

            {trackDisplay && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold text-foreground ${NM.recessed}`}
              >
                <User className="size-2.5 text-muted-foreground" />#{trackDisplay}
              </span>
            )}

            {cluster.rawCount > 1 && (
              <span className="rounded-md bg-warning/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-warning">
                ×{cluster.rawCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
              {cluster.effectiveSeverity}
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              {cluster.effectiveStatus}
            </span>
          </div>
        </div>

        {cluster.rawCount > 1 && (
          <p className="truncate font-mono text-[10px] font-semibold text-warning">
            {cluster.violationCodes
              .map((c) => formatViolationLabel(c, locale))
              .join(" + ")}
          </p>
        )}
      </div>

      {/* Image Stage: Side-by-side Before / After or Single Snapshot */}
      <button
        type="button"
        disabled={!onInspectLightbox}
        onClick={onInspectLightbox}
        className={`relative w-full overflow-hidden rounded-xl p-1.5 text-left ${NM.recessed} ${
          onInspectLightbox ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {pair.isPair && pair.beforeUrl && pair.afterUrl ? (
          <div className="grid grid-cols-2 gap-1.5">
            <div className="relative overflow-hidden rounded-lg bg-black/10 dark:bg-black/35">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pair.beforeUrl}
                alt={`Before ${inc.id}`}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-background/85 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground backdrop-blur-sm">
                {isVietnamese ? "Trước (Ref)" : "Before"}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-black/10 dark:bg-black/35">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pair.afterUrl}
                alt={`After ${inc.id}`}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
                {isVietnamese ? "Vi phạm (After)" : "After"}
              </span>
            </div>
          </div>
        ) : hasAnyImage ? (
          <div className="relative overflow-hidden rounded-lg bg-black/10 dark:bg-black/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fallbackThumb}
              alt={`Snapshot ${inc.id}`}
              loading="lazy"
              className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
              Snapshot
            </span>
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.03] text-muted-foreground">
            <ImageOff className="size-5 opacity-45" />
            <span className="text-[11px]">
              {isVietnamese ? "Chưa có ảnh đính kèm" : "No image attached"}
            </span>
          </div>
        )}

        {onInspectLightbox && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
            <Expand className="size-3 text-primary" />
            <span>{isVietnamese ? "Phóng to" : "Zoom"}</span>
          </span>
        )}
      </button>

      {/* Footer: Timestamp + Zoom & Incident Detail Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <Clock className="size-3 text-primary" />
          <span>
            {new Date(cluster.latestDetectedAt || inc.createdAt).toLocaleString(
              locale,
            )}
          </span>
        </span>

        <div className="flex items-center gap-1.5">
          {onInspectLightbox && (
            <button
              type="button"
              onClick={onInspectLightbox}
              className={`inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-foreground hover:text-primary ${NM.tactileBtn}`}
            >
              <Expand className="size-3" />
              <span>{pair.isPair ? "B/A" : isVietnamese ? "Ảnh" : "Zoom"}</span>
            </button>
          )}
          <Link
            href={`/incidents/${inc.id}`}
            className={`inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-primary ${NM.tactileBtn}`}
          >
            <span>{isVietnamese ? "Chi tiết" : "Inspect"}</span>
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
    </article>
  );
});
