"use client";

import { useEffect, useState } from "react";
import { Camera, Edit2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, CameraSourceType, CameraStatus, UpdateCameraPayload } from "@/types";

export interface EditCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: CameraItem | null;
  onSubmit: (id: string, payload: UpdateCameraPayload) => Promise<void>;
  loading?: boolean;
}

export function EditCameraModal({
  open,
  onOpenChange,
  camera,
  onSubmit,
  loading = false,
}: EditCameraModalProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sourceType, setSourceType] = useState<CameraSourceType>("RTSP");
  const [status, setStatus] = useState<CameraStatus>("ONLINE");
  const [streamUrl, setStreamUrl] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (camera) {
      setName(camera.name);
      setCode(camera.code);
      setSourceType((camera.sourceType as CameraSourceType) || "RTSP");
      setStatus(camera.status);
      setStreamUrl(camera.streamUrl || "");
      setLocation(camera.location || "");
      setDescription(camera.description || "");
      setError(null);
    }
  }, [camera]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camera) return;
    setError(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên camera.");
      return;
    }

    try {
      await onSubmit(camera.id, {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        sourceType,
        status,
        streamUrl: streamUrl.trim() || undefined,
        location: location.trim() || null,
        description: description.trim() || null,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi cập nhật camera";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.editTitle")}
      description={t("cameras.modals.editDesc")}
      icon={<Edit2 className="h-5 w-5 text-primary" />}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Camera Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tên Camera <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
          </div>

          {/* Camera Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mã Camera
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Source Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Giao thức luồng
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as CameraSourceType)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              <option value="RTSP">RTSP (Real-Time Streaming)</option>
              <option value="HLS">HLS (HTTP Live Streaming)</option>
              <option value="HTTP">HTTP (MJPEG Feed)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trạng thái vận hành
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CameraStatus)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              <option value="ONLINE">ONLINE (Hoạt động)</option>
              <option value="OFFLINE">OFFLINE (Ngoại tuyến)</option>
              <option value="CONNECTING">CONNECTING (Đang kết nối)</option>
              <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
            </select>
          </div>
        </div>

        {/* Stream URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Địa chỉ URL Luồng Stream
          </label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vị trí lắp đặt
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mô tả / Ghi chú kỹ thuật
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <span>Lưu thay đổi</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
