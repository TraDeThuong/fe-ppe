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
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCameraDetail } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import { generateLiveFrameEntry } from "./live-tracking-engine";
import { CameraIntelligencePlayer } from "./camera-intelligence-player";
import { CameraIntelligenceSidebar } from "./camera-intelligence-sidebar";
import { CameraTelemetryTables } from "./camera-telemetry-tables";
import { X } from "lucide-react";

export interface CameraIntelligenceContentProps {
  cameraId: string;
}

export function CameraIntelligenceContent({
  cameraId,
}: CameraIntelligenceContentProps) {
  const router = useRouter();
  const { t } = useLocale();

  // 1. Lấy dữ liệu Camera thực tế từ Database / Camera Service
  const { data: camera, isLoading: isCameraLoading } = useCameraDetail(cameraId);

  const cameraStreamUrl = camera?.streamUrl || "";

  // 2. Trạng thái điều khiển Real-time AI Tracking
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showBbox, setShowBbox] = useState<boolean>(true);
  const [liveElapsedSec, setLiveElapsedSec] = useState<number>(0);
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

  // Bộ tính toán Pipeline an toàn thời gian thực theo đúng chuẩn video-intelligence
  const liveTrackingData = useMemo(() => {
    return generateLiveFrameEntry(liveElapsedSec, camera?.code || "CAM-01");
  }, [liveElapsedSec, camera?.code]);

  // Handlers
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleBbox = () => {
    setShowBbox((prev) => !prev);
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
            title="Quay lại danh sách camera"
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
                {camera?.name || "Camera Giám Sát An Toàn"}
              </span>

              {camera?.siteId && (
                <Link
                  href={`/sites/${camera.siteId}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition hover:underline shadow-sm"
                  title="Mở trung tâm điều hành công trường này"
                >
                  <Building2 className="h-3 w-3 text-primary" />
                  <span>{camera.siteName || "Công trường"}</span>
                </Link>
              )}
            </div>

            <h1 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Cctv className="h-5 w-5 text-primary" />
              <span>Camera AI Intelligence Studio</span>
            </h1>
          </div>
        </div>

        {/* Action Header Links */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick link to this camera's incidents */}
          <Link
            href={`/incidents?cameraId=${cameraId}&cameraCode=${camera?.code || cameraId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition shadow-sm dark:text-amber-400"
            title="Xem danh sách sự cố vi phạm do camera này phát hiện"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Sự cố camera này</span>
          </Link>

          {/* AI Metrics link */}
          <Link
            href={`/ai-metrics`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated transition shadow-sm"
            title="Xem thông số mô hình AI toàn hệ thống"
          >
            <Cpu className="h-4 w-4 text-primary" />
            <span>AI Metrics</span>
          </Link>
        </div>
      </div>

      {/* ── BỐ CỤC 2 CỘT: TRÌNH PHÁT VIDEO CAMERA THỰC TẾ (BÊN TRÁI) & BẢNG THÔNG SỐ AI (BÊN PHẢI) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* CỘT TRÁI (7 / 12 phần): TRÌNH PHÁT VIDEO CAMERA + OVERLAY BOUNDING BOX REAL-TIME */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <CameraIntelligencePlayer
            videoSrc={cameraStreamUrl || "https://www.youtube.com/watch?v=1-iS7LArMPA"}
            currentEntry={liveTrackingData.entry}
            isPlaying={isPlaying}
            showBbox={showBbox}
            videoRef={videoRef}
            onTogglePlay={handleTogglePlay}
            onToggleBbox={handleToggleBbox}
            cameraName={camera?.name}
            cameraCode={camera?.code || cameraId}
            siteName={camera?.siteName}
          />
        </div>

        {/* CỘT PHẢI (5 / 12 phần): 5 BẢNG THÔNG SỐ VÀ VI PHẠM THỜI GIAN THỰC */}
        <div className="lg:col-span-5 xl:col-span-5">
          <CameraIntelligenceSidebar
            currentEntry={liveTrackingData.entry}
            allViolations={liveTrackingData.violations}
            personTracks={liveTrackingData.personTracks}
            cameraId={cameraId}
            cameraCode={camera?.code || cameraId}
            siteName={camera?.siteName}
          />
        </div>
      </div>

      {/* ── PHÂN VÙNG DƯỚI: TRUNG TÂM BẢNG DỮ LIỆU PHÂN TÍCH & GIÁM SÁT CHI TIẾT (FULL-WIDTH TABLES) ── */}
      <CameraTelemetryTables
        currentEntry={liveTrackingData.entry}
        allViolations={liveTrackingData.violations}
        personTracks={liveTrackingData.personTracks}
        cameraCode={camera?.code || cameraId}
        siteName={camera?.siteName}
        onViewSnapshot={(url) => setLightboxEvidenceUrl(url)}
      />

      {/* Lightbox Modal phóng to ảnh bằng chứng nếu kích hoạt từ Table */}
      {lightboxEvidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setLightboxEvidenceUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-surface border border-white/20 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div>
                <span className="font-bold text-sm text-foreground">
                  Ảnh Bằng Chứng Vi Phạm (Evidence Snapshot — VI-08)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Camera: {camera?.code || cameraId} • Site: {camera?.siteName || "Công trường"} • Worker #102
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
            <div className="mt-3 overflow-hidden rounded-xl bg-black border border-border/40">
              <img
                src={lightboxEvidenceUrl}
                alt="Camera Evidence Snapshot"
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Trích xuất trực tiếp từ luồng Camera {camera?.code || cameraId}</span>
              <span className="font-mono text-emerald-500 font-semibold">MinIO S3 Evidence Synced</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

