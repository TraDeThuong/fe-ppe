"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Layers,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ResourceAuditTrailCard } from "@/components/features/audit-logs";
import { extractPlottedBoundaryPoints } from "@/components/features/sites/restricted-area-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Switch } from "@/components/ui/form";
import {
  useClearCameraConfig,
  useResetCameraConfig,
  useUpdateCameraConfig,
} from "@/hooks/cameras";
import { useEffectiveSafetyConfig } from "@/hooks/sites/use-site-safety-config";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraConfigItem,
  CameraItem,
  EffectiveSafetyConfigResponse,
} from "@/types";

export interface CameraDeviceAdvancedPanelsProps {
  camera: CameraItem;
  config?: CameraConfigItem | null;
  effectiveSafety?: EffectiveSafetyConfigResponse | null;
  onOpenRestrictedAreaModal?: () => void;
}

export function CameraDeviceAdvancedPanels({
  camera,
  config,
  effectiveSafety: providedEffectiveSafety,
  onOpenRestrictedAreaModal,
}: CameraDeviceAdvancedPanelsProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const can = useCan();
  const canManageCamera = can("PPE_CAMERA_MANAGE");
  const canReadSafety = can("PPE_SAFETY_CONFIG_READ");

  // 1. Camera DB Hardware Config Editor + Reset / Clear (ROI managed visually via RestrictedAreaDrawer)
  const updateConfigMutation = useUpdateCameraConfig();
  const resetConfigMutation = useResetCameraConfig();
  const clearConfigMutation = useClearCameraConfig();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [processingEnabled, setProcessingEnabled] = useState(true);
  const [captureFps, setCaptureFps] = useState(10);
  const [resolution, setResolution] = useState("1920x1080");
  const [motionSensitivity, setMotionSensitivity] = useState(75);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? true);
      setProcessingEnabled(config.processingEnabled ?? true);
      setCaptureFps(config.captureFps ?? 10);
      setResolution(config.resolution || "1920x1080");
      setMotionSensitivity(config.motionSensitivity ?? 75);
    }
  }, [config]);

  const roiPointsCount = useMemo(
    () => extractPlottedBoundaryPoints(config?.roiPolygon).length,
    [config?.roiPolygon],
  );

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCamera) return;
    await updateConfigMutation.mutateAsync({
      cameraId: camera.id,
      payload: {
        enabled,
        processingEnabled,
        captureFps: Math.max(1, Math.min(30, Number(captureFps) || 10)),
        resolution: resolution.trim() || "1920x1080",
        motionSensitivity: Math.max(
          1,
          Math.min(100, Number(motionSensitivity) || 75),
        ),
      },
    });
  };

  // 2. Effective Safety Config Preview (reuses parent query when provided)
  const { data: fetchedEffectiveSafety } = useEffectiveSafetyConfig(
    { siteId: camera.siteId, cameraId: camera.id },
    providedEffectiveSafety === undefined &&
      Boolean(camera.siteId && camera.id && canReadSafety),
  );
  const effectiveSafety = providedEffectiveSafety ?? fetchedEffectiveSafety;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Card A: Camera DB Hardware Config + Visual ROI Trigger */}
        <section
          className={`space-y-4 rounded-[28px] p-5 sm:p-6 xl:col-span-6 ${NM.chassis}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
              >
                <Sliders className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">
                  {isVi
                    ? "Cấu hình Phần cứng Camera DB"
                    : "Camera DB Hardware Config"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {isVi
                    ? "Thông số thu nhận khung hình & trạng thái xử lý"
                    : "Frame capture settings & processing state"}
                </p>
              </div>
            </div>

            {canManageCamera && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resetConfigMutation.isPending}
                  onClick={() => void resetConfigMutation.mutateAsync(camera.id)}
                  className="gap-1 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isVi ? "Mặc định" : "Reset"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  disabled={clearConfigMutation.isPending}
                  onClick={() => setClearDialogOpen(true)}
                  title={isVi ? "Xóa cấu hình DB" : "Clear DB config"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveDbConfig} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl px-3 py-2 shadow-nm-inset">
                <span className="font-semibold text-foreground">
                  {isVi ? "Bật Camera" : "Enabled"}
                </span>
                <Switch
                  checked={enabled}
                  disabled={!canManageCamera}
                  onCheckedChange={setEnabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl px-3 py-2 shadow-nm-inset">
                <span className="font-semibold text-foreground">
                  {isVi ? "Xử lý AI" : "AI Processing"}
                </span>
                <Switch
                  checked={processingEnabled}
                  disabled={!canManageCamera}
                  onCheckedChange={setProcessingEnabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">
                  Capture FPS (1–30)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  disabled={!canManageCamera}
                  value={captureFps}
                  onChange={(e) => setCaptureFps(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">
                  {isVi ? "Độ phân giải" : "Resolution"}
                </label>
                <Input
                  pattern="^\d+x\d+$"
                  disabled={!canManageCamera}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="1920x1080"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground">
                  Motion (1–100)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  disabled={!canManageCamera}
                  value={motionSensitivity}
                  onChange={(e) => setMotionSensitivity(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Clean Visual ROI Summary (replaces error-prone raw JSON textarea) */}
            <div
              className={`flex flex-wrap items-center justify-between gap-2.5 rounded-2xl p-3 ${NM.recessed}`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-3.5 w-3.5 text-danger" />
                  <span className="font-bold text-foreground">
                    {isVi
                      ? "Vùng cấm nguy hiểm (ROI Polygon)"
                      : "Restricted Danger Zone (ROI)"}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                      roiPointsCount >= 3
                        ? "bg-danger/15 text-danger"
                        : "bg-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {roiPointsCount >= 3
                      ? isVi
                        ? `${roiPointsCount} điểm`
                        : `${roiPointsCount} pts`
                      : isVi
                        ? "Chưa vẽ"
                        : "Unplotted"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isVi
                    ? "Sử dụng công cụ vẽ trực quan trên khung hình camera để đồng bộ chính xác."
                    : "Use the visual canvas drawer to plot and sync camera ROI boundaries."}
                </p>
              </div>

              {onOpenRestrictedAreaModal && (
                <button
                  type="button"
                  onClick={onOpenRestrictedAreaModal}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-[11px] font-bold text-danger transition hover:bg-danger/15"
                >
                  <AlertOctagon className="h-3 w-3" />
                  <span>
                    {isVi ? "Vẽ Vùng cấm trực quan" : "Plot ROI Visually"}
                  </span>
                </button>
              )}
            </div>

            {canManageCamera && (
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={updateConfigMutation.isPending}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isVi ? "Lưu Cấu hình DB" : "Save DB Config"}</span>
              </Button>
            )}
          </form>
        </section>

        {/* Card B: Effective Safety Config + Resource Audit Trail */}
        <div className="space-y-6 xl:col-span-6">
          {effectiveSafety && (
            <section className={`space-y-3 rounded-[28px] p-5 sm:p-6 ${NM.chassis}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-extrabold text-foreground">
                    {isVi
                      ? "Cấu hình An toàn Hiệu lực (Effective Safety Rules)"
                      : "Effective Resolved Safety Rules"}
                  </h4>
                </div>
                <Badge variant="info" className="font-mono text-[10px]">
                  {effectiveSafety.source}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 text-center text-xs min-[420px]:grid-cols-3">
                <div className={`rounded-xl p-2 ${NM.recessed}`}>
                  <span className="text-[10px] text-muted-foreground">
                    Confidence
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {Math.round((effectiveSafety.confidenceThreshold ?? 0.8) * 100)}%
                  </p>
                </div>
                <div className={`rounded-xl p-2 ${NM.recessed}`}>
                  <span className="text-[10px] text-muted-foreground">
                    {isVi ? "Mũ · Áo / Cooldown" : "Helmet · Vest / Cooldown"}
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {effectiveSafety.helmetConfirmationDuration ??
                      effectiveSafety.confirmationDuration}
                    s · {effectiveSafety.vestConfirmationDuration ?? 4}s /{" "}
                    {effectiveSafety.cooldownDuration}s
                  </p>
                </div>
                <div className={`rounded-xl p-2 ${NM.recessed}`}>
                  <span className="text-[10px] text-muted-foreground">
                    {isVi ? "Vùng cấm" : "Restricted Zones"}
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {effectiveSafety.restrictedAreas?.length ?? 0}
                  </p>
                </div>
              </div>
              {effectiveSafety.modelVersion && (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Model: {effectiveSafety.modelVersion.modelName} v
                    {effectiveSafety.modelVersion.version}
                  </span>
                </p>
              )}
            </section>
          )}

          <ResourceAuditTrailCard
            targetType="PPE_CAMERA"
            targetId={camera.id}
            title={isVi ? "Nhật ký Tác động Camera" : "Camera Audit Trail"}
          />
        </div>
      </div>

      <ConfirmDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={async () => {
          await clearConfigMutation.mutateAsync(camera.id);
          setClearDialogOpen(false);
        }}
        variant="danger"
        loading={clearConfigMutation.isPending}
        title={isVi ? "Xóa cấu hình DB của Camera?" : "Clear Camera DB Config?"}
        description={
          isVi
            ? "Bản ghi CameraConfig sẽ bị xóa khỏi database (hệ thống sẽ tạo lại mặc định khi đọc)."
            : "This removes the CameraConfig row from the database."
        }
        confirmText={isVi ? "Xóa" : "Clear"}
      />
    </div>
  );
}
