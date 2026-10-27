"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sliders,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { CameraItem } from "@/types";

export interface CameraVideoPlayerProps {
  camera: CameraItem;
  showControls?: boolean;
  onSnapshot?: (camera: CameraItem) => void;
  onPing?: (camera: CameraItem) => void;
  onOpenRoi?: (camera: CameraItem) => void;
  className?: string;
}

export function CameraVideoPlayer({
  camera,
  showControls = true,
  onSnapshot,
  onPing,
  onOpenRoi,
  className = "",
}: CameraVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [streamError, setStreamError] = useState(camera.status === "OFFLINE" || camera.status === "ERROR");
  const [fps, setFps] = useState(camera.currentFps || (camera.status === "ONLINE" ? 25 : 0));
  const [latency, setLatency] = useState(camera.currentLatencyMs || (camera.status === "ONLINE" ? 42 : 0));

  useEffect(() => {
    setStreamError(camera.status === "OFFLINE" || camera.status === "ERROR");
    if (camera.status === "ONLINE") {
      setFps(camera.currentFps || 25);
      setLatency(camera.currentLatencyMs || 38);
    } else {
      setFps(0);
      setLatency(0);
    }
  }, [camera.status, camera.currentFps, camera.currentLatencyMs]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleRetryStream = () => {
    setStreamError(false);
    setFps(25);
    setLatency(45);
  };

  return (
    <div
      ref={containerRef}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-black shadow-[4px_4px_12px_rgba(0,0,0,0.15)] transition-all ${className}`}
    >
      {/* Aspect Ratio Wrapper (16:9) */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        {/* Real or Mock Video Element */}
        {camera.streamUrl && !streamError ? (
          <video
            ref={videoRef}
            src={camera.streamUrl.startsWith("http") ? camera.streamUrl : undefined}
            autoPlay
            playsInline
            muted={isMuted}
            loop
            onError={() => setStreamError(true)}
            className="h-full w-full object-cover"
          />
        ) : null}

        {/* Ambient Simulated Feed (when streamUrl is RTSP or video not native) */}
        {!streamError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none">
            {/* Grid Scanline Overlay for Industrial CCTV look */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
          </div>
        )}

        {/* Error / Offline Overlay */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger shadow-inner">
              <WifiOff className="h-6 w-6" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-danger">
                {camera.status === "OFFLINE" ? "MẤT KẾT NỐI CAMERA" : "LỖI KẾT NỐI LUỒNG VIDEO"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Không nhận được luồng RTSP từ {camera.code}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetryStream}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-surface/80 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Thử kết nối lại</span>
            </button>
          </div>
        )}

        {/* Top Badges (Live, FPS, Latency) */}
        <div className="absolute left-2.5 top-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
                !streamError
                  ? "bg-emerald-500/80 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : "bg-danger/80 text-white"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !streamError ? "bg-white animate-pulse" : "bg-white/60"
                }`}
              />
              {!streamError ? "LIVE" : "OFFLINE"}
            </span>

            <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 font-mono text-[10px] text-white/90">
              {camera.code}
            </span>
          </div>

          {!streamError && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/80">
              <span className="rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                {fps} FPS
              </span>
              <span className="rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5 flex items-center gap-1">
                <Wifi className="h-3 w-3 text-emerald-400" />
                {latency}ms
              </span>
            </div>
          )}
        </div>

        {/* Bottom Overlay Info & Controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 opacity-90 transition-opacity group-hover:opacity-100">
          <div className="truncate pr-2">
            <p className="truncate text-xs font-semibold text-white">
              {camera.name}
            </p>
            <p className="truncate text-[10px] text-white/60">
              {camera.location || camera.siteName || "Khu vực giám sát"}
            </p>
          </div>

          {showControls && (
            <div className="flex items-center gap-1 text-white">
              {onSnapshot && (
                <button
                  type="button"
                  onClick={() => onSnapshot(camera)}
                  title="Chụp ảnh khung hình"
                  className="rounded-lg p-1.5 hover:bg-white/20 transition"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}

              {onPing && (
                <button
                  type="button"
                  onClick={() => onPing(camera)}
                  title="Đo ping camera"
                  className="rounded-lg p-1.5 hover:bg-white/20 transition"
                >
                  <Activity className="h-4 w-4" />
                </button>
              )}

              {onOpenRoi && (
                <button
                  type="button"
                  onClick={() => onOpenRoi(camera)}
                  title="Cấu hình AI ROI"
                  className="rounded-lg p-1.5 hover:bg-white/20 transition"
                >
                  <Sliders className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                className="rounded-lg p-1.5 hover:bg-white/20 transition"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                className="rounded-lg p-1.5 hover:bg-white/20 transition"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
