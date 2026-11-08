"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Sliders } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CameraRoiCanvas } from "./camera-roi-canvas";
import { useCameraConfig, useUpdateCameraConfig } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, RoiPoint, UpdateCameraConfigPayload } from "@/types";

export interface CameraRoiDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera?: CameraItem | null;
  initialPoints?: RoiPoint[];
  onSavePoints?: (points: RoiPoint[]) => void | Promise<void>;
  customStreamUrl?: string;
  customCameraName?: string;
  customCameraCode?: string;
  customImageUrl?: string;
}

export function CameraRoiDrawer({
  open,
  onOpenChange,
  camera,
  initialPoints,
  onSavePoints,
  customStreamUrl,
  customCameraName,
  customCameraCode,
  customImageUrl,
}: CameraRoiDrawerProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: config, isLoading: configLoading } = useCameraConfig(
    camera?.id || "",
    open && Boolean(camera?.id),
  );
  const updateConfig = useUpdateCameraConfig();

  const [points, setPoints] = useState<RoiPoint[]>([]);
  const [processingEnabled, setProcessingEnabled] = useState(true);
  const [captureFps, setCaptureFps] = useState(10);
  const [motionSensitivity, setMotionSensitivity] = useState(75);
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialPoints !== undefined) {
      setPoints(initialPoints);
    } else if (config) {
      setPoints(config.roiPolygon || []);
      setProcessingEnabled(config.processingEnabled ?? true);
      setCaptureFps(config.captureFps || 10);
      setMotionSensitivity(config.motionSensitivity || 75);
    } else if (camera?.config) {
      setPoints(camera.config.roiPolygon || []);
      setProcessingEnabled(camera.config.processingEnabled ?? true);
      setCaptureFps(camera.config.captureFps || 10);
      setMotionSensitivity(camera.config.motionSensitivity || 75);
    }
  }, [open, initialPoints, config, camera]);

  const handleSave = async () => {
    if (onSavePoints) {
      setIsSavingCustom(true);
      try {
        await onSavePoints(points);
        onOpenChange(false);
      } finally {
        setIsSavingCustom(false);
      }
      return;
    }

    if (!camera) return;

    const payload: UpdateCameraConfigPayload = {
      processingEnabled,
      captureFps,
      roiPolygon: points,
      motionSensitivity,
    };

    await updateConfig.mutateAsync({
      cameraId: camera.id,
      payload,
    });
    onOpenChange(false);
  };

  const isSaving = updateConfig.isPending || isSavingCustom;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.roiTitle")}
      description={t("cameras.modals.roiDesc")}
      icon={<Sliders className="h-5 w-5 text-primary" />}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex-1 sm:flex-initial"
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isVietnamese ? "Lưu cấu hình AI ROI" : "Save AI ROI Config"}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Camera Info Header */}
        <div className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/60 p-3">
          <div>
            <span className="font-mono text-xs font-bold text-primary">
              {camera?.code || customCameraCode || "AI-SANDBOX"}
            </span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span className="text-xs font-semibold text-foreground">
              {camera?.name || customCameraName || "Sandbox Test Stream"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {camera?.location || (isVietnamese ? "Phòng thử nghiệm AI" : "AI Sandbox")}
          </span>
        </div>

        {/* Interactive Drawing Canvas */}
        <CameraRoiCanvas
          points={points}
          onChange={setPoints}
          imageUrl={customImageUrl || camera?.snapshotUrl}
          streamUrl={customStreamUrl || camera?.streamUrl}
          cameraName={camera?.name || customCameraName}
          disabled={configLoading || isSaving}
        />

        {/* AI Calibration Parameters */}
        <div className="grid grid-cols-1 gap-3.5 rounded-2xl border border-border/40 bg-surface/40 p-3.5 sm:grid-cols-3 sm:gap-4 sm:p-4">
          {/* Processing Enabled Switch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Quét Nhận diện AI PPE
            </label>
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={processingEnabled}
                  onChange={(e) => setProcessingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border/40 text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  {processingEnabled ? "Đang bật" : "Tạm dừng quét"}
                </span>
              </label>
            </div>
          </div>

          {/* Capture FPS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Tốc độ lấy mẫu
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {captureFps} FPS
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={captureFps}
              onChange={(e) => setCaptureFps(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Motion Sensitivity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Độ nhạy chuyển động
              </label>
              <span className="font-mono text-xs font-bold text-primary">
                {motionSensitivity}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={motionSensitivity}
              onChange={(e) => setMotionSensitivity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
