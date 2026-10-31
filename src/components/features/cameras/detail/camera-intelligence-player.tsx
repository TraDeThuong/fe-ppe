"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Sliders,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { FrameLogEntry, StreamMetadata } from "./types";

const AI_SERVER_BASE = "http://127.0.0.1:8000";

export function getYouTubeEmbedUrl(url?: string): {
  embedUrl: string | null;
  youtubeId: string | null;
  isShorts: boolean;
} {
  if (!url) return { embedUrl: null, youtubeId: null, isShorts: false };
  const isShorts = url.includes("/shorts/");
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  const youtubeId = match && match[1] ? match[1] : null;
  const embedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${youtubeId}&enablejsapi=1`
    : null;
  return { embedUrl, youtubeId, isShorts };
}

export interface CameraIntelligencePlayerProps {
  videoSrc: string;
  currentEntry: FrameLogEntry | null;
  isPlaying: boolean;
  showBbox: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onToggleBbox: () => void;
  onSnapshot?: (dataUrl?: string | null, isRealCanvas?: boolean) => void;
  onOpenAiModal?: () => void;
  onChangeVideoSource?: (newUrl: string) => void;
  onSyncPlaying?: (playing: boolean) => void;
  onSyncTime?: (timeSec: number) => void;
  streamMetadata?: StreamMetadata;
  cameraName?: string;
  cameraCode?: string;
  siteName?: string;
  activeModelName?: string;
  cameraStatus?: string;
  currentFps?: number;
  currentLatencyMs?: number;
  cameraLocation?: string | null;
  cameraStreamUrl?: string;
  // Tham số kết nối bộ đệm AI thời gian thực (Look-Ahead Pre-Buffer)
  liveSessionId?: string | null;
  liveSessionStatus?: string | null;
  bufferProgress?: number;
  bufferedFramesCount?: number;
  loopCached?: boolean;
  onLiveStateUpdate?: (state: any) => void;
}

export function CameraIntelligencePlayer({
  videoSrc,
  currentEntry,
  isPlaying,
  showBbox,
  videoRef,
  onTogglePlay,
  onToggleBbox,
  onSnapshot,
  onOpenAiModal,
  onChangeVideoSource,
  onSyncPlaying,
  onSyncTime,
  streamMetadata,
  cameraName = "Camera Giám Sát",
  cameraCode = "CAM-01",
  activeModelName = "YOLOv11s-PPE (best.pt)",
  cameraStatus = "ONLINE",
  currentFps,
  currentLatencyMs,
  cameraLocation,
  cameraStreamUrl,
  liveSessionId,
  liveSessionStatus,
  bufferProgress = 0,
  bufferedFramesCount = 0,
  loopCached = false,
  onLiveStateUpdate,
}: CameraIntelligencePlayerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hiddenWebcamVideoRef = useRef<HTMLVideoElement | null>(null);

  const [webcamRenderedB64, setWebcamRenderedB64] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const { isShorts, youtubeId } = getYouTubeEmbedUrl(videoSrc);
  const isWebcam = videoSrc.toLowerCase().includes("webcam");
  const isPreRenderedJobVideo =
    videoSrc.includes("/api/ai-test/jobs/") || videoSrc.includes("-annotated.mp4");

  // ── LẮNG NGHE SỰ KIỆN FULLSCREEN ──
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ── 1. VÒNG LẶP KHÓA KHUNG HÌNH (FRAME-LOCKED) CHO WEBCAM LAPTOP ──
  useEffect(() => {
    if (!isWebcam) {
      setWebcamRenderedB64(null);
      setWebcamError(null);
      return;
    }

    let active = true;
    let localStream: MediaStream | null = null;
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 640;
    offscreenCanvas.height = 480;
    const ctx = offscreenCanvas.getContext("2d");

    const runWebcamLoop = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setWebcamError(
            isVietnamese
              ? "Trình duyệt không hỗ trợ truy cập Webcam."
              : "Browser does not support Webcam."
          );
          return;
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = hiddenWebcamVideoRef.current;
        if (v) {
          v.srcObject = localStream;
          await v.play().catch(() => {});
        }

        while (active) {
          if (!isPlaying || !liveSessionId || !v || v.readyState < 2 || !ctx) {
            await new Promise((r) => setTimeout(r, 80));
            continue;
          }

          if (v.videoWidth && v.videoHeight) {
            offscreenCanvas.width = v.videoWidth;
            offscreenCanvas.height = v.videoHeight;
          }
          ctx.drawImage(v, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

          const blob: Blob | null = await new Promise((resolve) =>
            offscreenCanvas.toBlob(resolve, "image/jpeg", 0.8)
          );
          if (!blob || !active) continue;

          try {
            const res = await fetch(
              `${AI_SERVER_BASE}/api/live/${liveSessionId}/webcam_frame?bbox=${showBbox ? 1 : 0}`,
              {
                method: "POST",
                body: blob,
              }
            );
            if (res.ok && active) {
              const data = await res.json();
              if (data.image_b64) {
                setWebcamRenderedB64(data.image_b64);
              }
              if (data.state) {
                onLiveStateUpdate?.(data.state);
              }
            }
          } catch {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      } catch (err: any) {
        if (active) {
          setWebcamError(
            isVietnamese
              ? "Không thể mở Webcam Laptop. Vui lòng cấp quyền Camera cho trình duyệt."
              : "Could not access Laptop Webcam. Please grant camera permission."
          );
        }
      }
    };

    runWebcamLoop();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isWebcam, isPlaying, liveSessionId, showBbox, isVietnamese, onLiveStateUpdate]);

  // ── 2. ĐỒNG BỘ PLAY/PAUSE CHO VIDEO NATIVE (KHI XEM JOB ĐÃ XỬ LÝ) ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || liveSessionId) return;

    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, videoSrc, liveSessionId, videoRef]);

  useEffect(() => {
    if (!isPlaying || liveSessionId) return;

    let animId: number;
    const syncLoop = () => {
      const v = videoRef.current;
      if (v && !v.paused) {
        onSyncTime?.(v.currentTime);
      }
      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, liveSessionId, videoRef, onSyncTime]);

  const handleControlledTogglePlay = () => {
    if (!liveSessionId && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    onTogglePlay();
  };

  // Kích thước chuẩn hoá theo tỷ lệ nguồn thực tế từ AI Server
  const isVertical = streamMetadata?.isVertical ?? isShorts;
  const viewBoxWidth = streamMetadata?.videoWidth || (isVertical ? 360 : 640);
  const viewBoxHeight = streamMetadata?.videoHeight || (isVertical ? 640 : 360);

  const currentTimeSec = currentEntry?.t ?? 0;
  const currentFrame = currentEntry?.frame ?? 1;

  // Chụp Snapshot trực tiếp từ AI Server (hoạt động cho cả YouTube, Webcam, RTSP không lo CORS)
  const handleCaptureSnapshot = async () => {
    if (isWebcam && webcamRenderedB64) {
      onSnapshot?.(webcamRenderedB64, true);
      return;
    }

    if (liveSessionId) {
      try {
        const res = await fetch(
          `${AI_SERVER_BASE}/api/live/${liveSessionId}/frame.jpg?bbox=${showBbox ? 1 : 0}&t=${Date.now()}`
        );
        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            onSnapshot?.(reader.result as string, true);
          };
          reader.readAsDataURL(blob);
          return;
        }
      } catch {
        // fallback dưới
      }
    }

    if (videoRef.current) {
      const v = videoRef.current;
      if (v.videoWidth && v.videoHeight) {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          onSnapshot?.(canvas.toDataURL("image/jpeg", 0.95), true);
          return;
        }
      }
    }

    if (youtubeId) {
      onSnapshot?.(`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`, false);
    } else {
      onSnapshot?.(null, false);
    }
  };

  const displayFps = streamMetadata?.fps || currentFps || 24;
  const displayLatency = currentLatencyMs ? `${currentLatencyMs}ms` : "Pre-Buffered 0ms Drift";
  const isOnline = cameraStatus === "ONLINE";

  const isBuffering =
    Boolean(liveSessionId) &&
    !isWebcam &&
    (liveSessionStatus === "initializing" || liveSessionStatus === "buffering");

  const mjpegStreamUrl =
    liveSessionId && !isWebcam
      ? `${AI_SERVER_BASE}/api/live/${liveSessionId}/stream.mjpeg?bbox=${showBbox ? 1 : 0}&ready=${liveSessionStatus === "streaming" ? 1 : 0}`
      : null;

  return (
    <div ref={playerContainerRef} className="flex flex-col gap-4 font-sans select-none">
      {/* Thẻ video ẩn phục vụ chụp frame Webcam Laptop */}
      <video ref={hiddenWebcamVideoRef} muted playsInline className="hidden" />

      {/* ── 1. KHUNG PHÁT VIDEO: NEUMORPHIC DOCK & DEEP CONCAVE WELL ── */}
      <div className="relative rounded-[28px] p-2.5 sm:p-3.5 bg-card/40 dark:bg-card/30 border border-border/60 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] transition-all">
        {/* Vát rãnh viền / Bezel lõm tầng 1 */}
        <div className="relative rounded-[22px] p-1.5 sm:p-2 bg-background border border-border/40 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]">
          {/* Vùng màn hình video lõm sâu (Monitor Cavity) */}
          <div
            className="relative overflow-hidden rounded-[16px] bg-neutral-950 flex items-center justify-center mx-auto ring-1 ring-border/20 shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)]"
            style={{
              height: isVertical ? "min(70vh, 720px)" : "auto",
              aspectRatio: `${viewBoxWidth} / ${viewBoxHeight}`,
              maxWidth: "100%",
              width: isVertical ? "auto" : "100%",
            }}
          >
            {/* Lớp bóng chìm 4 góc màn hình để nhấn mạnh chiều sâu monitor */}
            <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_36px_rgba(0,0,0,0.7)]" />

            {isWebcam ? (
              /* CHẾ ĐỘ 1: WEBCAM LAPTOP */
              <div className="relative h-full w-full flex items-center justify-center bg-neutral-950">
                {webcamError ? (
                  <div className="p-6 text-center text-xs text-danger border border-danger/30 bg-danger/10 rounded-2xl max-w-sm m-4 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] backdrop-blur-md">
                    <p className="font-bold text-sm mb-1">⚠️ {webcamError}</p>
                  </div>
                ) : webcamRenderedB64 ? (
                  <img
                    src={webcamRenderedB64}
                    alt="Webcam AI Frame-Locked"
                    className="h-full w-full object-contain select-none"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <span>
                      {isVietnamese
                        ? "Đang khởi động Webcam & khóa khung hình YOLOv11..."
                        : "Initializing Laptop Webcam & YOLOv11 Frame-Lock..."}
                    </span>
                  </div>
                )}
              </div>
            ) : mjpegStreamUrl ? (
              /* CHẾ ĐỘ 2: LUỒNG AI THỜI GIAN THỰC */
              <div className="relative h-full w-full flex items-center justify-center bg-neutral-950">
                <img
                  key={mjpegStreamUrl}
                  src={mjpegStreamUrl}
                  alt={cameraName}
                  onClick={handleControlledTogglePlay}
                  className="h-full w-full object-contain select-none cursor-pointer"
                />

                {isBuffering && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/85 dark:bg-background/90 backdrop-blur-md p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm font-bold text-foreground tracking-wide">
                      {isVietnamese
                        ? "Đang nạp bộ đệm AI chạy trước (Look-Ahead Pre-Buffer)..."
                        : "Pre-buffering AI Stream (Look-Ahead Ring Buffer)..."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-md">
                      {isVietnamese
                        ? "Hệ thống xử lý trước ~1.5 giây để khóa chặt tọa độ Bounding Box 100% vào người và loại bỏ rung lag."
                        : "Buffering ~1.5s ahead to lock Bounding Boxes 100% and eliminate lag."}
                    </p>
                    <div className="mt-4 w-60 h-2.5 rounded-full bg-background border border-border/60 p-0.5 shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)]">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${Math.max(12, Math.round(bufferProgress * 100))}%` }}
                      />
                    </div>
                    <span className="mt-2 font-mono text-[11px] text-primary font-bold tracking-wider">
                      {Math.round(bufferProgress * 100)}% ({bufferedFramesCount} frames)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* CHẾ ĐỘ 3: VIDEO ĐÃ XỬ LÝ SẴN */
              <div className="relative h-full w-full flex items-center justify-center bg-neutral-950">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  playsInline
                  loop
                  muted
                  className="h-full w-full object-contain cursor-pointer"
                  onClick={handleControlledTogglePlay}
                  onPlay={() => onSyncPlaying?.(true)}
                  onPause={() => onSyncPlaying?.(false)}
                  onTimeUpdate={(e) => onSyncTime?.(e.currentTarget.currentTime)}
                />
              </div>
            )}

            {/* HUD Top Bar: Nổi mềm trên nền kính đục với token hệ thống */}
            <div className="pointer-events-none absolute top-3.5 inset-x-3.5 z-25 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-background/85 dark:bg-background/90 backdrop-blur-md px-3 py-1.5 border border-border/60 shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] text-foreground">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isOnline ? "animate-ping bg-success" : "bg-danger"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      isOnline ? "bg-success" : "bg-danger"
                    }`}
                  />
                </span>
                <Badge variant="primary" size="sm" shape="rounded" className="font-mono font-bold py-0.5">
                  {cameraCode}
                </Badge>
                <span className="text-border">•</span>
                <span className="font-semibold text-foreground line-clamp-1">{cameraName}</span>
                {cameraLocation && (
                  <>
                    <span className="text-border">•</span>
                    <span className="text-muted-foreground text-[11px] line-clamp-1">
                      {cameraLocation}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-background/85 dark:bg-background/90 backdrop-blur-md px-3 py-1.5 border border-border/60 shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] text-foreground font-mono text-[11px]">
                <Badge variant="outline" size="sm" className="font-mono text-foreground gap-1.5 py-0.5 border-border/60">
                  <Cpu className="h-3 w-3 text-primary" />
                  <span className="line-clamp-1">{activeModelName}</span>
                </Badge>
                <span className="text-border">•</span>
                <Badge variant="outline" size="sm" className="font-mono text-success border-success/30 bg-success/10 py-0.5">
                  {displayLatency}
                </Badge>
                <span className="text-border">•</span>
                <Badge variant="outline" size="sm" className="font-mono text-info border-info/30 bg-info/10 py-0.5">
                  {displayFps} FPS
                </Badge>
              </div>
            </div>

            {/* HUD Bottom Bar: Nổi mềm hiển thị tọa độ & tiến độ đệm */}
            <div className="pointer-events-none absolute bottom-3.5 inset-x-3.5 z-25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-background/85 dark:bg-background/90 backdrop-blur-md px-3.5 py-1.5 border border-border/60 font-mono text-[11px] shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] text-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPlaying ? "bg-danger animate-pulse" : "bg-warning"
                  }`}
                />
                <span className={`font-bold tracking-wide ${isPlaying ? "text-danger" : "text-warning"}`}>
                  {isPlaying
                    ? isVietnamese
                      ? "LUỒNG AI TRỰC TIẾP"
                      : "LIVE AI STREAM"
                    : isVietnamese
                      ? "TẠM DỪNG"
                      : "PAUSED"}
                </span>
                <span className="text-border">•</span>
                <span className="text-foreground">{`${viewBoxWidth}×${viewBoxHeight}`}</span>
                <span className="text-border">•</span>
                <span className="text-muted-foreground">
                  t = <strong className="text-foreground">{currentTimeSec.toFixed(1)}s</strong> (F: {currentFrame})
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-background/85 dark:bg-background/90 backdrop-blur-md px-3 py-1.5 border border-border/60 text-[11px] font-mono shadow-[2px_2px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)]">
                <Badge variant="outline" size="sm" className="font-mono text-success border-success/30 bg-success/10 gap-1.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span>
                    {loopCached
                      ? "Buffer Locked (100% Cached)"
                      : isWebcam
                        ? "Webcam Frame-Locked"
                        : `Pre-Buffer Active (${bufferedFramesCount}f)`}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. THANH BẢNG ĐIỀU KHIỂN: KHỐI NỔI NEUMORPHISM ĐỒNG BỘ DARK/LIGHT MODE ── */}
      <div className="flex flex-col gap-3 rounded-[24px] bg-card/40 dark:bg-card/30 p-3.5 sm:p-4 border border-border/60 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Trạng thái giám sát trực tiếp */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPlaying ? "animate-ping bg-success" : "bg-warning"
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isPlaying ? "bg-success" : "bg-warning"
                }`}
              />
            </span>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="font-mono text-primary font-bold">{cameraCode}</span>
              <span className="text-border">•</span>
              <span className="text-muted-foreground hidden sm:inline">{cameraName}</span>
              <span className="text-border hidden sm:inline">•</span>
              <span className={isPlaying ? "text-success font-medium" : "text-warning font-medium"}>
                {isPlaying
                  ? isVietnamese
                    ? "Đang phát trực tiếp"
                    : "Live Streaming"
                  : isVietnamese
                    ? "Tạm dừng"
                    : "Paused"}
              </span>
            </div>
          </div>

          {/* Cụm Phím Bấm Giám Sát CCTV Tinh Gọn */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Nút Play / Pause */}
            <Button
              variant={isPlaying ? "outline" : "primary"}
              size="sm"
              onClick={handleControlledTogglePlay}
              className={`gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl transition-all ${
                isPlaying
                  ? "border-border/60 text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
                  : "shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 text-danger" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>
                {isPlaying
                  ? isVietnamese
                    ? "Tạm dừng"
                    : "Pause"
                  : isVietnamese
                    ? "Tiếp tục"
                    : "Play"}
              </span>
            </Button>

            {/* 2. Nút Bbox */}
            {!isPreRenderedJobVideo && (
              <Button
                variant={showBbox ? "primary" : "outline"}
                size="sm"
                onClick={onToggleBbox}
                className={`gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl transition-all ${
                  !showBbox
                    ? "border-border/60 text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]"
                    : "shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                }`}
              >
                {showBbox ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>
                  {showBbox
                    ? isVietnamese
                      ? "Bbox: Bật"
                      : "Bbox: On"
                    : isVietnamese
                      ? "Bbox: Tắt"
                      : "Bbox: Off"}
                </span>
              </Button>
            )}

            {/* 3. Nút Chụp Snapshot */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCaptureSnapshot}
              className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl border-border/60 text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:text-primary transition-all"
              title={isVietnamese ? "Chụp khung hình và tải ảnh .jpg về máy" : "Capture snapshot and download .jpg"}
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Chụp Snapshot" : "Snapshot"}</span>
            </Button>

            {/* 4. Nút Cấu hình AI (nếu có handler onOpenAiModal) */}
            {onOpenAiModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAiModal}
                className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl border-border/60 text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:text-primary transition-all"
                title={isVietnamese ? "Cấu hình tham số AI" : "Configure AI parameters"}
              >
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{isVietnamese ? "Cấu hình AI" : "AI Config"}</span>
              </Button>
            )}

            {/* 5. Nút Toàn màn hình */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFullscreen}
              className="h-8 w-8 p-0 rounded-xl border-border/60 text-muted-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:text-foreground transition-all"
              title={isFullscreen ? (isVietnamese ? "Thu nhỏ" : "Exit Fullscreen") : (isVietnamese ? "Toàn màn hình" : "Fullscreen")}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
