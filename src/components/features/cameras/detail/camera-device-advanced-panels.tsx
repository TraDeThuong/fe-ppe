"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  Edit3,
  Layers,
  Plus,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ResourceAuditTrailCard } from "@/components/features/audit-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Switch, Textarea } from "@/components/ui/form";
import {
  Select,
  type SelectOption,
} from "@/components/ui/form/selection-controls/select";
import {
  useCameraStreamMutations,
  useCameraStreams,
  useClearCameraConfig,
  useResetCameraConfig,
  useUpdateCameraConfig,
} from "@/hooks/cameras";
import { useEffectiveSafetyConfig } from "@/hooks/sites/use-site-safety-config";
import { useCan } from "@/hooks/use-can";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraConfigItem,
  CameraItem,
  CameraStreamItem,
  RoiPoint,
} from "@/types";

export interface CameraDeviceAdvancedPanelsProps {
  camera: CameraItem;
  config?: CameraConfigItem | null;
  onOpenRestrictedAreaModal?: () => void;
}

const STREAM_PROTOCOL_OPTIONS: SelectOption[] = [
  { value: "RTSP", label: "RTSP" },
  { value: "HLS", label: "HLS" },
  { value: "WEBRTC", label: "WEBRTC" },
];

const STREAM_STATUS_OPTIONS: SelectOption[] = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
];

export function CameraDeviceAdvancedPanels({
  camera,
  config,
  onOpenRestrictedAreaModal,
}: CameraDeviceAdvancedPanelsProps) {
  const { locale } = useLocale();
  const isVi = locale === "vi-VN";
  const can = useCan();
  const canManageCamera = can("PPE_CAMERA_MANAGE");
  const canReadSafety = can("PPE_SAFETY_CONFIG_READ");

  // 1. Camera DB Config Editor + Reset / Clear
  const updateConfigMutation = useUpdateCameraConfig();
  const resetConfigMutation = useResetCameraConfig();
  const clearConfigMutation = useClearCameraConfig();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [processingEnabled, setProcessingEnabled] = useState(true);
  const [captureFps, setCaptureFps] = useState(10);
  const [resolution, setResolution] = useState("1920x1080");
  const [motionSensitivity, setMotionSensitivity] = useState(75);
  const [roiText, setRoiText] = useState("[]");

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? true);
      setProcessingEnabled(config.processingEnabled ?? true);
      setCaptureFps(config.captureFps ?? 10);
      setResolution(config.resolution || "1920x1080");
      setMotionSensitivity(config.motionSensitivity ?? 75);
      setRoiText(JSON.stringify(config.roiPolygon ?? [], null, 2));
    }
  }, [config]);

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedRoi: RoiPoint[] | null = null;
    try {
      const trimmed = roiText.trim();
      if (trimmed && trimmed !== "null") {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          throw new Error("ROI Polygon must be a JSON array of {x, y} points");
        }
        if (parsed.length > 0 && parsed.length < 3) {
          throw new Error(
            isVi
              ? "ROI Polygon cần 0 điểm hoặc từ 3 đến 50 điểm {x, y}"
              : "ROI Polygon requires 0 or 3 to 50 {x, y} points",
          );
        }
        parsedRoi = parsed.length === 0 ? null : parsed;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid ROI JSON");
      return;
    }

    await updateConfigMutation.mutateAsync({
      cameraId: camera.id,
      payload: {
        enabled,
        processingEnabled,
        captureFps: Math.max(1, Math.min(30, Number(captureFps) || 10)),
        resolution: resolution.trim() || "1920x1080",
        motionSensitivity: Math.max(1, Math.min(100, Number(motionSensitivity) || 75)),
        roiPolygon: parsedRoi,
      },
    });
  };

  // 2. Camera Streams Manager
  const { data: streams = [], isLoading: streamsLoading } = useCameraStreams(
    camera.id,
    Boolean(camera.id),
  );
  const streamMutations = useCameraStreamMutations(camera.id);
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<CameraStreamItem | null>(null);
  const [protocol, setProtocol] = useState("RTSP");
  const [streamUrl, setStreamUrl] = useState("");
  const [streamResolution, setStreamResolution] = useState("1920x1080");
  const [streamFps, setStreamFps] = useState("25");
  const [streamStatus, setStreamStatus] = useState("ACTIVE");
  const [deleteStreamTarget, setDeleteStreamTarget] =
    useState<CameraStreamItem | null>(null);

  const openCreateStream = () => {
    setEditingStream(null);
    setProtocol("RTSP");
    setStreamUrl("");
    setStreamResolution("1920x1080");
    setStreamFps("25");
    setStreamStatus("ACTIVE");
    setStreamModalOpen(true);
  };

  const openEditStream = (s: CameraStreamItem) => {
    setEditingStream(s);
    setProtocol(s.protocol);
    setStreamUrl(s.streamUrl);
    setStreamResolution(s.resolution || "1920x1080");
    setStreamFps(String(s.fps ?? 25));
    setStreamStatus(s.status || "ACTIVE");
    setStreamModalOpen(true);
  };

  const handleSaveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStream) {
      await streamMutations.updateStream.mutateAsync({
        streamId: editingStream.id,
        payload: {
          protocol: protocol as "RTSP" | "HLS" | "WEBRTC",
          streamUrl: streamUrl.trim(),
          resolution: streamResolution.trim() || undefined,
          fps: Number(streamFps) || undefined,
          status: streamStatus as "ACTIVE" | "INACTIVE",
        },
      });
    } else {
      await streamMutations.createStream.mutateAsync({
        protocol: protocol as "RTSP" | "HLS" | "WEBRTC",
        streamUrl: streamUrl.trim(),
        resolution: streamResolution.trim() || undefined,
        fps: Number(streamFps) || undefined,
        status: streamStatus as "ACTIVE" | "INACTIVE",
      });
    }
    setStreamModalOpen(false);
  };

  // 3. Effective Safety Config Preview
  const { data: effectiveSafety } = useEffectiveSafetyConfig(
    { siteId: camera.siteId, cameraId: camera.id },
    Boolean(camera.siteId && camera.id && canReadSafety),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Card A: Camera DB Config + ROI + Reset/Clear */}
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
                    ? "Cấu hình Camera DB & ROI Polygon"
                    : "Camera DB Config & ROI Polygon"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  PUT / Reset / Clear CameraConfig
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

          <form onSubmit={handleSaveDbConfig} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-muted-foreground">
                  ROI Polygon JSON (0 hoặc 3–50 điểm {"{x, y}"})
                </label>
                {canManageCamera && onOpenRestrictedAreaModal && (
                  <button
                    type="button"
                    onClick={onOpenRestrictedAreaModal}
                    className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger hover:bg-danger/15 transition"
                  >
                    <AlertOctagon className="h-3 w-3" />
                    <span>
                      {isVi
                        ? "Vẽ Vùng cấm trực quan trên Camera"
                        : "Plot ROI visually on Camera"}
                    </span>
                  </button>
                )}
              </div>
              <Textarea
                rows={4}
                disabled={!canManageCamera}
                value={roiText}
                onChange={(e) => setRoiText(e.target.value)}
                className="font-mono text-[11px]"
                placeholder='[{"x": 0.25, "y": 0.25}, {"x": 0.75, "y": 0.25}, {"x": 0.75, "y": 0.75}]'
              />
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

        {/* Card B: Camera Streams Manager + Effective Safety Config */}
        <div className="space-y-6 xl:col-span-6">
          <section className={`space-y-4 rounded-[28px] p-5 sm:p-6 ${NM.chassis}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-primary ${NM.recessed}`}
                >
                  <Radio className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    {isVi
                      ? `Luồng Video Streams (${streams.length})`
                      : `Camera Streams (${streams.length})`}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    RTSP / HLS / WebRTC Sub-streams
                  </p>
                </div>
              </div>
              {canManageCamera && (
                <Button size="sm" variant="outline" onClick={openCreateStream} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isVi ? "Thêm Stream" : "Add Stream"}</span>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {streamsLoading ? (
                <div className="h-20 animate-pulse rounded-xl bg-surface-elevated/40" />
              ) : streams.length === 0 ? (
                <p className="rounded-xl p-4 text-center text-xs text-muted-foreground shadow-nm-inset">
                  {isVi ? "Chưa có luồng stream nào." : "No streams configured."}
                </p>
              ) : (
                streams.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/20 bg-background/60 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={s.status === "ACTIVE" ? "success" : "default"}>
                          {s.status}
                        </Badge>
                        <Badge variant="info" className="font-mono text-[10px]">
                          {s.protocol}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {s.resolution || "--"} · {s.fps ?? "--"} fps
                        </span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-foreground">
                        {s.streamUrl}
                      </p>
                    </div>
                    {canManageCamera && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditStream(s)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={streams.length <= 1}
                          title={
                            streams.length <= 1
                              ? isVi
                                ? "Không thể xóa luồng cuối cùng"
                                : "Cannot delete the last remaining stream"
                              : undefined
                          }
                          className="text-danger hover:text-danger disabled:opacity-35"
                          onClick={() => setDeleteStreamTarget(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

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
              <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 text-center text-xs">
                <div className={`rounded-xl p-2 ${NM.recessed}`}>
                  <span className="text-[10px] text-muted-foreground">Confidence</span>
                  <p className="font-mono font-bold text-foreground">
                    {Math.round((effectiveSafety.confidenceThreshold ?? 0.8) * 100)}%
                  </p>
                </div>
                <div className={`rounded-xl p-2 ${NM.recessed}`}>
                  <span className="text-[10px] text-muted-foreground">Confirm / Cooldown</span>
                  <p className="font-mono font-bold text-foreground">
                    {effectiveSafety.confirmationDuration}s / {effectiveSafety.cooldownDuration}s
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

      {/* Stream Add/Edit Modal */}
      <Dialog
        open={streamModalOpen}
        onOpenChange={setStreamModalOpen}
        title={
          editingStream
            ? isVi
              ? "Cập nhật Camera Stream"
              : "Update Camera Stream"
            : isVi
              ? "Thêm Camera Stream mới"
              : "Add Camera Stream"
        }
        size="md"
      >
        <form onSubmit={handleSaveStream} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Protocol</label>
              <Select
                size="sm"
                options={STREAM_PROTOCOL_OPTIONS}
                value={protocol}
                onValueChange={setProtocol}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Status</label>
              <Select
                size="sm"
                options={STREAM_STATUS_OPTIONS}
                value={streamStatus}
                onValueChange={setStreamStatus}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Stream URL *</label>
            <Input
              required
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://user:pass@192.168.1.10:554/stream2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Resolution</label>
              <Input
                pattern="^\d+x\d+$"
                value={streamResolution}
                onChange={(e) => setStreamResolution(e.target.value)}
                placeholder="1920x1080"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">FPS (1–60)</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={streamFps}
                onChange={(e) => setStreamFps(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStreamModalOpen(false)}>
              {isVi ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                streamMutations.createStream.isPending ||
                streamMutations.updateStream.isPending
              }
            >
              {isVi ? "Lưu Stream" : "Save Stream"}
            </Button>
          </div>
        </form>
      </Dialog>

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

      <ConfirmDialog
        open={Boolean(deleteStreamTarget)}
        onClose={() => setDeleteStreamTarget(null)}
        onConfirm={async () => {
          if (!deleteStreamTarget) return;
          await streamMutations.deleteStream.mutateAsync(deleteStreamTarget.id);
          setDeleteStreamTarget(null);
        }}
        variant="danger"
        loading={streamMutations.deleteStream.isPending}
        title={isVi ? "Xóa luồng Stream?" : "Delete Camera Stream?"}
        description={deleteStreamTarget?.streamUrl || ""}
        confirmText={isVi ? "Xóa" : "Delete"}
      />
    </div>
  );
}

