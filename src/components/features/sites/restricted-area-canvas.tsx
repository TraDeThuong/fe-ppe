"use client";

import { useEffect, useRef, useState } from "react";
import { AlertOctagon, BoxSelect, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });
  const [videoAspect, setVideoAspect] = useState<string>("16 / 9");
  const [isPaused, setIsPaused] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const youtubeUrl = getYouTubeEmbedUrl(streamUrl);
  const isNativeVideo = isVideoSource(streamUrl) && !videoError;
  const fallbackConstructionImage = "/images/camera-live-evidence.jpg";

  const updateSize = () => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
      setTimeout(updateSize, 50);
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const newPoint: RestrictedAreaPoint = {
      x: Math.max(0, Math.min(1, Math.round(x * 10000) / 10000)),
      y: Math.max(0, Math.min(1, Math.round(y * 10000) / 10000)),
    };

    onChange([...points, newPoint]);
  };

  const handleUndo = () => {
    if (points.length > 0) {
      onChange(points.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleQuickBox = () => {
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
        ref={containerRef}
        onClick={handleClick}
        style={{
          aspectRatio: videoAspect,
          maxHeight: "56vh",
          margin: "0 auto",
        }}
        className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border-2 border-dashed border-danger/60 bg-neutral-950 shadow-nm-inset select-none flex items-center justify-center"
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
          <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-1 font-mono text-[10px] text-white/80 border border-white/10 hidden sm:inline-block">
            {isVietnamese ? "Nhấp chuột để chấm điểm ranh giới" : "Click to plot danger points"}
          </span>
        </div>

        {/* SVG Danger Boundary Layer */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
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

          {/* Vertex Dots */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x * dimensions.width}
                cy={p.y * dimensions.height}
                r="6.5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={p.x * dimensions.width + 9}
                y={p.y * dimensions.height - 9}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                className="drop-shadow-md select-none font-mono"
              >
                P{idx + 1}
              </text>
            </g>
          ))}
        </svg>

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
          {isVietnamese
            ? "Nhấp chuột theo chiều kim đồng hồ quanh khu vực hố móng / trạm điện / chân cẩu nguy hiểm."
            : "Click clockwise around excavation, transformer or crane danger zones."}
        </p>

        <div className="flex items-center gap-2 shrink-0">
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
            <span>{isVietnamese ? "Hoàn tác" : "Undo"}</span>
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

