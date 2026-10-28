"use client";

import { useEffect, useState } from "react";
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
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FrameLogEntry } from "./types";

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1]
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=1&loop=1&playlist=${match[1]}&enablejsapi=1`
    : null;
}

export interface CameraIntelligencePlayerProps {
  videoSrc: string;
  currentEntry: FrameLogEntry | null;
  isPlaying: boolean;
  showBbox: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onToggleBbox: () => void;
  onSnapshot?: () => void;
  cameraName?: string;
  cameraCode?: string;
  siteName?: string;
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
  cameraName = "Camera Giám Sát",
  cameraCode = "CAM-01",
  siteName = "Công Trường Xây Dựng",
}: CameraIntelligencePlayerProps) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoSrc);
  const isWebcam = videoSrc.toLowerCase().includes("webcam");
  const isRtsp = videoSrc.startsWith("rtsp://");

  // Webcam stream lifecycle
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

  // Chuẩn độ phân giải 16:9 Full HD (1920x1080)
  const videoWidth = 1920;
  const videoHeight = 1080;
  const currentTimeSec = currentEntry?.t ?? 0;
  const currentFrame = currentEntry?.frame ?? 1;

  // Bản đồ trạng thái công nhân trong khung hình
  const personStates = new Map(
    (currentEntry?.persons || []).map((p) => [p.track_id, p])
  );

  const renderDetectionsSvg = (preserveAspect: string = "none") => {
    if (!showBbox || !currentEntry) return null;
    return (
      <svg
        viewBox={`0 0 ${videoWidth} ${videoHeight}`}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        preserveAspectRatio={preserveAspect}
      >
        {currentEntry.detections.map((det, idx) => {
          const [x1, y1, x2, y2] = det.bbox;
          const width = Math.max(x2 - x1, 10);
          const height = Math.max(y2 - y1, 10);

          let strokeColor = "#10b981"; // Emerald chuẩn mặc định
          let fillColor = "rgba(16, 185, 129, 0.12)";
          let isViolating = false;
          let isCandidate = false;

          if (det.class_name === "person") {
            const state = det.track_id ? personStates.get(det.track_id) : undefined;
            if (
              state?.status === "CONFIRMED_VIOLATION" ||
              state?.status === "VIOLATION"
            ) {
              strokeColor = "#f43f5e"; // Rose vi phạm xác nhận
              fillColor = "rgba(244, 63, 94, 0.22)";
              isViolating = true;
            } else if (state?.status === "VIOLATION_CANDIDATE") {
              strokeColor = "#f59e0b"; // Amber đang đếm thời gian
              fillColor = "rgba(245, 158, 11, 0.18)";
              isCandidate = true;
            }
          } else if (det.class_name === "helmet") {
            strokeColor = "#3b82f6"; // Primary blue
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
                  ? "🚨 VI PHẠM (≥3s)"
                  : isCandidate
                    ? "⚠ VI PHẠM?"
                    : "✓ ĐỦ PPE"
              }`
            : isHelmet
              ? `⛑ #${det.track_id ?? "?"}`
              : `🦺 #${det.track_id ?? "?"}`;

          const badgeWidth = isPerson ? (isViolating ? 150 : isCandidate ? 135 : 120) : 52;
          const badgeHeight = isPerson ? 20 : 15;
          const badgeY = isPerson ? Math.max(2, y1 - 22) : Math.max(2, y1 - 16);
          const textY = isPerson ? Math.max(15, y1 - 7) : Math.max(12, y1 - 5);

          return (
            <g key={`${det.class_name}-${det.track_id}-${idx}`}>
              {/* Bounding Box với hiệu ứng cảnh báo khi vi phạm */}
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

              {/* Badge nền nhãn đối tượng */}
              <rect
                x={x1}
                y={badgeY}
                width={badgeWidth}
                height={badgeHeight}
                fill={strokeColor}
                rx={4}
                opacity={0.94}
              />

              {/* Chữ nhãn hiển thị thông số */}
              <text
                x={x1 + 5}
                y={textY}
                fill="#ffffff"
                fontSize={isPerson ? 10.5 : 9}
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
        {/* Top edge highlight reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 z-30 h-px bg-white/40"
        />

        {/* Video & Canvas Wrapper */}
        <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
          {youtubeEmbedUrl ? (
            /* Luồng YouTube trực tiếp kèm lớp phủ Bounding Box thời gian thực */
            <div className="relative h-full w-full">
              <iframe
                src={youtubeEmbedUrl}
                title={cameraName}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full object-cover border-0"
              />
              {renderDetectionsSvg("none")}
            </div>
          ) : isRtsp ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20" />
              <div className="text-center font-mono text-xs text-white/50">
                <p>LUỒNG RTSP NỘI BỘ</p>
                <p className="text-[10px] text-white/30">{videoSrc}</p>
              </div>
              {renderDetectionsSvg("none")}
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted
                className="h-full w-full object-cover"
                onClick={onTogglePlay}
              />
              {renderDetectionsSvg("none")}
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
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-black/65 backdrop-blur-md px-3 py-1.5 border border-white/10 font-mono text-[11px] text-white/90 shadow-md">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>YOLOv11s-PPE (best.pt)</span>
                <span className="text-white/40">•</span>
                <span>25.0 FPS</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-400 font-bold">24.6ms</span>
              </div>
            </div>
          </div>

          {/* HUD Bottom Bar trên Video */}
          <div className="pointer-events-none absolute bottom-3 inset-x-3.5 z-20 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-2 rounded-xl bg-black/65 backdrop-blur-md px-3 py-1.5 border border-white/10 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400">LUỒNG TRỰC TIẾP</span>
              <span className="text-white/40">•</span>
              <span>1080p Full HD</span>
              <span className="text-white/40">•</span>
              <span>
                t = <strong>{currentTimeSec.toFixed(1)}s</strong> (F: {currentFrame})
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-black/65 backdrop-blur-md px-2.5 py-1.5 border border-white/10 text-[11px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Realtime AI Engine Active</span>
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
              Giám Sát Camera Trực Tiếp Thời Gian Thực (Live Edge AI)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Phát hiện công nhân, mũ bảo hộ & áo phản quang theo thời gian thực. Xác nhận vi phạm khi thiếu bảo hộ liên tục ≥ 3.0s (VI-06).
            </p>
          </div>
        </div>

        {/* Nút điều khiển AI */}
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? "outline" : "primary"}
            size="sm"
            onClick={onTogglePlay}
            className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
            title={isPlaying ? "Tạm dừng xử lý AI" : "Tiếp tục chạy AI"}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-primary" />
            )}
            <span>{isPlaying ? "Tạm dừng AI" : "Chạy AI"}</span>
          </Button>

          <Button
            variant={showBbox ? "primary" : "outline"}
            size="sm"
            onClick={onToggleBbox}
            className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
          >
            {showBbox ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>{showBbox ? "AI Bbox: Bật" : "AI Bbox: Tắt"}</span>
          </Button>

          {onSnapshot && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSnapshot}
              className="gap-1.5 text-xs h-9 rounded-xl shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
              title="Chụp ảnh snapshot bằng chứng ngay lập tức"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Chụp Snapshot</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
