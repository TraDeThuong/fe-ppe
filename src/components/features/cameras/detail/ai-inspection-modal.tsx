"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Cpu,
  HardHat,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  Shirt,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { aiMetricsService } from "@/services/ai-metrics.service";
import type { AiInspectionConfig, StreamMetadata } from "./types";

export interface RemoteAiModelOption {
  id: string;
  name: string;
  filename?: string;
  path: string;
  size_mb: number;
  label?: string;
  is_default?: boolean;
}

export const DEFAULT_AI_MODEL_OPTIONS: RemoteAiModelOption[] = [
  {
    id: "models/best.pt",
    name: "YOLOv11s-PPE",
    filename: "best.pt",
    path: "models/best.pt",
    size_mb: 18.3,
    label: "YOLOv11s-PPE (best.pt — 18.3 MB, Tối ưu nhất - Khuyến nghị)",
    is_default: true,
  },
];

function normalizeModelId(rawId?: string): string {
  if (!rawId) return "models/best.pt";
  if (rawId === "models/yolo11s-best.pt" || rawId === "yolo11s-ppe-best") {
    return "models/best.pt";
  }
  return rawId;
}

export interface AiInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AiInspectionConfig;
  onSaveConfig: (newConfig: AiInspectionConfig) => void | Promise<void>;
  cameraCode?: string;
  streamMetadata?: StreamMetadata;
  roiPointsCount?: number;
  dangerPointsCount?: number;
  onOpenRoiDrawer?: () => void;
  onOpenDangerDrawer?: () => void;
}

export function AiInspectionModal({
  open,
  onOpenChange,
  config,
  onSaveConfig,
  cameraCode = "CAM-01",
  streamMetadata,
  roiPointsCount,
  dangerPointsCount,
  onOpenRoiDrawer,
  onOpenDangerDrawer,
}: AiInspectionModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Form states synced with parent config
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
    config.confidenceThreshold ?? 0.8
  );
  const [confirmationDuration, setConfirmationDuration] = useState<number>(
    config.confirmationDuration ?? 3.0
  );
  const [cooldownDuration, setCooldownDuration] = useState<number>(
    config.cooldownDuration ?? 30
  );
  const [enableNoHelmet, setEnableNoHelmet] = useState<boolean>(
    config.enableNoHelmet ?? true
  );
  const [enableNoVest, setEnableNoVest] = useState<boolean>(
    config.enableNoVest ?? true
  );
  const [enableRestrictedArea, setEnableRestrictedArea] = useState<boolean>(
    config.enableRestrictedArea ?? true
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    normalizeModelId(config.modelVersionId)
  );
  const [processFps, setProcessFps] = useState<number>(
    config.processFps || 25
  );

  const [loading, setLoading] = useState(false);
  const [remoteModels, setRemoteModels] = useState<RemoteAiModelOption[]>(
    DEFAULT_AI_MODEL_OPTIONS
  );

  useEffect(() => {
    if (open) {
      setConfidenceThreshold(config.confidenceThreshold ?? 0.8);
      setConfirmationDuration(config.confirmationDuration ?? 3.0);
      setCooldownDuration(config.cooldownDuration ?? 30);
      setEnableNoHelmet(config.enableNoHelmet ?? true);
      setEnableNoVest(config.enableNoVest ?? true);
      setEnableRestrictedArea(config.enableRestrictedArea ?? true);
      setSelectedModel(normalizeModelId(config.modelVersionId));
      setProcessFps(config.processFps || 25);

      // Lấy danh sách mô hình AI từ Backend Multi-Model Registry (/api/v1/ai-models)
      aiMetricsService
        .getAiModels()
        .then((models) => {
          if (!Array.isArray(models) || models.length === 0) return;
          const mapped: RemoteAiModelOption[] = [];
          for (const m of models) {
            for (const v of m.versions || []) {
              const path = v.modelPath || "models/best.pt";
              const filename = path.split("/").pop() || "best.pt";
              const metricsAny = (v.metrics || {}) as Record<string, any>;
              const sizeMb = Number(metricsAny.sizeMb || 18.3);
              const customLabel = metricsAny.label as string | undefined;
              mapped.push({
                id: v.id,
                name: `${m.name} v${v.version}`,
                filename,
                path,
                size_mb: sizeMb,
                label:
                  customLabel ||
                  `${m.name} v${v.version} (${filename} — ${sizeMb} MB${
                    v.status === "DEPLOYED" ? ", Tối ưu nhất - Khuyến nghị" : ""
                  })`,
                is_default: v.status === "DEPLOYED",
              });
            }
          }
          if (mapped.length > 0) {
            setRemoteModels(mapped);
            const normalizedCurrent = normalizeModelId(config.modelVersionId);
            const matched = mapped.find(
              (opt) => opt.path === normalizedCurrent || opt.id === normalizedCurrent
            );
            if (!matched) {
              const defaultOpt = mapped.find((opt) => opt.is_default) || mapped[0];
              setSelectedModel(defaultOpt.path);
            }
          }
        })
        .catch(() => {
          setRemoteModels(DEFAULT_AI_MODEL_OPTIONS);
        });
    }
  }, [open, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updated: AiInspectionConfig = {
      confidenceThreshold,
      confirmationDuration,
      cooldownDuration,
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      modelVersionId: selectedModel,
      processFps,
    };

    try {
      await onSaveConfig(updated);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setConfidenceThreshold(0.8);
    setConfirmationDuration(3.0);
    setCooldownDuration(30);
    setEnableNoHelmet(true);
    setEnableNoVest(true);
    setEnableRestrictedArea(true);
    setSelectedModel(remoteModels[0]?.path || "models/best.pt");
    setProcessFps(25);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isVietnamese
          ? `Cấu Hình & Tinh Chỉnh Mô Hình AI — ${cameraCode}`
          : `AI Model Inspection & Parameter Tuning — ${cameraCode}`
      }
      description={
        isVietnamese
          ? "Tinh chỉnh ngưỡng suy luận mạng nơ-ron và cửa sổ thời gian xác nhận vi phạm cho video camera này"
          : "Tune neural network inference thresholds and violation confirmation temporal window for this video stream"
      }
      icon={<Cpu className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner tóm tắt nguồn video thực tế đang kiểm tra */}
        {streamMetadata && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold text-foreground">
                {isVietnamese ? "Video nguồn đang nạp:" : "Target Video Stream:"}
              </span>
              <span className="font-mono text-primary font-bold">
                {streamMetadata.streamType === "youtube_shorts"
                  ? "YouTube Shorts (9:16 Dọc)"
                  : streamMetadata.streamType === "youtube_video"
                    ? "YouTube Feed (16:9 Ngang)"
                    : streamMetadata.streamType === "html5_video"
                      ? "HTML5 MP4 / WebM Native"
                      : streamMetadata.streamType === "webcam"
                        ? "Webcam Trực Tiếp"
                        : "RTSP Live Stream"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground bg-surface px-2 py-0.5 rounded-lg border border-border/40">
              {streamMetadata.aspectRatioLabel}
            </span>
          </div>
        )}

        {/* ── KHỐI 1: NGƯỠNG NHẬN DIỆN & CỬA SỔ THỜI GIAN (CONFIDENCE & CONFIRMATION) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/40 bg-surface/50 p-4 shadow-sm">
          {/* Slider Ngưỡng Tin Cậy */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground">
                {isVietnamese ? "Ngưỡng tin cậy AI (Confidence)" : "AI Confidence Threshold"}
              </span>
              <span className="font-mono text-primary font-bold">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Mô hình YOLO chỉ chấp nhận đối tượng khi xác suất dự đoán ≥ ngưỡng này."
                : "YOLO only accepts detections when prediction score ≥ this threshold."}
            </p>
          </div>

          {/* Slider Thời Gian Xác Nhận */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground">
                {isVietnamese ? "Thời gian xác nhận vi phạm" : "Confirmation Duration"}
              </span>
              <span className="font-mono text-primary font-bold">
                {confirmationDuration.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={confirmationDuration}
              onChange={(e) => setConfirmationDuration(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Thời gian vi phạm liên tục để loại bỏ báo động giả (cúi người, góc khuất ngắn)."
                : "Continuous violation duration to eliminate false alarms from temporary occlusion."}
            </p>
          </div>
        </div>

        {/* ── KHỐI 2: THỜI GIAN COOLDOWN & TỐC ĐỘ LẤY MẪU ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/40 bg-surface/50 p-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground">
                {isVietnamese ? "Thời gian Cooldown lặp lại" : "Spam Cooldown Duration"}
              </span>
              <span className="font-mono text-primary font-bold">{cooldownDuration}s</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={cooldownDuration}
              onChange={(e) => setCooldownDuration(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Khoảng nghỉ trước khi hệ thống tạo sự cố mới trên cùng 1 công nhân (VI-07)."
                : "Wait interval before generating duplicate incident for same worker (VI-07)."}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground">
                {isVietnamese ? "Tần suất xử lý khung hình (FPS)" : "Frame Processing Rate (FPS)"}
              </span>
              <span className="font-mono text-primary font-bold">{processFps} FPS</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[10, 15, 25].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => setProcessFps(fps)}
                  className={`rounded-lg py-1.5 text-xs font-mono font-bold transition border ${
                    processFps === fps
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-surface hover:bg-surface-elevated text-foreground border-border/40"
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isVietnamese
                ? "Khuyến nghị 25 FPS cho độ mượt mà cao nhất khi trình chiếu."
                : "25 FPS recommended for smooth bounding box animation."}
            </p>
          </div>
        </div>

        {/* ── KHỐI 3: QUY TẮC AN TOÀN KÍCH HOẠT (RULES TOGGLES) ── */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Quy tắc an toàn kích hoạt trên luồng này" : "Active Safety Rules"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex items-center gap-2.5 rounded-xl border border-border/40 p-3 bg-surface/40 cursor-pointer hover:bg-surface/80 transition shadow-sm">
              <input
                type="checkbox"
                checked={enableNoHelmet}
                onChange={(e) => setEnableNoHelmet(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <HardHat className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Mũ bảo hộ" : "Hard Hat"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese ? "Lớp helmet (CRITICAL)" : "helmet class"}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 rounded-xl border border-border/40 p-3 bg-surface/40 cursor-pointer hover:bg-surface/80 transition shadow-sm">
              <input
                type="checkbox"
                checked={enableNoVest}
                onChange={(e) => setEnableNoVest(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <Shirt className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Áo phản quang" : "Safety Vest"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese ? "Lớp vest (HIGH)" : "safety_vest class"}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 rounded-xl border border-border/40 p-3 bg-surface/40 cursor-pointer hover:bg-surface/80 transition shadow-sm">
              <input
                type="checkbox"
                checked={enableRestrictedArea}
                onChange={(e) => setEnableRestrictedArea(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <AlertOctagon className="h-4 w-4 text-rose-500" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isVietnamese ? "Vùng cấm nguy hiểm" : "Danger Zone"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isVietnamese ? "Đa giác ROI cấm" : "Restricted Polygon"}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ── KHỐI: RANH GIỚI KHÔNG GIAN GIÁM SÁT (SPATIAL BOUNDARIES) ── */}
        {(onOpenRoiDrawer || onOpenDangerDrawer) && (
          <div className="space-y-2 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>
                  {isVietnamese
                    ? "Ranh giới không gian giám sát (Spatial Geometry)"
                    : "Spatial Geometry Boundaries"}
                </span>
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {isVietnamese ? "Tọa độ chuẩn hóa [0..1]" : "Normalized [0..1]"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* ROI Polygon */}
              {onOpenRoiDrawer && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                      {isVietnamese ? "Vùng quét AI (ROI)" : "AI Scan ROI"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {roiPointsCount && roiPointsCount >= 3
                        ? isVietnamese
                          ? `Đã cấu hình ${roiPointsCount} điểm đỉnh`
                          : `${roiPointsCount} vertices configured`
                        : isVietnamese
                          ? "Toàn khung hình (chưa giới hạn)"
                          : "Full frame (unrestricted)"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenRoiDrawer();
                    }}
                    className="text-xs h-7 px-2.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    {isVietnamese ? "Vẽ / Sửa ROI" : "Edit ROI"}
                  </Button>
                </div>
              )}

              {/* Danger Zone Polygon */}
              {onOpenDangerDrawer && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      {isVietnamese ? "Vùng cấm nguy hiểm" : "Restricted Danger Zone"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {dangerPointsCount && dangerPointsCount >= 3
                        ? isVietnamese
                          ? `Đã thiết lập ${dangerPointsCount} điểm đỉnh`
                          : `${dangerPointsCount} vertices defined`
                        : isVietnamese
                          ? "Chưa khoanh vùng nguy hiểm"
                          : "No danger zone"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenDangerDrawer();
                    }}
                    className="text-xs h-7 px-2.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  >
                    {isVietnamese ? "Khoanh vùng cấm" : "Edit Zone"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── KHỐI 4: CHỌN PHIÊN BẢN MÔ HÌNH AI (MODEL SELECTION) ── */}
        <div className="space-y-1.5 rounded-xl border border-border/40 bg-surface/40 p-3">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{isVietnamese ? "Phiên bản mô hình AI (Model Weights)" : "AI Model Version"}</span>
            <span className="font-mono text-[10px] text-emerald-500 font-bold">
              {remoteModels.length > 0
                ? `${remoteModels.length} file .pt trong models/`
                : "models/ Linked"}
            </span>
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-sm"
          >
            {remoteModels.length > 0 ? (
              remoteModels.map((m) => (
                <option key={m.id || m.path} value={m.path}>
                  {m.label || `${m.name} (${m.filename || m.path} — ${m.size_mb} MB)`}
                </option>
              ))
            ) : (
              <option value="models/best.pt">
                YOLOv11s-PPE (best.pt — 18.3 MB, Tối ưu nhất - Khuyến nghị)
              </option>
            )}
          </select>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{isVietnamese ? "Mặc định chuẩn" : "Reset Defaults"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="gap-1.5 font-bold shadow-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isVietnamese ? "Áp dụng & Kiểm tra ngay" : "Apply & Inspect Live"}</span>
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
