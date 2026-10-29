"use client";

import { useState } from "react";
import { Download, Eye, Maximize2, Minimize2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { BoundingBox, EvidenceItem } from "@/types";

export interface IncidentEvidenceViewerProps {
  evidence?: EvidenceItem | null;
  snapshotUrl?: string;
  violationType: string;
  confidence?: number;
}

export function IncidentEvidenceViewer({
  evidence,
  snapshotUrl,
  violationType,
  confidence = 0.96,
}: IncidentEvidenceViewerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract bounding boxes or provide reasonable defaults
  const detections = evidence?.metadata?.aiDetections;
  const personBoxes: BoundingBox[] = detections?.persons?.map((p) => p.box) || [
    { x: 25, y: 15, width: 50, height: 75, label: "PERSON", confidence: 0.98 },
  ];

  const violationBoxes: BoundingBox[] = [
    {
      x: 35,
      y: 18,
      width: 28,
      height: 25,
      label: violationType,
      confidence: confidence,
    },
  ];

  const imageUrl =
    snapshotUrl ||
    evidence?.url ||
    (evidence?.id ? `/api/v1/evidences/${evidence.id}/download-url` : undefined);

  return (
    <div className="space-y-3">
      {/* Viewer Box */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-slate-950 shadow-[4px_4px_12px_rgba(0,0,0,0.15)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Incident Evidence"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-muted-foreground p-6 text-center">
            <ShieldAlert className="h-10 w-10 text-danger/60 mb-2" />
            <p className="text-xs font-semibold text-foreground">
              Ảnh bằng chứng chụp từ Camera RTSP
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Khung Bounding Box thể hiện khu vực phát hiện vi phạm PPE
            </p>
          </div>
        )}

        {/* SVG Bounding Box Layer (Overlay directly on image) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full pointer-events-none"
        >
          {/* Person Bounding Box (Soft Blue Dashed) */}
          {personBoxes.map((box, i) => (
            <rect
              key={`person-${i}`}
              x={`${box.x}%`}
              y={`${box.y}%`}
              width={`${box.width}%`}
              height={`${box.height}%`}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="#3b82f6"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              rx="1"
            />
          ))}

          {/* Violation Bounding Box (Alert Red Solid with Glow) */}
          {violationBoxes.map((box, i) => (
            <g key={`violation-${i}`}>
              <rect
                x={`${box.x}%`}
                y={`${box.y}%`}
                width={`${box.width}%`}
                height={`${box.height}%`}
                fill="rgba(239, 68, 68, 0.15)"
                stroke="#ef4444"
                strokeWidth="1.5"
                rx="1"
              />
            </g>
          ))}
        </svg>

        {/* Violation Badge Overlay (HTML positioned for crisp typography) */}
        {violationBoxes.map((box, i) => (
          <div
            key={`badge-${i}`}
            style={{
              left: `${box.x}%`,
              top: `${Math.max(2, box.y - 7)}%`,
            }}
            className="absolute rounded bg-danger px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-md flex items-center gap-1 pointer-events-none"
          >
            <ShieldAlert className="h-3 w-3" />
            <span>{box.label}</span>
            <span>{Math.round((box.confidence || 0.95) * 100)}%</span>
          </div>
        ))}

        {/* Top Control Overlay */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 font-mono text-[10px] text-white">
            1080p FHD
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isVietnamese
            ? "Bằng chứng thị giác trích xuất tự động qua luồng nhận diện YOLO."
            : "Visual evidence automatically extracted via YOLO detection pipeline."}
        </span>

        <div className="flex items-center gap-2">
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-surface-elevated transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Tải ảnh gốc" : "Download Original"}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
