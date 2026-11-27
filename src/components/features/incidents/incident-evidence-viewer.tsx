"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  Columns,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImageOff,
  Layers,
  Maximize2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { EVIDENCE_TYPE, type BoundingBox, type EvidenceItem } from "@/types";
import { AiBoundingBoxHud } from "./viewer/ai-bounding-box-hud";
import {
  EvidenceLightboxModal,
  type GalleryMediaItem,
} from "./viewer/evidence-lightbox-modal";
import {
  normalizeConfidenceRatio,
  resolveIncidentSnapshot,
} from "./viewer/evidence-media-utils";
import { useIncidentGalleryPhotos } from "./viewer/use-incident-gallery-photos";
import { EvidenceVideoPlayer } from "./viewer/evidence-video-player";

export type GalleryPhoto = GalleryMediaItem;

export interface IncidentEvidenceViewerProps {
  evidence?: EvidenceItem | null;
  evidences?: EvidenceItem[];
  snapshotUrl?: string;
  violationType: string;
  confidence?: number | null;
  trackId?: number | null;
  cameraId?: string;
  incidentId?: string;
  defaultViewMode?: "single" | "split";
}

export function IncidentEvidenceViewer({
  evidence,
  evidences = [],
  snapshotUrl,
  violationType,
  confidence,
  trackId,
  cameraId = "",
  incidentId = "",
  defaultViewMode = "single",
}: IncidentEvidenceViewerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "split">(defaultViewMode);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  const { galleryPhotos, incidentFallbackUrl, violationLabel, confidencePct } =
    useIncidentGalleryPhotos({
      evidence,
      evidences,
      snapshotUrl,
      violationType,
      confidence,
      cameraId,
      incidentId,
    });
  const normalizedConf = normalizeConfidenceRatio(confidence);

  const activePhoto = galleryPhotos[selectedIndex] || galleryPhotos[0];
  const isActiveVideo = activePhoto?.category === "video";

  useEffect(() => {
    setImgLoadFailed(false);
  }, [activePhoto?.id, activePhoto?.url]);

  const violationPhoto = useMemo(
    () => galleryPhotos.find((p) => p.category === "annotated" && p.url),
    [galleryPhotos],
  );
  const referencePhoto = useMemo(
    () =>
      galleryPhotos.find((p) => p.category === "reference" && p.url) ||
      galleryPhotos.find((p) => p.category === "raw" && p.url),
    [galleryPhotos],
  );
  const canCompare = Boolean(
    violationPhoto &&
      referencePhoto &&
      violationPhoto.url &&
      referencePhoto.url &&
      violationPhoto.url !== referencePhoto.url,
  );

  useEffect(() => {
    if (defaultViewMode === "split" && canCompare) {
      setViewMode("split");
    }
  }, [defaultViewMode, canCompare]);

  const isPreAnnotated = useMemo(() => {
    const url = (activePhoto?.url || "").toLowerCase();
    const title = (activePhoto?.title || "").toLowerCase();
    const primaryAiMeta = (
      evidence?.metadata?.aiDetections ||
      evidences?.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT)?.metadata?.aiDetections
    ) as { annotatedInImage?: boolean } | null | undefined;

    return (
      url.includes("-evidence") ||
      url.includes("evidence_") ||
      url.includes("_red") ||
      url.includes("annotated") ||
      url.includes("ai_violation") ||
      url.includes("/api/jobs/live/evidence/") ||
      url.includes("_ref") ||
      url.startsWith("data:image/") ||
      title.includes("tô đỏ") ||
      title.includes("annotated") ||
      activePhoto?.category === "reference" ||
      Boolean(activePhoto?.category === "annotated" && primaryAiMeta?.annotatedInImage === true)
    );
  }, [activePhoto?.url, activePhoto?.title, activePhoto?.category, evidence, evidences]);

  const handleSelectPhoto = (idx: number) => {
    setSelectedIndex(idx);
    setViewMode("single");
    const photo = galleryPhotos[idx];
    if (photo) {
      setShowBoundingBoxes(photo.category === "annotated");
    }
  };

  const activeViolationBox = useMemo<BoundingBox | null>(() => {
    if (typeof window !== "undefined" && incidentId) {
      try {
        const stored = sessionStorage.getItem(`ppe_incident_box_${incidentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.x === "number") {
            return {
              x: parsed.x,
              y: parsed.y,
              width: parsed.width,
              height: parsed.height,
              label: parsed.label || violationLabel,
              confidence: normalizeConfidenceRatio(parsed.confidence) ?? normalizedConf ?? undefined,
            };
          }
        }
      } catch {
        // Ignore corrupt storage
      }
    }

    const targetEvidence =
      evidence ||
      evidences?.find((e) => (e.metadata as any)?.aiDetections?.violations?.[0]?.box) ||
      evidences?.find((e) => (e.metadata as any)?.aiDetections?.violation?.box) ||
      evidences?.find((e) => (e.metadata as any)?.aiDetections?.box) ||
      evidences?.[0];

    const meta = targetEvidence?.metadata?.aiDetections as any;
    const metaBox =
      meta?.box ||
      meta?.violation?.box ||
      (Array.isArray(meta?.violations) && meta.violations[0]?.box) ||
      (Array.isArray(meta?.persons) && meta.persons[0]?.violations?.[0]?.box) ||
      null;

    if (metaBox && typeof metaBox.x === "number") {
      return {
        x: metaBox.x <= 1 ? metaBox.x * 100 : metaBox.x,
        y: metaBox.y <= 1 ? metaBox.y * 100 : metaBox.y,
        width: metaBox.width <= 1 ? metaBox.width * 100 : metaBox.width,
        height: metaBox.height <= 1 ? metaBox.height * 100 : metaBox.height,
        label: metaBox.label || violationLabel,
        confidence: normalizeConfidenceRatio(metaBox.confidence) ?? normalizedConf ?? undefined,
      };
    }
    return null;
  }, [evidence, evidences, incidentId, violationLabel, normalizedConf]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setIsPortrait(naturalHeight > naturalWidth);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── THANH ĐIỀU HƯỚNG TABS NHANH GIỮA CÁC BẰNG CHỨNG (ẢNH / VIDEO) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto py-1">
          {galleryPhotos.map((photo, idx) => {
            const isSelected = idx === selectedIndex && viewMode === "single";
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => handleSelectPhoto(idx)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? photo.category === "annotated"
                      ? "bg-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.35)]"
                      : photo.category === "reference"
                        ? "bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
                        : "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(var(--primary-rgb),0.25)]"
                    : "border border-border/40 bg-surface text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                }`}
              >
                {photo.category === "annotated" ? (
                  <span className="flex size-2 animate-pulse rounded-full bg-rose-200" />
                ) : photo.category === "video" ? (
                  <Video className="size-3.5" />
                ) : photo.category === "reference" ? (
                  <ShieldCheck className="size-3.5 text-emerald-200" />
                ) : photo.category === "raw" ? (
                  <Camera className="size-3.5" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                <span>{photo.badgeLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canCompare && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode((m) => (m === "split" ? "single" : "split"))}
              className={`h-8 gap-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "split"
                  ? "border-emerald-500/60 bg-emerald-500/15 font-bold text-emerald-600 shadow-sm dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <Columns className="size-3.5 text-emerald-500" />
              <span>
                {viewMode === "split"
                  ? isVietnamese
                    ? "Đóng So Sánh"
                    : "Close Compare"
                  : isVietnamese
                    ? "So Sánh 2 Cột"
                    : "Compare (2 Cols)"}
              </span>
            </Button>
          )}

          {!isActiveVideo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBoundingBoxes((v) => !v)}
              className={`h-8 gap-1.5 rounded-xl text-xs font-medium transition-all ${
                showBoundingBoxes
                  ? "border-rose-500/50 bg-rose-500/15 font-semibold text-rose-500 shadow-sm hover:bg-rose-500/25"
                  : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {showBoundingBoxes ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              <span>
                {showBoundingBoxes
                  ? isVietnamese
                    ? "Khung Tô Đỏ: BẬT"
                    : "Red Box: ON"
                  : isVietnamese
                    ? "Khung Tô Đỏ: TẮT"
                    : "Red Box: OFF"}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLightboxOpen(true)}
            className="h-8 gap-1 rounded-xl text-xs font-medium text-foreground hover:bg-surface-elevated"
            title={isVietnamese ? "Phóng to toàn màn hình" : "Fullscreen"}
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden md:inline">{isVietnamese ? "Phóng to" : "Expand"}</span>
          </Button>
        </div>
      </div>

      {/* ── NỘI DUNG CHÍNH: SO SÁNH 2 CỘT HOẶC XEM ĐƠN LẺ (ẢNH / VIDEO) ── */}
      {viewMode === "split" && violationPhoto && referencePhoto ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-neutral-950 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-emerald-500/30 bg-emerald-950/40 px-3 py-2 sm:px-3.5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm">
                    <ShieldCheck className="size-3.5" />
                    <span>{isVietnamese ? "1. ẢNH ĐỐI CHỨNG" : "1. REFERENCE"}</span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {isVietnamese ? "Trạng thái hợp lệ (Before / T=0s)" : "Compliant / Baseline"}
                  </span>
                </div>
              </div>

              <div className="relative flex aspect-video w-full select-none items-center justify-center overflow-hidden bg-neutral-950">
                <div
                  className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-xl"
                  style={{ backgroundImage: `url(${referencePhoto.url})` }}
                  aria-hidden="true"
                />
                <img
                  src={referencePhoto.url}
                  alt={referencePhoto.title}
                  className="relative z-10 max-h-full max-w-full select-none object-contain"
                />
              </div>

              <div className="border-t border-border/30 bg-surface/50 p-3 text-xs text-muted-foreground">
                <p className="line-clamp-2">
                  <span className="font-semibold text-emerald-500">
                    {isVietnamese ? "Mục đích đối chứng: " : "Reference Purpose: "}
                  </span>
                  {referencePhoto.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-rose-500/50 bg-neutral-950 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-rose-500/30 bg-rose-950/40 px-3 py-2 sm:px-3.5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm">
                    <ShieldAlert className="size-3.5" />
                    <span>{isVietnamese ? "2. ẢNH VI PHẠM" : "2. VIOLATION"}</span>
                  </span>
                  <span className="text-xs font-semibold text-rose-300">{violationLabel}</span>
                </div>
                {confidencePct !== null && (
                  <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    {confidencePct}% AI
                  </span>
                )}
              </div>

              <div className="relative flex aspect-video w-full select-none items-center justify-center overflow-hidden bg-neutral-950">
                <div
                  className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-xl"
                  style={{ backgroundImage: `url(${violationPhoto.url})` }}
                  aria-hidden="true"
                />
                <div className="relative z-10 inline-flex max-h-full max-w-full items-center justify-center">
                  <img
                    src={violationPhoto.url}
                    alt={violationPhoto.title}
                    className="relative z-10 max-h-full max-w-full select-none object-contain"
                  />
                  {showBoundingBoxes && !isPreAnnotated && activeViolationBox && (
                    <AiBoundingBoxHud
                      box={activeViolationBox}
                      violationLabel={violationLabel}
                      confidence={normalizedConf}
                      compact
                    />
                  )}
                </div>
              </div>

              <div className="border-t border-border/30 bg-surface/50 p-3 text-xs text-muted-foreground">
                <p className="line-clamp-2">
                  <span className="font-semibold text-rose-500">
                    {isVietnamese ? "Xác nhận vi phạm: " : "Violation Confirmation: "}
                  </span>
                  {violationPhoto.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
            <ArrowLeftRight className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isVietnamese
                ? "So sánh trực quan giữa trạng thái đối chứng ban đầu và thời điểm phát hiện vi phạm giúp Cán bộ An toàn thẩm định khách quan trước khi phê duyệt."
                : "Side-by-side comparison between compliant baseline and detected violation."}
            </span>
          </div>
        </div>
      ) : (
        <div className="group relative flex aspect-video w-full select-none items-center justify-center overflow-hidden rounded-2xl border-2 border-border/50 bg-neutral-950 shadow-[6px_6px_20px_var(--shadow-dark),-6px_-6px_20px_var(--shadow-light)]">
          {isActiveVideo ? (
            <EvidenceVideoPlayer
              evidence={activePhoto.evidenceItem}
              src={activePhoto.url}
              poster={violationPhoto?.url}
              title={activePhoto.title}
              className="relative z-10 max-h-[520px] w-full object-contain"
            />
          ) : activePhoto?.url && !imgLoadFailed ? (
            <>
              <div
                className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl transition-all duration-500"
                style={{ backgroundImage: `url(${activePhoto.url})` }}
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden="true" />
              <div className="relative z-10 inline-flex max-h-full max-w-full items-center justify-center">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.title}
                  onLoad={handleImageLoad}
                  className="block max-h-[340px] w-auto max-w-full select-none object-contain transition-transform duration-300 group-hover:scale-[1.005] sm:max-h-[420px] md:max-h-[480px] lg:max-h-[520px]"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.includes("maxresdefault.jpg")) {
                      target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
                      return;
                    }
                    const resolvedSnap = activePhoto.category === "annotated"
                      ? resolveIncidentSnapshot(snapshotUrl)
                      : "";
                    if (resolvedSnap && target.getAttribute("src") !== resolvedSnap) {
                      target.src = resolvedSnap;
                      return;
                    }
                    if (activePhoto.category === "annotated" && incidentFallbackUrl &&
                        target.getAttribute("src") !== incidentFallbackUrl) {
                      target.src = incidentFallbackUrl;
                      return;
                    }
                    setImgLoadFailed(true);
                  }}
                />
                {showBoundingBoxes &&
                  !isPreAnnotated &&
                  activePhoto.category === "annotated" &&
                  activeViolationBox && (
                    <AiBoundingBoxHud
                      box={activeViolationBox}
                      violationLabel={violationLabel}
                      confidence={normalizedConf}
                    />
                  )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400">
              <ImageOff className="h-8 w-8 opacity-60" />
              <span className="text-xs font-medium">
                {isVietnamese
                  ? "Chưa có ảnh bằng chứng hoặc không thể tải tệp"
                  : "No evidence image available"}
              </span>
            </div>
          )}

          {/* BADGE GÓC TRÁI */}
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold shadow-md backdrop-blur-md ${
                activePhoto.category === "annotated"
                  ? "border border-rose-500/50 bg-rose-600/90 text-white"
                  : activePhoto.category === "reference"
                    ? "border border-emerald-500/50 bg-emerald-700/90 text-white"
                    : "border border-white/20 bg-black/70 text-slate-200"
              }`}
            >
              {activePhoto.badgeLabel}
            </span>
            {typeof trackId === "number" && trackId >= 0 && (
              <span className="rounded-lg border border-primary/40 bg-black/70 px-2 py-1 font-mono text-[10px] font-bold text-primary backdrop-blur-sm">
                Track #{trackId}
              </span>
            )}
            {confidencePct !== null && (
              <span className="rounded-lg border border-amber-400/35 bg-black/70 px-2 py-1 font-mono text-[10px] font-bold text-amber-300 backdrop-blur-sm">
                AI {confidencePct}%
              </span>
            )}
            {galleryPhotos.length > 1 && (
              <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
                {selectedIndex + 1} / {galleryPhotos.length}
              </span>
            )}
            {!isActiveVideo && isPortrait && (
              <span className="hidden rounded-lg border border-primary/30 bg-black/70 px-2 py-1 font-mono text-[10px] text-primary backdrop-blur-sm sm:inline-flex">
                {isVietnamese ? "9:16 Dọc" : "9:16 Vertical"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── DẢI THUMBNAIL ── */}
      {galleryPhotos.length > 1 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Layers className="size-3.5 text-primary" />
              <span>
                {isVietnamese
                  ? `Bộ Bằng Chứng Thị Giác (${galleryPhotos.length} tệp):`
                  : `Visual Evidence Set (${galleryPhotos.length} files):`}
              </span>
            </span>
            <span className="text-[11px]">
              {isVietnamese ? "Click để chuyển đổi" : "Click to switch"}
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              galleryPhotos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {galleryPhotos.map((photo, idx) => {
              const isSelected = idx === selectedIndex && viewMode === "single";
              const isThumbVideo = photo.category === "video";
              return (
                <button
                  key={`thumb-${photo.id}`}
                  type="button"
                  onClick={() => handleSelectPhoto(idx)}
                  className={`group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-neutral-950 text-left transition-all ${
                    isSelected
                      ? photo.category === "reference"
                        ? "scale-[1.02] border-emerald-500 shadow-md ring-2 ring-emerald-500/40"
                        : "scale-[1.02] border-rose-500 shadow-md ring-2 ring-rose-500/40"
                      : "border-border/50 bg-surface opacity-80 hover:border-primary/50 hover:opacity-100"
                  }`}
                >
                  {isThumbVideo ? (
                    <div className="flex flex-col items-center gap-1.5 text-slate-200">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/25 text-primary ring-1 ring-primary/50">
                        <Play className="h-4 w-4 fill-current" />
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase">VIDEO CLIP</span>
                    </div>
                  ) : photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="relative z-10 max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImageOff className="h-5 w-5 text-slate-500" />
                  )}

                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-[11px] font-semibold leading-tight text-white drop-shadow">
                        #{idx + 1}: {photo.badgeLabel}
                      </p>
                      {isSelected && (
                        <CheckCircle2
                          className={`size-3.5 shrink-0 ${
                            photo.category === "reference" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FOOTER THÔNG TIN & TẢI VỀ ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/30 bg-surface p-3 text-xs text-muted-foreground">
        <p className="min-w-[200px] flex-1">
          <span className="font-semibold text-foreground">{activePhoto.title}: </span>
          {activePhoto.description}
        </p>

        {activePhoto.url && (
          <a
            href={activePhoto.url}
            download={`evidence_${activePhoto.category}_${Date.now()}.${
              isActiveVideo ? "mp4" : "jpg"
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
          >
            <Download className="size-3.5" />
            <span>
              {isActiveVideo
                ? isVietnamese
                  ? "Tải video này về"
                  : "Download This Video"
                : isVietnamese
                  ? "Tải ảnh này về"
                  : "Download This Image"}
            </span>
          </a>
        )}
      </div>

      <EvidenceLightboxModal
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        activeMedia={activePhoto}
        cameraId={cameraId}
        cameraFallbackUrl={activePhoto?.category === "annotated" ? incidentFallbackUrl : undefined}
        isVietnamese={isVietnamese}
        showBoundingBoxes={showBoundingBoxes}
        isPreAnnotated={isPreAnnotated}
        activeViolationBox={activeViolationBox}
        violationLabel={violationLabel}
        confidence={normalizedConf}
      />
    </div>
  );
}
