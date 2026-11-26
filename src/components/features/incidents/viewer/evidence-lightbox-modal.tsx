"use client";

import { Camera, Download, ShieldAlert, ShieldCheck, Video, X } from "lucide-react";
import type { BoundingBox, EvidenceItem, EvidenceType } from "@/types";
import { AiBoundingBoxHud } from "./ai-bounding-box-hud";
import { EvidenceVideoPlayer } from "./evidence-video-player";

export interface GalleryMediaItem {
  id: string;
  title: string;
  category: "annotated" | "reference" | "video" | "raw" | "wide";
  badgeLabel: string;
  badgeColor: "danger" | "success" | "info" | "default";
  url: string;
  description: string;
  isAiAnnotated: boolean;
  box?: BoundingBox;
  evidenceType?: EvidenceType | string;
  evidenceItem?: EvidenceItem;
}

export interface EvidenceLightboxModalProps {
  open: boolean;
  onClose: () => void;
  activeMedia: GalleryMediaItem;
  cameraId?: string;
  cameraFallbackUrl?: string;
  isVietnamese: boolean;
  showBoundingBoxes: boolean;
  isPreAnnotated: boolean;
  activeViolationBox: BoundingBox | null;
  violationLabel: string;
  confidence?: number | null;
}

export function EvidenceLightboxModal({
  open,
  onClose,
  activeMedia,
  cameraId,
  cameraFallbackUrl,
  isVietnamese,
  showBoundingBoxes,
  isPreAnnotated,
  activeViolationBox,
  violationLabel,
  confidence,
}: EvidenceLightboxModalProps) {
  if (!open) return null;

  const isVideo = activeMedia.category === "video";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/30 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-foreground sm:gap-2 sm:text-base">
              {activeMedia.category === "reference" ? (
                <ShieldCheck className="size-4 text-emerald-500" />
              ) : isVideo ? (
                <Video className="size-4 text-primary" />
              ) : activeMedia.category === "raw" ? (
                <Camera className="size-4 text-sky-500" />
              ) : (
                <ShieldAlert className="size-4 text-rose-500" />
              )}
              <span>{activeMedia.title}</span>
              <span
                className={`ml-2 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                  activeMedia.category === "reference"
                    ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : activeMedia.category === "annotated"
                      ? "border border-rose-500/30 bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      : "border border-border/40 bg-surface-elevated text-muted-foreground"
                }`}
              >
                {activeMedia.badgeLabel}
              </span>
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Camera: {cameraId || "—"} • {activeMedia.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeMedia.url && (
              <a
                href={activeMedia.url}
                download={`evidence_full_${Date.now()}.${isVideo ? "mp4" : "jpg"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <Download className="size-3.5" />
                <span>{isVietnamese ? "Tải về" : "Download"}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={isVietnamese ? "Đóng" : "Close"}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-3 flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-black sm:min-h-[380px]">
          {isVideo ? (
            <EvidenceVideoPlayer
              evidence={activeMedia.evidenceItem}
              src={activeMedia.url}
              title={activeMedia.title}
              className="max-h-[75vh] w-full object-contain"
            />
          ) : (
            <>
              {activeMedia.url && (
                <div
                  className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-2xl"
                  style={{ backgroundImage: `url(${activeMedia.url})` }}
                />
              )}
              <div className="relative z-10 inline-flex max-h-full max-w-full items-center justify-center">
                <img
                  src={activeMedia.url}
                  alt={activeMedia.title}
                  className="block max-h-[75vh] w-auto max-w-full select-none object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("maxresdefault.jpg")) {
                      target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                      return;
                    }
                    if (cameraFallbackUrl && target.src !== cameraFallbackUrl) {
                      target.src = cameraFallbackUrl;
                    }
                  }}
                />
                {showBoundingBoxes &&
                  !isPreAnnotated &&
                  activeMedia.category === "annotated" &&
                  activeViolationBox && (
                    <AiBoundingBoxHud
                      box={activeViolationBox}
                      violationLabel={violationLabel}
                      confidence={confidence}
                    />
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
