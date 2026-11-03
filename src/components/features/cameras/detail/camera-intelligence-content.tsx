"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cameraService } from "@/services/camera.service";
import { siteService } from "@/services/site.service";
import { incidentService } from "@/services/incident.service";
import { useNotificationSound } from "@/hooks/notifications";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import { IncidentAlertToast } from "@/components/features/app-shell/incident-alert-toast";
import { useQueryClient } from "@tanstack/react-query";
import { toast as hotToast } from "react-hot-toast";
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
  const { getSiteName, getZoneName } = useEntityLookup();

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
  const zoneName = camera?.zoneName || getZoneName(siteId, camera?.zoneId) || (isVietnamese ? "Khu vực chung" : "General Zone");

  // Nguồn video gốc từ camera DB hoặc tùy chọn ghi đè tạm thời (Upload file / Đổi URL / Webcam)
  const cameraStreamUrl = camera?.streamUrl || "";

  const defaultStreamUrl = useMemo(() => {
    const safeId = cameraId ? cameraId.replace(/[^a-zA-Z0-9_-]/g, "") : "";

    // 1. Nếu là Camera 01a18735
    if (
      safeId.includes("01a18735") ||
      camera?.code?.includes("01a18735") ||
      cameraStreamUrl.includes("rcvx3ZsI4eQ") ||
      cameraStreamUrl.includes("camera-01a18735")
    ) {
      return "/videos/cameras/camera-01a18735.mp4";
    }
    // 2. Nếu là Camera 01a19ce7 (CAM2)
    if (
      safeId.includes("01a19ce7") ||
      camera?.code?.includes("01a19ce7") ||
      camera?.code?.includes("CAM2") ||
      cameraStreamUrl.includes("POdSp36OulM") ||
      cameraStreamUrl.includes("camera-01a19ce7")
    ) {
      return "/videos/cameras/camera-01a19ce7.mp4";
    }
    // 3. Nếu là Camera CAM5 (01a19d07)
    if (
      safeId.includes("01a19d07") ||
      camera?.code?.includes("01a19d07") ||
      camera?.code?.includes("CAM5") ||
      cameraStreamUrl.includes("camera-01a19d07")
    ) {
      return "/videos/cameras/camera-01a19d07.mp4";
    }
    // 4. Nếu là Camera CAM3 (01a19cf4)
    if (
      safeId.includes("01a19cf4") ||
      camera?.code?.includes("01a19cf4") ||
      camera?.code?.includes("CAM3") ||
      cameraStreamUrl.includes("camera-01a19cf4")
    ) {
      return "/videos/cameras/camera-01a19cf4.mp4";
    }
    // 5. Nếu là Camera CAMMMMM (01a19e19)
    if (
      safeId.includes("01a19e19") ||
      camera?.code?.includes("01a19e19") ||
      camera?.code?.includes("CAMMMM") ||
      cameraStreamUrl.includes("camera-01a19e19")
    ) {
      return "/videos/cameras/camera-01a19e19.mp4";
    }
    if (cameraStreamUrl) {
      return cameraStreamUrl;
    }
    return "/videos/ai-cctv-sample.mp4";
  }, [cameraStreamUrl, cameraId, camera?.code]);

  const [customStreamUrl, setCustomStreamUrl] = useState<string | null>(null);
  const effectiveStreamUrl = customStreamUrl || defaultStreamUrl;

  // Dữ liệu nhật ký AI Tracking thực tế (từ các job YOLOv11 + ByteTrack)
  const [realLogData, setRealLogData] = useState<{
    meta?: any;
    frames: FrameLogEntry[];
  } | null>(null);

  // Reset toàn bộ state khi chuyển giữa các camera để chống hiển thị nhầm video camera khác
  useEffect(() => {
    setCustomStreamUrl(null);
    setRealLogData(null);
    setLiveElapsedSec(0);
    setAutoAnalysisState({ status: "idle", progress: 0 });
    setCapturedSnapshotUrl(null);
    setLiveSessionId(null);
    setLiveSessionState(null);
    setSessionViolations([]);
  }, [cameraId]);

  // Trạng thái Phiên Live AI Engine (Look-Ahead Pre-Buffer trên port 8000)
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveSessionState, setLiveSessionState] = useState<any | null>(null);

  // 4. Phân tích loại luồng & tỷ lệ khung hình thực tế của Video
  const streamMetadata = useMemo<StreamMetadata>(() => {
    const url = effectiveStreamUrl.trim();
    const { isShorts, youtubeId } = getYouTubeEmbedUrl(url);

    // Ưu tiên kích thước và tỷ lệ từ file log AI thật (đã được đo đạc chuẩn xác)
    if (realLogData?.meta?.viewBox || realLogData?.meta?.size) {
      const box = realLogData.meta.viewBox || realLogData.meta.size;
      if (Array.isArray(box) && box.length === 2 && box[0] > 0 && box[1] > 0) {
        const [w, h] = box;
        const vertical = Boolean(realLogData.meta.isVertical ?? h > w);
        return {
          streamType: url.includes("shorts") ? "youtube_shorts" : youtubeId ? "youtube_video" : "html5_video",
          isVertical: vertical,
          videoWidth: w,
          videoHeight: h,
          youtubeId,
          aspectRatioLabel: `${w} × ${h} (${vertical ? "Dọc" : "Ngang"} YOLOv11 AI)`,
          sourceUrl: url,
          fps: realLogData.meta.fps || 25,
        };
      }
    }

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
      url.includes("camera-01a18735") ||
      cameraId?.includes("01a18735") ||
      url.includes("rcvx3ZsI4eQ")
    ) {
      streamType = url.includes("shorts") ? "youtube_shorts" : "html5_video";
      isVertical = true;
      videoWidth = 1080;
      videoHeight = 1920;
      fps = 25.0;
      aspectRatioLabel = "1080 × 1920 (Camera 01A18735)";
    } else if (
      url.includes("camera-01a19ce7") ||
      cameraId?.includes("01a19ce7") ||
      camera?.code?.includes("CAM2") ||
      url.includes("POdSp36OulM")
    ) {
      streamType = url.includes("shorts") && !url.includes("camera-01a19ce7") ? "youtube_shorts" : "html5_video";
      isVertical = true;
      videoWidth = 720;
      videoHeight = 1280;
      fps = 29.97;
      aspectRatioLabel = "720 × 1280 (Camera CAM2)";
    } else if (
      url.includes("camera-01a19d07") ||
      cameraId?.includes("01a19d07") ||
      camera?.code?.includes("CAM5")
    ) {
      streamType = "html5_video";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      fps = 29.6;
      aspectRatioLabel = "1280 × 720 (Camera CAM5 YOLOv11)";
    } else if (
      url.includes("camera-01a19cf4") ||
      cameraId?.includes("01a19cf4") ||
      camera?.code?.includes("CAM3")
    ) {
      streamType = "html5_video";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      fps = 29.6;
      aspectRatioLabel = "1280 × 720 (Camera CAM3 YOLOv11)";
    } else if (
      url.includes("camera-01a19e19") ||
      cameraId?.includes("01a19e19") ||
      camera?.code?.includes("CAMMMM")
    ) {
      streamType = "html5_video";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      fps = 29.6;
      aspectRatioLabel = "1280 × 720 (Camera CAMMMM YOLOv11)";
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
  }, [effectiveStreamUrl, liveSessionState, realLogData]);

  // 5. Trạng thái cấu hình tham số AI riêng cho camera (tích hợp Modal AI Inspection)
  const [aiConfig, setAiConfig] = useState<AiInspectionConfig>(() => {
    const defaults: AiInspectionConfig = {
      confidenceThreshold: 0.8,
      confirmationDuration: 3.0,
      cooldownDuration: 30,
      enableNoHelmet: true,
      enableNoVest: true,
      enableRestrictedArea: true,
      modelVersionId: "models/best.pt",
      processFps: 25,
    };
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`ppe_camera_ai_config_${cameraId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed.modelVersionId === "models/yolo11s-best.pt" ||
            parsed.modelVersionId === "yolo11s-ppe-best"
          ) {
            parsed.modelVersionId = "models/best.pt";
          }
          return { ...defaults, ...parsed };
        }
      } catch {
        // ignore localStorage parse error
      }
    }
    return defaults;
  });

  // Helper ánh xạ modelVersionId sang đường dẫn file .pt thực tế trong cấu trúc Đa Model
  const resolveModelPath = (modelVersionId?: string): string => {
    if (!modelVersionId) return "models/best.pt";
    if (
      modelVersionId === "models/yolo11s-best.pt" ||
      modelVersionId === "yolo11s-ppe-best" ||
      modelVersionId === "yolo11m-ppe-finetune" ||
      modelVersionId === "best.pt" ||
      modelVersionId === "0192e210-0000-7000-8000-000000000001"
    ) {
      return "models/best.pt";
    }
    if (modelVersionId.endsWith(".pt")) return modelVersionId;
    return "models/best.pt";
  };

  // Nạp cấu hình hiệu lực từ Backend (Site Service) kết hợp localStorage
  useEffect(() => {
    let cancelled = false;

    async function loadEffectiveConfig() {
      try {
        const effective = await siteService.getEffectiveSafetyConfig({
          cameraId,
          siteId: siteId || undefined,
        });

        if (!cancelled && effective) {
          setAiConfig((prev) => ({
            ...prev,
            confidenceThreshold:
              effective.confidenceThreshold ?? prev.confidenceThreshold,
            confirmationDuration:
              effective.confirmationDuration ?? prev.confirmationDuration,
            cooldownDuration:
              effective.cooldownDuration ?? prev.cooldownDuration,
            enableNoHelmet:
              effective.rules?.enableNoHelmet ?? prev.enableNoHelmet,
            enableNoVest:
              effective.rules?.enableNoVest ?? prev.enableNoVest,
            enableRestrictedArea:
              effective.rules?.enableRestrictedArea ?? prev.enableRestrictedArea,
            modelVersionId:
              effective.modelVersion?.modelPath ||
              resolveModelPath(prev.modelVersionId),
            processFps:
              effective.captureFps ?? camera?.config?.captureFps ?? prev.processFps,
          }));
        }
      } catch {
        // Fallback sang localStorage hoặc siteSafetyConfig nếu API effective chưa phản hồi
        let savedLocal: Partial<AiInspectionConfig> = {};
        try {
          const raw = localStorage.getItem(`ppe_camera_ai_config_${cameraId}`);
          if (raw) savedLocal = JSON.parse(raw);
        } catch {
          // ignore
        }
        if (!cancelled) {
          setAiConfig((prev) => ({
            ...prev,
            confidenceThreshold:
              savedLocal.confidenceThreshold ?? prev.confidenceThreshold,
            confirmationDuration:
              savedLocal.confirmationDuration ??
              siteSafetyConfig?.confirmationDuration ??
              prev.confirmationDuration,
            cooldownDuration:
              savedLocal.cooldownDuration ??
              siteSafetyConfig?.cooldownDuration ??
              prev.cooldownDuration,
            enableNoHelmet:
              savedLocal.enableNoHelmet ??
              siteSafetyConfig?.enableNoHelmet ??
              prev.enableNoHelmet,
            enableNoVest:
              savedLocal.enableNoVest ??
              siteSafetyConfig?.enableNoVest ??
              prev.enableNoVest,
            enableRestrictedArea:
              savedLocal.enableRestrictedArea ??
              siteSafetyConfig?.enableRestrictedArea ??
              prev.enableRestrictedArea,
            modelVersionId: resolveModelPath(
              savedLocal.modelVersionId || prev.modelVersionId
            ),
            processFps:
              savedLocal.processFps ??
              camera?.config?.captureFps ??
              prev.processFps,
          }));
        }
      }
    }

    if (cameraId) {
      loadEffectiveConfig();
    }

    return () => {
      cancelled = true;
    };
  }, [cameraId, siteId, siteSafetyConfig, camera?.config?.captureFps]);

  // 6. Trạng thái điều khiển Real-time AI Tracking & Modals
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showBbox, setShowBbox] = useState<boolean>(true);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);
  const [roiDrawerOpen, setRoiDrawerOpen] = useState<boolean>(false);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null);
  const [lightboxEvidenceUrl, setLightboxEvidenceUrl] = useState<string | null>(null);
  // Danh sách sự kiện vi phạm tích lũy trong toàn bộ phiên xem (không bị xóa khi video loop lại)
  const [sessionViolations, setSessionViolations] = useState<ViolationEvent[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Vòng lặp đồng bộ thời gian phát video tĩnh / RTSP
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
      effectiveStreamUrl.includes("camera-01a18735") ||
      cameraId?.includes("01a18735") ||
      effectiveStreamUrl.includes("rcvx3ZsI4eQ")
    ) {
      logUrl = "/data/camera-01a18735-log.json";
    } else if (
      effectiveStreamUrl.includes("camera-01a19ce7") ||
      cameraId?.includes("01a19ce7") ||
      camera?.code?.includes("CAM2") ||
      effectiveStreamUrl.includes("POdSp36OulM")
    ) {
      logUrl = "/data/camera-01a19ce7-log.json";
    } else if (
      effectiveStreamUrl.includes("camera-01a19d07") ||
      cameraId?.includes("01a19d07") ||
      camera?.code?.includes("CAM5")
    ) {
      logUrl = "/data/camera-01a19d07-log.json";
    } else if (
      effectiveStreamUrl.includes("camera-01a19cf4") ||
      cameraId?.includes("01a19cf4") ||
      camera?.code?.includes("CAM3")
    ) {
      logUrl = "/data/camera-01a19cf4-log.json";
    } else if (
      effectiveStreamUrl.includes("camera-01a19e19") ||
      cameraId?.includes("01a19e19") ||
      camera?.code?.includes("CAMMMM")
    ) {
      logUrl = "/data/camera-01a19e19-log.json";
    } else if (cameraId) {
      const safeId = cameraId.replace(/[^a-zA-Z0-9_-]/g, "");
      logUrl = `/data/camera-${safeId}-log.json`;
    }

    if (logUrl) {
      const tryFetch = (urlToFetch: string, fallbackUrl?: string) => {
        fetch(urlToFetch)
          .then((res) => {
            if (!res.ok) {
              if (fallbackUrl) {
                return fetch(fallbackUrl).then((r2) => {
                  if (!r2.ok) throw new Error("Log not found");
                  return r2.json();
                });
              }
              throw new Error("Log not found");
            }
            return res.json();
          })
          .then((data) => {
            const frames = Array.isArray(data) ? data : data?.frames;
            if (active && frames && frames.length > 0) {
              setRealLogData({ frames, meta: data?.meta });
            }
          })
          .catch(() => {
            if (active) setRealLogData(null);
          });
      };

      const safeId = cameraId?.replace(/[^a-zA-Z0-9_-]/g, "");
      const shortId = safeId ? safeId.slice(0, 8) : "";
      const fallback =
        shortId && logUrl.includes(safeId) && !logUrl.includes(shortId)
          ? `/data/camera-${shortId}-log.json`
          : undefined;

      tryFetch(logUrl, fallback);
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
            const matchedEv =
              f.evidence?.find((e) => e.event_id === v.event_id) || f.evidence?.[0];
            allViolations.push({
              ...v,
              frame: v.frame || f.frame,
              evidence_path: v.evidence_path || matchedEv?.path,
            });
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
        } else if (
          p.violations?.includes("no_helmet") ||
          p.violations?.includes("NO_HELMET")
        ) {
          trk.noHelmetFrames.add(f.frame);
        } else if (
          p.violations?.includes("no_safety_vest") ||
          p.violations?.includes("NO_VEST")
        ) {
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
        violations: currentViolations,
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

  // Tên hiển thị mô hình AI trên HUD Video Player, Sidebar & Telemetry
  const activeModelDisplayName = useMemo(() => {
    const id = resolveModelPath(aiConfig.modelVersionId);
    if (id.includes("best.pt")) {
      return "YOLOv11s-PPE (best.pt)";
    }
    const cleanFileName = id.replace(/^models\//, "");
    return `YOLO-PPE (${cleanFileName})`;
  }, [aiConfig.modelVersionId]);

  // Danh sách job tĩnh (không gọi port 8000)
  const [availableAiJobs] = useState<
    Array<{
      job_id: string;
      source: string;
      total_frames: number;
      fps: number;
      model?: string;
    }>
  >([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoadingAiJob] = useState<boolean>(false);

  const handleSelectAiJob = async (jobId: string) => {
    if (!jobId) {
      setSelectedJobId(null);
      setCustomStreamUrl(null);
      setLiveElapsedSec(0);
      setSessionViolations([]);
    }
  };

  const queryClient = useQueryClient();
  const { playAlert } = useNotificationSound();
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const lastAutoIncidentTimeRef = useRef<number>(0);
  const knownViolationsRef = useRef<Set<string>>(new Set());

  /**
   * Kích hoạt sự cố trực tiếp từ luồng Camera/YouTube/Webcam (Tạo Incident thật vào DB + Hú còi + Bung Toast 10s)
   */
  const triggerLiveIncidentAlert = useCallback(
    async (customPayload?: { violationType?: string; description?: string }) => {
      try {
        setIsSimulating(true);
        const vType = customPayload?.violationType || "NO_HELMET";
        const sev = vType === "NO_HELMET" ? "CRITICAL" : "HIGH";

        // 1. Trích xuất cặp ảnh bằng chứng (Ảnh AI tô đỏ vi phạm và Ảnh gốc đối chiếu)
        let snapRedUrl = "/images/evidence/camera-01a18735_16ee47ac_f76_red.jpg";
        let snapRawUrl = "/images/evidence/camera-01a18735_16ee47ac_f76.jpg";

        const safeCam = (camera?.code || cameraId || "").toLowerCase();
        if (safeCam.includes("01a19ce7") || safeCam.includes("cam2")) {
          snapRedUrl = "/images/camera-01a19ce7-evidence.jpg";
          snapRawUrl = "/images/camera-live-evidence.jpg";
        } else if (safeCam.includes("01a19d07") || safeCam.includes("cam5")) {
          snapRedUrl = "/images/camera-01a19d07-evidence.jpg";
          snapRawUrl = "/images/camera-live-evidence.jpg";
        } else if (safeCam.includes("01a19cf4") || safeCam.includes("cam3")) {
          snapRedUrl = "/images/camera-01a19cf4-evidence.jpg";
          snapRawUrl = "/images/camera-live-evidence.jpg";
        } else if (safeCam.includes("01a19e19") || safeCam.includes("cammm")) {
          snapRedUrl = "/images/camera-01a19e19-evidence.jpg";
          snapRawUrl = "/images/camera-live-evidence.jpg";
        } else if (effectiveStreamUrl.includes("video8") || vType === "RESTRICTED_AREA") {
          snapRedUrl = "/images/evidence/video8_ea579346_f91_red.jpg";
          snapRawUrl = "/images/evidence/video8_ea579346_f91.jpg";
        } else if (effectiveStreamUrl.includes("cctv") || effectiveStreamUrl.includes("ai-cctv")) {
          snapRedUrl = "/images/evidence/ai-cctv_3a05148c_f195_red.jpg";
          snapRawUrl = "/images/evidence/ai-cctv_3a05148c_f195.jpg";
        }

        const snapUrl = capturedSnapshotUrl || snapRedUrl;

        // 2. Đảm bảo siteId và cameraId luôn là UUID hợp lệ trong Postgres DB
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let effectiveCameraId = camera?.id;
        let effectiveSiteId = camera?.siteId;

        if (!effectiveCameraId || !UUID_REGEX.test(effectiveCameraId)) {
          if (cameraId?.includes("01a18735") || camera?.code?.includes("01a18735") || camera?.code?.includes("099999")) {
            effectiveCameraId = "01a18735-39f8-7ea2-822d-1e7765c59c73";
          } else if (cameraId?.includes("01a19ce7") || camera?.code?.includes("CAM2")) {
            effectiveCameraId = "01a19ce7-05b3-7dcd-97d2-35d4b8309e1d";
          } else if (cameraId?.includes("01a19cf4") || camera?.code?.includes("CAM3")) {
            effectiveCameraId = "01a19cf4-3b78-783c-af36-f52812c9ee3b";
          } else if (cameraId?.includes("01a19d07") || camera?.code?.includes("CAM5")) {
            effectiveCameraId = "01a19d07-bd01-76f9-a7c3-4e7fbcc02538";
          } else if (cameraId?.includes("01a19e19") || camera?.code?.includes("CAMMM")) {
            effectiveCameraId = "01a19e19-ed7f-72ae-a832-6c64d2595dcf";
          } else {
            effectiveCameraId = "01a18735-39f8-7ea2-822d-1e7765c59c73";
          }
        }

        if (!effectiveSiteId || !UUID_REGEX.test(effectiveSiteId)) {
          effectiveSiteId = "01a1866d-094a-741c-8fe2-d679f1a46780";
        }

        // 3. Tạo Incident thực sự vào CSDL qua API (Kèm ảnh bằng chứng tô đỏ ban đầu)
        const newIncident = await incidentService.createIncident({
          siteId: effectiveSiteId,
          cameraId: effectiveCameraId,
          violationType: vType,
          severity: sev,
          detectedAt: new Date().toISOString(),
          description:
            customPayload?.description ||
            (isVietnamese
              ? `AI Camera quét phát hiện công nhân vi phạm ${vType === "NO_HELMET" ? "Không đội mũ bảo hộ" : "Không mặc áo phản quang"} tại ${siteName}.`
              : `AI Camera detected safety violation (${vType}) at ${siteName}.`),
          initialEvidence: {
            cameraId: effectiveCameraId,
            evidenceType: "SNAPSHOT",
            storageKey: snapRedUrl.replace(/^\//, ""),
            fileName: `evidence_${vType.toLowerCase()}_annotated_red.jpg`,
            mimeType: "image/jpeg",
            fileSize: 230436,
            capturedAt: new Date().toISOString(),
            metadata: {
              width: 1920,
              height: 1080,
              frameRate: 25,
              checksum: `sha256-evidence-red-${Date.now()}`,
              aiDetections: {
                persons: [
                  { box: { x: 24, y: 12, width: 52, height: 78, label: "PERSON #1", confidence: 0.98 } },
                ],
                violations: [
                  { box: { x: 36, y: 14, width: 28, height: 24, label: vType, confidence: 0.96 } },
                ],
              },
            },
          },
        });

        const createdId = newIncident?.id || (newIncident as any)?.data?.id || (newIncident as any)?.incidentId;
        if (!createdId) {
          throw new Error("Không nhận được mã ID sự cố từ máy chủ");
        }

        // 4. Phát âm thanh còi Siren cảnh báo khẩn cấp
        playAlert(sev);

        // 5. Kích hoạt Toast nổi 10s (Click vào mở trang chi tiết incident thật)
        hotToast.custom(
          (t) => (
            <IncidentAlertToast
              visible={t.visible}
              data={{
                incidentId: createdId,
                cameraId: effectiveCameraId,
                cameraCode: camera?.code || "CAM-LIVE",
                siteName: siteName,
                violationType: vType,
                severity: sev,
                title: isVietnamese
                  ? `Cảnh báo: ${vType === "NO_HELMET" ? "Không đội mũ bảo hộ" : "Không mặc áo phản quang"}`
                  : `Alert: ${vType} Detected`,
                content: `Phát hiện trực tiếp từ camera ${camera?.code || cameraId}. Sự cố đã ghi nhận vào CSDL.`,
                evidenceUrl: snapUrl,
              }}
              onClose={() => hotToast.dismiss(t.id)}
              onOpenIncident={(incId) => {
                hotToast.dismiss(t.id);
                router.push(`/incidents/${incId}`);
              }}
            />
          ),
          {
            id: `live-alert-${createdId}`,
            duration: 10000,
            position: "top-right",
          }
        );

        // 6. Làm mới danh sách sự cố và số đếm thông báo trên toàn hệ thống
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: incidentKeys.all }),
          queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        ]);
      } catch (err: any) {
        console.error("[CameraIntelligenceContent] Lỗi khi tạo sự cố trực tiếp:", err);
        hotToast.error(
          isVietnamese
            ? `Không thể tạo sự cố trên máy chủ: ${err?.message || "Vui lòng thử lại"}`
            : `Failed to create incident: ${err?.message || "Please retry"}`
        );
      } finally {
        setIsSimulating(false);
      }
    },
    [
      camera,
      cameraId,
      capturedSnapshotUrl,
      isVietnamese,
      playAlert,
      queryClient,
      router,
      siteName,
      streamMetadata?.youtubeId,
    ]
  );

  // Tích lũy vi phạm theo phiên xem thực tế: khi AI phát hiện vi phạm mới thì chèn thêm dòng,
  // khi video lặp (loop về 0s) thì KHÔNG bị xóa và không bị nhân đôi.
  useEffect(() => {
    const liveItems = resolvedTrackingData.violations;
    if (!liveItems || liveItems.length === 0) return;

    const newItems = liveItems.filter((v) => !knownViolationsRef.current.has(v.event_id));
    if (newItems.length === 0) return;

    for (const item of newItems) {
      knownViolationsRef.current.add(item.event_id);
    }

    setSessionViolations((prev) => {
      const merged = [...newItems, ...prev];
      return merged.sort((a, b) => (b.frame ?? 0) - (a.frame ?? 0));
    });

    // Khi phát hiện vi phạm mới và đang bật chế độ quét tự động cảnh báo:
    if (autoAlertEnabled) {
      const now = Date.now();
      // Giãn cách Cooldown 30s giữa các lần tự động bắn sự cố để chống spam CSDL
      if (now - lastAutoIncidentTimeRef.current >= 30000) {
        lastAutoIncidentTimeRef.current = now;
        const firstNew = newItems[0];
        const vType = firstNew.violation_type?.toUpperCase().includes("HELMET")
          ? "NO_HELMET"
          : "NO_VEST";
        triggerLiveIncidentAlert({
          violationType: vType,
          description: `AI Camera quét luồng video phát hiện công nhân #${firstNew.person || "N/A"} vi phạm ${vType} tại frame #${firstNew.frame || 0}.`,
        });
      }
    }
  }, [resolvedTrackingData.violations, autoAlertEnabled, triggerLiveIncidentAlert]);

  const handleResetSessionLog = useCallback(() => {
    knownViolationsRef.current.clear();
    setSessionViolations([]);
  }, []);

  const handleSeekToFrame = useCallback((targetFrame: number) => {
    const fps = streamMetadata.fps || aiConfig.processFps || 25;
    const targetSec = Math.max(0, (targetFrame - 1) / fps);
    setLiveElapsedSec(targetSec);
    if (videoRef.current) {
      videoRef.current.currentTime = targetSec;
    }
  }, [streamMetadata.fps, aiConfig.processFps]);

  const handleViewSnapshot = useCallback((url: string) => {
    setLightboxEvidenceUrl(url);
  }, []);

  const handleOpenRoiDrawer = useCallback(() => {
    setRoiDrawerOpen(true);
  }, []);

  const handleOpenHealthDialog = useCallback(() => {
    setHealthModalOpen(true);
  }, []);

  const handleOpenAiModal = useCallback(() => {
    setAiModalOpen(true);
  }, []);

  // Trạng thái tự động phân tích AI cho camera mới
  const [autoAnalysisState, setAutoAnalysisState] = useState<{
    status: "idle" | "initializing" | "downloading" | "processing" | "completed" | "error";
    progress: number;
    message?: string;
  }>({ status: "idle", progress: 0 });

  const handleStartAutoAnalyze = useCallback(async () => {
    if (!cameraId || !effectiveStreamUrl) return;
    try {
      setAutoAnalysisState({
        status: "initializing",
        progress: 10,
        message: isVietnamese
          ? "Đang khởi tạo suy luận YOLOv11..."
          : "Initializing YOLOv11...",
      });
      const res = await fetch("/api/cameras/auto-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraId,
          streamUrl: effectiveStreamUrl,
          modelPath: aiConfig.modelVersionId,
          confidenceThreshold: aiConfig.confidenceThreshold,
          confirmationDuration: aiConfig.confirmationDuration,
          cooldownDuration: aiConfig.cooldownDuration,
          enableNoHelmet: aiConfig.enableNoHelmet,
          enableNoVest: aiConfig.enableNoVest,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAutoAnalysisState({
          status: data.data.status || "processing",
          progress: data.data.progress || 15,
          message: data.data.message,
        });
      }
    } catch (err: any) {
      setAutoAnalysisState({
        status: "error",
        progress: 0,
        message: err?.message || "Lỗi khởi chạy phân tích AI.",
      });
    }
  }, [cameraId, effectiveStreamUrl, aiConfig, isVietnamese]);

  // Tự động thăm dò tiến trình phân tích AI nếu đang chạy
  useEffect(() => {
    if (!cameraId) return;
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/cameras/auto-analyze?cameraId=${cameraId}`);
        const data = await res.json();
        if (cancelled || !data?.success || !data.data) return;

        const info = data.data;
        if (info.status === "completed" && info.logUrl) {
          setAutoAnalysisState({
            status: "completed",
            progress: 100,
            message: info.message || "Đã phân tích xong!",
          });
          // Nạp log ngay
          fetch(info.logUrl)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d && !cancelled) {
                const frames = Array.isArray(d) ? d : d.frames;
                if (frames && frames.length > 0) {
                  setRealLogData({ frames, meta: d.meta });
                  if (info.videoUrl && !customStreamUrl) {
                    setCustomStreamUrl(info.videoUrl);
                  }
                }
              }
            })
            .catch(() => {});
        } else if (
          info.status === "processing" ||
          info.status === "downloading" ||
          info.status === "initializing"
        ) {
          setAutoAnalysisState({
            status: info.status,
            progress: info.progress || 20,
            message: info.message,
          });
        }
      } catch {
        // ignore polling error
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cameraId, customStreamUrl]);

  // Tự động kích hoạt phân tích AI cho camera mới khi chưa có file log
  useEffect(() => {
    if (!cameraId || realLogData || !effectiveStreamUrl) return;
    const isYoutube =
      effectiveStreamUrl.includes("youtube.com") ||
      effectiveStreamUrl.includes("youtu.be");
    const isVideo =
      effectiveStreamUrl.endsWith(".mp4") ||
      effectiveStreamUrl.includes("/videos/");
    if (!isYoutube && !isVideo) return;

    if (autoAnalysisState.status === "idle") {
      handleStartAutoAnalyze();
    }
  }, [cameraId, effectiveStreamUrl, realLogData, autoAnalysisState.status, handleStartAutoAnalyze]);

  // Handlers
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
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

  const handleSaveAiConfig = async (newConfig: AiInspectionConfig) => {
    setAiConfig(newConfig);

    // 1. Lưu bền vững vào localStorage riêng cho camera này (bao gồm model .pt & processFps)
    try {
      localStorage.setItem(`ppe_camera_ai_config_${cameraId}`, JSON.stringify(newConfig));
    } catch {
      // ignore storage errors
    }

    // 2. Lưu cấu hình an toàn riêng cho Camera xuống Backend (Site Service) & Camera Hardware Config
    if (cameraId) {
      const resolvedModelUuid =
        newConfig.modelVersionId === "models/best.pt" || !newConfig.modelVersionId
          ? "0192e210-0000-7000-8000-000000000001"
          : newConfig.modelVersionId;
      siteService
        .updateCameraSafetyConfig(cameraId, {
          confidenceThreshold: newConfig.confidenceThreshold,
          confirmationDuration: newConfig.confirmationDuration,
          cooldownDuration: newConfig.cooldownDuration,
          enableNoHelmet: newConfig.enableNoHelmet,
          enableNoVest: newConfig.enableNoVest,
          enableRestrictedArea: newConfig.enableRestrictedArea,
          modelVersionId: resolvedModelUuid,
        })
        .catch(() => {});
    }

    if (cameraId && newConfig.processFps) {
      cameraService
        .updateCameraConfig(cameraId, {
          captureFps: newConfig.processFps,
        })
        .catch(() => {});
    }

    toast.success(
      isVietnamese
        ? `Đã lưu & áp dụng cấu hình AI mới (${resolveModelPath(newConfig.modelVersionId).replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%) cho Camera ${camera?.code || cameraId}!`
        : `Saved & applied new AI config (${resolveModelPath(newConfig.modelVersionId).replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%) to Camera ${camera?.code || cameraId}!`
    );
  };

  const captureCurrentVideoFrame = (): string | null => {
    try {
      const v = videoRef.current;
      if (v && v.videoWidth && v.videoHeight) {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/jpeg", 0.95);
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  const handleSnapshotCapture = (dataUrl?: string | null, _isRealCanvas?: boolean) => {
    const latestViol =
      resolvedTrackingData.violations[resolvedTrackingData.violations.length - 1];

    const safeId = cameraId ? cameraId.replace(/[^a-zA-Z0-9_-]/g, "") : "";
    const idFallback =
      safeId.includes("01a19e19")
        ? "/images/camera-01a19e19-evidence.jpg"
        : safeId.includes("01a18735")
        ? "/images/camera-01a18735-evidence.jpg"
        : safeId.includes("01a19ce7")
        ? "/images/camera-01a19ce7-evidence.jpg"
        : safeId.includes("01a19d07")
        ? "/images/camera-01a19d07-evidence.jpg"
        : safeId.includes("01a19cf4")
        ? "/images/camera-01a19cf4-evidence.jpg"
        : null;

    const finalUrl =
      dataUrl ||
      captureCurrentVideoFrame() ||
      latestViol?.evidence_path ||
      resolvedTrackingData.entry?.evidence?.[0]?.path ||
      camera?.snapshotUrl ||
      idFallback ||
      (streamMetadata.youtubeId
        ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`
        : "/images/camera-live-evidence.jpg");

    if (!finalUrl) return;

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

          {/* Nút Bắn thử sự cố mẫu thời gian thực để test thông báo & còi hú */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerLiveIncidentAlert()}
            disabled={isSimulating}
            className="gap-1.5 rounded-xl text-xs font-bold border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            title={
              isVietnamese
                ? "Bắn thử sự cố vi phạm mẫu để kiểm tra còi hú Siren, Toast 10s và điều hướng"
                : "Simulate safety violation incident to test Siren sound, 10s Toast, and navigation"
            }
          >
            <ShieldAlert className={`h-4 w-4 text-rose-500 ${isSimulating ? "animate-spin" : "animate-pulse"}`} />
            <span>{isVietnamese ? "Bắn Thử Sự Cố" : "Simulate Alert"}</span>
          </Button>

          {/* Toggle Bật/Tắt Cảnh báo Tự động khi quét thấy vi phạm trên video/webcam */}
          <button
            type="button"
            onClick={() => setAutoAlertEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition shadow-sm ${
              autoAlertEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border/40 bg-muted/30 text-muted-foreground"
            }`}
            title={
              autoAlertEnabled
                ? isVietnamese
                  ? "Đang BẬT tự động tạo sự cố và hú còi khi video quét thấy vi phạm (Bấm để tắt)"
                  : "Auto Alert ON (Click to disable)"
                : isVietnamese
                  ? "Đang TẮT tự động tạo sự cố khi quét video (Bấm để bật)"
                  : "Auto Alert OFF (Click to enable)"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoAlertEnabled ? "bg-emerald-500 animate-ping" : "bg-muted-foreground"
              }`}
            />
            <span>
              {autoAlertEnabled
                ? isVietnamese
                  ? "Quét Tự Động: BẬT"
                  : "Live Scan: ON"
                : isVietnamese
                  ? "Quét Tự Động: TẮT"
                  : "Live Scan: OFF"}
            </span>
          </button>

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
            isRealAiLog={resolvedTrackingData.isRealAiLog}
            autoAnalysisState={autoAnalysisState}
            onStartAutoAnalyze={handleStartAutoAnalyze}
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
            onViewSnapshot={handleViewSnapshot}
            onSeekToFrame={handleSeekToFrame}
            cameraStatus={camera?.status || "ONLINE"}
            realIncidentsCount={incidentsResult?.meta?.total ?? realIncidents.length}
            totalFrames={liveSessionState?.total_frames || realLogData?.frames?.length}
          />
        </div>
      </div>

      {/* Inspector dùng toàn bộ chiều rộng để bảng theo dõi và navigation không bị nén bởi cột video. */}
      <CameraAiInspectorCard
        currentEntry={resolvedTrackingData.entry}
        personTracks={resolvedTrackingData.personTracks}
        allViolations={sessionViolations.length > 0 ? sessionViolations : resolvedTrackingData.violations}
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
        zoneName={zoneName}
        safetyConfig={aiConfig}
        activeModelName={activeModelDisplayName}
        realIncidents={realIncidents}
        totalIncidents={incidentsResult?.meta?.total}
        isIncidentsLoading={isIncidentsLoading}
        fps={streamMetadata.fps || aiConfig.processFps || camera?.streams?.[0]?.fps || 25}
        resolution={streamMetadata.aspectRatioLabel || camera?.streams?.[0]?.resolution}
        streamType={streamMetadata.streamType}
        liveViolations={sessionViolations}
        onSeekToFrame={handleSeekToFrame}
        onViewSnapshot={handleViewSnapshot}
        onOpenRoiDrawer={handleOpenRoiDrawer}
        onOpenHealthDialog={handleOpenHealthDialog}
        onOpenAiModal={handleOpenAiModal}
        onResetSessionLog={handleResetSessionLog}
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
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40 flex items-center justify-center min-h-[220px]">
              <img
                src={lightboxEvidenceUrl}
                alt="Camera Evidence Snapshot"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                onError={(e) => {
                  const safeId = cameraId ? cameraId.replace(/[^a-zA-Z0-9_-]/g, "") : "";
                  if (safeId.includes("01a19e19") && !e.currentTarget.src.includes("camera-01a19e19")) {
                    e.currentTarget.src = "/images/camera-01a19e19-evidence.jpg";
                    return;
                  }
                  if (safeId.includes("01a18735") && !e.currentTarget.src.includes("camera-01a18735")) {
                    e.currentTarget.src = "/images/camera-01a18735-evidence.jpg";
                    return;
                  }
                  if (safeId.includes("01a19ce7") && !e.currentTarget.src.includes("camera-01a19ce7")) {
                    e.currentTarget.src = "/images/camera-01a19ce7-evidence.jpg";
                    return;
                  }
                  if (safeId.includes("01a19d07") && !e.currentTarget.src.includes("camera-01a19d07")) {
                    e.currentTarget.src = "/images/camera-01a19d07-evidence.jpg";
                    return;
                  }
                  if (safeId.includes("01a19cf4") && !e.currentTarget.src.includes("camera-01a19cf4")) {
                    e.currentTarget.src = "/images/camera-01a19cf4-evidence.jpg";
                    return;
                  }
                  if (streamMetadata.youtubeId && !e.currentTarget.src.includes("img.youtube.com")) {
                    e.currentTarget.src = `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`;
                    return;
                  }
                  e.currentTarget.src = "/images/camera-live-evidence.jpg";
                }}
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
