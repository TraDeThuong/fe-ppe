"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  Film,
  KeyRound,
  Link2,
  Loader2,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { IncidentSeverityBadge } from "@/components/features/incidents/incident-severity-badge";
import { IncidentStatusBadge } from "@/components/features/incidents/incident-status-badge";
import {
  useEvidenceIntegrity,
  useIncidentDetail,
  useVerifyEvidenceMutation,
} from "@/hooks/incidents";
import { fetchEvidenceViewUrl, useEvidenceViewUrl } from "@/hooks/incidents/use-evidences";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import {
  extractEvidenceBoundingBoxes,
  formatEvidenceFileSize,
  formatMediaDuration,
  getViolationLabel,
  isChecksumVerifyValid,
  isReferenceEvidenceItem,
  isVideoEvidenceItem,
} from "@/lib/evidence-utils";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import {
  EVIDENCE_TYPE,
  type EvidenceItem,
  type IncidentItem,
} from "@/types";
import { EvidenceAiHudOverlay } from "./evidence-status-pill";

type InspectorDisplayMode = "single" | "split" | "slider";

export interface EvidenceQuickInspectorModalProps {
  open: boolean;
  items: EvidenceItem[];
  activeIndex: number;
  initialCompare?: boolean;
  incidentsMap: Map<string, IncidentItem>;
  canDelete: boolean;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
  onDownload: (evidence: EvidenceItem) => void;
  onDelete: (evidence: EvidenceItem) => void;
}

export function EvidenceQuickInspectorModal({
  open,
  items,
  activeIndex,
  initialCompare = false,
  incidentsMap,
  canDelete,
  onClose,
  onChangeIndex,
  onDownload,
  onDelete,
}: EvidenceQuickInspectorModalProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const { getCamera, getCameraCode, getCameraName, getSiteName, getSiteCode } =
    useEntityLookup();

  const current = open ? (items[activeIndex] ?? null) : null;
  const incidentId = current?.incidentId ?? "";

  // Hydrate full incident + sibling evidences (e.g., matching Reference/Snapshot on another page)
  const { data: hydratedIncident } = useIncidentDetail(
    incidentId,
    Boolean(open && incidentId),
  );
  const incident = hydratedIncident ?? (current ? (current.incident ?? incidentsMap.get(current.incidentId)) : null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  );
  const [showAiHud, setShowAiHud] = useState(true);
  const [displayMode, setDisplayMode] = useState<InspectorDisplayMode>("single");
  const [sliderPos, setSliderPos] = useState(50);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const verifyMutation = useVerifyEvidenceMutation();
  const { data: cachedIntegrity } = useEvidenceIntegrity(current?.id ?? "", false);

  const isVideo = current ? isVideoEvidenceItem(current) : false;

  // Pair discovery across both current items & hydrated incident evidences
  const { beforeEvidence, afterEvidence } = useMemo(() => {
    if (!current) return { beforeEvidence: null, afterEvidence: null };
    const pool = new Map<string, EvidenceItem>();
    for (const item of items) {
      if (item.incidentId === current.incidentId) pool.set(item.id, item);
    }
    for (const item of hydratedIncident?.evidences ?? []) {
      pool.set(item.id, item);
    }
    const candidates = Array.from(pool.values()).filter((e) => !isVideoEvidenceItem(e));
    const ref = candidates.find((e) => isReferenceEvidenceItem(e)) ?? null;
    const snap =
      candidates.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ??
      candidates.find((e) => !isReferenceEvidenceItem(e)) ??
      null;
    return { beforeEvidence: ref, afterEvidence: snap };
  }, [current, items, hydratedIncident]);

  const hasComparePair = Boolean(beforeEvidence && afterEvidence && !isVideo);

  // Reset zoom/pan and choose initial display mode whenever active item changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPos(50);
    if (initialCompare && hasComparePair) {
      setDisplayMode("slider");
    } else {
      setDisplayMode("single");
    }
  }, [current?.id, initialCompare, hasComparePair]);

  // Ảnh/video xem trước qua presigned VIEW URL (bucket private, giữ chữ ký SigV4, BE ghi EvidenceAccessLog)
  const currentView = useEvidenceViewUrl(current, open);
  const beforeView = useEvidenceViewUrl(beforeEvidence, open && hasComparePair);
  const afterView = useEvidenceViewUrl(afterEvidence, open && hasComparePair);
  const resolvedVideoUrl = isVideo ? currentView.url : "";
  const loadingVideoUrl = isVideo && currentView.isLoading;

  const handleVerifyNow = useCallback(() => {
    // Cùng guard với nút "Giám định": tệp chưa có SHA-256 gốc thì BE trả 400.
    if (!current?.metadata?.checksum) return;
    verifyMutation.mutate(current.id);
  }, [current, verifyMutation]);

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;

  // Keyboard shortcuts while inspector is open
  useEffect(() => {
    if (!open || !current) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onChangeIndex(activeIndex - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onChangeIndex(activeIndex + 1);
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setShowAiHud((v) => !v);
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        handleVerifyNow();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        onDownload(current);
      } else if ((e.key === "+" || e.key === "=") && !isVideo) {
        e.preventDefault();
        setZoom((z) => Math.min(4, Number((z + 0.5).toFixed(2))));
      } else if (e.key === "-" && !isVideo) {
        e.preventDefault();
        setZoom((z) => {
          const next = Math.max(1, Number((z - 0.5).toFixed(2)));
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    current,
    activeIndex,
    hasPrev,
    hasNext,
    isVideo,
    onChangeIndex,
    handleVerifyNow,
    onDownload,
  ]);

  if (!current) return null;

  const currentUrl = currentView.url;
  const beforeUrl = beforeEvidence ? beforeView.url : "";
  const afterUrl = afterEvidence ? afterView.url : "";

  const violationLabel = incident?.violationType
    ? getViolationLabel(incident.violationType, isVi)
    : undefined;
  const currentBoxes =
    !isVideo && showAiHud
      ? extractEvidenceBoundingBoxes(current, violationLabel)
      : [];
  const afterBoxes =
    showAiHud && afterEvidence
      ? extractEvidenceBoundingBoxes(afterEvidence, violationLabel)
      : [];

  const cam = getCamera(current.cameraId);
  const siteId = incident?.siteId ?? cam?.siteId;
  const siteName = siteId ? getSiteName(siteId) : "--";
  const siteCode = siteId ? getSiteCode(siteId) : undefined;
  const cameraCode = getCameraCode(current.cameraId);
  const cameraName = getCameraName(current.cameraId);

  const verifyResult =
    verifyMutation.variables === current.id && verifyMutation.data
      ? verifyMutation.data
      : cachedIntegrity;

  const isVerifyingCurrent =
    verifyMutation.isPending && verifyMutation.variables === current.id;

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (isVideo || displayMode !== "single") return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((z) => {
      const next = Math.max(1, Math.min(4, Number((z + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || isVideo || displayMode !== "single") return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleCopyText = (text: string, message: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(message);
  };

  // Sao chép presigned VIEW URL mới (có hạn 60 phút) thay vì URL thô của bucket.
  const handleCopyLink = async () => {
    if (isCopyingLink) return;
    setIsCopyingLink(true);
    try {
      const signedUrl = await fetchEvidenceViewUrl(current.id);
      if (!signedUrl) throw new Error(t("evidences.actions.downloadError"));
      await navigator.clipboard.writeText(signedUrl);
      toast.success(t("evidences.actions.linkCopied"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("evidences.actions.downloadError"));
    } finally {
      setIsCopyingLink(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="full"
      title={current.fileName}
      description={`${cameraCode}${siteCode ? ` (${siteCode})` : ""} • ${new Date(
        current.capturedAt,
      ).toLocaleString(locale)}`}
      className="h-[92dvh] max-w-[96vw]"
      contentClassName="flex-1 overflow-y-auto lg:overflow-hidden p-0"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPrev}
              onClick={() => onChangeIndex(activeIndex - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t("evidences.inspector.prev")}</span>
            </Button>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {activeIndex + 1} / {items.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasNext}
              onClick={() => onChangeIndex(activeIndex + 1)}
              className="gap-1"
            >
              <span>{t("evidences.inspector.next")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="hidden text-[11px] text-muted-foreground lg:inline">
              {t("evidences.inspector.shortcutsHint")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCopyLink()}
              disabled={isCopyingLink}
              className="gap-1.5 text-xs"
            >
              {isCopyingLink ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              <span>{t("evidences.actions.copyLink")}</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onDownload(current)}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("evidences.actions.downloadOriginal")}</span>
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(current)}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("common.delete")}</span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Left Viewport: Dark Forensic Lab */}
        <div className="flex min-h-[260px] sm:min-h-[340px] lg:min-h-0 flex-col bg-slate-950 text-slate-100">
          {/* Viewport Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900/80 px-3 sm:px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  current.evidenceType === "SNAPSHOT"
                    ? "danger"
                    : current.evidenceType === "REFERENCE_SNAPSHOT"
                      ? "info"
                      : "warning"
                }
                size="sm"
              >
                {current.evidenceType}
              </Badge>

              {hasComparePair && (
                <div className="sm:ml-2 inline-flex max-w-full flex-wrap items-center rounded-lg border border-white/15 bg-slate-950/80 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("single")}
                    className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition-colors ${
                      displayMode === "single"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {t("evidences.inspector.modeSingle")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode("split")}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                      displayMode === "split"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Columns2 className="h-3 w-3" />
                    <span>{t("evidences.inspector.modeSplit")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode("slider")}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                      displayMode === "slider"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>{t("evidences.inspector.modeSlider")}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {!isVideo && (
                <button
                  type="button"
                  onClick={() => setShowAiHud((v) => !v)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    showAiHud
                      ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                      : "border-white/15 bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  {showAiHud ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>AI HUD (B)</span>
                </button>
              )}

              {!isVideo && displayMode === "single" && (
                <div className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((z) => {
                        const next = Math.max(1, Number((z - 0.5).toFixed(2)));
                        if (next === 1) setPan({ x: 0, y: 0 });
                        return next;
                      })
                    }
                    disabled={zoom <= 1}
                    className="cursor-pointer rounded p-1 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    title={t("evidences.inspector.zoomOut")}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[42px] text-center font-mono text-[11px]">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(4, Number((z + 0.5).toFixed(2))))}
                    disabled={zoom >= 4}
                    className="cursor-pointer rounded p-1 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    title={t("evidences.inspector.zoomIn")}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="cursor-pointer rounded p-1 text-slate-300 hover:bg-white/10"
                    title={t("evidences.inspector.resetZoom")}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Media Canvas */}
          <div
            onWheel={handleWheelZoom}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative flex flex-1 items-center justify-center overflow-hidden p-4 select-none ${
              zoom > 1 && displayMode === "single" && !isVideo
                ? isDragging
                  ? "cursor-grabbing"
                  : "cursor-grab"
                : ""
            }`}
          >
            {isVideo ? (
              <div className="relative flex h-full w-full flex-col items-center justify-center gap-3">
                {loadingVideoUrl && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("evidences.inspector.loadingStream")}</span>
                  </div>
                )}
                {resolvedVideoUrl ? (
                  <video
                    key={resolvedVideoUrl}
                    src={resolvedVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Film className="h-10 w-10" />
                    <span className="text-xs">{t("evidences.inspector.videoUnavailable")}</span>
                  </div>
                )}
              </div>
            ) : displayMode === "split" && hasComparePair ? (
              <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-info/30 bg-slate-900/70 p-3">
                  <Badge variant="info" size="sm">
                    {t("evidences.pairs.beforeSlot")}
                  </Badge>
                  <div className="relative flex max-h-[62vh] w-full flex-1 items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={beforeUrl}
                      alt="Reference"
                      className="max-h-full max-w-full rounded-lg object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-danger/30 bg-slate-900/70 p-3">
                  <Badge variant="danger" size="sm">
                    {t("evidences.pairs.afterSlot")}
                  </Badge>
                  <div className="relative inline-flex max-h-[62vh] items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={afterUrl}
                      alt="Violation"
                      className="max-h-[60vh] max-w-full rounded-lg object-contain"
                    />
                    {afterBoxes.length > 0 && <EvidenceAiHudOverlay boxes={afterBoxes} />}
                  </div>
                </div>
              </div>
            ) : displayMode === "slider" && hasComparePair ? (
              <div className="relative inline-flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
                {/* Base layer: After / Violation */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={afterUrl}
                  alt="Violation"
                  className="block max-h-[68vh] max-w-full object-contain"
                />
                {afterBoxes.length > 0 && <EvidenceAiHudOverlay boxes={afterBoxes} />}

                {/* Clipped overlay layer: Before / Reference */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeUrl}
                    alt="Reference"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Divider line + handle */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                </div>

                {/* Labels */}
                <span className="pointer-events-none absolute left-3 top-3 z-30 rounded bg-info/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("evidences.pairs.beforeSlot")}
                </span>
                <span className="pointer-events-none absolute right-3 top-3 z-30 rounded bg-danger/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("evidences.pairs.afterSlot")}
                </span>

                {/* Interactive Range Overlay */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  aria-label={t("evidences.inspector.modeSlider")}
                  className="absolute inset-0 z-40 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>
            ) : (
              <div
                onDoubleClick={() => {
                  setZoom((z) => {
                    const next = z > 1 ? 1 : 2;
                    if (next === 1) setPan({ x: 0, y: 0 });
                    return next;
                  });
                }}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? "none" : "transform 160ms ease-out",
                }}
                className="relative inline-flex max-h-full max-w-full items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUrl}
                  alt={current.fileName}
                  draggable={false}
                  className="max-h-[68vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
                {currentBoxes.length > 0 && <EvidenceAiHudOverlay boxes={currentBoxes} />}
              </div>
            )}
          </div>
        </div>

        {/* Right Forensic & Incident Sidebar */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-border/30 bg-surface p-4 lg:border-l lg:border-t-0">
          {/* 1. Live Forensic SHA-256 Block */}
          <section className="space-y-2.5 rounded-2xl border border-border/40 bg-background/70 p-3.5 shadow-[inset_2px_2px_6px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  {t("evidences.inspector.forensicTitle")}
                </h4>
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={isVerifyingCurrent || !current.metadata?.checksum}
                onClick={handleVerifyNow}
                className="h-7 gap-1 px-2.5 text-[11px]"
              >
                {isVerifyingCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <KeyRound className="h-3 w-3" />
                )}
                <span>{t("evidences.inspector.verifyShortcut")}</span>
              </Button>
            </div>

            {current.metadata?.checksum ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase text-muted-foreground">
                  <span>{t("evidences.inspector.expectedHash")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        current.metadata!.checksum!,
                        t("evidences.actions.hashCopied"),
                      )
                    }
                    className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    <span>{t("common.copy")}</span>
                  </button>
                </div>
                <p className="break-all rounded-lg bg-slate-950 p-2 font-mono text-[10px] text-emerald-400 select-all">
                  {current.metadata.checksum}
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/50 p-2.5 text-[11px] text-muted-foreground">
                {t("evidences.integrity.missingHint")}
              </p>
            )}

            {verifyResult && (
              <div
                className={`space-y-1.5 rounded-xl border p-2.5 text-xs ${
                  isChecksumVerifyValid(verifyResult)
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-danger/40 bg-danger/10 text-danger"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {isChecksumVerifyValid(verifyResult) ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {isChecksumVerifyValid(verifyResult)
                      ? t("evidences.inspector.verifyPassed")
                      : t("evidences.inspector.verifyFailed")}
                  </span>
                </div>
                {verifyResult.actualChecksum && (
                  <p className="break-all font-mono text-[10px] opacity-90">
                    Actual: {verifyResult.actualChecksum}
                  </p>
                )}
                {verifyResult.verifiedAt && (
                  <p className="text-[10px] opacity-80">
                    {t("evidences.inspector.verifiedAt", {
                      time: new Date(verifyResult.verifiedAt).toLocaleString(locale),
                    })}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* 2. Incident Context Block */}
          <section className="space-y-2.5 rounded-2xl border border-border/40 bg-background/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  {t("evidences.inspector.incidentContext")}
                </h4>
              </div>
              <Link href={`/incidents/${current.incidentId}`}>
                <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]">
                  <span>{t("evidences.actions.openIncident")}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {incident?.violationType && (
                  <Badge variant="danger" size="sm">
                    {getViolationLabel(incident.violationType, isVi)}
                  </Badge>
                )}
                {incident?.severity && <IncidentSeverityBadge severity={incident.severity} />}
                {incident?.status && <IncidentStatusBadge status={incident.status} />}
              </div>

              <div className="grid grid-cols-[92px_1fr] gap-y-1 text-[11px]">
                <span className="text-muted-foreground">{t("evidences.inspector.incidentId")}:</span>
                <span className="truncate font-mono font-semibold text-foreground">
                  {current.incidentId}
                </span>

                <span className="text-muted-foreground">{t("evidences.inspector.site")}:</span>
                <span className="font-medium text-foreground">
                  {siteName}
                  {siteCode ? ` (${siteCode})` : ""}
                </span>

                <span className="text-muted-foreground">{t("evidences.inspector.camera")}:</span>
                <span className="font-medium text-foreground">
                  <span className="font-mono font-semibold">{cameraCode}</span> — {cameraName}
                </span>

                {incident?.detectedAt && (
                  <>
                    <span className="text-muted-foreground">
                      {t("evidences.inspector.detectedAt")}:
                    </span>
                    <span className="text-foreground">
                      {new Date(incident.detectedAt).toLocaleString(locale)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 3. Technical File Metadata */}
          <section className="space-y-2 rounded-2xl border border-border/40 bg-background/70 p-3.5">
            <div className="flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4 text-info" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                {t("evidences.inspector.technicalMeta")}
              </h4>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[11px]">
              <span className="text-muted-foreground">{t("evidences.inspector.fileSize")}:</span>
              <span className="font-mono text-foreground">
                {formatEvidenceFileSize(current.fileSize)}
              </span>

              <span className="text-muted-foreground">{t("evidences.inspector.mimeType")}:</span>
              <span className="font-mono text-foreground">{current.mimeType}</span>

              {current.metadata?.width && current.metadata?.height && (
                <>
                  <span className="text-muted-foreground">
                    {t("evidences.inspector.resolution")}:
                  </span>
                  <span className="font-mono text-foreground">
                    {current.metadata.width} × {current.metadata.height} px
                  </span>
                </>
              )}

              {typeof current.metadata?.durationSeconds === "number" && (
                <>
                  <span className="text-muted-foreground">
                    {t("evidences.inspector.duration")}:
                  </span>
                  <span className="font-mono text-foreground">
                    {formatMediaDuration(current.metadata.durationSeconds)}
                    {current.metadata.frameRate ? ` (${current.metadata.frameRate} fps)` : ""}
                  </span>
                </>
              )}

              <span className="text-muted-foreground">{t("evidences.inspector.capturedAt")}:</span>
              <span className="text-foreground">
                {new Date(current.capturedAt).toLocaleString(locale)}
              </span>

              <span className="text-muted-foreground">{t("evidences.inspector.aiBoxes")}:</span>
              <span className="font-mono text-foreground">
                {currentBoxes.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                    <Maximize2 className="h-3 w-3" />
                    {currentBoxes.length}
                  </span>
                ) : (
                  "0"
                )}
              </span>

              <span className="text-muted-foreground">Storage Key:</span>
              <button
                type="button"
                onClick={() =>
                  handleCopyText(current.storageKey, t("evidences.actions.keyCopied"))
                }
                className="truncate text-left font-mono text-[10px] text-primary hover:underline cursor-pointer"
                title={current.storageKey}
              >
                {current.storageKey}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </Modal>
  );
}
