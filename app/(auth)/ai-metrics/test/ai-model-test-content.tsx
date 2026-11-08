"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  ArrowLeft,
  Cpu,
  FlaskConical,
  Loader2,
  RefreshCw,
  Scan,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useActiveModelVersion, useAiModels } from "@/hooks";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { AiInspectionModal } from "@/components/features/cameras/detail/ai-inspection-modal";
import { CameraAiInspectorCard } from "@/components/features/cameras/detail/camera-ai-inspector-card";
import { CameraIntelligencePlayer } from "@/components/features/cameras/detail/camera-intelligence-player";
import { CameraIntelligenceSidebar } from "@/components/features/cameras/detail/camera-intelligence-sidebar";
import { CameraTelemetryTables } from "@/components/features/cameras/detail/camera-telemetry-tables";
import { CameraRoiDrawer } from "@/components/features/cameras/camera-roi-drawer";
import { RestrictedAreaCanvas } from "@/components/features/sites/restricted-area-canvas";
import { generateLiveFrameEntry } from "@/components/features/cameras/detail/live-tracking-engine";
import type {
  AiInspectionConfig,
  ComputedPersonTrack,
  FrameLogEntry,
  StreamMetadata,
  ViolationEvent,
} from "@/components/features/cameras/detail/types";

// Hàm kiểm tra điểm (chân người) nằm trong đa giác (Ray-Casting Algorithm)
function isPointInPolygon(
  px: number,
  py: number,
  polygon: Array<{ x: number; y: number }>,
  coordW: number = 1,
  coordH: number = 1
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x <= 1 ? polygon[i].x : polygon[i].x / coordW;
    const yi = polygon[i].y <= 1 ? polygon[i].y : polygon[i].y / coordH;
    const xj = polygon[j].x <= 1 ? polygon[j].x : polygon[j].x / coordW;
    const yj = polygon[j].y <= 1 ? polygon[j].y : polygon[j].y / coordH;
    const denom = Math.abs(yj - yi) > 1e-9 ? yj - yi : 1e-9;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / denom + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Tọa độ mẫu mặc định cho vùng cấm trong Sandbox (Bao trùm lối đi chính)
const DEFAULT_SANDBOX_DANGER_POLYGON = [
  { x: 0.15, y: 0.55 },
  { x: 0.50, y: 0.55 },
  { x: 0.50, y: 0.95 },
  { x: 0.15, y: 0.95 },
];

interface SandboxJobInfo {
  job_id: string;
  source: string;
  total_frames: number;
  fps: number;
  model?: string;
  cleanVideoUrl?: string;
  annotatedVideoUrl?: string;
  logUrl?: string;
  meta?: {
    size?: [number, number];
    isVertical?: boolean;
    fps?: number;
    total_frames?: number;
    model?: string;
    processing_time_s?: number;
  };
}

interface SandboxProgressState {
  jobId: string;
  status: "initializing" | "processing" | "encoding" | "completed" | "error";
  progress: number;
  currentFrame: number;
  totalFrames: number;
  fps?: number;
  size?: [number, number];
  isVertical?: boolean;
  model?: string;
  message?: string;
  error?: string;
  cleanVideoUrl?: string;
  annotatedVideoUrl?: string;
  logUrl?: string;
  meta?: any;
}

const PRESET_SAMPLES = [
  {
    id: "preset_cam_01a18735",
    label: "Video Mẫu 1 — Công trường thực tế (Vertical 720×1280)",
    cleanUrl: "/videos/cameras/camera-01a18735.mp4",
    annotatedUrl: "/videos/cameras/camera-01a18735-annotated.mp4",
    logUrl: "/data/camera-01a18735-log.json",
    width: 1080,
    height: 1920,
    fps: 25,
    isVertical: true,
  },
  {
    id: "preset_ai_cctv",
    label: "Video Mẫu 2 — Giám sát cổng công trường (900×1596)",
    cleanUrl: "/videos/ai-cctv-sample.mp4",
    annotatedUrl: "/videos/ai-cctv-annotated.mp4",
    logUrl: "/data/sample-ai-log.json",
    width: 900,
    height: 1596,
    fps: 29.69,
    isVertical: true,
  },
  {
    id: "preset_video8",
    label: "Video Mẫu 3 — Nhóm công nhân làm việc (480×854)",
    cleanUrl: "/videos/video8-annotated.mp4",
    annotatedUrl: "/videos/video8-annotated.mp4",
    logUrl: "/data/video8-log.json",
    width: 480,
    height: 854,
    fps: 29.95,
    isVertical: true,
  },
];

export default function AiModelTestContent() {
  const router = useRouter();
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: activeVersion } = useActiveModelVersion();
  const { data: models = [] } = useAiModels();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Cấu hình tham số AI cho phiên Sandbox
  const [aiConfig, setAiConfig] = useState<AiInspectionConfig>({
    confidenceThreshold: 0.35,
    confirmationDuration: 3.0,
    cooldownDuration: 30,
    enableNoHelmet: true,
    enableNoVest: true,
    enableRestrictedArea: true,
    modelVersionId: "models/best.pt",
    processFps: 25,
  });

  // Đồng bộ modelVersionId với activeVersion từ Backend nếu có
  useEffect(() => {
    if (activeVersion?.modelPath) {
      setAiConfig((prev) => ({
        ...prev,
        modelVersionId: activeVersion.modelPath || "models/best.pt",
      }));
    }
  }, [activeVersion?.modelPath]);

  const activeModelObj = useMemo(
    () => models.find((m) => m.id === activeVersion?.modelId) ?? models[0],
    [models, activeVersion?.modelId]
  );

  const activeModelDisplayName = useMemo(() => {
    const modelName =
      activeModelObj?.name ||
      (typeof activeVersion?.metrics?.modelName === "string"
        ? activeVersion.metrics.modelName
        : "YOLOv11s-PPE");
    const ver = activeVersion?.version ? `v${activeVersion.version.replace(/^v/i, "")}` : "";
    const weightFile = (aiConfig.modelVersionId || "models/best.pt").replace(/^models\//, "");
    return `${modelName}${ver ? ` ${ver}` : ""} (${weightFile})`;
  }, [activeModelObj?.name, activeVersion, aiConfig.modelVersionId]);

  // 2. Quản lý nguồn video đang phát (Preset hoặc Sandbox Job vừa upload)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_SAMPLES[0].id);
  const [sandboxJobs, setSandboxJobs] = useState<SandboxJobInfo[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [sandboxProgress, setSandboxProgress] = useState<SandboxProgressState | null>(null);

  // Dữ liệu Log AI thực tế của video hiện tại
  const [realLogData, setRealLogData] = useState<{
    meta?: any;
    frames: FrameLogEntry[];
  } | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState<boolean>(false);

  // Trạng thái điều khiển Player & Modals
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showBbox, setShowBbox] = useState<boolean>(true);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [roiDrawerOpen, setRoiDrawerOpen] = useState<boolean>(false);
  const [dangerDrawerOpen, setDangerDrawerOpen] = useState<boolean>(false);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null);
  const [lightboxEvidenceUrl, setLightboxEvidenceUrl] = useState<string | null>(null);

  // Vùng quét ROI & Vùng cấm nguy hiểm được lưu trữ trong Sandbox Session
  const [roiPolygon, setRoiPolygon] = useState<Array<{ x: number; y: number }>>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("ppe_sandbox_roi_polygon");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dangerPolygon, setDangerPolygon] = useState<Array<{ x: number; y: number }>>(() => {
    if (typeof window === "undefined") return DEFAULT_SANDBOX_DANGER_POLYGON;
    try {
      const saved = localStorage.getItem("ppe_sandbox_danger_polygon");
      return saved ? JSON.parse(saved) : DEFAULT_SANDBOX_DANGER_POLYGON;
    } catch {
      return DEFAULT_SANDBOX_DANGER_POLYGON;
    }
  });

  // State tạm thời khi mở modal vẽ vùng cấm
  const [tempDangerPoints, setTempDangerPoints] = useState<Array<{ x: number; y: number }>>([]);

  const captureCurrentVideoFrame = (): string | null => {
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
    return null;
  };

  const handleOpenRoiDrawer = () => {
    const snap = captureCurrentVideoFrame();
    if (snap) {
      setCapturedSnapshotUrl(snap);
    }
    setRoiDrawerOpen(true);
  };

  const handleOpenDangerModal = () => {
    const snap = captureCurrentVideoFrame();
    if (snap) {
      setCapturedSnapshotUrl(snap);
    }
    setTempDangerPoints(dangerPolygon);
    setDangerDrawerOpen(true);
  };

  const handleSaveRoi = (points: Array<{ x: number; y: number }>) => {
    setRoiPolygon(points);
    try {
      localStorage.setItem("ppe_sandbox_roi_polygon", JSON.stringify(points));
    } catch {
      // ignore
    }
    toast.success(
      isVietnamese
        ? `Đã lưu vùng quét AI ROI (${points.length} điểm)!`
        : `Saved AI scan ROI (${points.length} vertices)!`
    );
  };

  const handleSaveDanger = () => {
    setDangerPolygon(tempDangerPoints);
    try {
      localStorage.setItem("ppe_sandbox_danger_polygon", JSON.stringify(tempDangerPoints));
    } catch {
      // ignore
    }
    setDangerDrawerOpen(false);
    toast.success(
      isVietnamese
        ? `Đã lưu vùng cấm nguy hiểm (${tempDangerPoints.length} điểm)!`
        : `Saved restricted danger zone (${tempDangerPoints.length} vertices)!`
    );
  };

  // Tải danh sách các job Sandbox đã chạy trước đó
  const fetchSandboxJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-sandbox/status");
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setSandboxJobs(json.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSandboxJobs();
  }, [fetchSandboxJobs]);

  // Xác định thông tin nguồn video hiện tại (Job vừa upload hoặc Preset mẫu)
  const activeJob = useMemo(
    () => sandboxJobs.find((j) => j.job_id === selectedJobId) || null,
    [sandboxJobs, selectedJobId]
  );

  const activePreset = useMemo(
    () => PRESET_SAMPLES.find((p) => p.id === selectedPresetId) || PRESET_SAMPLES[0],
    [selectedPresetId]
  );

  // Đường dẫn video thực tế phát trên thẻ <video>
  const effectiveVideoSrc = useMemo(() => {
    if (activeJob) {
      return showBbox
        ? activeJob.annotatedVideoUrl || activeJob.cleanVideoUrl || ""
        : activeJob.cleanVideoUrl || activeJob.annotatedVideoUrl || "";
    }
    return showBbox ? activePreset.annotatedUrl : activePreset.cleanUrl;
  }, [activeJob, activePreset, showBbox]);

  const effectiveLogUrl = useMemo(() => {
    if (activeJob?.logUrl) return activeJob.logUrl;
    return activePreset.logUrl;
  }, [activeJob, activePreset]);

  // Nạp file log.json của video đang chọn
  useEffect(() => {
    let active = true;
    if (!effectiveLogUrl) {
      setRealLogData(null);
      return;
    }

    setIsLoadingLog(true);
    fetch(effectiveLogUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Log not found");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const frames = Array.isArray(data) ? data : data?.frames;
        const meta = !Array.isArray(data) ? data?.meta : undefined;
        if (Array.isArray(frames) && frames.length > 0) {
          setRealLogData({ meta, frames });
        } else {
          setRealLogData(null);
        }
      })
      .catch(() => {
        if (active) setRealLogData(null);
      })
      .finally(() => {
        if (active) setIsLoadingLog(false);
      });

    return () => {
      active = false;
    };
  }, [effectiveLogUrl]);

  // Metadata luồng video
  const streamMetadata = useMemo<StreamMetadata>(() => {
    if (activeJob) {
      const w = activeJob.meta?.size?.[0] || realLogData?.meta?.size?.[0] || 1280;
      const h = activeJob.meta?.size?.[1] || realLogData?.meta?.size?.[1] || 720;
      const fps = activeJob.fps || activeJob.meta?.fps || realLogData?.meta?.fps || 25;
      const isVert = Boolean(activeJob.meta?.isVertical ?? h > w);
      return {
        streamType: "html5_video",
        isVertical: isVert,
        videoWidth: w,
        videoHeight: h,
        aspectRatioLabel: `${w} × ${h} (${activeJob.source} · ${fps} FPS)`,
        sourceUrl: effectiveVideoSrc,
        fps,
        totalFrames: activeJob.total_frames || realLogData?.frames?.length || 0,
      };
    }

    return {
      streamType: "html5_video",
      isVertical: activePreset.isVertical,
      videoWidth: activePreset.width,
      videoHeight: activePreset.height,
      aspectRatioLabel: `${activePreset.width} × ${activePreset.height} (${activePreset.fps} FPS)`,
      sourceUrl: effectiveVideoSrc,
      fps: activePreset.fps,
      totalFrames: realLogData?.frames?.length || 250,
    };
  }, [activeJob, activePreset, effectiveVideoSrc, realLogData]);

  // Poll trạng thái khi đang chạy phân tích video bằng model best.pt
  useEffect(() => {
    if (
      !sandboxProgress ||
      sandboxProgress.status === "completed" ||
      sandboxProgress.status === "error"
    ) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai-sandbox/status?jobId=${encodeURIComponent(sandboxProgress.jobId)}`
        );
        const json = await res.json();
        if (json?.success && json.data) {
          const st: SandboxProgressState = json.data;
          setSandboxProgress(st);

          if (st.status === "completed") {
            clearInterval(timer);
            const completedJob: SandboxJobInfo = {
              job_id: st.jobId,
              source: st.meta?.source || "uploaded_video.mp4",
              total_frames: st.totalFrames || st.meta?.total_frames || 0,
              fps: st.fps || st.meta?.fps || 25,
              model: st.model || st.meta?.model || activeModelDisplayName,
              cleanVideoUrl: st.cleanVideoUrl,
              annotatedVideoUrl: st.annotatedVideoUrl,
              logUrl: st.logUrl,
              meta: st.meta,
            };
            setSandboxJobs((prev) => [
              completedJob,
              ...prev.filter((x) => x.job_id !== completedJob.job_id),
            ]);
            setSelectedJobId(completedJob.job_id);
            setLiveElapsedSec(0);
            toast.success(
              isVietnamese
                ? `Hoàn tất chạy model ${completedJob.model} trên video (${completedJob.total_frames} frames)!`
                : `Finished running ${completedJob.model} on video (${completedJob.total_frames} frames)!`
            );
          } else if (st.status === "error") {
            clearInterval(timer);
            toast.error(
              st.error ||
                (isVietnamese
                  ? "Lỗi khi phân tích video bằng model AI."
                  : "Error analyzing video with AI model.")
            );
          }
        }
      } catch {
        // ignore transient poll error
      }
    }, 900);

    return () => clearInterval(timer);
  }, [sandboxProgress, activeModelDisplayName, isVietnamese]);

  // Xử lý Upload Video mới và gọi model best.pt chạy thật
  const startVideoAnalysis = async (file: File | null, existingJobId?: string | null) => {
    try {
      const formData = new FormData();
      if (file) {
        formData.append("video", file);
      } else if (existingJobId) {
        formData.append("existingJobId", existingJobId);
      } else {
        return;
      }

      formData.append("modelPath", aiConfig.modelVersionId || "models/best.pt");
      formData.append("confidenceThreshold", String(aiConfig.confidenceThreshold));
      formData.append("confirmationDuration", String(aiConfig.confirmationDuration));
      formData.append("cooldownDuration", String(aiConfig.cooldownDuration));
      formData.append("enableNoHelmet", String(aiConfig.enableNoHelmet));
      formData.append("enableNoVest", String(aiConfig.enableNoVest));

      const res = await fetch("/api/ai-sandbox/analyze", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Không thể khởi chạy phân tích video.");
      }

      setSandboxProgress(json.data);
      toast.success(
        isVietnamese
          ? `Đang chạy model ${activeModelDisplayName} trên video vừa tải lên...`
          : `Running ${activeModelDisplayName} on uploaded video...`
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isVietnamese ? "Không thể tải video lên để phân tích." : "Failed to upload video.")
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await startVideoAnalysis(file, null);
  };

  // Tổng hợp danh sách vi phạm và tracks công nhân từ log thực tế của model best.pt
  const { fullViolations, fullPersonTracks } = useMemo(() => {
    if (!realLogData?.frames || realLogData.frames.length === 0) {
      return { fullViolations: [], fullPersonTracks: [] };
    }
    const allViolations: ViolationEvent[] = [];
    const trackMap = new Map<number, ComputedPersonTrack>();

    const coordW = streamMetadata.videoWidth || 1280;
    const coordH = streamMetadata.videoHeight || 720;
    const hasDangerZone =
      Boolean(aiConfig.enableRestrictedArea) &&
      Array.isArray(dangerPolygon) &&
      dangerPolygon.length >= 3;

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

      // Quét vi phạm Vùng Cấm Nguy Hiểm thời gian thực (Ray-Casting Algorithm)
      if (hasDangerZone) {
        for (const det of f.detections || []) {
          if (
            det.class_name === "person" &&
            typeof det.track_id === "number" &&
            Array.isArray(det.bbox)
          ) {
            const [x1, y1, x2, y2] = det.bbox;
            const isNorm = x2 <= 1 && y2 <= 1;
            const footX = isNorm ? (x1 + x2) * 0.5 : (x1 + x2) * 0.5 / coordW;
            const footY = isNorm ? y2 : y2 / coordH;

            if (isPointInPolygon(footX, footY, dangerPolygon, coordW, coordH)) {
              const dangerEvId = `violation_danger_trk${det.track_id}_f${f.frame}`;
              const alreadyHas = allViolations.some(
                (x) =>
                  x.event_id === dangerEvId ||
                  (x.person === det.track_id &&
                    (x.violation_type === "RESTRICTED_AREA" || x.violation_type === "restricted_area") &&
                    Math.abs((x.frame || 0) - f.frame) < 30)
              );
              if (!alreadyHas) {
                const matchedEv = f.evidence?.[0];
                allViolations.push({
                  event_id: dangerEvId,
                  camera_id: "ai-sandbox",
                  person: det.track_id,
                  violation_type: "restricted_area",
                  start_t: f.t || 0,
                  confirmed_t: f.t || 0,
                  duration_s: 1.0,
                  frame: f.frame,
                  evidence_path: matchedEv?.path,
                });
              }
            }
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
        } else {
          if (p.violations?.includes("no_helmet")) {
            trk.noHelmetFrames.add(f.frame);
          }
          if (p.violations?.includes("no_safety_vest")) {
            trk.noVestFrames.add(f.frame);
          }
        }
      }
    }

    return {
      fullViolations: allViolations,
      fullPersonTracks: Array.from(trackMap.values()).sort((a, b) => a.id - b.id),
    };
  }, [
    realLogData,
    aiConfig.enableRestrictedArea,
    dangerPolygon,
    streamMetadata.videoWidth,
    streamMetadata.videoHeight,
    isVietnamese,
  ]);

  // Fallback nếu log đang tải
  const fallbackTrackingData = useMemo(() => {
    return generateLiveFrameEntry({
      elapsedSec: liveElapsedSec,
      cameraCode: "AI-SANDBOX",
      cameraId: "ai-sandbox",
      siteName: "AI Model Sandbox",
      safetyConfig: {
        ...aiConfig,
        locale,
      },
      streamMetadata,
      customSnapshotUrl: capturedSnapshotUrl,
    });
  }, [liveElapsedSec, aiConfig, locale, streamMetadata, capturedSnapshotUrl]);

  // Đồng bộ khung hình hiện tại theo thời gian phát của video
  const resolvedTrackingData = useMemo(() => {
    if (realLogData?.frames && realLogData.frames.length > 0) {
      const frames = realLogData.frames;
      const totalDuration = frames[frames.length - 1].t || 10.0;
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
      const currentViolations = fullViolations.filter((v) => (v.frame || 0) <= frame.frame);

      const coordW = streamMetadata.videoWidth || 1280;
      const coordH = streamMetadata.videoHeight || 720;
      const hasDangerZone =
        Boolean(aiConfig.enableRestrictedArea) &&
        Array.isArray(dangerPolygon) &&
        dangerPolygon.length >= 3;

      let enrichedFrame = frame;
      if (hasDangerZone && frame.persons?.length) {
        const enrichedPersons = frame.persons.map((p) => {
          const det = (frame.detections || []).find(
            (d) => d.class_name === "person" && d.track_id === p.track_id && Array.isArray(d.bbox)
          );
          if (det) {
            const [x1, y1, x2, y2] = det.bbox;
            const isNorm = x2 <= 1 && y2 <= 1;
            const footX = isNorm ? (x1 + x2) * 0.5 : (x1 + x2) * 0.5 / coordW;
            const footY = isNorm ? y2 : y2 / coordH;

            if (isPointInPolygon(footX, footY, dangerPolygon, coordW, coordH)) {
              const currentV = p.violations || [];
              const updatedV = currentV.includes("restricted_area")
                ? currentV
                : [...currentV, "restricted_area"];
              return {
                ...p,
                status: "CONFIRMED_VIOLATION" as const,
                violations: updatedV,
                reason: isVietnamese
                  ? "Xâm nhập vùng cấm nguy hiểm"
                  : "Restricted area intrusion",
              };
            }
          }
          return p;
        });

        enrichedFrame = {
          ...frame,
          persons: enrichedPersons,
        };
      }

      return {
        entry: enrichedFrame,
        violations: currentViolations.length > 0 ? currentViolations : fullViolations,
        personTracks: fullPersonTracks,
      };
    }

    return {
      entry: fallbackTrackingData.entry,
      violations: fallbackTrackingData.violations,
      personTracks: fallbackTrackingData.personTracks,
    };
  }, [
    realLogData,
    liveElapsedSec,
    fullViolations,
    fullPersonTracks,
    fallbackTrackingData,
    aiConfig.enableRestrictedArea,
    dangerPolygon,
    streamMetadata.videoWidth,
    streamMetadata.videoHeight,
    isVietnamese,
  ]);

  const handleSeekToFrame = (targetFrame: number) => {
    const fps = streamMetadata.fps || aiConfig.processFps || 25;
    const targetSec = Math.max(0, (targetFrame - 1) / fps);
    setLiveElapsedSec(targetSec);
    if (videoRef.current) {
      videoRef.current.currentTime = targetSec;
    }
  };

  const lastSyncTimeRef = useRef<number>(0);
  const handleSyncTime = (timeSec: number) => {
    if (timeSec < lastSyncTimeRef.current || Math.abs(timeSec - lastSyncTimeRef.current) >= 0.025) {
      lastSyncTimeRef.current = timeSec;
      setLiveElapsedSec(timeSec);
    }
  };

  const handleSaveAiConfig = async (newConfig: AiInspectionConfig) => {
    setAiConfig(newConfig);
    toast.success(
      isVietnamese
        ? `Đã áp dụng cấu hình thử nghiệm (${newConfig.modelVersionId.replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%)!`
        : `Applied sandbox config (${newConfig.modelVersionId.replace(/^models\//, "")}, Conf ${(newConfig.confidenceThreshold * 100).toFixed(0)}%)!`
    );

    // Nếu đang xem một video do người dùng tải lên, tự động chạy lại model best.pt với cấu hình mới
    if (selectedJobId) {
      await startVideoAnalysis(null, selectedJobId);
    }
  };

  const handleSnapshotCapture = (dataUrl?: string | null) => {
    const latestViol =
      resolvedTrackingData.violations[resolvedTrackingData.violations.length - 1];
    const finalUrl =
      dataUrl ||
      captureCurrentVideoFrame() ||
      latestViol?.evidence_path ||
      resolvedTrackingData.entry?.evidence?.[0]?.path ||
      null;

    if (!finalUrl) return;

    setCapturedSnapshotUrl(finalUrl);
    setLightboxEvidenceUrl(finalUrl);

    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
      const filename = `sandbox_snapshot_${dateStr}_${timeStr}.jpg`;

      if (finalUrl.startsWith("data:") || finalUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = finalUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // ignore
    }

    toast.success(
      isVietnamese
        ? "Đã chụp ảnh Snapshot kết quả kiểm thử AI!"
        : "Captured AI Sandbox snapshot!"
    );
  };

  const isRunningSandbox =
    sandboxProgress !== null &&
    sandboxProgress.status !== "completed" &&
    sandboxProgress.status !== "error";

  return (
    <div className="space-y-5">
      {/* Input file ẩn để tải video từ máy tính */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── 1. HEADER ĐIỀU HƯỚNG & CÔNG CỤ UPLOAD VIDEO CHẠY MODEL THẬT ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ai-metrics")}
            className="h-10 w-10 p-0 rounded-2xl shrink-0 border-border/40 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
            title={isVietnamese ? "Quay lại Hiệu năng & Quản trị AI" : "Back to AI Metrics"}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2.5 py-0.5">
                <FlaskConical className="h-3.5 w-3.5" />
                <span>AI SANDBOX</span>
              </span>

              <Badge variant="success" size="sm">
                <span className="h-1.5 w-1.5 rounded-full mr-1 bg-emerald-500 animate-pulse" />
                {activeModelDisplayName}
              </Badge>

              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">
                <ShieldCheck className="h-3 w-3" />
                <span>{isVietnamese ? "Cách ly CSDL 100%" : "Zero DB Write"}</span>
              </span>

              <span className="text-[11px] text-muted-foreground font-medium">
                {isVietnamese
                  ? "Chạy suy luận thật 100% từ smart-ppe-ai-service/models/best.pt"
                  : "100% real inference via smart-ppe-ai-service/models/best.pt"}
              </span>
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span>
                {isVietnamese
                  ? "Phòng Thử Nghiệm & Kiểm Chứng Mô Hình AI Trên Video"
                  : "AI Model Video Sandbox & Verification Studio"}
              </span>
            </h1>
          </div>
        </div>

        {/* Cụm nút tác vụ: Tải Video Lên, Chọn Video Mẫu, Tinh Chỉnh AI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn nhanh Video Mẫu hoặc Video đã Upload */}
          <select
            value={selectedJobId ? `job:${selectedJobId}` : `preset:${selectedPresetId}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith("job:")) {
                setSelectedJobId(val.replace("job:", ""));
                setLiveElapsedSec(0);
              } else {
                setSelectedJobId(null);
                setSelectedPresetId(val.replace("preset:", ""));
                setLiveElapsedSec(0);
              }
            }}
            className="h-9 rounded-xl border border-border/50 bg-surface px-3 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none"
          >
            {sandboxJobs.length > 0 && (
              <optgroup
                label={
                  isVietnamese
                    ? "Video Bạn Đã Tải Lên (Đã Quét best.pt)"
                    : "Your Uploaded Videos (Analyzed by best.pt)"
                }
              >
                {sandboxJobs.map((j) => (
                  <option key={j.job_id} value={`job:${j.job_id}`}>
                    {j.source} ({j.total_frames} frames · {j.fps} FPS)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={isVietnamese ? "Video Mẫu Có Sẵn" : "Built-in Sample Videos"}>
              {PRESET_SAMPLES.map((p) => (
                <option key={p.id} value={`preset:${p.id}`}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Nút Tải Video Từ Máy Tính Lên Để Chạy Model best.pt */}
          <Button
            variant="primary"
            size="sm"
            disabled={isRunningSandbox}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 rounded-xl text-xs font-bold shadow-nm-sm hover:shadow-nm transition"
          >
            {isRunningSandbox ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>
              {isVietnamese ? "Tải Video Lên & Chạy Model" : "Upload Video & Run Model"}
            </span>
          </Button>

          {/* Nút Chạy lại nếu đang xem 1 video đã upload */}
          {selectedJobId && !isRunningSandbox && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startVideoAnalysis(null, selectedJobId)}
              className="gap-1.5 rounded-xl text-xs font-semibold border-border/40 hover:bg-surface-elevated transition shadow-sm"
              title={
                isVietnamese
                  ? "Chạy quét lại video này với bộ tham số AI hiện tại"
                  : "Re-run AI model on this video with current parameters"
              }
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span>{isVietnamese ? "Quét Lại Video" : "Re-Analyze"}</span>
            </Button>
          )}

          {/* Nút Vùng ROI */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenRoiDrawer}
            className="gap-1.5 rounded-xl text-xs font-semibold border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition shadow-sm"
            title={
              isVietnamese
                ? "Vẽ & tùy chỉnh vùng nhận diện AI (ROI)"
                : "Draw & customize AI scan region (ROI)"
            }
          >
            <Scan className="h-4 w-4" />
            <span>
              {isVietnamese ? "Vùng ROI" : "ROI Area"}
              {roiPolygon.length >= 3 && ` (${roiPolygon.length}p)`}
            </span>
          </Button>

          {/* Nút Vùng Cấm Nguy Hiểm */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDangerModal}
            className="gap-1.5 rounded-xl text-xs font-semibold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition shadow-sm"
            title={
              isVietnamese
                ? "Khoanh vùng cấm nguy hiểm và thử nghiệm cảnh báo xâm nhập"
                : "Define danger zone and test intrusion violation"
            }
          >
            <AlertOctagon className="h-4 w-4" />
            <span>
              {isVietnamese ? "Vùng Cấm" : "Danger Zone"}
              {dangerPolygon.length >= 3 && ` (${dangerPolygon.length}p)`}
            </span>
          </Button>

          {/* Nút Cấu hình AI */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 transition shadow-sm"
          >
            <Cpu className="h-4 w-4" />
            <span>{isVietnamese ? "Cấu Hình AI" : "AI Config"}</span>
          </Button>
        </div>
      </div>

      {/* ── 2. BANNER TIẾN ĐỘ KHI MODEL BEST.PT ĐANG QUÉT VIDEO NGƯỜI DÙNG TẢI LÊN ── */}
      {isRunningSandbox && sandboxProgress && (
        <div className="rounded-2xl border border-primary/35 bg-primary/5 p-4 shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)] space-y-2.5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  {sandboxProgress.message ||
                    (isVietnamese
                      ? "Đang chạy suy luận bằng model YOLOv11s-PPE (models/best.pt)..."
                      : "Running inference with YOLOv11s-PPE (models/best.pt)...")}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {isVietnamese
                    ? "Pipeline thực tế: YOLOv11 Detection → ByteTrack → PPE Association (VI-04) → Safety Rules (VI-05) → Confirmation (VI-06) → Deduplication (VI-07)"
                    : "Real pipeline: YOLOv11 Detection → ByteTrack → PPE Association (VI-04) → Safety Rules (VI-05) → Confirmation (VI-06) → Deduplication (VI-07)"}
                </p>
              </div>
            </div>

            <Badge variant="primary" size="sm" className="font-mono font-bold">
              {sandboxProgress.progress}% (
              {sandboxProgress.currentFrame}/{sandboxProgress.totalFrames || "?"} frames)
            </Badge>
          </div>

          <div className="h-2.5 w-full rounded-full overflow-hidden bg-background/80 border border-border/40 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(5, sandboxProgress.progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 3. BỐ CỤC 2 CỘT: TRÌNH PHÁT VIDEO AI (8/12) & BẢNG ĐIỀU HÀNH TRỰC TIẾP (4/12) ── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-8 xl:col-span-8 space-y-5">
          <CameraIntelligencePlayer
            videoSrc={effectiveVideoSrc}
            currentEntry={resolvedTrackingData.entry}
            isPlaying={isPlaying}
            showBbox={showBbox}
            videoRef={videoRef}
            roiPolygon={roiPolygon}
            dangerPolygon={dangerPolygon}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onToggleBbox={() => setShowBbox((prev) => !prev)}
            onSnapshot={handleSnapshotCapture}
            onOpenAiModal={() => setAiModalOpen(true)}
            onSyncPlaying={setIsPlaying}
            onSyncTime={handleSyncTime}
            streamMetadata={streamMetadata}
            cameraName={
              activeJob
                ? `Video Test: ${activeJob.source}`
                : activePreset.label
            }
            cameraCode="AI-SANDBOX"
            siteName="AI Model Sandbox"
            activeModelName={activeModelDisplayName}
            cameraStatus="ONLINE"
            currentFps={streamMetadata.fps}
            currentLatencyMs={
              typeof activeVersion?.metrics?.latencyMs === "number"
                ? activeVersion.metrics.latencyMs
                : 18.4
            }
            cameraLocation={
              isVietnamese ? "Phòng Thử Nghiệm Mô Hình" : "AI Model Playground"
            }
          />
        </div>

        <div className="lg:col-span-4 lg:flex xl:col-span-4">
          <CameraIntelligenceSidebar
            currentEntry={resolvedTrackingData.entry}
            allViolations={resolvedTrackingData.violations}
            personTracks={resolvedTrackingData.personTracks}
            cameraId="ai-sandbox"
            cameraCode="AI-SANDBOX"
            siteName={
              isVietnamese ? "Phòng Thử Nghiệm AI" : "AI Model Sandbox"
            }
            streamMetadata={streamMetadata}
            safetyConfig={aiConfig}
            activeModelName={activeModelDisplayName}
            onSnapshot={() => handleSnapshotCapture(null)}
            onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
            onSeekToFrame={handleSeekToFrame}
            cameraStatus="ONLINE"
            realIncidentsCount={0}
            totalFrames={realLogData?.frames?.length || streamMetadata.totalFrames}
          />
        </div>
      </div>

      {/* ── 4. BẢNG PHÂN TÍCH CHI TIẾT 4 TAB (PERSON SUMMARY, CURRENT FRAME, ASSOCIATIONS, TRACKS) ── */}
      <CameraAiInspectorCard
        currentEntry={resolvedTrackingData.entry}
        personTracks={resolvedTrackingData.personTracks}
        allViolations={resolvedTrackingData.violations}
        onSeekToFrame={handleSeekToFrame}
        fps={streamMetadata.fps || aiConfig.processFps || 25}
        totalFrames={realLogData?.frames?.length || streamMetadata.totalFrames || 250}
        availableJobs={sandboxJobs}
        selectedJobId={selectedJobId}
        onSelectJob={(jobId) => {
          setSelectedJobId(jobId || null);
          setLiveElapsedSec(0);
        }}
        isLoadingJob={isLoadingLog || isRunningSandbox}
      />

      {/* ── 5. BẢNG NHẬT KÝ VI PHẠM TRONG VIDEO TEST & CẤU HÌNH THAM SỐ AI ── */}
      <CameraTelemetryTables
        cameraId="ai-sandbox"
        camera={null}
        siteName={isVietnamese ? "Phòng Thử Nghiệm AI" : "AI Model Sandbox"}
        zoneName={
          activeJob ? activeJob.source : activePreset.label
        }
        safetyConfig={aiConfig}
        activeModelName={activeModelDisplayName}
        realIncidents={[]}
        totalIncidents={0}
        isIncidentsLoading={isLoadingLog}
        fps={streamMetadata.fps || 25}
        resolution={streamMetadata.aspectRatioLabel}
        streamType={streamMetadata.streamType}
        liveViolations={resolvedTrackingData.violations}
        onSeekToFrame={handleSeekToFrame}
        onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
        onOpenAiModal={() => setAiModalOpen(true)}
      />

      {/* ── MODAL CẤU HÌNH & TINH CHỈNH THAM SỐ AI ── */}
      <AiInspectionModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        config={aiConfig}
        onSaveConfig={handleSaveAiConfig}
        cameraCode="AI-SANDBOX"
        streamMetadata={streamMetadata}
        roiPointsCount={roiPolygon.length}
        dangerPointsCount={dangerPolygon.length}
        onOpenRoiDrawer={handleOpenRoiDrawer}
        onOpenDangerDrawer={handleOpenDangerModal}
      />

      {/* ── DRAWER CẤU HÌNH VÙNG ROI ── */}
      <CameraRoiDrawer
        open={roiDrawerOpen}
        onOpenChange={setRoiDrawerOpen}
        initialPoints={roiPolygon}
        onSavePoints={handleSaveRoi}
        customStreamUrl={effectiveVideoSrc}
        customImageUrl={capturedSnapshotUrl || undefined}
        customCameraName={
          activeJob ? activeJob.source : activePreset.label
        }
        customCameraCode="AI-SANDBOX"
      />

      {/* ── MODAL KHOANH VÙNG CẤM NGUY HIỂM (RESTRICTED AREA CANVAS) ── */}
      <Modal
        open={dangerDrawerOpen}
        onOpenChange={setDangerDrawerOpen}
        title={
          isVietnamese
            ? "Khoanh Vùng Cấm Nguy Hiểm — AI Sandbox"
            : "Define Restricted Danger Zone — AI Sandbox"
        }
        description={
          isVietnamese
            ? "Vẽ đa giác vùng cấm trực tiếp trên video để kiểm thử phát hiện xâm nhập thời gian thực (Zero DB Write)"
            : "Draw danger polygon directly on video to test real-time intrusion violation detection (Zero DB Write)"
        }
        icon={<AlertOctagon className="h-5 w-5 text-rose-500" />}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDangerDrawerOpen(false)}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveDanger}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <AlertOctagon className="h-4 w-4" />
              <span>
                {isVietnamese
                  ? `Áp dụng Vùng Cấm (${tempDangerPoints.length} điểm)`
                  : `Apply Danger Zone (${tempDangerPoints.length} pts)`}
              </span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="text-xs font-semibold text-foreground">
                {isVietnamese ? "Video thử nghiệm:" : "Sandbox Video Stream:"}
              </span>
              <span className="font-mono text-xs font-bold text-rose-500">
                {activeJob ? activeJob.source : activePreset.label}
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-lg border border-border/40">
              {streamMetadata.aspectRatioLabel}
            </span>
          </div>

          <RestrictedAreaCanvas
            points={tempDangerPoints}
            onChange={setTempDangerPoints}
            streamUrl={effectiveVideoSrc}
            imageUrl={capturedSnapshotUrl || undefined}
            cameraName={streamMetadata.aspectRatioLabel}
          />
        </div>
      </Modal>

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
                    ? "Ảnh Bằng Chứng Vi Phạm Từ Model Kiểm Thử (VI-08)"
                    : "Sandbox Violation Evidence Snapshot (VI-08)"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Model: {activeModelDisplayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxEvidenceUrl(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40 flex items-center justify-center">
              <img
                src={lightboxEvidenceUrl}
                alt="Sandbox Evidence Snapshot"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
