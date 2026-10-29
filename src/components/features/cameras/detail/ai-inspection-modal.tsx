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
import type { AiInspectionConfig, StreamMetadata } from "./types";

export interface AiInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AiInspectionConfig;
  onSaveConfig: (newConfig: AiInspectionConfig) => void;
  cameraCode?: string;
  streamMetadata?: StreamMetadata;
}

export function AiInspectionModal({
  open,
  onOpenChange,
  config,
  onSaveConfig,
  cameraCode = "CAM-01",
  streamMetadata,
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
    config.modelVersionId || "yolo11s-ppe-best"
  );
  const [processFps, setProcessFps] = useState<number>(
    config.processFps || 25
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setConfidenceThreshold(config.confidenceThreshold ?? 0.8);
      setConfirmationDuration(config.confirmationDuration ?? 3.0);
      setCooldownDuration(config.cooldownDuration ?? 30);
      setEnableNoHelmet(config.enableNoHelmet ?? true);
      setEnableNoVest(config.enableNoVest ?? true);
      setEnableRestrictedArea(config.enableRestrictedArea ?? true);
      setSelectedModel(config.modelVersionId || "yolo11s-ppe-best");
      setProcessFps(config.processFps || 25);
    }
  }, [open, config]);

  const handleSubmit = (e: React.FormEvent) => {
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

    onSaveConfig(updated);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
    }, 200);
  };

  const handleResetDefaults = () => {
    setConfidenceThreshold(0.8);
    setConfirmationDuration(3.0);
    setCooldownDuration(30);
    setEnableNoHelmet(true);
    setEnableNoVest(true);
    setEnableRestrictedArea(true);
    setSelectedModel("yolo11s-ppe-best");
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

        {/* ── KHỐI 4: CHỌN PHIÊN BẢN MÔ HÌNH AI (MODEL SELECTION) ── */}
        <div className="space-y-1.5 rounded-xl border border-border/40 bg-surface/40 p-3">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{isVietnamese ? "Phiên bản mô hình AI (Model Weights)" : "AI Model Version"}</span>
            <span className="font-mono text-[10px] text-emerald-500 font-bold">MODAL-AI-TEST Linked</span>
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary shadow-sm"
          >
            <option value="yolo11s-ppe-best">
              YOLOv11s-PPE (best.pt — 21.5 MB, mAP 93.1%, Khuyến nghị)
            </option>
            <option value="yolo11m-ppe-finetune">
              YOLO11m-PPE (40.5 MB, mAP 98.3%, Độ chính xác cao)
            </option>
            <option value="yolo11n-edge-light">
              YOLO11n-PPE (5.5 MB, Tối ưu Edge Computing 45 FPS)
            </option>
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
