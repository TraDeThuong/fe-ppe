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
import { useTableState } from "@/hooks/use-table-state";
import { useIncidents } from "@/hooks/incidents";
import { useSiteSafetyConfig } from "@/hooks/sites";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { cameraService } from "@/services/camera.service";
import { siteService } from "@/services/site.service";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
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

  const incidentsTable = useTableState([{ id: "detectedAt", desc: true }], cameraId);

  // 2. Lấy dữ liệu sự cố vi phạm THỰC TẾ từ Backend API theo cameraId này
  const {
    data: incidentsResult,
    isLoading: isIncidentsLoading,
    isFetching: incidentsFetching,
    error: incidentsError,
    refetch: refetchIncidents,
  } = useIncidents({
    cameraId,
    page: incidentsTable.pagination.pageIndex + 1,
    limit: incidentsTable.pagination.pageSize,
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
  const [analyzedVideoUrl, setAnalyzedVideoUrl] = useState<string | null>(null);

  const defaultStreamUrl = useMemo(() => {
    if (analyzedVideoUrl) return analyzedVideoUrl;
    if (cameraStreamUrl) return cameraStreamUrl;
    return "";
  }, [analyzedVideoUrl, cameraStreamUrl]);

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
    setAnalyzedVideoUrl(null);
    setRealLogData(null);
    setLiveElapsedSec(0);
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
    let isVertical = isShorts;
    let videoWidth = isShorts ? 720 : 1280;
    let videoHeight = isShorts ? 1280 : 720;
    let fps = 25;
    let aspectRatioLabel = isShorts ? "720 × 1280 (9:16 Shorts Dọc)" : "1280 × 720 (16:9 Video)";

    if (isShorts) {
      streamType = "youtube_shorts";
      isVertical = true;
      videoWidth = 720;
      videoHeight = 1280;
      aspectRatioLabel = "720 × 1280 (9:16 Shorts Dọc)";
    } else if (youtubeId) {
      streamType = "youtube_video";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      aspectRatioLabel = "1280 × 720 (16:9 YouTube)";
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
      url.includes("/videos/")
    ) {
      streamType = "html5_video";
      isVertical = false;
      videoWidth = 1280;
      videoHeight = 720;
      aspectRatioLabel = "1280 × 720 (HTML5 MP4 Native)";
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

  // 5b. Danh sách vùng cấm nguy hiểm có hiệu lực cho camera này
  const [effectiveRestrictedAreas, setEffectiveRestrictedAreas] = useState<any[]>([]);

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
          if (Array.isArray(effective.restrictedAreas)) {
            setEffectiveRestrictedAreas(effective.restrictedAreas);
          }
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

  // Vòng lặp đồng bộ thời gian phát dự phòng khi không dùng thẻ <video> native
  useEffect(() => {
    if (!isPlaying) return;

    const isNativeVideo =
      effectiveStreamUrl.endsWith(".mp4") ||
      effectiveStreamUrl.endsWith(".webm") ||
      effectiveStreamUrl.startsWith("blob:") ||
      effectiveStreamUrl.startsWith("/videos/");

    if (isNativeVideo || liveSessionId) return;

    const interval = setInterval(() => {
      setLiveElapsedSec((prev) => prev + 0.04);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying, effectiveStreamUrl, liveSessionId]);

  useEffect(() => {
    let active = true;

    const safeId = cameraId ? cameraId.replace(/[^a-zA-Z0-9_-]/g, "") : "";
    const shortId = safeId ? safeId.slice(0, 8) : "";
    const rawStreamLower = (cameraStreamUrl || "").toLowerCase();

    // Danh sách ứng viên (logUrl, videoUrl) ưu tiên khớp chính xác ID camera hoặc nguồn video chuẩn
    const candidates: Array<{ logUrl: string; videoUrl: string }> = [];
    if (safeId) {
      candidates.push({
        logUrl: `/data/camera-${safeId}-log.json`,
        videoUrl: `/videos/cameras/camera-${safeId}.mp4`,
      });
    }
    if (shortId && shortId !== safeId) {
      candidates.push({
        logUrl: `/data/camera-${shortId}-log.json`,
        videoUrl: `/videos/cameras/camera-${shortId}.mp4`,
      });
    }

    const inferLogMeta = (frames: FrameLogEntry[], rawMeta?: any) => {
      if (rawMeta?.size && Array.isArray(rawMeta.size) && rawMeta.size.length === 2) {
        return rawMeta;
      }
      let maxX = 0;
      let maxY = 0;
      for (const fr of frames.slice(0, 120)) {
        for (const det of fr.detections || []) {
          if (Array.isArray(det.bbox) && det.bbox.length === 4) {
            if (det.bbox[2] > maxX) maxX = det.bbox[2];
            if (det.bbox[3] > maxY) maxY = det.bbox[3];
          }
        }
      }
      let inferredSize: [number, number] = [1280, 720];
      if (maxY > 1280 && maxX <= 1080) {
        inferredSize = [1080, 1920];
      } else if (maxY > 1280 && maxX <= 900) {
        inferredSize = [900, 1596];
      } else if (maxY > 720 && maxX <= 720) {
        inferredSize = [720, 1280];
      } else if (maxY > 640 && maxX <= 480) {
        inferredSize = [480, 854];
      } else if (maxY <= 640 && maxX <= 360 && maxY > maxX) {
        inferredSize = [360, 640];
      }
      const lastT = frames[frames.length - 1]?.t || 10;
      const inferredFps = lastT > 0 ? Math.round(frames.length / lastT) || 25 : 25;
      return {
        ...rawMeta,
        size: inferredSize,
        viewBox: inferredSize,
        isVertical: inferredSize[1] > inferredSize[0],
        fps: rawMeta?.fps || inferredFps,
      };
    };

    const loadCandidateAt = async (idx: number) => {
      if (!active || idx >= candidates.length) {
        if (active) setRealLogData(null);
        return;
      }
      const cand = candidates[idx];
      try {
        const res = await fetch(cand.logUrl);
        if (!res.ok) {
          await loadCandidateAt(idx + 1);
          return;
        }
        const data = await res.json();
        const frames: FrameLogEntry[] = Array.isArray(data) ? data : data?.frames;
        if (active && Array.isArray(frames) && frames.length > 0) {
          const normalizedMeta = inferLogMeta(frames, data?.meta);
          setRealLogData({ frames, meta: normalizedMeta });
          setAnalyzedVideoUrl(cand.videoUrl);
        } else {
          await loadCandidateAt(idx + 1);
        }
      } catch {
        await loadCandidateAt(idx + 1);
      }
    };

    if (candidates.length > 0) {
      loadCandidateAt(0);
    } else {
      setRealLogData(null);
    }

    return () => {
      active = false;
    };
  }, [cameraId, cameraStreamUrl]);

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
            const rawEvPath = v.evidence_path || matchedEv?.path;
            const rawRefPath =
              v.reference_path ||
              matchedEv?.reference_path ||
              (rawEvPath?.startsWith("/api/jobs/live/evidence/")
                ? rawEvPath.replace(/\.jpg$/i, "_ref.jpg")
                : undefined);
            allViolations.push({
              ...v,
              frame: v.frame || f.frame,
              evidence_path: rawEvPath,
              reference_path: rawRefPath,
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

  // Đồng bộ Bounding Box & Telemetry chuẩn xác 100% theo từng frame
  const resolvedTrackingData = useMemo(() => {
    const isUsingLocalAnalyzedVideo =
      !customStreamUrl && Boolean(analyzedVideoUrl && realLogData?.frames?.length);

    // 1. Khi phát thẻ <video> MP4 cục bộ có sẵn file Log AI chuẩn:
    // Đồng bộ trực tiếp với currentTime của thẻ <video> để khớp 100% từng miligiây (0ms drift)
    if (isUsingLocalAnalyzedVideo && realLogData?.frames && realLogData.frames.length > 0) {
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
      const rawFrame = frames[bestIdx];

      // Nếu tắt xử lý AI (processingEnabled === false), trả về khung hình trống không vẽ box
      if (camera?.config?.processingEnabled === false) {
        return {
          entry: {
            ...rawFrame,
            detections: [],
            persons: [],
            associations: [],
            confirmations: [],
          },
          violations: [],
          personTracks: [],
          isRealAiLog: true,
        };
      }

      // Lọc theo vùng ROI Polygon nếu camera có cấu hình ROI
      const roiPoly = camera?.config?.roiPolygon;
      const [coordW, coordH] = realLogData.meta?.size || [streamMetadata.videoWidth || 1280, streamMetadata.videoHeight || 720];
      let filteredDetections = rawFrame.detections || [];
      let filteredPersons = rawFrame.persons || [];

      if (Array.isArray(roiPoly) && roiPoly.length >= 3 && coordW > 0 && coordH > 0) {
        const isPointInRoi = (px: number, py: number) => {
          let inside = false;
          for (let i = 0, j = roiPoly.length - 1; i < roiPoly.length; j = i++) {
            const xi = roiPoly[i].x <= 1 && roiPoly[i].y <= 1 ? roiPoly[i].x : roiPoly[i].x / coordW;
            const yi = roiPoly[i].x <= 1 && roiPoly[i].y <= 1 ? roiPoly[i].y : roiPoly[i].y / coordH;
            const xj = roiPoly[j].x <= 1 && roiPoly[j].y <= 1 ? roiPoly[j].x : roiPoly[j].x / coordW;
            const yj = roiPoly[j].x <= 1 && roiPoly[j].y <= 1 ? roiPoly[j].y : roiPoly[j].y / coordH;
            const intersect =
              yi > py !== yj > py &&
              px < ((xj - xi) * (py - yi)) / (Math.abs(yj - yi) > 1e-9 ? yj - yi : 1e-9) + xi;
            if (intersect) inside = !inside;
          }
          return inside;
        };

        const allowedPersonIds = new Set<number>();
        filteredDetections = filteredDetections.filter((d) => {
          if (d.class_name === "person" && Array.isArray(d.bbox) && d.bbox.length === 4) {
            const footX = (d.bbox[0] + d.bbox[2]) * 0.5 / coordW;
            const footY = d.bbox[3] / coordH;
            const inside = isPointInRoi(footX, footY);
            if (inside && typeof d.track_id === "number") {
              allowedPersonIds.add(d.track_id);
            }
            return inside;
          }
          return true;
        });
        filteredPersons = filteredPersons.filter((p) => allowedPersonIds.has(p.track_id));
      }

      const currentViolations = fullViolations.filter((v) => v.frame <= rawFrame.frame);

      return {
        entry: {
          ...rawFrame,
          detections: filteredDetections,
          persons: filteredPersons,
        },
        violations: currentViolations,
        personTracks: fullPersonTracks.length > 0 ? fullPersonTracks : liveTrackingData.personTracks,
        isRealAiLog: true,
      };
    }

    // 2. Dữ liệu thời gian thực từ Look-Ahead Live AI Engine (Port 8000) cho luồng RTSP / YouTube mới / Webcam
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

    // 3. Nếu đang xem một Job đã xử lý sẵn với customStreamUrl
    if (realLogData?.frames && realLogData.frames.length > 0) {
      const frames = realLogData.frames;
      const totalDuration = frames[frames.length - 1].t || 10.08;
      const loopedTime = totalDuration > 0 ? liveElapsedSec % totalDuration : 0;

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

    // 4. Nếu chưa có log AI thực tế hoặc đang chạy phân tích, KHÔNG sinh box hay vi phạm giả lập
    return {
      entry: null,
      violations: [],
      personTracks: [],
      isRealAiLog: false,
    };
  }, [
    customStreamUrl,
    analyzedVideoUrl,
    liveSessionId,
    liveSessionState,
    realLogData,
    liveElapsedSec,
    fullViolations,
    fullPersonTracks,
    liveTrackingData,
    camera?.config?.processingEnabled,
    camera?.config?.roiPolygon,
    streamMetadata.videoWidth,
    streamMetadata.videoHeight,
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
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const lastAutoIncidentTimeRef = useRef<number>(0);
  const knownViolationsRef = useRef<Set<string>>(new Set());

  /**
   * Chụp khung hình thực tế từ thẻ <video> hiện tại và vẽ chính xác các Bounding Box AI thực tế
   * từ `resolvedTrackingData.entry.detections` (tuyệt đối không dùng tọa độ giả lập cố định).
   */
  const captureCurrentVideoFrame = useCallback(
    (annotate: boolean = true, forceViolationHighlight: boolean = false): string | null => {
      try {
        const v =
          videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight
            ? videoRef.current
            : typeof document !== "undefined"
            ? document.querySelector<HTMLVideoElement>('video[data-webcam-video="true"]')
            : null;

        if (!v || !v.videoWidth || !v.videoHeight) {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // 1. Vẽ frame video gốc
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

        // 2. Nếu annotate=true: Vẽ trực tiếp các detections thực tế từ frame AI hiện tại lên canvas
        if (annotate) {
          const entryDets = resolvedTrackingData.entry?.detections || [];
          const entryPersons = resolvedTrackingData.entry?.persons || [];
          const personMap = new Map(entryPersons.map((p) => [p.track_id, p]));

          // Xác định hệ tọa độ gốc của các detections
          const [coordW, coordH] =
            !customStreamUrl && analyzedVideoUrl && realLogData?.meta?.size
              ? realLogData.meta.size
              : liveSessionState?.size && liveSessionState.size.length === 2
              ? liveSessionState.size
              : [
                  streamMetadata.videoWidth || canvas.width,
                  streamMetadata.videoHeight || canvas.height,
                ];

          const scaleX = coordW > 0 ? canvas.width / coordW : 1;
          const scaleY = coordH > 0 ? canvas.height / coordH : 1;

          // Vẽ vùng ROI Polygon nếu có
          const roiPoly = camera?.config?.roiPolygon;
          if (Array.isArray(roiPoly) && roiPoly.length >= 3) {
            ctx.save();
            ctx.beginPath();
            roiPoly.forEach((pt, idx) => {
              const px = (pt.x <= 1 && pt.y <= 1 ? pt.x * coordW : pt.x) * scaleX;
              const py = (pt.x <= 1 && pt.y <= 1 ? pt.y * coordH : pt.y) * scaleY;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
            ctx.fill();
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = Math.max(2, Math.round(canvas.width / 500));
            ctx.setLineDash([8, 5]);
            ctx.stroke();
            ctx.restore();
          }

          // Vẽ các vùng cấm nguy hiểm Restricted Area (nếu bật enableRestrictedArea)
          if (aiConfig.enableRestrictedArea && Array.isArray(effectiveRestrictedAreas) && effectiveRestrictedAreas.length > 0) {
            effectiveRestrictedAreas.forEach((area: any) => {
              const boundary = area?.boundary;
              if (Array.isArray(boundary) && boundary.length >= 3) {
                ctx.save();
                ctx.beginPath();
                boundary.forEach((pt: any, idx: number) => {
                  const px = (pt.x <= 1 && pt.y <= 1 ? pt.x * coordW : pt.x) * scaleX;
                  const py = (pt.y <= 1 && pt.y <= 1 ? pt.y * coordH : pt.y) * scaleY;
                  if (idx === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.fillStyle = "rgba(239, 68, 68, 0.16)";
                ctx.fill();
                ctx.strokeStyle = "#ef4444";
                ctx.lineWidth = Math.max(2, Math.round(canvas.width / 450));
                ctx.setLineDash([6, 4]);
                ctx.stroke();

                // Nhãn cảnh báo vùng nguy hiểm
                const firstPt = boundary[0];
                if (firstPt) {
                  const labelX = (firstPt.x <= 1 && firstPt.y <= 1 ? firstPt.x * coordW : firstPt.x) * scaleX;
                  const labelY = (firstPt.y <= 1 && firstPt.y <= 1 ? firstPt.y * coordH : firstPt.y) * scaleY;
                  ctx.fillStyle = "#ef4444";
                  ctx.font = "bold 11px sans-serif";
                  ctx.fillText(`🚨 ${area.name || "VÙNG CẤM NGUY HIỂM"}`, labelX + 6, Math.max(16, labelY - 6));
                }
                ctx.restore();
              }
            });
          }

          // Nếu đang chụp ảnh cho Sự cố (forceViolationHighlight) mà frame hiện tại chưa có người ở trạng thái CONFIRMED_VIOLATION,
          // chọn person đầu tiên được AI phát hiện thực tế trong frame để tô đỏ đúng vị trí của họ.
          const hasConfirmedInFrame = entryPersons.some(
            (p) => p.status === "CONFIRMED_VIOLATION" || p.status === "VIOLATION" || p.status === "VIOLATION_CANDIDATE"
          );
          const fallbackViolatorTrackId =
            forceViolationHighlight && !hasConfirmedInFrame
              ? entryDets.find((d) => d.class_name === "person")?.track_id
              : undefined;

          for (const det of entryDets) {
            if (!Array.isArray(det.bbox) || det.bbox.length !== 4) continue;
            const [x1, y1, x2, y2] = det.bbox;
            const bx = x1 * scaleX;
            const by = y1 * scaleY;
            const bw = Math.max(6, (x2 - x1) * scaleX);
            const bh = Math.max(6, (y2 - y1) * scaleY);

            const pState =
              det.class_name === "person" && typeof det.track_id === "number"
                ? personMap.get(det.track_id)
                : undefined;

            const isViolating =
              pState?.status === "CONFIRMED_VIOLATION" ||
              pState?.status === "VIOLATION" ||
              (forceViolationHighlight &&
                det.class_name === "person" &&
                det.track_id !== undefined &&
                det.track_id === fallbackViolatorTrackId);
            const isCandidate = !isViolating && pState?.status === "VIOLATION_CANDIDATE";

            let strokeColor = "#10b981";
            let fillColor = "rgba(16, 185, 129, 0.10)";
            let labelText = "";
            const confPct = `${Math.round((det.confidence || 0.95) * 100)}%`;

            if (det.class_name === "person") {
              if (isViolating) {
                strokeColor = "#f43f5e";
                fillColor = "rgba(244, 63, 94, 0.18)";
                const vTypes = (pState?.violations || [])
                  .map((v) => {
                    const lower = v.toLowerCase();
                    if (lower.includes("helmet")) return isVietnamese ? "THIẾU MŨ" : "NO HELMET";
                    if (lower.includes("vest")) return isVietnamese ? "THIẾU ÁO" : "NO VEST";
                    return v.toUpperCase();
                  })
                  .join(" + ");
                labelText = `WORKER #${det.track_id ?? 1} • ${
                  isVietnamese ? "VI PHẠM" : "VIOLATION"
                }${vTypes ? `: ${vTypes}` : ""} (${confPct})`;
              } else if (isCandidate) {
                strokeColor = "#f59e0b";
                fillColor = "rgba(245, 158, 11, 0.14)";
                labelText = `WORKER #${det.track_id ?? 1} • ${
                  isVietnamese ? "ĐANG ĐẾM (3s)" : "EVALUATING"
                } (${confPct})`;
              } else {
                strokeColor = "#10b981";
                fillColor = "rgba(16, 185, 129, 0.10)";
                labelText = `WORKER #${det.track_id ?? 1} • ${
                  isVietnamese ? "ĐỦ BẢO HỘ" : "COMPLIANT"
                } (${confPct})`;
              }
            } else if (det.class_name === "helmet") {
              strokeColor = "#0ea5e9";
              fillColor = "rgba(14, 165, 233, 0.10)";
              labelText = `#${det.track_id ?? 1} ${isVietnamese ? "MŨ BẢO HỘ" : "HARD HAT"} (${confPct})`;
            } else if (det.class_name === "safety_vest") {
              strokeColor = "#a855f7";
              fillColor = "rgba(168, 85, 247, 0.10)";
              labelText = `#${det.track_id ?? 1} ${isVietnamese ? "ÁO PHẢN QUANG" : "SAFETY VEST"} (${confPct})`;
            } else {
              strokeColor = "#06b6d4";
              fillColor = "rgba(6, 182, 212, 0.10)";
              labelText = `${det.class_name.toUpperCase()} (${confPct})`;
            }

            // 2.1 Nền bán trong suốt & viền mảnh
            ctx.fillStyle = fillColor;
            ctx.fillRect(bx, by, bw, bh);

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = Math.max(1.5, Math.round(canvas.width / 500));
            ctx.strokeRect(bx, by, bw, bh);

            // 2.2 Thước ngắm 4 góc (L-Brackets)
            const cl = Math.min(bw * 0.22, bh * 0.22, Math.max(12, canvas.width / 42));
            ctx.lineWidth = Math.max(2.5, Math.round(canvas.width / 280));
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(bx, by + cl); ctx.lineTo(bx, by); ctx.lineTo(bx + cl, by);
            ctx.moveTo(bx + bw - cl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cl);
            ctx.moveTo(bx, by + bh - cl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cl, by + bh);
            ctx.moveTo(bx + bw - cl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cl);
            ctx.stroke();

            // 2.3 Tia laser quét ngang nếu đang vi phạm
            if (isViolating) {
              const scanY = by + bh * 0.28;
              ctx.strokeStyle = "rgba(244, 63, 94, 0.9)";
              ctx.lineWidth = Math.max(1.5, Math.round(canvas.width / 520));
              ctx.beginPath();
              ctx.moveTo(bx + 4, scanY);
              ctx.lineTo(bx + bw - 4, scanY);
              ctx.stroke();
            }

            // 2.4 Nhãn HUD
            const fontSize = Math.max(11, Math.min(18, Math.round(canvas.width / 62)));
            ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
            const textMetrics = ctx.measureText(labelText);
            const bannerW = textMetrics.width + 18;
            const bannerH = fontSize + 10;
            const bannerY = by > bannerH + 6 ? by - bannerH - 4 : by + 4;
            const bannerX = Math.max(4, Math.min(canvas.width - bannerW - 4, bx));

            ctx.fillStyle = "rgba(10, 15, 29, 0.92)";
            ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
            ctx.fillStyle = strokeColor;
            ctx.fillRect(bannerX, bannerY, 4, bannerH);
            ctx.fillStyle = "#ffffff";
            ctx.textBaseline = "middle";
            ctx.fillText(labelText, bannerX + 10, bannerY + bannerH / 2);
          }
        }

        return canvas.toDataURL("image/jpeg", 0.95);
      } catch {
        return null;
      }
    },
    [
      resolvedTrackingData.entry,
      customStreamUrl,
      analyzedVideoUrl,
      realLogData?.meta?.size,
      liveSessionState?.size,
      streamMetadata.videoWidth,
      streamMetadata.videoHeight,
      camera?.config?.roiPolygon,
      isVietnamese,
    ]
  );

  /**
   * Kích hoạt sự cố trực tiếp từ luồng Camera/YouTube/Webcam (Tạo Incident thật vào DB + Hú còi + Bung Toast 10s)
   */
  const triggerLiveIncidentAlert = useCallback(
    async (customPayload?: { violationType?: string; description?: string }) => {
      try {
        setIsSimulating(true);
        const vType = customPayload?.violationType || "NO_HELMET";
        const sev = vType === "NO_HELMET" ? "CRITICAL" : "HIGH";

        // 1. Trích xuất ảnh bằng chứng AI thực tế ngay tại frame hiện tại của Camera/Video stream
        const safeCamStr = (cameraId || camera?.id || camera?.code || "").toLowerCase();
        const latestViol =
          resolvedTrackingData.violations[resolvedTrackingData.violations.length - 1];

        const freshAnnotatedFrame = captureCurrentVideoFrame(true, true);
        const freshRawFrame = captureCurrentVideoFrame(false, false);

        // Ưu tiên số 1: Ảnh bằng chứng vi phạm thực tế từ AI Service hoặc snapshot trực tiếp từ video
        const actualEvidenceUrl =
          latestViol?.evidence_path ||
          capturedSnapshotUrl ||
          freshAnnotatedFrame ||
          (liveSessionId && (liveSessionState?.status === "streaming" || liveSessionState?.status === "buffering")
            ? `/api/live/${liveSessionId}/frame.jpg?bbox=1`
            : null) ||
          resolvedTrackingData.entry?.evidence?.[0]?.path ||
          camera?.snapshotUrl ||
          null;

        // 1b. Trích xuất Ảnh Đối Chứng (Reference Snapshot: từ AI Service hoặc frame gốc)
        const derivedLiveRefPath =
          latestViol?.reference_path ||
          resolvedTrackingData.entry?.evidence?.[0]?.reference_path ||
          (latestViol?.evidence_path?.startsWith("/api/jobs/live/evidence/")
            ? latestViol.evidence_path.replace(/\.jpg$/i, "_ref.jpg")
            : null);

        const actualReferenceUrl =
          latestViol?.reference_path ||
          freshRawFrame ||
          (liveSessionId && (liveSessionState?.status === "streaming" || liveSessionState?.status === "buffering")
            ? `/api/live/${liveSessionId}/frame.jpg?bbox=0`
            : null) ||
          derivedLiveRefPath ||
          (streamMetadata?.youtubeId ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg` : null) ||
          camera?.snapshotUrl ||
          null;

        // Trích xuất tọa độ Bounding Box thực tế từ AI Service (Ưu tiên box [0..1] chuẩn hóa từ latestViol)
        let realViolationBox: { x: number; y: number; width: number; height: number; label: string; confidence: number } | null = null;
        if (latestViol?.box && typeof latestViol.box.x === "number") {
          const rawBox = latestViol.box;
          realViolationBox = {
            x: Number((rawBox.x <= 1 ? rawBox.x * 100 : rawBox.x).toFixed(1)),
            y: Number((rawBox.y <= 1 ? rawBox.y * 100 : rawBox.y).toFixed(1)),
            width: Number((rawBox.width <= 1 ? rawBox.width * 100 : rawBox.width).toFixed(1)),
            height: Number((rawBox.height <= 1 ? rawBox.height * 100 : rawBox.height).toFixed(1)),
            label: rawBox.label || vType,
            confidence: Number((rawBox.confidence || 0.96).toFixed(2)),
          };
        } else {
          const entryDets = resolvedTrackingData.entry?.detections || [];
          const entryPersons = resolvedTrackingData.entry?.persons || [];
          
          // Tìm person đang bị đánh dấu vi phạm trong frame
          const violatorTrack = entryPersons.find((p) => p.status === "CONFIRMED_VIOLATION" || p.status === "VIOLATION_CANDIDATE") || entryPersons[0];
          const violatorDet = violatorTrack
            ? entryDets.find((d) => d.class_name === "person" && d.track_id === violatorTrack.track_id)
            : entryDets.find((d) => d.class_name === "person");

          if (violatorDet && violatorDet.bbox) {
            const [bx1, by1, bx2, by2] = violatorDet.bbox;
            const [coordW, coordH] =
              !customStreamUrl && analyzedVideoUrl && realLogData?.meta?.size
                ? realLogData.meta.size
                : liveSessionState?.size && liveSessionState.size.length === 2
                ? liveSessionState.size
                : [
                    streamMetadata.videoWidth || (streamMetadata.isVertical ? 720 : 1280),
                    streamMetadata.videoHeight || (streamMetadata.isVertical ? 1280 : 720),
                  ];
            realViolationBox = {
              x: Number(((bx1 / coordW) * 100).toFixed(1)),
              y: Number(((by1 / coordH) * 100).toFixed(1)),
              width: Number((((bx2 - bx1) / coordW) * 100).toFixed(1)),
              height: Number((((by2 - by1) / coordH) * 100).toFixed(1)),
              label: vType,
              confidence: Number((violatorDet.confidence || 0.96).toFixed(2)),
            };
          }
        }

        // 2. Sử dụng siteId và cameraId thực tế từ camera hiện hành
        const effectiveCameraId = camera?.id || cameraId;
        const effectiveSiteId = camera?.siteId || siteId;

        // 3. Tạo Incident thực sự vào CSDL qua API
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
        });

        const createdId = newIncident?.id || (newIncident as any)?.data?.id || (newIncident as any)?.incidentId;
        if (!createdId) {
          throw new Error("Không nhận được mã ID sự cố từ máy chủ");
        }

        // 4. Lưu ảnh bằng chứng thực tế, ảnh đối chứng & tọa độ Bounding Box vào Client-side Cache
        if (typeof window !== "undefined") {
          try {
            if (actualEvidenceUrl) {
              sessionStorage.setItem(`ppe_incident_evidence_${createdId}`, actualEvidenceUrl);
              sessionStorage.setItem(`ppe_camera_evidence_${effectiveCameraId}`, actualEvidenceUrl);
            }
            if (actualReferenceUrl) {
              sessionStorage.setItem(`ppe_incident_ref_evidence_${createdId}`, actualReferenceUrl);
              sessionStorage.setItem(`ppe_camera_ref_evidence_${effectiveCameraId}`, actualReferenceUrl);
            }
            if (realViolationBox) {
              sessionStorage.setItem(`ppe_incident_box_${createdId}`, JSON.stringify(realViolationBox));
            }
          } catch {
            // Không làm gián đoạn nếu storage quota đầy
          }
        }

        // 5. Đẩy tệp ảnh bằng chứng (SNAPSHOT) và ảnh đối chứng (REFERENCE_SNAPSHOT) lên Object Storage (MinIO) qua direct-upload
        if (actualEvidenceUrl || actualReferenceUrl) {
          (async () => {
            const fetchImageBlob = async (targetUrl?: string | null): Promise<Blob | null> => {
              if (!targetUrl) return null;
              try {
                let fetchUrl = targetUrl;
                if (targetUrl.startsWith("/api/jobs/") || targetUrl.startsWith("/api/live/")) {
                  fetchUrl = `http://127.0.0.1:8000${targetUrl}`;
                } else if (targetUrl.startsWith("/") && typeof window !== "undefined") {
                  fetchUrl = `${window.location.origin}${targetUrl}`;
                }
                if (
                  fetchUrl.startsWith("data:") ||
                  fetchUrl.startsWith("http://") ||
                  fetchUrl.startsWith("https://")
                ) {
                  const res = await fetch(fetchUrl);
                  if (res.ok) {
                    return await res.blob();
                  }
                }
              } catch {
                // ignore individual fetch error
              }
              return null;
            };

            try {
              const [snapBlob, refBlob] = await Promise.all([
                fetchImageBlob(actualEvidenceUrl),
                fetchImageBlob(actualReferenceUrl),
              ]);

              const uploadTasks: Promise<unknown>[] = [];

              const isEvidencePreAnnotated = Boolean(
                actualEvidenceUrl?.includes("/api/jobs/live/evidence/") ||
                actualEvidenceUrl?.includes("bbox=1") ||
                actualEvidenceUrl?.includes("annotated") ||
                actualEvidenceUrl?.includes("-evidence")
              );
              const snapFileName = isEvidencePreAnnotated
                ? `snapshot_annotated_${createdId.slice(0, 8)}.jpg`
                : `snapshot_${createdId.slice(0, 8)}.jpg`;

              if (snapBlob) {
                uploadTasks.push(
                  incidentService.uploadEvidenceDirect({
                    incidentId: createdId,
                    cameraId: effectiveCameraId,
                    evidenceType: "SNAPSHOT",
                    file: snapBlob,
                    fileName: snapFileName,
                    aiDetections: realViolationBox
                      ? {
                          violations: [
                            {
                              box: realViolationBox,
                            },
                          ],
                        }
                      : undefined,
                  })
                );
              }

              if (refBlob) {
                uploadTasks.push(
                  incidentService.uploadEvidenceDirect({
                    incidentId: createdId,
                    cameraId: effectiveCameraId,
                    evidenceType: "REFERENCE_SNAPSHOT",
                    file: refBlob,
                    fileName: `reference_${createdId.slice(0, 8)}.jpg`,
                  })
                );
              }

              if (uploadTasks.length > 0) {
                await Promise.allSettled(uploadTasks);
                queryClient.invalidateQueries({ queryKey: incidentKeys.detail(createdId) });
                queryClient.invalidateQueries({ queryKey: incidentKeys.all });
              }
            } catch (upErr) {
              console.warn("[CameraIntelligenceContent] Lưu tệp bằng chứng vào MinIO ngầm:", upErr);
            }
          })();
        }

        // 6. Làm mới danh sách sự cố và số đếm thông báo trên toàn hệ thống
        // (Thông báo Toast cảnh báo và còi Siren sẽ do NotificationBell toàn cục xử lý qua SSE)
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
      queryClient,
      siteName,
      streamMetadata?.youtubeId,
    ]
  );

  // Tích lũy vi phạm theo phiên xem thực tế: khi AI phát hiện vi phạm mới thì chèn thêm dòng,
  // khi video lặp (loop về 0s) thì KHÔNG bị xóa và không bị nhân đôi.
  useEffect(() => {
    const liveItems = resolvedTrackingData.violations;
    if (!liveItems || liveItems.length === 0 || !resolvedTrackingData.isRealAiLog) return;

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

  // Khởi động và kết nối Live Look-Ahead AI Engine trên port 8000
  const connectLiveSession = useCallback(
    async (forceRestart: boolean = false) => {
      if (!cameraId || !effectiveStreamUrl) return;

      try {
        const res = await fetch("http://127.0.0.1:8000/api/live/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            camera_id: cameraId,
            stream_url: effectiveStreamUrl,
            conf_threshold: aiConfig.confidenceThreshold,
            confirmation_s: aiConfig.confirmationDuration,
            cooldown_s: aiConfig.cooldownDuration,
            enable_no_helmet: aiConfig.enableNoHelmet,
            enable_no_vest: aiConfig.enableNoVest,
            target_fps: camera?.config?.captureFps || aiConfig.processFps || 25,
            model_path: aiConfig.modelVersionId,
            force_restart: forceRestart,
            roi_polygon: camera?.config?.roiPolygon ?? null,
            processing_enabled: camera?.config?.processingEnabled ?? true,
            motion_sensitivity: camera?.config?.motionSensitivity ?? 75,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.session_id) {
            setLiveSessionId(data.session_id);
            if (data.state) {
              setLiveSessionState(data.state);
            }
          }
        }
      } catch (err) {
        console.warn("[Live Look-Ahead] AI Server port 8000 chưa sẵn sàng hoặc không kết nối được:", err);
      }
    },
    [
      cameraId,
      effectiveStreamUrl,
      aiConfig,
      camera?.config?.captureFps,
      camera?.config?.roiPolygon,
      camera?.config?.processingEnabled,
      camera?.config?.motionSensitivity,
    ]
  );

  // Tự động kết nối hoặc cập nhật nóng Live AI Stream khi mở camera hoặc thay đổi cấu hình
  useEffect(() => {
    if (!cameraId || !effectiveStreamUrl) return;
    connectLiveSession(false);
  }, [cameraId, effectiveStreamUrl, connectLiveSession]);

  // Kết nối WebSocket & Fallback polling đồng bộ Telemetry theo thời gian thực
  useEffect(() => {
    if (!liveSessionId) return;

    let ws: WebSocket | null = null;
    let pollInterval: any = null;
    let active = true;

    try {
      ws = new WebSocket(`ws://127.0.0.1:8000/api/live/${liveSessionId}/ws`);

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "telemetry" || data.type === "init") {
            const state = data.state || data;
            setLiveSessionState((prev: any) => ({ ...prev, ...state }));
          }
        } catch {}
      };

      ws.onerror = () => {
        // Fallback polling mỗi 1.5s nếu WebSocket không hỗ trợ hoặc ngắt
        if (active && !pollInterval) {
          pollInterval = setInterval(async () => {
            if (!active) return;
            try {
              const r = await fetch(`http://127.0.0.1:8000/api/live/${liveSessionId}/status`);
              if (r.ok) {
                const s = await r.json();
                setLiveSessionState(s);
                // Dừng ngay polling khi phiên phân tích hoàn tất hoặc gặp lỗi kết thúc
                if (s?.status === "completed" || s?.status === "error" || s?.status === "stopped") {
                  if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                  }
                }
              }
            } catch {}
          }, 1500);
        }
      };
    } catch {
      // ignore ws constructor failure
    }

    return () => {
      active = false;
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [liveSessionId]);

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
  const handleSyncTime = useCallback((timeSec: number) => {
    // Điều tiết cập nhật state thời gian ở mức ~30Hz (33ms) để đồng bộ khung hình mượt mà
    if (timeSec < lastSyncTimeRef.current || Math.abs(timeSec - lastSyncTimeRef.current) >= 0.033) {
      lastSyncTimeRef.current = timeSec;
      setLiveElapsedSec(timeSec);
    }
  }, []);

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

    // Áp dụng và khởi động lại luồng Live AI Look-Ahead với thông số mới
    connectLiveSession(true);

    toast.success(
      isVietnamese
        ? `Đã lưu & áp dụng cấu hình AI mới (${resolveModelPath(newConfig.modelVersionId).replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%) cho Camera ${camera?.code || cameraId}!`
        : `Saved & applied new AI config (${resolveModelPath(newConfig.modelVersionId).replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%) to Camera ${camera?.code || cameraId}!`
    );
  };

  const handleSnapshotCapture = (dataUrl?: string | null, isRealCanvas?: boolean) => {
    const latestViol =
      resolvedTrackingData.violations[resolvedTrackingData.violations.length - 1];

    // Ưu tiên snapshot thực tế vẽ đúng detections AI
    const freshAnnotated = isRealCanvas ? dataUrl : captureCurrentVideoFrame(true, false);
    const finalUrl =
      freshAnnotated ||
      dataUrl ||
      latestViol?.evidence_path ||
      resolvedTrackingData.entry?.evidence?.[0]?.path ||
      camera?.snapshotUrl ||
      null;

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
            onStartAutoAnalyze={() => connectLiveSession(true)}
            roiPolygon={camera?.config?.roiPolygon ?? null}
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
        incidentsTableState={{ ...incidentsTable, manualPagination: true, manualSorting: true, manualFiltering: true, rowCount: incidentsResult?.meta?.total ?? realIncidents.length, pageCount: incidentsResult?.meta?.totalPages ?? 1, fetching: incidentsFetching, error: incidentsError, onRetry: () => { void refetchIncidents(); } }}
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
                  if (camera?.snapshotUrl && e.currentTarget.src !== camera.snapshotUrl) {
                    e.currentTarget.src = camera.snapshotUrl;
                  }
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
