"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { AlertOctagon, BoxSelect, Check, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { RestrictedAreaPoint } from "@/types";

export interface RestrictedAreaCanvasProps {
  points: RestrictedAreaPoint[];
  onChange: (points: RestrictedAreaPoint[]) => void;
  imageUrl?: string;
  streamUrl?: string;
  cameraName?: string;
  disabled?: boolean;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1]
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match[1]}&enablejsapi=1`
    : null;
}

function isVideoSource(url?: string): boolean {
  if (!url) return false;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return false;
  if (/\.(jpg|jpeg|png|webp|avif|gif|svg)($|\?)/i.test(url)) return false;
  return (
    url.startsWith("/") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:video") ||
    /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(url)
  );
}

const MAX_POINTS = 50;
const ARROW_OFFSETS: Partial<Record<string, [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function clampCoordinate(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 10000) / 10000));
}

export function RestrictedAreaCanvas({
  points,
  onChange,
  imageUrl,
  streamUrl,
  cameraName,
  disabled = false,
}: RestrictedAreaCanvasProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const drawingRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<{
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    original: RestrictedAreaPoint;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });
  const [videoAspect, setVideoAspect] = useState<string>("16 / 9");
  const [isPaused, setIsPaused] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);
  const isDrawing = points.length === 0 || addingPoints;

  const youtubeUrl = getYouTubeEmbedUrl(streamUrl);
  const isNativeVideo = isVideoSource(streamUrl) && !videoError;
  const fallbackConstructionImage = "/images/camera-live-evidence.jpg";

  useEffect(() => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const updateSize = () => {
      const { width, height } = drawing.getBoundingClientRect();
      setDimensions({ width, height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(drawing);
    return () => observer.disconnect();
  }, []);

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled || !isDrawing || points.length >= MAX_POINTS) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    setAddingPoints(true);
    onChange([
      ...points,
      {
        x: clampCoordinate((e.clientX - rect.left) / rect.width),
        y: clampCoordinate((e.clientY - rect.top) / rect.height),
      },
    ]);
  };

  const handleVertexPointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (disabled || e.button !== 0 || dragRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      index,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      original: points[index],
    };
  };

  const handleVertexPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const rect = drawingRef.current?.getBoundingClientRect();
    if (disabled || drag?.pointerId !== e.pointerId || !rect?.width || !rect.height) return;

    moveVertex(
      drag.index,
      drag.original.x + (e.clientX - drag.startX) / rect.width,
      drag.original.y + (e.clientY - drag.startY) / rect.height,
    );
  };

  const moveVertex = (index: number, nextX: number, nextY: number) => {
    const x = clampCoordinate(nextX);
    const y = clampCoordinate(nextY);
    const point = points[index];
    if (point && (point.x !== x || point.y !== y)) {
      onChange(points.map((existing, currentIndex) => currentIndex === index ? { x, y } : existing));
    }
  };

  const handleVertexKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = ARROW_OFFSETS[e.key];
    if (disabled || !direction) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.05 : 0.01;
    moveVertex(index, points[index].x + direction[0] * step, points[index].y + direction[1] * step);
  };

  const finishVertexDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleUndo = () => {
    if (points.length > 0) {
      onChange(points.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAddingPoints(false);
    onChange([]);
  };

  const handleQuickBox = () => {
    setAddingPoints(false);
    onChange([
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ]);
  };

  const svgPoints = points
    .map((p) => `${p.x * dimensions.width},${p.y * dimensions.height}`)
    .join(" ");

  return (
    <div className="space-y-3">
      {/* Interactive Danger Canvas Container */}
      <div
        style={{
          aspectRatio: videoAspect,
          maxHeight: "56vh",
          margin: "0 auto",
        }}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-danger/60 bg-neutral-950 shadow-nm-inset select-none flex items-center justify-center"
      >
        {/* Background Visual Layer */}
        {youtubeUrl ? (
          <iframe
            src={youtubeUrl}
            title={cameraName || "Camera Stream"}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none border-0"
          />
        ) : isNativeVideo ? (
          <video
            ref={videoRef}
            src={streamUrl}
            autoPlay
            playsInline
            muted
            loop
            preload="auto"
            poster={imageUrl}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onCanPlay={(e) => {
              if (!isPaused) {
                e.currentTarget.play().catch(() => {});
              }
            }}
            onError={() => setVideoError(true)}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />
        ) : (
          <img
            src={imageUrl || fallbackConstructionImage}
            alt={cameraName || "Camera Frame"}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none opacity-90"
          />
        )}

        {/* Danger Header Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-2">
          <span className="rounded-lg bg-red-950/85 backdrop-blur-md px-2.5 py-1 font-mono text-[10px] font-bold text-red-200 border border-red-500/30 shadow-sm flex items-center gap-1.5">
            <AlertOctagon className="h-3 w-3 text-danger animate-pulse" />
            <span>
              {cameraName
                ? `${isVietnamese ? "CAMERA THAM CHIẾU" : "REF CAM"}: ${cameraName}`
                : isVietnamese
                ? "ẢNH MẪU HIỆN TRƯỜNG CÔNG TRƯỜNG"
                : "CONSTRUCTION SITE REFERENCE"}
            </span>
          </span>
          {isNativeVideo && (
            <button
              type="button"
              onClick={togglePause}
              className="pointer-events-auto rounded-lg bg-red-950/85 hover:bg-red-900/90 px-2 py-1 font-mono text-[10px] text-white border border-red-500/40 transition flex items-center gap-1 cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="h-2.5 w-2.5 text-emerald-400" />
                  <span>{isVietnamese ? "Tiếp tục phát" : "Play"}</span>
                </>
              ) : (
                <>
                  <Pause className="h-2.5 w-2.5 text-amber-400" />
                  <span>{isVietnamese ? "Tạm dừng" : "Pause"}</span>
                </>
              )}
            </button>
          )}
        </div>

        <div
          ref={drawingRef}
          onClick={handleClick}
          className={`absolute inset-0 ${!disabled && isDrawing ? "cursor-crosshair" : ""}`}
        >
          {/* SVG Danger Boundary Layer */}
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none">
            {/* Danger Stripe Pattern Def */}
            <defs>
              <pattern
                id="dangerStripes"
                width="16"
                height="16"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(239, 68, 68, 0.45)" strokeWidth="6" />
              </pattern>
            </defs>

            {/* Filled Danger Polygon with stripes */}
            {points.length >= 3 && (
              <>
                <polygon
                  points={svgPoints}
                  fill="rgba(239, 68, 68, 0.22)"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
                <polygon points={svgPoints} fill="url(#dangerStripes)" opacity="0.35" />
              </>
            )}

            {/* Polyline for < 3 points */}
            {points.length > 0 && points.length < 3 && (
              <polyline
                points={svgPoints}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            )}
          </svg>
          {points.map((point, index) => (
            <button
              key={index}
              type="button"
              aria-label={isVietnamese ? `Kéo điểm ${index + 1}` : `Drag vertex ${index + 1}`}
              disabled={disabled}
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              onPointerDown={(e) => handleVertexPointerDown(e, index)}
              onPointerMove={handleVertexPointerMove}
              onPointerUp={finishVertexDrag}
              onPointerCancel={finishVertexDrag}
              onLostPointerCapture={finishVertexDrag}
              onKeyDown={(e) => handleVertexKeyDown(e, index)}
              onClick={(e) => e.stopPropagation()}
              className="group absolute flex size-10 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-full focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-white active:cursor-grabbing disabled:cursor-default"
            >
              <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-white bg-red-500 group-hover:ring-4 group-hover:ring-white/40" />
              <span aria-hidden="true" className="absolute left-[calc(50%+9px)] top-0 font-mono text-[11px] font-bold text-white drop-shadow-md">
                P{index + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Coordinates Overlay Badge */}
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/75 backdrop-blur-sm px-2.5 py-1 font-mono text-[11px] text-white/90 border border-white/10 pointer-events-none flex items-center gap-2">
          <span className="font-bold text-danger">{points.length}</span>
          <span>{isVietnamese ? "điểm đỉnh" : "vertices"}</span>
          <span>•</span>
          <span className={points.length >= 3 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
            {points.length >= 3
              ? isVietnamese
                ? "Đa giác hợp lệ"
                : "Valid polygon"
              : isVietnamese
              ? "Cần tối thiểu 3 điểm"
              : "Requires ≥ 3 points"}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <p className="text-xs text-muted-foreground">
          {isDrawing
            ? isVietnamese
              ? "Chấm điểm theo thứ tự quanh ranh giới. Kéo các điểm để chỉnh vị trí."
              : "Click around the boundary in order. Drag vertices to adjust them."
            : isVietnamese
              ? "Kéo các điểm để chỉnh ranh giới. Bấm Thêm điểm để tiếp tục vẽ."
              : "Drag vertices to adjust the boundary. Select Add points to continue drawing."}
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddingPoints(!isDrawing)}
            disabled={disabled || (isDrawing ? points.length < 3 : points.length >= MAX_POINTS)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary"
          >
            {isDrawing ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isDrawing
              ? isVietnamese ? "Xong" : "Done"
              : isVietnamese ? "Thêm điểm" : "Add points"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleQuickBox}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary"
            title={isVietnamese ? "Tạo nhanh khung chữ nhật mặc định" : "Preset center box"}
          >
            <BoxSelect className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Khung nhanh" : "Box Preset"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={disabled || points.length === 0}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Bỏ điểm cuối" : "Remove last"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled || points.length === 0}
            className="flex items-center gap-1.5 text-xs text-danger hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Xóa vùng" : "Clear"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

