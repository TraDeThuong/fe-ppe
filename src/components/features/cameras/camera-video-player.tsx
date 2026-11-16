"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Radio, Square } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { aiTestService } from "@/services/ai-test.service";
import {
  getYouTubeEmbedUrl,
  hasMaskedCredentials,
  isHtml5VideoUrl,
  toSafeLiveCameraId,
} from "./camera-live-helpers";
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
 * Live AI MJPEG + direct HTML5/YouTube preview viewport for `/cameras` Grid & Video Wall.
 * Uses IntersectionObserver to pause off-screen browser MJPEG <img> connections without stopping AI backend sessions.
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const liveId = toSafeLiveCameraId(camera);
  const isRunning = liveSession?.status === "running";
  const isInitializing = liveSession?.status === "initializing";
  const metrics = liveSession?.metrics;

  const fps = typeof metrics?.fps === "number" ? metrics.fps : undefined;
  const activePersons =
    metrics?.counts?.person ?? metrics?.active_persons ?? 0;
  const activeViolations = metrics?.active_violations ?? 0;

  const html5PreviewUrl =
    !isRunning && isHtml5VideoUrl(camera.streamUrl)
      ? camera.streamUrl.trim()
      : null;
  const youtubeEmbedUrl =
    !isRunning && !html5PreviewUrl
      ? getYouTubeEmbedUrl(camera.streamUrl)
      : null;

  const isMaskedRtsp = hasMaskedCredentials(camera.streamUrl);
  const isDbOnline = camera.status === "ONLINE";

  const standbyHeading =
    isInitializing || isBusy
      ? "Đang khởi tạo luồng Live..."
      : streamError
        ? "Luồng MJPEG vừa tạm ngắt"
        : !isDbOnline
          ? `Camera đang ${camera.status}`
          : isMaskedRtsp
            ? "RTSP đang ẩn mật khẩu (:***@)"
            : "Chế độ chờ (Chưa chạy AI Live)";

  const standbySubtext = !isDbOnline
    ? "Thiết bị hiện không ở trạng thái ONLINE để phát tự động."
    : isMaskedRtsp
      ? "Backend đang che mật khẩu RTSP — mở Studio để nhập nguồn hoặc xem hướng dẫn BE."
      : camera.streamUrl || "Chưa gắn streamUrl";

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full overflow-hidden rounded-2xl p-2 ${NM.recessed} ${className}`}
    >
      {/* Viewfinder 4 góc */}
      <span className="pointer-events-none absolute left-3 top-3 z-10 h-3 w-3 rounded-tl border-l-2 border-t-2 border-primary/40" />
      <span className="pointer-events-none absolute right-3 top-3 z-10 h-3 w-3 rounded-tr border-r-2 border-t-2 border-primary/40" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-3 w-3 rounded-bl border-b-2 border-l-2 border-primary/40" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-3 w-3 rounded-br border-b-2 border-r-2 border-primary/40" />

      {isRunning && !streamError ? (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-foreground/[0.04]">
          {isVisible ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={aiTestService.getLiveStreamUrl(liveId)}
              alt={`AI Live Stream ${camera.name}`}
              onError={() => setStreamError(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
              AI Live đang chạy nền...
            </div>
          )}

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
              title="Tạm dừng phiên AI Live"
              className="absolute bottom-2.5 right-2.5 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-background/90 px-2 py-1 font-mono text-[10px] font-bold text-accent shadow-sm backdrop-blur-md transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <Square className="size-2.5 fill-current" />
              <span>Dừng</span>
            </button>
          )}
        </div>
      ) : html5PreviewUrl ? (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-black/80">
          <video
            src={html5PreviewUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />
          <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-lg bg-background/85 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground backdrop-blur-md">
            PREVIEW
          </span>
          {onStartLive && !isInitializing && (
            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                setStreamError(false);
                onStartLive(camera);
              }}
              className="absolute bottom-2.5 right-2.5 inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary px-2.5 py-1 text-[10px] font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              <Play className="size-2.5 fill-current" />
              <span>{isBusy ? "Đang bật..." : "Bật AI Live"}</span>
            </button>
          )}
        </div>
      ) : youtubeEmbedUrl ? (
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-black/80">
          <iframe
            src={youtubeEmbedUrl}
            title={`Preview ${camera.name}`}
            allow="autoplay; encrypted-media"
            className="h-full w-full border-0"
          />
          {onStartLive && !isInitializing && (
            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                setStreamError(false);
                onStartLive(camera);
              }}
              className="absolute bottom-2.5 right-2.5 inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary px-2.5 py-1 text-[10px] font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              <Play className="size-2.5 fill-current" />
              <span>{isBusy ? "Đang bật..." : "Bật AI Live"}</span>
            </button>
          )}
        </div>
      ) : (
        /* Khay chờ radar đúc nổi */
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
              {standbyHeading}
            </p>
            {!compact && (
              <p className="line-clamp-2 font-mono text-[10px] text-muted-foreground">
                {standbySubtext}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {onStartLive && !isInitializing && isDbOnline && (
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
