"use client";

import { useEffect, useState } from "react";
import { Camera, Edit2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSites, useSiteZones } from "@/hooks/sites";
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
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: sitesData } = useSites();
  const sites = sitesData?.items || [];

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [sourceType, setSourceType] = useState<CameraSourceType>("RTSP");
  const [status, setStatus] = useState<CameraStatus>("ONLINE");
  const [streamUrl, setStreamUrl] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: zones = [] } = useSiteZones(siteId, Boolean(siteId));

  useEffect(() => {
    if (camera) {
      setName(camera.name);
      setCode(camera.code);
      setSiteId(camera.siteId || "");
      setZoneId(camera.zoneId || "");
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
      setError(isVietnamese ? "Vui lòng nhập tên camera." : "Please enter camera name.");
      return;
    }

    try {
      await onSubmit(camera.id, {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        siteId:
          siteId ||
          camera.siteId ||
          (sites.length > 0 ? sites[0].id : "0192d6e3-8f0a-7bb1-8c4d-91b53f608a11"),
        zoneId: zoneId.trim() ? zoneId.trim() : null,
        sourceType,
        status,
        streamUrl: streamUrl.trim() || undefined,
        location: location.trim() || null,
        description: description.trim() || null,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isVietnamese ? "Đã có lỗi xảy ra khi cập nhật camera" : "An error occurred while updating the camera");
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
              {isVietnamese ? "Tên Camera" : "Camera Name"} <span className="text-danger">*</span>
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
              {isVietnamese ? "Mã Camera" : "Camera Code"}
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

        {/* Site and Zone Selection */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Site Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Công trường" : "Site"} <span className="text-danger">*</span>
            </label>
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setZoneId("");
              }}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            >
              {sites.length === 0 ? (
                <option value={camera?.siteId || "0192d6e3-8f0a-7bb1-8c4d-91b53f608a11"}>
                  {camera?.siteName || (isVietnamese ? "Công trường Landmark 81" : "Landmark 81 Site")}
                </option>
              ) : (
                sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Zone Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Phân khu (Tùy chọn)" : "Zone (Optional)"}
            </label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading || zones.length === 0}
            >
              <option value="">{isVietnamese ? "-- Toàn công trường --" : "-- Entire Site --"}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Source Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Giao thức luồng" : "Stream Protocol"}
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as CameraSourceType)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              <option value="RTSP">RTSP (Real-Time Streaming)</option>
              <option value="HLS">HLS (HTTP Live Streaming)</option>
              <option value="HTTP">HTTP (MJPEG / Web Feed)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Trạng thái vận hành" : "Operational Status"}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CameraStatus)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              <option value="ONLINE">{isVietnamese ? "ONLINE (Hoạt động)" : "ONLINE (Active)"}</option>
              <option value="OFFLINE">{isVietnamese ? "OFFLINE (Ngoại tuyến)" : "OFFLINE (Disconnected)"}</option>
              <option value="CONNECTING">{isVietnamese ? "CONNECTING (Đang kết nối)" : "CONNECTING (Connecting)"}</option>
              <option value="MAINTENANCE">{isVietnamese ? "MAINTENANCE (Bảo trì)" : "MAINTENANCE (Servicing)"}</option>
            </select>
          </div>
        </div>

        {/* Stream URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Địa chỉ URL Luồng Stream" : "Stream URL Endpoint"}
            </label>
            <span className="text-[11px] text-muted-foreground/80">
              {isVietnamese ? "Hỗ trợ RTSP, HTTP/MP4, YouTube, Webcam" : "Supports RTSP, HTTP/MP4, YouTube, Webcam"}
            </span>
          </div>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />

          {/* Quick presets for testing */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground">
              {isVietnamese ? "Chọn nhanh để test:" : "Quick test presets:"}
            </span>
            <button
              type="button"
              onClick={() => {
                setStreamUrl("http://localhost/webcam");
                setSourceType("HTTP");
              }}
              className="rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] text-foreground/80 hover:bg-surface-elevated transition"
            >
              {isVietnamese ? "💻 Webcam máy tính" : "💻 Local Webcam"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStreamUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
                setSourceType("HTTP");
              }}
              className="rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] text-foreground/80 hover:bg-surface-elevated transition"
            >
              {isVietnamese ? "🎥 Mẫu MP4" : "🎥 Sample MP4"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStreamUrl("https://www.youtube.com/watch?v=1-iS7LArMPA");
                setSourceType("HLS");
              }}
              className="rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] text-foreground/80 hover:bg-surface-elevated transition"
            >
              🔴 YouTube Live
            </button>
            <button
              type="button"
              onClick={() => {
                setStreamUrl("rtsp://admin:Pass@123@192.168.1.100:554/stream1");
                setSourceType("RTSP");
              }}
              className="rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] text-foreground/80 hover:bg-surface-elevated transition"
            >
              {isVietnamese ? "📡 Luồng RTSP thực" : "📡 Real RTSP Stream"}
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Vị trí lắp đặt" : "Physical Location / Floor"}
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
            {isVietnamese ? "Mô tả / Ghi chú kỹ thuật" : "Technical Notes & Description"}
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
            <span>{isVietnamese ? "Lưu thay đổi" : "Save Changes"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
