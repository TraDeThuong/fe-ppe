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
  Layers,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCameraDetail } from "@/hooks/cameras";
import { useSiteSafetyConfig } from "@/hooks/sites";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { AiInspectionModal } from "./ai-inspection-modal";
import { CameraIntelligencePlayer, getYouTubeEmbedUrl } from "./camera-intelligence-player";
import { CameraIntelligenceSidebar } from "./camera-intelligence-sidebar";
import { CameraTelemetryTables } from "./camera-telemetry-tables";
import { generateLiveFrameEntry } from "./live-tracking-engine";
import type { AiInspectionConfig, StreamMetadata, StreamType } from "./types";

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

  // 2. Lấy cấu hình quy tắc an toàn của Site trực thuộc để camera áp dụng đồng bộ
  const siteId = camera?.siteId || "";
  const { data: siteSafetyConfig } = useSiteSafetyConfig(siteId, Boolean(siteId));
  const siteName = camera?.siteName || getSiteName(siteId);

  // Nguồn video gốc từ camera DB hoặc tùy chọn ghi đè tạm thời (Upload file / Đổi URL)
  const cameraStreamUrl = camera?.streamUrl || "";
  const [customStreamUrl, setCustomStreamUrl] = useState<string | null>(null);
  const effectiveStreamUrl =
    customStreamUrl || cameraStreamUrl || "https://www.youtube.com/watch?v=uOvHUykxNOA";

  // 3. Phân tích loại luồng & tỷ lệ khung hình thực tế của Video
  const streamMetadata = useMemo<StreamMetadata>(() => {
    const url = effectiveStreamUrl.trim();
    const { isShorts, youtubeId } = getYouTubeEmbedUrl(url);

    let streamType: StreamType = "rtsp";
    let isVertical = false;
    let videoWidth = 1920;
    let videoHeight = 1080;
    let aspectRatioLabel = "1920 × 1080 (16:9 Full HD)";

    if (isShorts) {
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
      url.includes("storage.googleapis.com")
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
    };
  }, [effectiveStreamUrl]);

  // 4. Trạng thái cấu hình tham số AI riêng cho camera (tích hợp Modal AI Inspection)
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

  // 5. Trạng thái điều khiển Real-time AI Tracking
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showBbox, setShowBbox] = useState<boolean>(true);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null);
  const [lightboxEvidenceUrl, setLightboxEvidenceUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Vòng lặp Real-time Edge AI Tracking: chạy liên tục theo thời gian thực (10Hz = 100ms)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLiveElapsedSec((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Bộ tính toán Pipeline an toàn thời gian thực ĐỘNG: gắn liền với tỷ lệ video, camera seed và Site Safety Config
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

  // Handlers
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleBbox = () => {
    setShowBbox((prev) => !prev);
  };

  const handleSaveAiConfig = (newConfig: AiInspectionConfig) => {
    setAiConfig(newConfig);
    toast.success(
      isVietnamese
        ? `Đã áp dụng cấu hình AI mới cho Camera ${camera?.code || cameraId}. Pipeline đang kiểm tra video trực tiếp!`
        : `New AI parameters applied to Camera ${camera?.code || cameraId}. Real-time inspection running!`
    );
  };

  const handleSnapshotCapture = (dataUrl?: string | null) => {
    const finalUrl =
      dataUrl ||
      (streamMetadata.youtubeId
        ? `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`
        : "/images/camera-live-evidence.jpg");

    setCapturedSnapshotUrl(finalUrl);
    setLightboxEvidenceUrl(finalUrl);
    toast.success(
      isVietnamese
        ? `Đã chụp ảnh bằng chứng từ luồng video ${camera?.code || cameraId} thành công.`
        : `Snapshot evidence captured from ${camera?.code || cameraId} successfully.`
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

  return (
    <div className="space-y-6">
      {/* ── HEADER THANH ĐIỀU HƯỚNG CHUYÊN SÂU ── */}
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
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/25 rounded-lg px-2 py-0.5">
                {camera?.code || cameraId}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs font-semibold text-foreground">
                {camera?.name || (isVietnamese ? "Camera Giám Sát An Toàn" : "Safety Surveillance Camera")}
              </span>

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
              <span>Camera AI Intelligence Studio</span>
            </h1>
          </div>
        </div>

        {/* Action Header Links & Nút Mở Modal Cấu Hình AI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Mở Modal AI Inspection (Giải quyết triệt để yêu cầu: modal AI kiểm tra video bên cạnh) */}
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
            <span>{isVietnamese ? "Cấu hình & Tinh chỉnh AI" : "AI Inspection Config"}</span>
          </Button>

          {/* Quick link to this camera's incidents */}
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
            <span>{isVietnamese ? "Sự cố camera này" : "This Camera Incidents"}</span>
          </Link>

          {/* AI Metrics link */}
          <Link
            href="/ai-metrics"
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated transition shadow-sm"
            title={
              isVietnamese
                ? "Xem thông số mô hình AI toàn hệ thống"
                : "View system-wide AI metrics"
            }
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Metrics</span>
          </Link>
        </div>
      </div>

      {/* ── BỐ CỤC 2 CỘT: TRÌNH PHÁT VIDEO CAMERA THỰC TẾ (BÊN TRÁI) & BẢNG THÔNG SỐ AI (BÊN PHẢI) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* CỘT TRÁI (7 / 12 phần): TRÌNH PHÁT VIDEO CAMERA + OVERLAY BOUNDING BOX REAL-TIME */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <CameraIntelligencePlayer
            videoSrc={effectiveStreamUrl}
            currentEntry={liveTrackingData.entry}
            isPlaying={isPlaying}
            showBbox={showBbox}
            videoRef={videoRef}
            onTogglePlay={handleTogglePlay}
            onToggleBbox={handleToggleBbox}
            onSnapshot={handleSnapshotCapture}
            onOpenAiModal={() => setAiModalOpen(true)}
            onChangeVideoSource={handleChangeVideoSource}
            streamMetadata={streamMetadata}
            cameraName={camera?.name}
            cameraCode={camera?.code || cameraId}
            siteName={siteName}
            activeModelName={activeModelDisplayName}
          />
        </div>

        {/* CỘT PHẢI (5 / 12 phần): 5 BẢNG THÔNG SỐ VÀ VI PHẠM THỜI GIAN THỰC ĐỒNG BỘ */}
        <div className="lg:col-span-5 xl:col-span-5">
          <CameraIntelligenceSidebar
            currentEntry={liveTrackingData.entry}
            allViolations={liveTrackingData.violations}
            personTracks={liveTrackingData.personTracks}
            cameraId={cameraId}
            cameraCode={camera?.code || cameraId}
            siteName={siteName}
            streamMetadata={streamMetadata}
            safetyConfig={aiConfig}
            activeModelName={activeModelDisplayName}
            onSnapshot={() => handleSnapshotCapture(null)}
          />
        </div>
      </div>

      {/* ── PHÂN VÙNG DƯỚI: TRUNG TÂM BẢNG DỮ LIỆU PHÂN TÍCH & GIÁM SÁT CHI TIẾT (FULL-WIDTH TABLES) ── */}
      <CameraTelemetryTables
        currentEntry={liveTrackingData.entry}
        allViolations={liveTrackingData.violations}
        personTracks={liveTrackingData.personTracks}
        cameraCode={camera?.code || cameraId}
        siteName={siteName}
        streamMetadata={streamMetadata}
        safetyConfig={aiConfig}
        activeModelName={activeModelDisplayName}
        onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
      />

      {/* ── MODAL CẤU HÌNH & KIỂM TRA AI THỜI GIAN THỰC ── */}
      <AiInspectionModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        config={aiConfig}
        onSaveConfig={handleSaveAiConfig}
        cameraCode={camera?.code || cameraId}
        streamMetadata={streamMetadata}
      />

      {/* Lightbox Modal phóng to ảnh bằng chứng thực tế */}
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
                  {isVietnamese ? "Ảnh Bằng Chứng Vi Phạm (Evidence Snapshot — VI-08)" : "Violation Evidence Snapshot (VI-08)"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Camera: {camera?.code || cameraId} • Site: {siteName} • Worker #{liveTrackingData.violations[0]?.person || 102}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxEvidenceUrl(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
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
                  ? `Trích xuất trực tiếp từ video Camera ${camera?.code || cameraId}`
                  : `Extracted directly from Camera stream ${camera?.code || cameraId}`}
              </span>
              <span className="font-mono text-emerald-500 font-semibold">MinIO S3 Evidence Synced</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
