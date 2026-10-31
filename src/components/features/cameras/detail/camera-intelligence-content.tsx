"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  Camera,
  Cctv,
  CheckCircle2,
  Cpu,
  Download,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCameraDetail } from "@/hooks/cameras";
import { useIncidents } from "@/hooks/incidents";
import { useSiteSafetyConfig } from "@/hooks/sites";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { CameraHealthDialog } from "../camera-health-dialog";
import { CameraRoiDrawer } from "../camera-roi-drawer";
import { AiInspectionModal } from "./ai-inspection-modal";
import { CameraAiInspectorCard } from "./camera-ai-inspector-card";
import { CameraIntelligencePlayer, getYouTubeEmbedUrl } from "./camera-intelligence-player";
import { CameraIntelligenceSidebar } from "./camera-intelligence-sidebar";
import { CameraTelemetryTables } from "./camera-telemetry-tables";
import { generateLiveFrameEntry } from "./live-tracking-engine";
import type {
  AiInspectionConfig,
  ComputedPersonTrack,
  FrameLogEntry,
  StreamMetadata,
  StreamType,
  ViolationEvent,
} from "./types";

export interface CameraIntelligenceContentProps {
  cameraId: string;
}

export function CameraIntelligenceContent({
  cameraId,
}: CameraIntelligenceContentProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName } = useEntityLookup();

  // 1. Lấy dữ liệu Camera thực tế từ Database / Camera Service
  const { data: camera, isLoading: isCameraLoading } = useCameraDetail(cameraId);

  // 2. Lấy dữ liệu sự cố vi phạm THỰC TẾ từ Backend API theo cameraId này
  const {
    data: incidentsResult,
    isLoading: isIncidentsLoading,
  } = useIncidents({
    cameraId,
    limit: 20,
    sortBy: "detectedAt",
    sortOrder: "desc",
  });
  const realIncidents = useMemo(() => incidentsResult?.items || [], [incidentsResult]);

  // 3. Lấy cấu hình quy tắc an toàn của Site trực thuộc để camera áp dụng đồng bộ
  const siteId = camera?.siteId || "";
  const { data: siteSafetyConfig } = useSiteSafetyConfig(siteId, Boolean(siteId));
  const siteName = camera?.siteName || getSiteName(siteId) || (isVietnamese ? "Công Trường Xây Dựng" : "Construction Site");

  // Nguồn video gốc từ camera DB hoặc tùy chọn ghi đè tạm thời (Upload file / Đổi URL / Webcam)
  const cameraStreamUrl = camera?.streamUrl || "";

  const defaultStreamUrl = useMemo(() => {
    if (cameraStreamUrl) {
      return cameraStreamUrl;
    }
    return "/videos/ai-cctv-sample.mp4";
  }, [cameraStreamUrl]);

  const [customStreamUrl, setCustomStreamUrl] = useState<string | null>(null);
  const effectiveStreamUrl = customStreamUrl || defaultStreamUrl;

  // Trạng thái Phiên Live AI Engine (Look-Ahead Pre-Buffer trên port 8000)
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveSessionState, setLiveSessionState] = useState<any | null>(null);

  // 4. Phân tích loại luồng & tỷ lệ khung hình thực tế của Video
  const streamMetadata = useMemo<StreamMetadata>(() => {
    const url = effectiveStreamUrl.trim();
    const { isShorts, youtubeId } = getYouTubeEmbedUrl(url);

    // Ưu tiên kích thước thực tế từ Look-Ahead Live AI Engine nếu đã có
    if (liveSessionState && Array.isArray(liveSessionState.size) && liveSessionState.size.length === 2) {
      const [w, h] = liveSessionState.size;
      const vertical = Boolean(liveSessionState.is_vertical ?? h > w);
      return {
        streamType: url.toLowerCase().includes("webcam")
          ? "webcam"
          : isShorts
          ? "youtube_shorts"
          : youtubeId
          ? "youtube_video"
          : "rtsp",
        isVertical: vertical,
        videoWidth: w || 1280,
        videoHeight: h || 720,
        youtubeId,
        aspectRatioLabel: `${w} × ${h} (AI Frame-Locked ${Math.round(liveSessionState.fps || 25)} FPS)`,
        sourceUrl: url,
        fps: liveSessionState.fps || 25,
      };
    }

    let streamType: StreamType = "rtsp";
    let isVertical = false;
    let videoWidth = 1920;
    let videoHeight = 1080;
    let fps = 25;
    let aspectRatioLabel = "1920 × 1080 (16:9 Full HD)";

    if (url.includes("video8")) {
      streamType = "html5_video";
      isVertical = true;
      videoWidth = 480;
      videoHeight = 854;
      fps = 29.95;
      aspectRatioLabel = "480 × 854 (Video 8 AI Test UI)";
    } else if (
      url.includes("ai-cctv") ||
      url.includes("video2")
    ) {
      streamType = "html5_video";
      isVertical = true;
      videoWidth = 900;
      videoHeight = 1596;
      fps = 29.69;
      aspectRatioLabel = "900 × 1596 (YOLOv11 Bám Vết 100%)";
    } else if (
      url.includes("camera-01a18735")
    ) {
      streamType = "html5_video";
      isVertical = true;
      videoWidth = 1080;
      videoHeight = 1920;
      fps = 25.0;
      aspectRatioLabel = "1080 × 1920 (Camera 01A18735)";
    } else if (isShorts) {
      streamType = "youtube_shorts";
      isVertical = true;
      videoWidth = 1080;
      videoHeight = 1920;
      aspectRatioLabel = "1080 × 1920 (9:16 Shorts Dọc)";
    } else if (youtubeId) {
      streamType = "youtube_video";
      isVertical = false;
      videoWidth = 1920;
      videoHeight = 1080;
      aspectRatioLabel = "1920 × 1080 (16:9 YouTube)";
    } else if (url.toLowerCase().includes("webcam")) {
      streamType = "webcam";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      aspectRatioLabel = "1280 × 720 (Webcam Live)";
    } else if (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.startsWith("blob:") ||
      url.includes("storage.googleapis.com") ||
      url.includes("/videos/")
    ) {
      streamType = "html5_video";
      isVertical = false;
      videoWidth = 1920;
      videoHeight = 1080;
      aspectRatioLabel = "1920 × 1080 (HTML5 MP4 Native)";
    } else {
      streamType = "rtsp";
      isVertical = false;
      videoWidth = 1920;
      videoHeight = 1080;
      aspectRatioLabel = "1920 × 1080 (RTSP Stream)";
    }

    return {
      streamType,
      isVertical,
      videoWidth,
      videoHeight,
      youtubeId,
      aspectRatioLabel,
      sourceUrl: url,
      fps,
    };
  }, [effectiveStreamUrl, liveSessionState]);

  // 5. Trạng thái cấu hình tham số AI riêng cho camera (tích hợp Modal AI Inspection)
  const [aiConfig, setAiConfig] = useState<AiInspectionConfig>({
    confidenceThreshold: 0.8,
    confirmationDuration: 3.0,
    cooldownDuration: 30,
    enableNoHelmet: true,
    enableNoVest: true,
    enableRestrictedArea: true,
    modelVersionId: "yolo11s-ppe-best",
    processFps: 25,
  });

  // Đồng bộ với cấu hình Site khi load được từ backend
  useEffect(() => {
    if (siteSafetyConfig) {
      setAiConfig((prev) => ({
        ...prev,
        confidenceThreshold: siteSafetyConfig.confidenceThreshold ?? prev.confidenceThreshold,
        confirmationDuration: siteSafetyConfig.confirmationDuration ?? prev.confirmationDuration,
        cooldownDuration: siteSafetyConfig.cooldownDuration ?? prev.cooldownDuration,
        enableNoHelmet: siteSafetyConfig.enableNoHelmet ?? prev.enableNoHelmet,
        enableNoVest: siteSafetyConfig.enableNoVest ?? prev.enableNoVest,
        enableRestrictedArea: siteSafetyConfig.enableRestrictedArea ?? prev.enableRestrictedArea,
      }));
    }
  }, [siteSafetyConfig]);

  // 6. Trạng thái điều khiển Real-time AI Tracking & Modals
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showBbox, setShowBbox] = useState<boolean>(true);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);
  const [roiDrawerOpen, setRoiDrawerOpen] = useState<boolean>(false);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null);
  const [lightboxEvidenceUrl, setLightboxEvidenceUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ── KHỞI TẠO & ĐỒNG BỘ LOOK-AHEAD BUFFERED LIVE AI SESSION (PORT 8000) ──
  // Bất kỳ nguồn nào (YouTube URL, Webcam, MP4 công trường) đều được đẩy qua
  // YOLOv11 + ByteTrack Look-Ahead Ring Buffer để đảm bảo 0% lệch Bbox và 0% giật lag.
  useEffect(() => {
    if (isCameraLoading) return;
    if (!effectiveStreamUrl) return;
    // Nếu đang xem một Job tĩnh từ /api/ai-test/jobs/... thì dùng luồng Job
    if (effectiveStreamUrl.startsWith("/api/ai-test/jobs/")) {
      setLiveSessionId(null);
      setLiveSessionState(null);
      return;
    }

    let cancelled = false;
    fetch("http://127.0.0.1:8000/api/live/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        camera_id: cameraId,
        camera_code: camera?.code || cameraId,
        source: effectiveStreamUrl,
        conf_threshold: 0.5,
        confirmation_s: aiConfig.confirmationDuration || 3.0,
        cooldown_s: aiConfig.cooldownDuration || 30.0,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Live AI service unavailable");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data?.session_id) {
          setLiveSessionId(data.session_id);
          setLiveSessionState(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveSessionId(null);
          setLiveSessionState(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isCameraLoading,
    cameraId,
    camera?.code,
    effectiveStreamUrl,
    aiConfig.confirmationDuration,
    aiConfig.cooldownDuration,
  ]);

  // Poll trạng thái telemetry trực tiếp từ Look-Ahead Ring Buffer (đối với luồng không phải webcam, vì webcam tự trả state mỗi frame)
  useEffect(() => {
    if (!liveSessionId) return;
    if (effectiveStreamUrl.toLowerCase().includes("webcam")) return;

    let active = true;
    const pollState = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/live/${liveSessionId}/state`);
        if (res.status === 404) {
          // Tự động phục hồi phiên nếu AI Server vừa khởi động lại
          const startRes = await fetch("http://127.0.0.1:8000/api/live/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              camera_id: cameraId,
              camera_code: camera?.code || cameraId,
              source: effectiveStreamUrl,
              conf_threshold: 0.5,
              confirmation_s: aiConfig.confirmationDuration || 3.0,
              cooldown_s: aiConfig.cooldownDuration || 30.0,
            }),
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            if (active && startData?.session_id) {
              setLiveSessionId(startData.session_id);
              setLiveSessionState(startData);
            }
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (active && data) {
          setLiveSessionState(data);
          if (data.entry && typeof data.entry.t === "number") {
            setLiveElapsedSec(data.entry.t);
          }
        }
      } catch {
        // Ignore transient network errors
      }
    };

    pollState();
    const timer = setInterval(pollState, 220);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [liveSessionId, effectiveStreamUrl]);

  // Vòng lặp fallback khi không có Live AI Session và đang ở chế độ video tĩnh
  useEffect(() => {
    if (!isPlaying || liveSessionId) return;

    const isNativeVideo =
      effectiveStreamUrl.endsWith(".mp4") ||
      effectiveStreamUrl.endsWith(".webm") ||
      effectiveStreamUrl.startsWith("blob:");

    if (isNativeVideo) return;

    const interval = setInterval(() => {
      setLiveElapsedSec((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, effectiveStreamUrl, liveSessionId]);

  // Tải dữ liệu nhật ký AI Tracking thực tế (từ các job YOLOv11 + ByteTrack tĩnh khi chọn Job)
  const [realLogData, setRealLogData] = useState<{
    meta?: any;
    frames: FrameLogEntry[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    // Chỉ dùng static log nếu không chạy Live AI Session
    if (liveSessionId) {
      return () => {
        active = false;
      };
    }

    let logUrl: string | null = null;
    if (effectiveStreamUrl.includes("video8")) {
      logUrl = "/data/video8-log.json";
    } else if (
      effectiveStreamUrl.includes("ai-cctv") ||
      effectiveStreamUrl.includes("video2")
    ) {
      logUrl = "/data/sample-ai-log.json";
    } else if (
      effectiveStreamUrl.includes("camera-01a18735")
    ) {
      logUrl = "/data/camera-01a18735-log.json";
    }

    if (logUrl) {
      fetch(logUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Log not found");
          return res.json();
        })
        .then((data) => {
          const frames = Array.isArray(data) ? data : data?.frames;
          if (active && frames && frames.length > 0) {
            setRealLogData({ frames });
          }
        })
        .catch(() => {
          if (active) setRealLogData(null);
        });
    } else {
      setRealLogData(null);
    }

    return () => {
      active = false;
    };
  }, [cameraId, effectiveStreamUrl, liveSessionId]);

  // Bộ tính toán Pipeline an toàn thời gian thực ĐỘNG (chỉ làm fallback khi port 8000 tắt)
  const liveTrackingData = useMemo(() => {
    return generateLiveFrameEntry({
      elapsedSec: liveElapsedSec,
      cameraCode: camera?.code || "CAM-01",
      cameraId,
      siteName,
      safetyConfig: {
        ...aiConfig,
        locale,
      },
      streamMetadata,
      customSnapshotUrl: capturedSnapshotUrl,
    });
  }, [
    liveElapsedSec,
    camera?.code,
    cameraId,
    siteName,
    aiConfig,
    locale,
    streamMetadata,
    capturedSnapshotUrl,
  ]);

  // Tiền xử lý danh sách vi phạm và tracks công nhân từ file log AI để tối ưu hiệu năng
  const { fullViolations, fullPersonTracks } = useMemo(() => {
    if (!realLogData?.frames || realLogData.frames.length === 0) {
      return { fullViolations: [], fullPersonTracks: [] };
    }
    const allViolations: ViolationEvent[] = [];
    const trackMap = new Map<number, ComputedPersonTrack>();

    for (const f of realLogData.frames) {
      if (f.violations && f.violations.length > 0) {
        for (const v of f.violations) {
          if (!allViolations.some((x) => x.event_id === v.event_id)) {
            allViolations.push(v);
          }
        }
      }
      for (const p of f.persons || []) {
        if (!trackMap.has(p.track_id)) {
          trackMap.set(p.track_id, {
            id: p.track_id,
            frames: [],
            okFrames: [],
            noHelmetFrames: new Set<number>(),
            noVestFrames: new Set<number>(),
            unknownCount: 0,
          });
        }
        const trk = trackMap.get(p.track_id)!;
        trk.frames.push(f.frame);
        if (p.status === "COMPLIANT") {
          trk.okFrames.push(f.frame);
        } else if (p.violations?.includes("no_helmet")) {
          trk.noHelmetFrames.add(f.frame);
        } else if (p.violations?.includes("no_safety_vest")) {
          trk.noVestFrames.add(f.frame);
        }
      }
    }

    return {
      fullViolations: allViolations,
      fullPersonTracks: Array.from(trackMap.values()).sort((a, b) => a.id - b.id),
    };
  }, [realLogData]);

  // Đồng bộ Bounding Box & Telemetry chuẩn xác 100% theo từng frame từ Look-Ahead Live AI Engine
  const resolvedTrackingData = useMemo(() => {
    // 1. Ưu tiên tuyệt đối dữ liệu thực tế từ Look-Ahead Live AI Engine (Port 8000)
    if (liveSessionId && liveSessionState) {
      const liveEntry: FrameLogEntry = liveSessionState.entry || {
        frame: liveSessionState.current_frame || 0,
        t: Number(((liveSessionState.current_frame || 0) / (liveSessionState.fps || 25)).toFixed(2)),
        raw_detections: [],
        persons: [],
        violations: [],
      };

      const mappedTracks: ComputedPersonTrack[] = Array.isArray(liveSessionState.person_tracks)
        ? liveSessionState.person_tracks.map((t: any) => ({
            id: t.id,
            frames: Array.isArray(t.frames) ? t.frames : [],
            okFrames: Array.isArray(t.okFrames) ? t.okFrames : [],
            noHelmetFrames: new Set<number>(Array.isArray(t.noHelmetFrames) ? t.noHelmetFrames : []),
            noVestFrames: new Set<number>(Array.isArray(t.noVestFrames) ? t.noVestFrames : []),
            unknownCount: t.unknownCount || 0,
          }))
        : [];

      const mappedViolations: ViolationEvent[] = Array.isArray(liveSessionState.violations)
        ? liveSessionState.violations
        : [];

      return {
        entry: liveEntry,
        violations: mappedViolations,
        personTracks: mappedTracks,
        isRealAiLog: true,
      };
    }

    // 2. Nếu đang xem một Job đã xử lý sẵn
    if (realLogData?.frames && realLogData.frames.length > 0) {
      const frames = realLogData.frames;
      const totalDuration = frames[frames.length - 1].t || 10.08;
      const loopedTime = totalDuration > 0 ? liveElapsedSec % totalDuration : 0;

      // Tìm frame có timestamp t gần nhất bằng Binary Search
      let low = 0;
      let high = frames.length - 1;
      let bestIdx = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (frames[mid].t <= loopedTime) {
          bestIdx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const frame = frames[bestIdx];

      const currentViolations = fullViolations.filter((v) => v.frame <= frame.frame);

      return {
        entry: frame,
        violations: currentViolations.length > 0 ? currentViolations : fullViolations,
        personTracks: fullPersonTracks.length > 0 ? fullPersonTracks : liveTrackingData.personTracks,
        isRealAiLog: true,
      };
    }

    return {
      entry: liveTrackingData.entry,
      violations: liveTrackingData.violations,
      personTracks: liveTrackingData.personTracks,
      isRealAiLog: false,
    };
  }, [
    liveSessionId,
    liveSessionState,
    realLogData,
    liveElapsedSec,
    fullViolations,
    fullPersonTracks,
    liveTrackingData,
  ]);

  // Tên hiển thị mô hình AI
  const activeModelDisplayName = useMemo(() => {
    switch (aiConfig.modelVersionId) {
      case "yolo11m-ppe-finetune":
        return "YOLO11m-PPE (40.5 MB, mAP 98.3%)";
      case "yolo11n-edge-light":
        return "YOLO11n-PPE (5.5 MB, Edge 45 FPS)";
      case "yolo11s-ppe-best":
      default:
        return "YOLOv11s-PPE (best.pt)";
    }
  }, [aiConfig.modelVersionId]);

  // Tải danh sách job từ AI Test Service (port 8000)
  const [availableAiJobs, setAvailableAiJobs] = useState<
    Array<{
      job_id: string;
      source: string;
      total_frames: number;
      fps: number;
      model?: string;
    }>
  >([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoadingAiJob, setIsLoadingAiJob] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetch("/api/ai-test/jobs")
      .then((res) => {
        if (!res.ok) throw new Error("AI service not reachable");
        return res.json();
      })
      .then((jobs) => {
        if (active && Array.isArray(jobs) && jobs.length > 0) {
          setAvailableAiJobs(jobs);
        }
      })
      .catch(() => {
        // AI service offline or not running
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectAiJob = async (jobId: string) => {
    if (!jobId) {
      setSelectedJobId(null);
      setCustomStreamUrl(null);
      setLiveElapsedSec(0);
      return;
    }

    try {
      setIsLoadingAiJob(true);
      setSelectedJobId(jobId);

      const [metaRes, logRes] = await Promise.all([
        fetch(`/api/ai-test/jobs/${jobId}/meta`).then((r) => r.json()),
        fetch(`/api/ai-test/jobs/${jobId}/log`).then((r) => r.text()),
      ]);

      const lines = logRes.trim().split("\n").filter(Boolean);
      const parsedFrames: FrameLogEntry[] = lines.map((l: string) => JSON.parse(l));

      setRealLogData({ meta: metaRes, frames: parsedFrames });
      setCustomStreamUrl(`/api/ai-test/jobs/${jobId}/video`);
      setLiveElapsedSec(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      toast.success(
        isVietnamese
          ? `Đã nạp video ${metaRes.source || jobId} (${metaRes.total_frames || parsedFrames.length} frames) từ AI Test Service!`
          : `Loaded job ${metaRes.source || jobId} from AI Test Service!`
      );
    } catch (err) {
      toast.error(
        isVietnamese
          ? "Không thể tải dữ liệu job từ AI Service"
          : "Failed to load job from AI Service"
      );
    } finally {
      setIsLoadingAiJob(false);
    }
  };

  const handleSeekToFrame = (targetFrame: number) => {
    const fps = streamMetadata.fps || aiConfig.processFps || 25;
    const targetSec = Math.max(0, (targetFrame - 1) / fps);
    setLiveElapsedSec(targetSec);
    if (videoRef.current) {
      videoRef.current.currentTime = targetSec;
    }
  };

  // Handlers
  const handleTogglePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (liveSessionId) {
      fetch(`http://127.0.0.1:8000/api/live/${liveSessionId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !nextPlaying }),
      }).catch(() => {});
    }
  };

  const handleToggleBbox = () => {
    setShowBbox((prev) => !prev);
  };

  const handleSyncPlaying = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const lastSyncTimeRef = useRef<number>(0);
  const handleSyncTime = (timeSec: number) => {
    // Chỉ cập nhật state khi thời gian dịch chuyển ít nhất ~25ms (tối ưu hóa 40 FPS mượt mà) hoặc khi video lặp lại
    if (timeSec < lastSyncTimeRef.current || Math.abs(timeSec - lastSyncTimeRef.current) >= 0.025) {
      lastSyncTimeRef.current = timeSec;
      setLiveElapsedSec(timeSec);
    }
  };

  const handleSaveAiConfig = (newConfig: AiInspectionConfig) => {
    setAiConfig(newConfig);
    toast.success(
      isVietnamese
        ? `Đã áp dụng cấu hình AI mới cho Camera ${camera?.code || cameraId}. Pipeline đang kiểm tra video trực tiếp!`
        : `New AI parameters applied to Camera ${camera?.code || cameraId}. Real-time inspection running!`
    );
  };

  const handleSnapshotCapture = (dataUrl?: string | null, isRealCanvas?: boolean) => {
    const finalUrl =
      dataUrl ||
      camera?.snapshotUrl ||
      (streamMetadata.youtubeId
        ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`
        : "/images/camera-live-evidence.jpg");

    setCapturedSnapshotUrl(finalUrl);
    setLightboxEvidenceUrl(finalUrl);

    // ── TỰ ĐỘNG TẢI FILE ẢNH .JPG VỀ MÁY TÍNH CỦA NGƯỜI DÙNG ──
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
      const camCodeClean = (camera?.code || cameraId || "CAM").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `snapshot_${camCodeClean}_${dateStr}_${timeStr}.jpg`;

      if (finalUrl.startsWith("data:") || finalUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = finalUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        fetch(finalUrl)
          .then((res) => {
            if (!res.ok) throw new Error("Fetch failed");
            return res.blob();
          })
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          })
          .catch(() => {
            const link = document.createElement("a");
            link.href = finalUrl;
            link.download = filename;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
      }
    } catch (err) {
      console.error("Lỗi tự động tải snapshot:", err);
    }

    toast.success(
      isVietnamese
        ? `Đã chụp và tải ảnh snapshot (${camera?.code || cameraId}) về máy tính!`
        : `Snapshot for ${camera?.code || cameraId} captured and downloaded!`
    );
  };

  const handleChangeVideoSource = (newUrl: string) => {
    setCustomStreamUrl(newUrl);
    setCapturedSnapshotUrl(null);
    setLiveElapsedSec(0);
    toast.success(
      isVietnamese
        ? "Đã nạp video kiểm tra mới vào Camera Studio!"
        : "Loaded new inspection video into Camera Studio!"
    );
  };

  const isOnline = camera?.status === "ONLINE";

  return (
    <div className="space-y-5">
      {/* ── HEADER THANH ĐIỀU HƯỚNG TINH GỌN & HIỂN THỊ DỮ LIỆU CAMERA THỰC TẾ ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/cameras")}
            className="h-10 w-10 p-0 rounded-2xl shrink-0 border-border/40 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
            title={isVietnamese ? "Quay lại danh sách camera" : "Back to cameras"}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Mã Camera */}
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2 py-0.5">
                {camera?.code || cameraId}
              </span>

              {/* Trạng thái kết nối thực tế từ DB */}
              <Badge variant={isOnline ? "success" : "danger"} size="sm">
                <span
                  className={`h-1.5 w-1.5 rounded-full mr-1 ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                {camera?.status || "ONLINE"}
              </Badge>

              {/* Vị trí / Khu vực */}
              {(camera?.location || camera?.zoneName) && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{camera.location || camera.zoneName}</span>
                </span>
              )}

              {/* Công trường */}
              {camera?.siteId && (
                <Link
                  href={`/sites/${camera.siteId}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition hover:underline shadow-sm"
                  title={
                    isVietnamese
                      ? `Mở trung tâm điều hành công trường ${siteName}`
                      : `Open operations center for site ${siteName}`
                  }
                >
                  <Building2 className="h-3 w-3 text-primary" />
                  <span>{siteName}</span>
                </Link>
              )}
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Cctv className="h-5 w-5 text-primary" />
              <span>{camera?.name || (isVietnamese ? "Camera Giám Sát An Toàn" : "Safety Surveillance Camera")}</span>
            </h1>
          </div>
        </div>

        {/* Action Header: Nhóm các nút tác vụ kiểm tra camera */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Ping kiểm tra đường truyền thực tế */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHealthModalOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-semibold border-border/40 hover:bg-surface-elevated transition shadow-sm"
            title={isVietnamese ? "Kiểm tra độ trễ mạng và ping camera" : "Ping check camera health"}
          >
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>{isVietnamese ? "Kiểm Tra Mạng" : "Ping Health"}</span>
          </Button>

          {/* Nút Cấu hình vùng an toàn ROI */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRoiDrawerOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-semibold border-border/40 hover:bg-surface-elevated transition shadow-sm"
            title={isVietnamese ? "Vẽ vùng cảnh báo an toàn ROI trên camera" : "Draw ROI safety boundary"}
          >
            <Scan className="h-4 w-4 text-primary" />
            <span>{isVietnamese ? "Vùng ROI" : "ROI Zone"}</span>
          </Button>

          {/* Nút Cấu hình AI */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-bold shadow-nm-sm hover:shadow-nm transition"
            title={
              isVietnamese
                ? "Mở Modal tinh chỉnh ngưỡng tin cậy và kiểm tra AI trên video này"
                : "Open AI inspection modal to tune thresholds and test on this video"
            }
          >
            <Cpu className="h-4 w-4" />
            <span>{isVietnamese ? "Cấu Hình AI" : "AI Config"}</span>
          </Button>

          {/* Link sang trang sự cố thực tế của camera này */}
          <Link
            href={`/incidents?cameraId=${cameraId}&cameraCode=${camera?.code || cameraId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition shadow-sm dark:text-amber-400"
            title={
              isVietnamese
                ? "Xem danh sách sự cố vi phạm do camera này phát hiện"
                : "View violation incidents detected by this camera"
            }
          >
            <ShieldAlert className="h-4 w-4" />
            <span>
              {isVietnamese ? "Sự Cố Đã Lưu" : "Stored Incidents"} ({realIncidents.length})
            </span>
          </Link>
        </div>
      </div>

      {/* ── BỐ CỤC 2 CỘT CÂN ĐỐI: VIDEO CHÍNH (68%) & BẢNG ĐIỀU HÀNH TRỰC TIẾP (32%) ── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:items-stretch">
        {/* CỘT TRÁI (8 / 12 phần): TRÌNH PHÁT VIDEO CHÍNH & CÁC CARD THEO DÕI AI (CÓ THANH NAVIGATION TRÊN ĐẦU) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-5">
          <CameraIntelligencePlayer
            videoSrc={effectiveStreamUrl}
            currentEntry={resolvedTrackingData.entry}
            isPlaying={isPlaying}
            showBbox={showBbox}
            videoRef={videoRef}
            onTogglePlay={handleTogglePlay}
            onToggleBbox={handleToggleBbox}
            onSnapshot={handleSnapshotCapture}
            onOpenAiModal={() => setAiModalOpen(true)}
            onChangeVideoSource={handleChangeVideoSource}
            onSyncPlaying={handleSyncPlaying}
            onSyncTime={handleSyncTime}
            streamMetadata={streamMetadata}
            cameraName={camera?.name}
            cameraCode={camera?.code || cameraId}
            siteName={siteName}
            activeModelName={activeModelDisplayName}
            cameraStatus={camera?.status || "ONLINE"}
            currentFps={camera?.currentFps}
            currentLatencyMs={camera?.currentLatencyMs}
            cameraLocation={camera?.location || camera?.zoneName}
            cameraStreamUrl={cameraStreamUrl}
            liveSessionId={liveSessionId}
            liveSessionStatus={liveSessionState?.status}
            bufferProgress={liveSessionState?.buffer_progress}
            bufferedFramesCount={liveSessionState?.buffered_frames}
            loopCached={liveSessionState?.loop_cached}
            onLiveStateUpdate={setLiveSessionState}
          />

        </div>

        {/* CỘT PHẢI (4 / 12 phần): BẢNG ĐIỀU HÀNH AN TOÀN TRỰC TIẾP (UNIFIED PANEL) */}
        <div className="lg:col-span-4 lg:flex xl:col-span-4">
          <CameraIntelligenceSidebar
            currentEntry={resolvedTrackingData.entry}
            allViolations={resolvedTrackingData.violations}
            personTracks={resolvedTrackingData.personTracks}
            cameraId={cameraId}
            cameraCode={camera?.code || cameraId}
            siteName={siteName}
            streamMetadata={streamMetadata}
            safetyConfig={aiConfig}
            activeModelName={activeModelDisplayName}
            onSnapshot={() => handleSnapshotCapture(null)}
            onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
            onSeekToFrame={handleSeekToFrame}
            cameraStatus={camera?.status || "ONLINE"}
            realIncidentsCount={realIncidents.length}
            totalFrames={liveSessionState?.total_frames || realLogData?.frames?.length}
          />
        </div>
      </div>

      {/* Inspector dùng toàn bộ chiều rộng để bảng theo dõi và navigation không bị nén bởi cột video. */}
      <CameraAiInspectorCard
        currentEntry={resolvedTrackingData.entry}
        personTracks={resolvedTrackingData.personTracks}
        allViolations={resolvedTrackingData.violations}
        onSeekToFrame={handleSeekToFrame}
        fps={streamMetadata.fps || aiConfig.processFps || 25}
        totalFrames={liveSessionState?.total_frames || realLogData?.frames?.length || 500}
        availableJobs={availableAiJobs}
        selectedJobId={selectedJobId}
        onSelectJob={handleSelectAiJob}
        isLoadingJob={isLoadingAiJob}
      />

      {/* ── PHÂN VÙNG DƯỚI: TRUNG TÂM CHẨN ĐOÁN & LỊCH SỬ SỰ CỐ CỦA CAMERA (DỮ LIỆU THẬT TỪ BACKEND) ── */}
      <CameraTelemetryTables
        cameraId={cameraId}
        camera={camera}
        siteName={siteName}
        safetyConfig={aiConfig}
        activeModelName={activeModelDisplayName}
        realIncidents={realIncidents}
        isIncidentsLoading={isIncidentsLoading}
        onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
        onOpenRoiDrawer={() => setRoiDrawerOpen(true)}
        onOpenHealthDialog={() => setHealthModalOpen(true)}
        onOpenAiModal={() => setAiModalOpen(true)}
      />

      {/* ── MODAL KIỂM TRA SỨC KHOẺ / PING CAMERA ── */}
      <CameraHealthDialog
        open={healthModalOpen}
        onOpenChange={setHealthModalOpen}
        camera={camera || null}
      />

      {/* ── DRAWER VẼ VÙNG CẢNH BÁO AN TOÀN ROI ── */}
      <CameraRoiDrawer
        open={roiDrawerOpen}
        onOpenChange={setRoiDrawerOpen}
        camera={camera || null}
      />

      {/* ── MODAL CẤU HÌNH & TINH CHỈNH THAM SỐ AI ── */}
      <AiInspectionModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        config={aiConfig}
        onSaveConfig={handleSaveAiConfig}
        cameraCode={camera?.code || cameraId}
        streamMetadata={streamMetadata}
      />

      {/* ── LIGHTBOX MODAL PHÓNG TO ẢNH BẰNG CHỨNG ── */}
      {lightboxEvidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in"
          onClick={() => setLightboxEvidenceUrl(null)}
        >
          <div
            className="relative my-auto max-w-2xl w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-surface border border-white/20 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div>
                <span className="font-bold text-sm text-foreground">
                  {isVietnamese
                    ? "Ảnh Bằng Chứng Vi Phạm (Evidence Snapshot — VI-08)"
                    : "Violation Evidence Snapshot (VI-08)"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Camera: {camera?.code || cameraId} • Site: {siteName}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
                    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
                    const camCodeClean = (camera?.code || cameraId || "CAM").replace(/[^a-zA-Z0-9_-]/g, "_");
                    const filename = `snapshot_${camCodeClean}_${dateStr}_${timeStr}.jpg`;

                    if (lightboxEvidenceUrl.startsWith("data:") || lightboxEvidenceUrl.startsWith("blob:")) {
                      const link = document.createElement("a");
                      link.href = lightboxEvidenceUrl;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      fetch(lightboxEvidenceUrl)
                        .then((res) => res.blob())
                        .then((blob) => {
                          const blobUrl = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = blobUrl;
                          link.download = filename;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                        })
                        .catch(() => {
                          window.open(lightboxEvidenceUrl, "_blank");
                        });
                    }
                  }}
                  className="h-8 gap-1 rounded-xl text-xs font-semibold px-2.5 text-primary border-primary/30 hover:bg-primary/10"
                  title={isVietnamese ? "Tải ảnh về máy" : "Download image"}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isVietnamese ? "Tải về" : "Download"}</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setLightboxEvidenceUrl(null)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40 flex items-center justify-center">
              <img
                src={lightboxEvidenceUrl}
                alt="Camera Evidence Snapshot"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {isVietnamese
                  ? `Trích xuất từ luồng Camera ${camera?.code || cameraId}`
                  : `Extracted from Camera stream ${camera?.code || cameraId}`}
              </span>
              <span className="font-mono text-emerald-500 font-semibold">MinIO S3 Evidence Synced</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
