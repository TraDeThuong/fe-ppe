"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoiPoint } from "@/types";

export interface CameraRoiCanvasProps {
  points: RoiPoint[];
  onChange: (points: RoiPoint[]) => void;
  imageUrl?: string;
  disabled?: boolean;
}

export function CameraRoiCanvas({
  points,
  onChange,
  imageUrl,
  disabled = false,
}: CameraRoiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

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
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-slate-950 shadow-nm-inset select-none"
      >
        {/* Background Image / Snapshot */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Camera Snapshot"
            className="h-full w-full object-cover pointer-events-none"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-white/50 pointer-events-none">
            <p className="text-xs">Ảnh mẫu giả lập khung hình camera (1920x1080)</p>
            <p className="text-[11px] text-white/30 mt-1">
              Nhấp chuột vào khung hình để đánh dấu các đỉnh đa giác
            </p>
          </div>
        )}

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
          {points.length} điểm đỉnh đã chọn {points.length >= 3 ? "(Đa giác hợp lệ)" : "(Cần ≥ 3 điểm)"}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Nhấp các điểm theo chiều kim đồng hồ quanh khu vực cần nhận diện PPE.
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
            <span>Hoàn tác điểm</span>
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
            <span>Xóa vùng</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
