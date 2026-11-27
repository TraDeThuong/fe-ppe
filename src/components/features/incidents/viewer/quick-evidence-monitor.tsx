"use client";

import { Camera, Columns2, Image as ImageIcon, Maximize2, Video, X } from "lucide-react";
import type { EvidenceItem } from "@/types";
import { EvidenceVideoPlayer } from "./evidence-video-player";

export type QuickEvidenceTab = "violation" | "compare" | "video";

export interface QuickEvidenceMonitorProps {
  incidentId: string;
  cameraCode: string;
  isVietnamese: boolean;
  trackId: number | null;
  confidencePct: number | null;
  evidenceCount: number;
  /** Ảnh vi phạm đang hiển thị (signed URL nếu đã xin lại); "" nghĩa là không có ảnh. */
  imageUrl: string;
  imageFailed: boolean;
  referenceUrl: string;
  videoEvidence: EvidenceItem | null;
  activeTab: QuickEvidenceTab;
  onTabChange: (tab: QuickEvidenceTab) => void;
  onZoom: () => void;
  onImageError: () => void;
}

/** Màn hình "Bằng chứng AI" của khung Xem nhanh: nhãn AI, tab Vi phạm / Video / Đối chứng và ảnh. */
export function QuickEvidenceMonitor({
  incidentId,
  cameraCode,
  isVietnamese,
  trackId,
  confidencePct,
  evidenceCount,
  imageUrl,
  imageFailed,
  referenceUrl,
  videoEvidence,
  activeTab,
  onTabChange,
  onZoom,
  onImageError,
}: QuickEvidenceMonitorProps) {
  const shortId = incidentId.slice(0, 8);
  const showVideoPlayer =
    Boolean(videoEvidence) &&
    (activeTab === "video" || (!imageUrl && activeTab === "violation"));

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/40 bg-surface p-2.5 shadow-nm-sm dark:border-white/[0.06]">
      {/* Monitor Header */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-background/85 text-primary shadow-nm-inset">
            <ImageIcon className="h-3.5 w-3.5" />
          </span>
          <span className="font-extrabold tracking-tight text-foreground">
            {isVietnamese ? "Bằng chứng AI" : "AI Evidence"}
          </span>
          {trackId !== null && (
            <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-black text-primary">
              Track #{trackId}
            </span>
          )}
          {confidencePct !== null && (
            <span className="rounded-lg border border-danger/25 bg-danger/10 px-2 py-0.5 font-mono text-[10px] font-black text-danger">
              AI {confidencePct}%
            </span>
          )}
          {evidenceCount > 0 && (
            <span className="rounded-lg border border-border/30 bg-background/85 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground shadow-nm-inset">
              {evidenceCount} {isVietnamese ? "tệp" : "files"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {(referenceUrl || videoEvidence) && (
            <div className="inline-flex items-center rounded-xl border border-border/30 bg-background/85 p-0.5 text-[10px] shadow-nm-inset">
              <button
                type="button"
                onClick={() => onTabChange("violation")}
                className={`rounded-lg px-2.5 py-0.5 font-extrabold transition-all ${activeTab === "violation"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {isVietnamese ? "Vi phạm" : "Violation"}
              </button>
              {videoEvidence && (
                <button
                  type="button"
                  onClick={() => onTabChange("video")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-extrabold transition-all ${activeTab === "video"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Video className="h-3 w-3" />
                  <span>Video</span>
                </button>
              )}
              {referenceUrl && (
                <button
                  type="button"
                  onClick={() => onTabChange("compare")}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 font-extrabold transition-all ${activeTab === "compare"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Columns2 className="h-3 w-3" />
                  <span>{isVietnamese ? "Đối chứng" : "Compare"}</span>
                </button>
              )}
            </div>
          )}

          {imageUrl && !imageFailed && !showVideoPlayer && (
            <button
              type="button"
              onClick={onZoom}
              title={isVietnamese ? "Phóng to toàn màn hình" : "Zoom fullscreen"}
              aria-label={isVietnamese ? "Phóng to ảnh" : "Zoom image"}
              className="inline-flex h-7 items-center gap-1 rounded-xl border border-white/40 bg-surface px-2 text-[10px] font-bold text-muted-foreground shadow-nm-sm transition-all hover:text-primary active:scale-95 active:shadow-nm-inset dark:border-white/[0.06]"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">
                {isVietnamese ? "Phóng to" : "Zoom"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Tactical Screen (16:10 taller viewport) */}
      <div className="group/screen relative flex-1 overflow-hidden rounded-xl border border-border/40 bg-[#070b14] shadow-nm-inset">
        {/* HUD Corner Brackets */}
        <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 h-3.5 w-3.5 border-l-2 border-t-2 border-primary/75" />
        <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 h-3.5 w-3.5 border-r-2 border-t-2 border-primary/75" />
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 h-3.5 w-3.5 border-b-2 border-l-2 border-primary/75" />
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 h-3.5 w-3.5 border-b-2 border-r-2 border-primary/75" />

        {showVideoPlayer && videoEvidence ? (
          <div className="relative flex aspect-[16/10] w-full items-center justify-center">
            <EvidenceVideoPlayer
              evidence={videoEvidence}
              poster={imageUrl || undefined}
              title={`Video #${shortId}`}
              className="h-full w-full object-contain"
            />
          </div>
        ) : activeTab === "compare" && referenceUrl ? (
          <div className="grid h-full min-h-[260px] grid-cols-2 gap-1.5 p-1.5 sm:min-h-[320px]">
            <div className="relative overflow-hidden rounded-lg bg-slate-900">
              <span className="absolute left-2 top-2 z-10 rounded-md bg-danger/90 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-wider text-white shadow">
                {isVietnamese ? "VI PHẠM" : "VIOLATION"}
              </span>
              <img
                src={imageUrl}
                alt="Violation"
                className="h-full w-full object-contain"
                onError={onImageError}
              />
            </div>
            <div className="relative overflow-hidden rounded-lg bg-slate-900">
              <span className="absolute left-2 top-2 z-10 rounded-md bg-emerald-600/90 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-wider text-white shadow">
                {isVietnamese ? "ĐỐI CHỨNG" : "REFERENCE"}
              </span>
              <img
                src={referenceUrl}
                alt="Reference"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="relative flex aspect-[16/10] w-full items-center justify-center">
            {/* Live Camera Watermark */}
            <span className="pointer-events-none absolute bottom-3 left-4 z-10 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-slate-200 backdrop-blur-xs">
              CAM • {cameraCode}
            </span>

            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt={`Evidence #${shortId}`}
                onClick={onZoom}
                className="h-full w-full cursor-zoom-in object-contain transition-transform duration-300 group-hover/screen:scale-[1.015]"
                onError={onImageError}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <Camera className="h-8 w-8 opacity-50" />
                <span className="text-xs">
                  {isVietnamese ? "Chưa có ảnh bằng chứng" : "No evidence snapshot available"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface QuickEvidenceLightboxProps {
  incidentId: string;
  imageUrl: string;
  isVietnamese: boolean;
  onClose: () => void;
}

/** Lớp phóng to ảnh bằng chứng toàn màn hình của khung Xem nhanh. */
export function QuickEvidenceLightbox({
  incidentId,
  imageUrl,
  isVietnamese,
  onClose,
}: QuickEvidenceLightboxProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isVietnamese ? "Xem ảnh bằng chứng phóng to" : "Zoomed evidence viewer"}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isVietnamese ? "Đóng" : "Close"}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={imageUrl}
          alt={`Evidence #${incidentId.slice(0, 8)}`}
          className="max-h-[88dvh] w-auto object-contain"
        />
      </div>
    </div>
  );
}
