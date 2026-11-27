"use client";

import { useRef } from "react";
import { Camera, Maximize2, Play, Radio, RefreshCw, Wrench } from "lucide-react";
import { toast } from "@/lib/toast";
import { NM } from "@/components/features/ai-test/nm-styles";
import { Loader } from "@/components/ui/loader";
import { useLocale } from "@/providers/locale-provider";
import { aiTestService } from "@/services/ai-test.service";
import {
  getYouTubeEmbedUrl,
  isHtml5VideoUrl,
} from "../camera-live-helpers";
import type { LiveStatsResponse } from "@/types/ai-test.types";

export interface CameraLiveViewportProps {
  liveCameraId: string;
  cameraName: string;
  cameraStreamUrl?: string | null;
  sourceErrorReason?: string | null;
  stats: LiveStatsResponse | null;
  streamNonce: number;
  isStarting: boolean;
  canStart: boolean;
  canManageCamera?: boolean;
  onStartStream: () => void;
  onReloadStream: () => void;
  onOpenDeviceTab?: () => void;
}

export function CameraLiveViewport({
  liveCameraId,
  cameraName,
  cameraStreamUrl,
  sourceErrorReason,
  stats,
  streamNonce,
  isStarting,
  canStart,
  canManageCamera = false,
  onStartStream,
  onReloadStream,
  onOpenDeviceTab,
}: CameraLiveViewportProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  const isRunning = stats?.status === "running";
  const isReconnecting = stats?.status === "reconnecting";
  const isWaitingForStream =
    isStarting || stats?.status === "initializing" || isReconnecting;
  const hasFailed = stats?.status === "error";
  const sessionError = hasFailed
    ? stats?.error ||
      (isVietnamese ? "Không thể mở luồng AI." : "Unable to open the AI stream.")
    : isReconnecting
      ? stats?.error
      : null;
  const metrics = stats?.metrics;
  const html5PreviewUrl =
    !isRunning && isHtml5VideoUrl(cameraStreamUrl) ? cameraStreamUrl!.trim() : null;
  const youtubeEmbedUrl =
    !isRunning && !html5PreviewUrl ? getYouTubeEmbedUrl(cameraStreamUrl) : null;

  const handleSnapshot = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      toast.error(
        isVietnamese
          ? "Chưa có khung hình khả dụng để chụp."
          : "No frame available to capture.",
      );
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/jpeg", 0.92);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${liveCameraId}-${Date.now()}.jpg`;
      link.click();
      toast.success(
        isVietnamese
          ? "Đã lưu ảnh chụp khung hình Live!"
          : "Live frame snapshot saved!",
      );
    } catch {
      toast.error(
        isVietnamese
          ? "Không thể chụp trực tiếp từ luồng MJPEG."
          : "Unable to capture snapshot directly from MJPEG stream.",
      );
    }
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  return (
    <section
      aria-label="MJPEG Live Stream Viewport"
      className={`relative flex flex-col overflow-hidden rounded-[28px] p-4 sm:p-6 xl:sticky xl:top-6 xl:col-span-7 ${NM.chassis}`}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Header Bezel & Telemetry Pods */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                isRunning
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/15 text-primary"
              }`}
            >
              <Radio className={`size-4 ${isRunning ? "animate-pulse" : ""}`} />
            </div>
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                isRunning
                  ? "bg-accent shadow-[0_0_8px_hsl(var(--accent))]"
                  : "bg-muted-foreground/40"
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                MJPEG Live Stream
              </h2>
              <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-extrabold text-primary">
                {liveCameraId}
              </span>
            </div>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {cameraName} • Optical Inference &amp; Bounding Box Viewport
            </p>
          </div>
        </div>

        {/* Telemetry Pods */}
        <div
          className={`flex flex-wrap items-center gap-2 self-start rounded-2xl p-1.5 sm:self-center ${NM.recessed}`}
        >
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-[3px_3px_6px_rgba(0,0,0,0.08)] ${
              isRunning
                ? "bg-accent text-accent-foreground"
                : "bg-background text-muted-foreground"
            }`}
          >
            {isRunning && (
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent-foreground" />
            )}
            {isRunning ? "LIVE" : (stats?.status ?? "STOPPED").toUpperCase()}
          </span>

          <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.08)]">
            {typeof metrics?.fps === "number" ? metrics.fps.toFixed(1) : "--"}
            <span className="text-[10px] font-semibold text-muted-foreground">
              FPS
            </span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.08)]">
            <span className="text-[10px] font-extrabold uppercase text-accent">
              AI
            </span>
            {typeof metrics?.ai_fps_actual === "number"
              ? metrics.ai_fps_actual.toFixed(1)
              : "--"}
            <span className="text-[10px] font-semibold text-muted-foreground">
              fps
            </span>
          </span>
        </div>
      </div>

      {/* Recessed Optical Display */}
      <div
        ref={containerRef}
        className={`relative flex aspect-video max-h-[540px] w-full items-center justify-center overflow-hidden rounded-[24px] p-3 ${NM.recessed}`}
      >
        <span className="pointer-events-none absolute left-4 top-4 z-10 h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-primary/40" />
        <span className="pointer-events-none absolute right-4 top-4 z-10 h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-primary/40" />
        <span className="pointer-events-none absolute bottom-4 left-4 z-10 h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-primary/40" />
        <span className="pointer-events-none absolute bottom-4 right-4 z-10 h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-primary/40" />

        {isRunning ? (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/[0.03] p-1 shadow-[4px_4px_10px_rgba(0,0,0,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              key={`${liveCameraId}-${streamNonce}`}
              src={aiTestService.getLiveStreamUrl(liveCameraId, streamNonce)}
              alt={`AI Live MJPEG Stream ${liveCameraId}`}
              onError={() => {
                if (retryTimerRef.current !== null) {
                  window.clearTimeout(retryTimerRef.current);
                }
                retryTimerRef.current = window.setTimeout(() => {
                  retryTimerRef.current = null;
                  onReloadStream();
                }, 1500);
              }}
              className="h-full w-full rounded-xl object-contain"
            />

            <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl border border-white/40 bg-background/85 px-3 py-1.5 shadow-[4px_4px_10px_rgba(0,0,0,0.15)] backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="font-mono text-[11px] font-extrabold tracking-wider text-foreground">
                REC • {liveCameraId}
              </span>
            </div>

            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSnapshot}
                title={isVietnamese ? "Chụp ảnh khung hình Live" : "Capture live frame"}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-white/40 bg-background/90 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-md transition hover:text-primary"
              >
                <Camera className="size-3.5 text-primary" />
                <span>{isVietnamese ? "Chụp ảnh" : "Snapshot"}</span>
              </button>
              <button
                type="button"
                onClick={onReloadStream}
                title={isVietnamese ? "Kết nối lại luồng MJPEG" : "Reconnect MJPEG stream"}
                aria-label={isVietnamese ? "Kết nối lại luồng MJPEG" : "Reconnect MJPEG stream"}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/40 bg-background/90 text-foreground shadow-sm backdrop-blur-md transition hover:text-primary"
              >
                <RefreshCw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFullscreen}
                title={isVietnamese ? "Toàn màn hình" : "Fullscreen"}
                aria-label={isVietnamese ? "Toàn màn hình" : "Fullscreen"}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/40 bg-background/90 text-foreground shadow-sm backdrop-blur-md transition hover:text-primary"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </div>
          </div>
        ) : isWaitingForStream ? (
          <div className={`rounded-2xl px-8 py-6 ${NM.extruded}`}>
            <Loader
              size="lg"
              showLabel
              label={
                isReconnecting
                  ? isVietnamese
                    ? "Đang kết nối lại luồng AI..."
                    : "Reconnecting the AI stream..."
                  : isVietnamese
                    ? "Đang khởi tạo luồng suy luận Live..."
                    : "Initializing live inference stream..."
              }
            />
          </div>
        ) : html5PreviewUrl || youtubeEmbedUrl ? (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-black/80 shadow-[4px_4px_10px_rgba(0,0,0,0.12)]">
            {html5PreviewUrl ? (
              <video
                src={html5PreviewUrl}
                controls
                muted
                autoPlay
                loop
                playsInline
                className="h-full w-full rounded-xl object-contain"
              />
            ) : (
              <iframe
                src={`${youtubeEmbedUrl}?autoplay=1&mute=1`}
                title={`Preview ${cameraName}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full rounded-xl border-0"
              />
            )}

            <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-background/90 px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>
                {hasFailed
                  ? isVietnamese
                    ? "Preview gốc (Lỗi AI Tracking)"
                    : "Raw Preview (AI Tracking error)"
                  : isVietnamese
                    ? "Preview gốc (AI Tracking chưa bật)"
                    : "Raw Preview (AI Tracking inactive)"}
              </span>
            </div>

            {canManageCamera && (
              <div className="absolute right-3 top-3 flex flex-wrap items-center gap-2">
                {canStart ? (
                  <button
                    type="button"
                    onClick={onStartStream}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground shadow-md transition hover:brightness-105"
                  >
                    <Play className="size-3 fill-current" />
                    <span>{isVietnamese ? "Bật AI Tracking" : "Start AI Tracking"}</span>
                  </button>
                ) : (
                  onOpenDeviceTab && (
                    <button
                      type="button"
                      onClick={onOpenDeviceTab}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/40 bg-background/95 px-3 py-1.5 text-[11px] font-bold text-primary shadow-md backdrop-blur-md transition hover:brightness-105"
                    >
                      <Wrench className="size-3" />
                      <span>
                        {isVietnamese
                          ? "Gắn Nguồn AI Override (Tab 03)"
                          : "Set AI Override Source (Tab 03)"}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-4 p-6 text-center">
            <div
              className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${NM.extruded}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08)]">
                <Radio className="size-6" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-extrabold tracking-tight text-foreground">
                {isVietnamese
                  ? `Camera ${liveCameraId} đang ở trạng thái ${stats?.status ?? "chờ"}`
                  : `Camera ${liveCameraId} is ${stats?.status ?? "standby"}`}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {!canManageCamera
                  ? isVietnamese
                    ? "Phiên AI Live hiện chưa kích hoạt. Khi Quản lý An toàn bật luồng phân tích, hình ảnh MJPEG trực tiếp sẽ tự động hiển thị tại đây."
                    : "AI Live session is currently inactive. Live MJPEG frames will appear automatically once started by a Safety Manager."
                  : sourceErrorReason ??
                    (isVietnamese ? (
                      <>
                        Nhấn{" "}
                        <strong className="font-bold text-primary">
                          Bắt đầu Tracking
                        </strong>{" "}
                        để xem MJPEG bounding box real-time.
                      </>
                    ) : (
                      <>
                        Click{" "}
                        <strong className="font-bold text-primary">
                          Start Tracking
                        </strong>{" "}
                        to view real-time MJPEG bounding boxes.
                      </>
                    ))}
              </p>
            </div>

            {canManageCamera && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {canStart && (
                  <button
                    type="button"
                    onClick={onStartStream}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.16)] transition hover:brightness-105"
                  >
                    <Play className="size-3.5 fill-current" />
                    <span>
                      {isVietnamese ? "Bắt đầu Tracking Ngay" : "Start Tracking Now"}
                    </span>
                  </button>
                )}

                {!canStart && onOpenDeviceTab && (
                  <button
                    type="button"
                    onClick={onOpenDeviceTab}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-primary ${NM.tactileBtn}`}
                  >
                    <Wrench className="size-3.5" />
                    <span>
                      {isVietnamese
                        ? "Mở Tab 03 gắn Nguồn Override"
                        : "Open Tab 03 to Set Override Source"}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {!isStarting && sessionError && (
        <p
          role="alert"
          className="mt-3 break-words rounded-xl border border-accent/25 bg-accent/15 px-3.5 py-2 text-xs font-bold text-accent"
        >
          {isVietnamese ? "Lỗi AI Tracking" : "AI Tracking error"} — {sessionError}
        </p>
      )}
    </section>
  );
}

