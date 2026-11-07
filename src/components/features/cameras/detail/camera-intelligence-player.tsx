"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  Cpu,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Scan,
  Sliders,
  Sparkles,
  Zap,
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
  isRealAiLog?: boolean;
  autoAnalysisState?: {
    status: "idle" | "initializing" | "downloading" | "processing" | "completed" | "error";
    progress: number;
    message?: string;
  };
  onStartAutoAnalyze?: () => void;
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
  siteName,
  activeModelName = "YOLOv11s-PPE (best.pt)",
  cameraStatus = "ONLINE",
  currentFps,
  currentLatencyMs,
  cameraLocation,
  cameraStreamUrl,
  isRealAiLog = false,
  autoAnalysisState,
  onStartAutoAnalyze,
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

  const { embedUrl: youtubeEmbedUrl, isShorts, youtubeId } = getYouTubeEmbedUrl(videoSrc);
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

  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);

  // Kích thước chuẩn hoá theo tỷ lệ nguồn thực tế từ AI Server hoặc Video Element
  // Ưu tiên 1: Kích thước từ file log AI thật (isRealAiLog && streamMetadata)
  // Ưu tiên 2: Kích thước đo trực tiếp từ thẻ video (videoDimensions)
  // Ưu tiên 3: streamMetadata
  const isVertical = videoDimensions
    ? videoDimensions.height > videoDimensions.width
    : (streamMetadata?.isVertical ?? isShorts);

  const viewBoxWidth = isRealAiLog && streamMetadata?.videoWidth
    ? streamMetadata.videoWidth
    : videoDimensions?.width || streamMetadata?.videoWidth || (isVertical ? 720 : 1280);

  const viewBoxHeight = isRealAiLog && streamMetadata?.videoHeight
    ? streamMetadata.videoHeight
    : videoDimensions?.height || streamMetadata?.videoHeight || (isVertical ? 1280 : 720);

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

  // Tự động bỏ qua lớp phủ buffering nếu sau 2.5s để người dùng xem video ngay
  const [forceStreamReady, setForceStreamReady] = useState(false);
  useEffect(() => {
    if (!liveSessionId) {
      setForceStreamReady(false);
      return;
    }
    const timer = setTimeout(() => {
      setForceStreamReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [liveSessionId]);

  const isBuffering =
    Boolean(liveSessionId) &&
    !isWebcam &&
    !forceStreamReady &&
    (liveSessionStatus === "initializing" || liveSessionStatus === "buffering") &&
    bufferedFramesCount < 2;

  const mjpegStreamUrl =
    liveSessionId && !isWebcam
      ? `${AI_SERVER_BASE}/api/live/${liveSessionId}/stream.mjpeg?bbox=${showBbox ? 1 : 0}&src=${encodeURIComponent(videoSrc)}`
      : null;

  // Bản đồ trạng thái công nhân trong khung hình
  const personStates = useMemo(() => {
    return new Map((currentEntry?.persons || []).map((p) => [p.track_id, p]));
  }, [currentEntry?.persons]);

  // Lớp phủ Bounding Box SVG thời gian thực chuẩn HUD AI Công nghệ cao & Đẳng cấp
  const renderDetectionsSvg = () => {
    if (!showBbox || !currentEntry?.detections || currentEntry.detections.length === 0) {
      return null;
    }

    // Tỉ lệ scale chuẩn xác theo độ phân giải viewBox thực tế
    const scale = Math.max(0.65, Math.min(1.4, viewBoxWidth / 1280));
    const fontSize = Math.max(11, Math.min(16, Math.round(12.5 * scale)));
    const badgeHeight = Math.max(22, Math.round(fontSize * 1.75));
    const baseStrokeW = Math.max(1.2, 1.5 * scale);
    const cornerStrokeW = Math.max(2.6, 3.2 * scale);

    return (
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full z-15"
      >
        <defs>
          {/* Bộ lọc Neon Glow HUD cho các trạng thái phát hiện */}
          <filter id="hud-glow-rose" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f43f5e" floodOpacity="0.85" />
          </filter>
          <filter id="hud-glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.75" />
          </filter>
          <filter id="hud-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#10b981" floodOpacity="0.65" />
          </filter>
          <filter id="hud-glow-sky" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0ea5e9" floodOpacity="0.65" />
          </filter>
          <filter id="hud-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#a855f7" floodOpacity="0.65" />
          </filter>

          {/* Dải màu chuyển tiếp bán trong suốt thanh lịch (Không làm đục hay che khuất người) */}
          <linearGradient id="hud-grad-rose" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hud-grad-amber" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="hud-grad-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="hud-grad-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="hud-grad-purple" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {currentEntry.detections.map((det, idx) => {
          const [x1, y1, x2, y2] = det.bbox;
          const w = Math.max(6, x2 - x1);
          const h = Math.max(6, y2 - y1);

          const personState =
            det.class_name === "person" && typeof det.track_id === "number"
              ? personStates.get(det.track_id)
              : undefined;

          const isViolating =
            personState?.status === "CONFIRMED_VIOLATION" || personState?.status === "VIOLATION";
          const isCandidate = personState?.status === "VIOLATION_CANDIDATE";

          // Nếu video đã vẽ sẵn box cơ bản (-annotated.mp4) thì chỉ vẽ đè lớp phủ ĐỎ VI PHẠM
          if (isPreRenderedJobVideo && !isViolating) {
            return null;
          }

          let themeKey = "emerald";
          let strokeColor = "#10b981"; // Emerald
          let mainBadgeText = "";
          let confText = `${Math.round((det.confidence || 0.95) * 100)}%`;

          if (det.class_name === "person") {
            if (isViolating) {
              themeKey = "rose";
              strokeColor = "#f43f5e"; // Rose
              const vTypes = (personState?.violations || [])
                .map((v) => {
                  const lower = v.toLowerCase();
                  if (lower === "no_helmet") return isVietnamese ? "THIẾU MŨ" : "NO HELMET";
                  if (lower === "no_safety_vest" || lower === "no_vest") return isVietnamese ? "THIẾU ÁO" : "NO VEST";
                  if (lower === "restricted_area") return isVietnamese ? "VÙNG CẤM" : "RESTRICTED";
                  return v.toUpperCase();
                })
                .join(" + ");
              mainBadgeText = `WORKER #${det.track_id ?? 1} • ${isVietnamese ? "VI PHẠM (≥3s)" : "VIOLATION (≥3s)"}${vTypes ? `: ${vTypes}` : ""}`;
            } else if (isCandidate) {
              themeKey = "amber";
              strokeColor = "#f59e0b"; // Amber
              const vTypes = (personState?.violations || [])
                .map((v) => {
                  const lower = v.toLowerCase();
                  if (lower === "no_helmet") return isVietnamese ? "THIẾU MŨ" : "NO HELMET";
                  if (lower === "no_safety_vest" || lower === "no_vest") return isVietnamese ? "THIẾU ÁO" : "NO VEST";
                  if (lower === "restricted_area") return isVietnamese ? "VÙNG CẤM" : "RESTRICTED";
                  return v.toUpperCase();
                })
                .join(" + ");
              mainBadgeText = `WORKER #${det.track_id ?? 1} • ${isVietnamese ? "ĐANG ĐẾM (3s)" : "EVALUATING (3s)"}${vTypes ? `: ${vTypes}` : ""}`;
            } else {
              themeKey = "emerald";
              strokeColor = "#10b981";
              mainBadgeText = `WORKER #${det.track_id ?? 1} • ${isVietnamese ? "ĐỦ BẢO HỘ" : "PPE COMPLIANT"}`;
            }
          } else if (det.class_name === "helmet") {
            themeKey = "sky";
            strokeColor = "#0ea5e9";
            mainBadgeText = `#${det.track_id ?? 1} ${isVietnamese ? "MŨ BẢO HỘ" : "HARD HAT"}`;
          } else if (det.class_name === "safety_vest") {
            themeKey = "purple";
            strokeColor = "#a855f7";
            mainBadgeText = `#${det.track_id ?? 1} ${isVietnamese ? "ÁO PHẢN QUANG" : "SAFETY VEST"}`;
          } else {
            themeKey = "emerald";
            strokeColor = "#06b6d4";
            mainBadgeText = det.class_name.toUpperCase();
          }

          // Chiều dài và vị trí thước ngắm HUD 4 góc (L-shaped Reticles)
          const cornerLen = Math.max(6, Math.min(24, Math.round(Math.min(w, h) * 0.22)));

          // Kích thước chuẩn badge hiển thị trên đầu Bounding Box
          const charWidth = fontSize * 0.60;
          const mainTextWidth = mainBadgeText.length * charWidth;
          const confChipWidth = confText ? Math.max(28, confText.length * (fontSize * 0.55) + 8) : 0;
          const badgeWidth = Math.round(24 + mainTextWidth + (confChipWidth ? confChipWidth + 8 : 4));

          // Đảm bảo nhãn không tràn ra khỏi 4 cạnh khung hình video
          const pillY = y1 >= badgeHeight + 6 ? y1 - badgeHeight - 4 : y1 + 4;
          const pillX = Math.max(4, Math.min(viewBoxWidth - badgeWidth - 4, x1));

          return (
            <g key={`${det.class_name}-${det.track_id ?? idx}-${idx}`}>
              {/* 1. Khung nền gradient bán trong suốt & Viền mảnh thanh lịch */}
              <rect
                x={x1}
                y={y1}
                width={w}
                height={h}
                fill={`url(#hud-grad-${themeKey})`}
                stroke={strokeColor}
                strokeWidth={baseStrokeW}
                strokeOpacity={0.6}
                strokeDasharray={isCandidate ? "4 3" : undefined}
                rx={4}
              />

              {/* 2. Thước ngắm HUD 4 góc (High-Tech Laser L-Brackets) */}
              {/* Góc Trên-Trái */}
              <path
                d={`M ${x1} ${y1 + cornerLen} L ${x1} ${y1} L ${x1 + cornerLen} ${y1}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={cornerStrokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#hud-glow-${themeKey})`}
              />
              {/* Góc Trên-Phải */}
              <path
                d={`M ${x2 - cornerLen} ${y1} L ${x2} ${y1} L ${x2} ${y1 + cornerLen}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={cornerStrokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#hud-glow-${themeKey})`}
              />
              {/* Góc Dưới-Trái */}
              <path
                d={`M ${x1} ${y2 - cornerLen} L ${x1} ${y2} L ${x1 + cornerLen} ${y2}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={cornerStrokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#hud-glow-${themeKey})`}
              />
              {/* Góc Dưới-Phải */}
              <path
                d={`M ${x2 - cornerLen} ${y2} L ${x2} ${y2} L ${x2} ${y2 - cornerLen}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={cornerStrokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#hud-glow-${themeKey})`}
              />

              {/* 3. Tia quét Laser AI & Hồng tâm định vị (Chỉ hiển thị khi vi phạm) */}
              {isViolating && (
                <>
                  <line
                    x1={x1 + 3}
                    y1={y1 + h * 0.28}
                    x2={x2 - 3}
                    y2={y1 + h * 0.28}
                    stroke="#f43f5e"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.8}
                    className="animate-pulse"
                  />
                  {/* Tâm chữ thập micro (+) ở trung tâm đối tượng vi phạm */}
                  <g opacity={0.65}>
                    <line
                      x1={x1 + w / 2 - 5}
                      y1={y1 + h / 2}
                      x2={x1 + w / 2 + 5}
                      y2={y1 + h / 2}
                      stroke="#f43f5e"
                      strokeWidth={1}
                    />
                    <line
                      x1={x1 + w / 2}
                      y1={y1 + h / 2 - 5}
                      x2={x1 + w / 2}
                      y2={y1 + h / 2 + 5}
                      stroke="#f43f5e"
                      strokeWidth={1}
                    />
                  </g>
                </>
              )}

              {/* 4. Thẻ nhãn AI HUD thông minh (Glassmorphic Cyber Card) */}
              <g filter={`url(#hud-glow-${themeKey})`}>
                {/* Thân card nền đen kính mờ với viền phát sáng */}
                <rect
                  x={pillX}
                  y={pillY}
                  width={badgeWidth}
                  height={badgeHeight}
                  fill="rgba(10, 15, 29, 0.92)"
                  stroke={strokeColor}
                  strokeWidth={1.2}
                  rx={4}
                />

                {/* Đèn LED trạng thái thời gian thực (Status Pip) */}
                <circle
                  cx={pillX + 9}
                  cy={pillY + badgeHeight / 2}
                  r={3.2}
                  fill={strokeColor}
                />
                {isViolating && (
                  <circle
                    cx={pillX + 9}
                    cy={pillY + badgeHeight / 2}
                    r={5.5}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                    opacity={0.8}
                    className="animate-ping"
                  />
                )}

                {/* Nhãn chữ chính nét sắc sảo, công nghệ cao */}
                <text
                  x={pillX + 18}
                  y={pillY + badgeHeight / 2 + fontSize * 0.35}
                  fill="#ffffff"
                  fontSize={fontSize}
                  fontWeight="700"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  letterSpacing="0.25px"
                >
                  {mainBadgeText}
                </text>

                {/* Chip hiển thị độ tin cậy AI (%) */}
                {confText && (
                  <g>
                    <rect
                      x={pillX + badgeWidth - confChipWidth - 4}
                      y={pillY + 3}
                      width={confChipWidth}
                      height={badgeHeight - 6}
                      fill="rgba(255, 255, 255, 0.12)"
                      rx={3}
                    />
                    <text
                      x={pillX + badgeWidth - confChipWidth / 2 - 4}
                      y={pillY + badgeHeight / 2 + (fontSize - 2) * 0.35}
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize={Math.max(9, fontSize - 2)}
                      fontWeight="800"
                      fontFamily="ui-monospace, monospace"
                    >
                      {confText}
                    </text>
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    );
  };

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
                  onError={(e) => {
                    const img = e.currentTarget;
                    setTimeout(() => {
                      if (img && mjpegStreamUrl) {
                        img.src = `${mjpegStreamUrl}&t=${Date.now()}`;
                      }
                    }, 1000);
                  }}
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
            ) : youtubeEmbedUrl ? (
              /* CHẾ ĐỘ 3: YOUTUBE EMBED (SHORTS / VIDEO LIVE) */
              <div className="relative h-full w-full flex items-center justify-center bg-neutral-950">
                <iframe
                  src={youtubeEmbedUrl}
                  title={cameraName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full object-cover border-0"
                />
                {renderDetectionsSvg()}
              </div>
            ) : (
              /* CHẾ ĐỘ 4: VIDEO ĐÃ XỬ LÝ SẴN HOẶC VIDEO HTML5 NATIVE */
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
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) {
                      setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
                    }
                  }}
                  onPlay={() => onSyncPlaying?.(true)}
                  onPause={() => onSyncPlaying?.(false)}
                  onTimeUpdate={(e) => onSyncTime?.(e.currentTarget.currentTime)}
                />
                {renderDetectionsSvg()}
              </div>
            )}

            {/* Nút thoát toàn màn hình góc trên-phải khi đang ở chế độ Fullscreen */}
            {isFullscreen && (
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="absolute top-3.5 right-3.5 z-30 flex items-center gap-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 text-white px-3 py-1.5 text-xs font-semibold backdrop-blur-md border border-white/20 transition-all shadow-lg"
                title={isVietnamese ? "Thoát toàn màn hình (Esc)" : "Exit Fullscreen (Esc)"}
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Thu nhỏ" : "Exit"}</span>
              </button>
            )}
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

            {/* 5. Nút Kích hoạt phân tích AI thật nếu chưa có log */}
            {/* Nút Kết nối / Khởi động lại Luồng Live AI */}
            {onStartAutoAnalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartAutoAnalyze}
                className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl border-primary/50 text-primary hover:bg-primary/10 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all"
                title={isVietnamese ? "Làm mới / Khởi động lại luồng Live AI" : "Refresh Live AI Stream"}
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>
                  {isVietnamese ? "Làm mới Live AI" : "Refresh Live AI"}
                </span>
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

      {/* ── 3. CARD THÔNG SỐ VẬN HÀNH & CHỈ SỐ LUỒNG AI (TÁCH KHỎI MÀN HÌNH CAMERA) ── */}
      <div className="flex flex-col gap-3.5 rounded-[24px] bg-card/40 dark:bg-card/30 p-4 sm:p-5 border border-border/60 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] transition-all">
        {/* Header của Card */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_3px_var(--shadow-dark),inset_-1px_-1px_3px_var(--shadow-light)] border border-primary/20">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                {isVietnamese ? "Thông số Giám sát & Luồng AI" : "Camera Telemetry & AI Stream"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isVietnamese
                  ? "Dữ liệu vận hành thời gian thực từ camera & mô hình AI"
                  : "Real-time operational telemetry from camera & AI model"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              size="sm"
              className={`gap-1.5 font-mono text-[11px] py-0.5 ${
                isOnline
                  ? "text-success border-success/30 bg-success/10"
                  : "text-danger border-danger/30 bg-danger/10"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-success animate-pulse" : "bg-danger"
                }`}
              />
              <span>{isOnline ? (isVietnamese ? "TRỰC TUYẾN" : "ONLINE") : (isVietnamese ? "MẤT KẾT NỐI" : "OFFLINE")}</span>
            </Badge>

            <Badge
              variant="outline"
              size="sm"
              className={`gap-1.5 font-mono text-[11px] py-0.5 ${
                isPlaying
                  ? "text-danger border-danger/30 bg-danger/10"
                  : "text-warning border-warning/30 bg-warning/10"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPlaying ? "bg-danger animate-pulse" : "bg-warning"
                }`}
              />
              <span>{isPlaying ? (isVietnamese ? "LUỒNG TRỰC TIẾP" : "LIVE STREAM") : (isVietnamese ? "TẠM DỪNG" : "PAUSED")}</span>
            </Badge>
          </div>
        </div>

        {/* Lưới 4 ô thông số chi tiết */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô 1: Camera & Vị trí */}
          <div className="flex flex-col justify-between gap-2.5 rounded-2xl p-3 bg-background/50 border border-border/50 shadow-[inset_1.5px_1.5px_4px_var(--shadow-dark),inset_-1.5px_-1.5px_4px_var(--shadow-light)]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {isVietnamese ? "Camera & Vị trí" : "Camera & Location"}
              </span>
              <Camera className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Badge variant="primary" size="sm" shape="rounded" className="font-mono font-bold text-[11px] py-0">
                  {cameraCode}
                </Badge>
                <span className="font-semibold text-xs text-foreground line-clamp-1">{cameraName}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                <span className="line-clamp-1">
                  {cameraLocation || siteName || (isVietnamese ? "Khu vực chung" : "General Zone")}
                </span>
              </div>
            </div>
          </div>

          {/* Ô 2: Mô hình AI & Hiệu năng */}
          <div className="flex flex-col justify-between gap-2.5 rounded-2xl p-3 bg-background/50 border border-border/50 shadow-[inset_1.5px_1.5px_4px_var(--shadow-dark),inset_-1.5px_-1.5px_4px_var(--shadow-light)]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {isVietnamese ? "Mô hình AI & Tốc độ" : "AI Model & Engine"}
              </span>
              <Cpu className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-foreground line-clamp-1" title={activeModelName}>
                  {activeModelName}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono">
                <span className="inline-flex items-center gap-1 text-success font-semibold bg-success/10 border border-success/30 px-1.5 py-0.5 rounded">
                  <Zap className="h-2.5 w-2.5" />
                  {displayLatency}
                </span>
                <span className="inline-flex items-center gap-1 text-info font-semibold bg-info/10 border border-info/30 px-1.5 py-0.5 rounded">
                  <Activity className="h-2.5 w-2.5" />
                  {displayFps} FPS
                </span>
              </div>
            </div>
          </div>

          {/* Ô 3: Độ phân giải & Thời gian */}
          <div className="flex flex-col justify-between gap-2.5 rounded-2xl p-3 bg-background/50 border border-border/50 shadow-[inset_1.5px_1.5px_4px_var(--shadow-dark),inset_-1.5px_-1.5px_4px_var(--shadow-light)]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {isVietnamese ? "Độ phân giải & Thời gian" : "Resolution & Timeline"}
              </span>
              <Scan className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-foreground">
                  {viewBoxWidth} × {viewBoxHeight}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">px</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <span>
                  t = <strong className="text-foreground">{currentTimeSec.toFixed(1)}s</strong>
                </span>
                <span className="text-border">•</span>
                <span>
                  F: <strong className="text-primary font-bold">#{currentFrame}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Ô 4: Trạng thái Bộ đệm AI */}
          <div className="flex flex-col justify-between gap-2.5 rounded-2xl p-3 bg-background/50 border border-border/50 shadow-[inset_1.5px_1.5px_4px_var(--shadow-dark),inset_-1.5px_-1.5px_4px_var(--shadow-light)]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {isVietnamese ? "Trạng thái Bộ đệm" : "Buffer Lock State"}
              </span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded-lg line-clamp-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
                  <span className="line-clamp-1">
                    {loopCached
                      ? "Buffer Locked (100% Cached)"
                      : isWebcam
                        ? "Webcam Frame-Locked"
                        : `Pre-Buffer Active (${bufferedFramesCount}f)`}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-muted-foreground line-clamp-1">
                {loopCached ? (
                  <span className="text-success font-medium">
                    {isVietnamese ? "Đã khóa 100% đệm video" : "Zero-lag cached feed"}
                  </span>
                ) : isWebcam ? (
                  <span className="text-muted-foreground">
                    {isVietnamese ? "Đồng bộ webcam trực tiếp" : "Direct hardware sync"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {isVietnamese ? "Đồng bộ chống rung lag AI" : "Look-ahead drift lock"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
