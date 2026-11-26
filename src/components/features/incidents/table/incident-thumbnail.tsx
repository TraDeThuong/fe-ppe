"use client";

import { useEffect, useState } from "react";
import { Camera, Video } from "lucide-react";
import type { IncidentItem } from "@/types";
import {
  isVideoEvidence,
  resolveIncidentTelemetry,
} from "../viewer/evidence-media-utils";

export interface IncidentThumbnailProps {
  src?: string | null;
  alt?: string;
  hasVideo?: boolean;
  className?: string;
}

/**
 * Thumbnail bằng chứng an toàn: hiển thị icon placeholder chuẩn khi thiếu ảnh hoặc lỗi tải,
 * tuyệt đối không trỏ sang ảnh mẫu tĩnh giả (/images/camera-live-evidence.jpg).
 */
export function IncidentThumbnail({
  src,
  alt = "Evidence",
  hasVideo = false,
  className = "h-11 w-16",
}: IncidentThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-slate-950/80 ${className}`}
    >
      {src && !hasError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : hasVideo ? (
        <Video className="h-4 w-4 text-primary/80" aria-label="Video evidence" />
      ) : (
        <Camera className="h-4 w-4 text-muted-foreground/60" aria-label="No snapshot" />
      )}
    </div>
  );
}

export function incidentHasVideoEvidence(incident: IncidentItem): boolean {
  return Boolean(incident.evidences?.some((ev) => isVideoEvidence(ev)));
}

export interface IncidentTelemetryChipsProps {
  incident: IncidentItem;
  className?: string;
}

/**
 * Hiển thị chip `Track #N` và `AI XX%` khi sự cố có dữ liệu thật từ AI/Backend (Mục 3.6 D08).
 */
export function IncidentTelemetryChips({
  incident,
  className = "",
}: IncidentTelemetryChipsProps) {
  const { trackId, confidencePct } = resolveIncidentTelemetry(incident);

  if (trackId === null && confidencePct === null) {
    return null;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {trackId !== null && (
        <span className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-primary">
          Track #{trackId}
        </span>
      )}
      {confidencePct !== null && (
        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-amber-700 dark:text-amber-300">
          AI {confidencePct}%
        </span>
      )}
    </span>
  );
}
