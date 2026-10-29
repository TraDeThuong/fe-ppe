"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { RoiPoint } from "@/types";

export interface CameraRoiCanvasProps {
  points: RoiPoint[];
  onChange: (points: RoiPoint[]) => void;
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

export function CameraRoiCanvas({
  points,
  onChange,
  imageUrl,
  streamUrl,
  cameraName,
  disabled = false,
}: CameraRoiCanvasProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  const youtubeUrl = getYouTubeEmbedUrl(streamUrl);
  const isWebcam = streamUrl?.toLowerCase().includes("webcam");
  const isNativeVideo = Boolean(
    streamUrl &&
      streamUrl.startsWith("http") &&
      !streamUrl.includes("youtube.com") &&
      !streamUrl.includes("youtu.be")
  );
  // Crisp realistic construction site reference image if no direct video stream is available
  const fallbackConstructionImage =
    "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1280&q=80";

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Round to 4 decimal places
    const newPoint: RoiPoint = {
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

  // Convert normalized points to SVG points string
  const svgPoints = points
    .map((p) => `${p.x * dimensions.width},${p.y * dimensions.height}`)
    .join(" ");

  return (
    <div className="space-y-3">
      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-2xl border-2 border-dashed border-primary/60 bg-slate-950 shadow-nm-inset select-none"
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
            src={streamUrl}
            autoPlay
            playsInline
            muted
            loop
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
        ) : (
          <img
            src={imageUrl || fallbackConstructionImage}
            alt={cameraName || "Camera Frame"}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-90"
          />
        )}

        {/* HUD Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-2">
          <span className="rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-1 font-mono text-[10px] font-bold text-white border border-white/10 shadow-sm flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {youtubeUrl || isNativeVideo
              ? (isVietnamese ? "LUỒNG VIDEO TRỰC TIẾP" : "LIVE CAMERA FEED")
              : imageUrl
              ? (isVietnamese ? "ẢNH CHỤP CAMERA" : "CAMERA SNAPSHOT")
              : (isVietnamese ? "ẢNH MẪU CÔNG TRƯỜNG THAM CHIẾU" : "CONSTRUCTION REFERENCE FRAME")}
          </span>
          <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-1 font-mono text-[10px] text-white/80 border border-white/10">
            {isVietnamese ? "Nhấp chuột để chọn điểm" : "Click to plot points"}
          </span>
        </div>

        {/* SVG Drawing Layer */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          {/* Filled Polygon */}
          {points.length >= 3 && (
            <polygon
              points={svgPoints}
              fill="rgba(59, 130, 246, 0.25)"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* Polyline for < 3 points */}
          {points.length > 0 && points.length < 3 && (
            <polyline
              points={svgPoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}

          {/* Vertex Dots */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x * dimensions.width}
                cy={p.y * dimensions.height}
                r="6"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={p.x * dimensions.width + 9}
                y={p.y * dimensions.height - 9}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                className="drop-shadow-md select-none"
              >
                P{idx + 1}
              </text>
            </g>
          ))}
        </svg>

        {/* Coordinates Overlay */}
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-1 font-mono text-[11px] text-white/80 pointer-events-none">
          {points.length} {isVietnamese ? "điểm đỉnh đã chọn" : "vertices selected"}{" "}
          {points.length >= 3
            ? isVietnamese
              ? "(Đa giác hợp lệ)"
              : "(Valid polygon)"
            : isVietnamese
            ? "(Cần ≥ 3 điểm)"
            : "(Requires ≥ 3 points)"}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isVietnamese
            ? "Nhấp các điểm theo chiều kim đồng hồ quanh khu vực cần nhận diện PPE."
            : "Click points clockwise around the PPE detection zone."}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={disabled || points.length === 0}
            className="flex items-center gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Hoàn tác điểm" : "Undo point"}</span>
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
            <span>{isVietnamese ? "Xóa vùng" : "Clear ROI"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
