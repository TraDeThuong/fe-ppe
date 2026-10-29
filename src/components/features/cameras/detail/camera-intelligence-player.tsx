"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Maximize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { FrameLogEntry, StreamMetadata } from "./types";

export function getYouTubeEmbedUrl(url?: string): {
  embedUrl: string | null;
  youtubeId: string | null;
  isShorts: boolean;
} {
  if (!url) return { embedUrl: null, youtubeId: null, isShorts: false };
  const isShorts = url.includes("/shorts/");
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
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
  onSnapshot?: (dataUrl?: string | null) => void;
  onOpenAiModal?: () => void;
  onChangeVideoSource?: (newUrl: string) => void;
  streamMetadata?: StreamMetadata;
  cameraName?: string;
  cameraCode?: string;
  siteName?: string;
  activeModelName?: string;
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
  streamMetadata,
  cameraName = "Camera Giám Sát",
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
  activeModelName = "YOLOv11s-PPE (best.pt)",
}: CameraIntelligencePlayerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { embedUrl: youtubeEmbedUrl, isShorts, youtubeId } = getYouTubeEmbedUrl(videoSrc);
  const isWebcam = videoSrc.toLowerCase().includes("webcam");
  const isRtsp = videoSrc.startsWith("rtsp://");

  // Xử lý webcam stream lifecycle
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (isWebcam) {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            localStream = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isWebcam, videoRef]);

  // Kích thước chuẩn hoá theo tỷ lệ nguồn
  const isVertical = isShorts || (streamMetadata?.isVertical ?? false);
  const viewBoxWidth = isVertical ? 1080 : 1920;
  const viewBoxHeight = isVertical ? 1920 : 1080;

  const currentTimeSec = currentEntry?.t ?? 0;
  const currentFrame = currentEntry?.frame ?? 1;

  // Bản đồ trạng thái công nhân trong khung hình
  const personStates = new Map(
    (currentEntry?.persons || []).map((p) => [p.track_id, p])
  );

  // Xử lý chụp ảnh thực tế từ Canvas HTML5 video nếu có
  const handleCaptureSnapshot = () => {
    let snapshotDataUrl: string | null = null;
    if (videoRef.current && !youtubeEmbedUrl) {
      const v = videoRef.current;
      if (v.videoWidth && v.videoHeight) {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          snapshotDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        }
      }
    } else if (youtubeId) {
      snapshotDataUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    onSnapshot?.(snapshotDataUrl);
  };

  // Xử lý tải video tệp lên từ máy để kiểm tra AI trực tiếp
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onChangeVideoSource?.(objectUrl);
    }
  };

  // Render SVG Bounding Box bám sát tỷ lệ khung hình
  const renderDetectionsSvg = () => {
    if (!showBbox || !currentEntry) return null;

    return (
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        preserveAspectRatio="none"
      >
        {currentEntry.detections.map((det, idx) => {
          const [x1, y1, x2, y2] = det.bbox;
          const width = Math.max(x2 - x1, 10);
          const height = Math.max(y2 - y1, 10);

          let strokeColor = "#10b981"; // Emerald
          let fillColor = "rgba(16, 185, 129, 0.12)";
          let isViolating = false;
          let isCandidate = false;

          if (det.class_name === "person") {
            const state = det.track_id ? personStates.get(det.track_id) : undefined;
            if (
              state?.status === "CONFIRMED_VIOLATION" ||
              state?.status === "VIOLATION"
            ) {
              strokeColor = "#f43f5e"; // Rose vi phạm
              fillColor = "rgba(244, 63, 94, 0.22)";
              isViolating = true;
            } else if (state?.status === "VIOLATION_CANDIDATE") {
              strokeColor = "#f59e0b"; // Amber đang đếm thời gian
              fillColor = "rgba(245, 158, 11, 0.18)";
              isCandidate = true;
            }
          } else if (det.class_name === "helmet") {
            strokeColor = "#3b82f6"; // Blue
            fillColor = "rgba(59, 130, 246, 0.12)";
          } else if (det.class_name === "safety_vest") {
            strokeColor = "#06b6d4"; // Cyan
            fillColor = "rgba(6, 182, 212, 0.12)";
          }

          const isPerson = det.class_name === "person";
          const isHelmet = det.class_name === "helmet";

          const labelText = isPerson
            ? `Worker #${det.track_id ?? "?"} ${
                isViolating
                  ? isVietnamese
                    ? "🚨 VI PHẠM (≥3s)"
                    : "🚨 VIOLATION (≥3s)"
                  : isCandidate
                    ? isVietnamese
                      ? "⚠ VI PHẠM?"
                      : "⚠ VIOLATION?"
                    : isVietnamese
                      ? "✓ ĐỦ PPE"
                      : "✓ COMPLIANT"
              }`
            : isHelmet
              ? `⛑ #${det.track_id ?? "?"}`
              : `🦺 #${det.track_id ?? "?"}`;

          const badgeWidth = isPerson
            ? isViolating
              ? isVertical ? 220 : 160
              : isCandidate
                ? isVertical ? 190 : 140
                : isVertical ? 180 : 130
            : isVertical ? 80 : 60;
          const badgeHeight = isPerson ? (isVertical ? 32 : 22) : (isVertical ? 24 : 16);
          const badgeY = isPerson
            ? Math.max(2, y1 - (isVertical ? 36 : 24))
            : Math.max(2, y1 - (isVertical ? 26 : 18));
          const textY = isPerson
            ? Math.max(20, y1 - (isVertical ? 14 : 8))
            : Math.max(16, y1 - (isVertical ? 8 : 5));

          return (
            <g key={`${det.class_name}-${det.track_id}-${idx}`}>
              <rect
                x={x1}
                y={y1}
                width={width}
                height={height}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isViolating ? 3.5 : isCandidate ? 2.5 : 2}
                rx={isPerson ? 6 : 3}
                className={isViolating ? "animate-pulse" : ""}
              />

              <rect
                x={x1}
                y={badgeY}
                width={badgeWidth}
                height={badgeHeight}
                fill={strokeColor}
                rx={4}
                opacity={0.94}
              />

              <text
                x={x1 + 6}
                y={textY}
                fill="#ffffff"
                fontSize={isPerson ? (isVertical ? 16 : 11) : (isVertical ? 13 : 9)}
                fontWeight="bold"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {labelText} ({(det.confidence * 100).toFixed(0)}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. KHUNG PHÁT VIDEO CHÍNH VỚI BOUNDING BOX THỜI GIAN THỰC ── */}
      <div className="relative overflow-hidden rounded-[24px] border border-border/40 bg-black/95 shadow-[0_2px_0_rgba(255,255,255,0.85)_inset,0_-1px_0_rgba(0,0,0,0.025)_inset,7px_9px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 z-30 h-px bg-white/40"
        />

        {/* Video Container với định dạng thích ứng thông minh (Shorts 9:16 Dọc hoặc Chuẩn 16:9 Ngang) */}
        <div
          className={`relative w-full overflow-hidden bg-black flex items-center justify-center ${
            isShorts ? "aspect-[9/16] max-h-[72vh] mx-auto max-w-[420px]" : "aspect-video"
          }`}
        >
          {youtubeEmbedUrl ? (
            /* Luồng YouTube (Video thông thường hoặc YouTube Shorts dọc) */
            <div className="relative h-full w-full">
              <iframe
                src={youtubeEmbedUrl}
                title={cameraName}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full object-cover border-0"
              />
              {renderDetectionsSvg()}
            </div>
          ) : isRtsp ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
              <div className="text-center font-mono text-xs text-white/50">
                <p>{isVietnamese ? "LUỒNG RTSP NỘI BỘ" : "INTERNAL RTSP STREAM"}</p>
                <p className="text-[10px] text-white/30">{videoSrc}</p>
              </div>
              {renderDetectionsSvg()}
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted
                className="h-full w-full object-contain"
                onClick={onTogglePlay}
              />
              {renderDetectionsSvg()}
            </div>
          )}

          {/* HUD Top Bar trên Video */}
          <div className="pointer-events-none absolute top-3 inset-x-3.5 z-20 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
            <div className="flex items-center gap-2 rounded-xl bg-black/65 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono font-bold tracking-wide">{cameraCode}</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80 line-clamp-1">{siteName}</span>
              {isShorts && (
                <span className="bg-rose-500/80 font-mono text-[9px] px-1.5 py-0.5 rounded text-white font-bold">
                  9:16 SHORTS
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-black/65 backdrop-blur-md px-3 py-1.5 border border-white/10 font-mono text-[11px] text-white/90 shadow-md">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span className="line-clamp-1">{activeModelName}</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-400 font-bold">24.6ms</span>
              </div>
            </div>
          </div>

          {/* HUD Bottom Bar trên Video */}
          <div className="pointer-events-none absolute bottom-3 inset-x-3.5 z-20 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-2 rounded-xl bg-black/65 backdrop-blur-md px-3 py-1.5 border border-white/10 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400">
                {isVietnamese ? "LUỒNG TRỰC TIẾP" : "LIVE FEED"}
              </span>
              <span className="text-white/40">•</span>
              <span>{isShorts ? "1080×1920 (9:16)" : "1920×1080 Full HD"}</span>
              <span className="text-white/40">•</span>
              <span>
                t = <strong>{currentTimeSec.toFixed(1)}s</strong> (F: {currentFrame})
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-black/65 backdrop-blur-md px-2.5 py-1.5 border border-white/10 text-[11px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Edge AI Engine Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. THANH ĐIỀU KHIỂN & BẬT TẮT LỚP PHỦ AI NEUMORPHIC ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border/40 bg-surface p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,4px_5px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="font-bold text-foreground text-xs">
              {isVietnamese
                ? "Giám Sát AI Trực Tiếp Trên Video Này (Live Stream AI Inspection)"
                : "Live AI Video Inspection"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isVietnamese
                ? "Mô hình AI kiểm tra phát hiện mũ bảo hộ & áo phản quang trực tiếp từ luồng video bên trên."
                : "AI model inspects hard hat & safety vest compliance directly on the active video stream above."}
            </p>
          </div>
        </div>

        {/* Nút điều khiển AI & Đổi nguồn video */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Tạm dừng / Tiếp tục AI */}
          <Button
            variant={isPlaying ? "outline" : "primary"}
            size="sm"
            onClick={onTogglePlay}
            className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-primary" />
            )}
            <span>
              {isPlaying
                ? isVietnamese ? "Tạm dừng AI" : "Pause AI"
                : isVietnamese ? "Chạy AI" : "Run AI"}
            </span>
          </Button>

          {/* Nút Bật/Tắt Bbox */}
          <Button
            variant={showBbox ? "primary" : "outline"}
            size="sm"
            onClick={onToggleBbox}
            className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
          >
            {showBbox ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>
              {showBbox
                ? isVietnamese ? "AI Bbox: Bật" : "AI Bbox: On"
                : isVietnamese ? "AI Bbox: Tắt" : "AI Bbox: Off"}
            </span>
          </Button>

          {/* Nút Cấu hình & Tinh chỉnh AI (Mở AI Inspection Modal) */}
          {onOpenAiModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiModal}
              className="gap-1.5 text-xs h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
              title={isVietnamese ? "Cấu hình tham số AI cho video này" : "Tune AI parameters for this video"}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Cấu hình AI" : "AI Config"}</span>
            </Button>
          )}

          {/* Nút Chụp ảnh Snapshot thực tế */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureSnapshot}
            className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            title={isVietnamese ? "Chụp ảnh snapshot bằng chứng từ khung hình hiện tại" : "Capture snapshot from current frame"}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Chụp Snapshot" : "Capture Snapshot"}</span>
          </Button>

          {/* Nút Tải video khác lên để kiểm tra */}
          {onChangeVideoSource && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs h-9 rounded-xl text-muted-foreground hover:text-foreground"
                title={isVietnamese ? "Tải video file MP4 lên để AI kiểm tra" : "Upload MP4 video to inspect"}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Tải video lên" : "Upload Video"}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
