"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Play, Radio, Square } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { aiTestService } from "@/services/ai-test.service";
import { toSafeLiveCameraId } from "./camera-live-helpers";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraVideoPlayerProps {
  camera: CameraItem;
  liveSession?: LiveSessionInfo;
  isBusy?: boolean;
  onStartLive?: (camera: CameraItem) => void;
  onStopLive?: (camera: CameraItem) => void;
  compact?: boolean;
  className?: string;
}

/**
 * Real AI Live MJPEG viewport for `/cameras` Grid & Video Wall.
 * Replaces legacy fake RTSP scanlines & hardcoded 25fps/38ms metrics.
 */
export const CameraVideoPlayer = memo(function CameraVideoPlayer({
  camera,
  liveSession,
  isBusy = false,
  onStartLive,
  onStopLive,
  compact = false,
  className = "",
}: CameraVideoPlayerProps) {
  const [streamError, setStreamError] = useState(false);

  const liveId = toSafeLiveCameraId(camera);
  const isRunning = liveSession?.status === "running";
  const isInitializing = liveSession?.status === "initializing";
  const metrics = liveSession?.metrics;

  const fps = typeof metrics?.fps === "number" ? metrics.fps : undefined;
  const activePersons =
    metrics?.counts?.person ?? metrics?.active_persons ?? 0;
  const activeViolations = metrics?.active_violations ?? 0;

  return (
    <div
      className={`group relative aspect-video w-full overflow-hidden rounded-2xl p-2 ${NM.recessed} ${className}`}
    >
      {/* Viewfinder 4 góc */}
      <span className="pointer-events-none absolute left-3 top-3 z-10 h-3 w-3 rounded-tl border-l-2 border-t-2 border-primary/40" />
      <span className="pointer-events-none absolute right-3 top-3 z-10 h-3 w-3 rounded-tr border-r-2 border-t-2 border-primary/40" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-3 w-3 rounded-bl border-b-2 border-l-2 border-primary/40" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-3 w-3 rounded-br border-b-2 border-r-2 border-primary/40" />

      {isRunning && !streamError ? (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-foreground/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aiTestService.getLiveStreamUrl(liveId)}
            alt={`AI Live Stream ${camera.name}`}
            onError={() => setStreamError(true)}
            className="h-full w-full object-contain"
          />

          {/* HUD góc trên trái: LIVE + Vi phạm */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground shadow-sm">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent-foreground" />
              LIVE
            </span>
            {activeViolations > 0 && (
              <span className="rounded-lg bg-accent/90 px-2 py-0.5 font-mono text-[10px] font-extrabold text-accent-foreground shadow-sm">
                {activeViolations} VI PHẠM
              </span>
            )}
          </div>

          {/* HUD góc dưới trái: Thông số thật từ session.metrics */}
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-background/85 px-2.5 py-1 font-mono text-[10px] font-bold text-foreground backdrop-blur-md">
            <span className="text-primary">
              {typeof fps === "number" ? `${fps.toFixed(1)} FPS` : "LIVE"}
            </span>
            <span className="opacity-40">•</span>
            <span>{activePersons} người</span>
          </div>

          {/* Nút dừng nhanh góc dưới phải */}
          {onStopLive && (
            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                onStopLive(camera);
              }}
              title="Dừng AI Live Tracking"
              className="absolute bottom-2.5 right-2.5 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-background/90 px-2 py-1 font-mono text-[10px] font-bold text-accent shadow-sm backdrop-blur-md transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <Square className="size-2.5 fill-current" />
              <span>Dừng</span>
            </button>
          )}
        </div>
      ) : (
        /* Khay chờ radar đúc nổi chuẩn LiveStreamPanel */
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl px-4 text-center">
          <div
            className={`flex items-center justify-center rounded-full ${NM.extruded} ${
              compact ? "h-11 w-11" : "h-14 w-14"
            }`}
          >
            <div
              className={`flex items-center justify-center rounded-full bg-primary/10 text-primary ${
                compact ? "h-7 w-7" : "h-9 w-9"
              }`}
            >
              <Radio
                className={`${compact ? "size-3.5" : "size-4"} ${
                  isInitializing || isBusy ? "animate-pulse" : ""
                }`}
              />
            </div>
          </div>

          <div className="max-w-xs space-y-0.5">
            <p className="text-xs font-extrabold text-foreground">
              {isInitializing || isBusy
                ? "Đang khởi tạo AI Live..."
                : streamError
                  ? "Luồng MJPEG vừa tạm ngắt"
                  : "Chế độ chờ (Chưa chạy AI Live)"}
            </p>
            {!compact && (
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {camera.streamUrl || "Chưa gắn streamUrl"}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {onStartLive && !isInitializing && (
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  setStreamError(false);
                  onStartLive(camera);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.16)] transition hover:brightness-105 disabled:opacity-50"
              >
                <Play className="size-3 fill-current" />
                <span>{isBusy ? "Đang bật..." : "Bật AI Live"}</span>
              </button>
            )}

            <Link
              href={`/cameras/${camera.id}`}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-bold text-foreground hover:text-primary ${NM.tactileBtn}`}
            >
              <span>Mở Studio</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
});
