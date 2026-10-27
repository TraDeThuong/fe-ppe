"use client";

import { useState } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CameraSourceType, CreateCameraPayload } from "@/types";

export interface CreateCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCameraPayload) => Promise<void>;
  loading?: boolean;
}

export function CreateCameraModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateCameraModalProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [siteId, setSiteId] = useState("00000000-0000-0000-0000-000000000001");
  const [sourceType, setSourceType] = useState<CameraSourceType>("RTSP");
  const [streamUrl, setStreamUrl] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên camera.");
      return;
    }

    const formattedCode = code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!formattedCode) {
      setError("Vui lòng nhập mã camera (VD: CAM-NORTH-01).");
      return;
    }

    if (!streamUrl.trim()) {
      setError("Vui lòng nhập địa chỉ URL luồng video.");
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        code: formattedCode,
        siteId,
        sourceType,
        streamUrl: streamUrl.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });

      setName("");
      setCode("");
      setStreamUrl("");
      setLocation("");
      setDescription("");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo camera";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.createTitle")}
      description={t("cameras.modals.createDesc")}
      icon={<Camera className="h-5 w-5 text-primary" />}
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
              placeholder="VD: Camera Giàn Giáo Tầng 5"
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
          </div>

          {/* Camera Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mã Camera <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: CAM-NORTH-01"
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs uppercase shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
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

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vị trí lắp đặt
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Cổng vào khu vực giàn giáo phía Bắc"
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>

        {/* Stream URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Địa chỉ URL Luồng Stream <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="rtsp://admin:pass@192.168.1.100:554/stream1 hoặc https://..."
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
            required
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
            placeholder="Ghi chú về góc quay camera, phần cứng, thông số kết nối..."
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
              <Plus className="h-4 w-4" />
            )}
            <span>Thêm Camera</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
