"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSites, useSiteZones } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { CameraSourceType, CreateCameraPayload } from "@/types";

export interface CreateCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCameraPayload) => Promise<void>;
  loading?: boolean;
  defaultSiteId?: string;
  defaultZoneId?: string;
}

export function CreateCameraModal({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  defaultSiteId,
  defaultZoneId,
}: CreateCameraModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Load sites for siteId linking
  const { data: sitesData } = useSites();
  const sites = sitesData?.items || [];

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [siteId, setSiteId] = useState(defaultSiteId || "");
  const [zoneId, setZoneId] = useState(defaultZoneId || "");
  const [sourceType, setSourceType] = useState<CameraSourceType>("RTSP");
  const [streamUrl, setStreamUrl] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: zones = [] } = useSiteZones(siteId, Boolean(siteId));

  useEffect(() => {
    if (open) {
      if (defaultSiteId) {
        setSiteId(defaultSiteId);
        if (defaultZoneId) {
          setZoneId(defaultZoneId);
        }
      } else if (sites.length > 0 && !siteId) {
        setSiteId(sites[0].id);
      }
    }
  }, [open, defaultSiteId, defaultZoneId, sites, siteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(isVietnamese ? "Vui lòng nhập tên camera." : "Please enter camera name.");
      return;
    }

    const formattedCode = code.trim().toUpperCase().replace(/\s+/g, "-");
    if (!formattedCode) {
      setError(isVietnamese ? "Vui lòng nhập mã camera (VD: CAM-NORTH-01)." : "Please enter camera code (e.g., CAM-NORTH-01).");
      return;
    }

    if (!streamUrl.trim()) {
      setError(isVietnamese ? "Vui lòng nhập địa chỉ URL luồng video." : "Please enter video stream URL.");
      return;
    }

    const finalSiteId = siteId || (sites.length > 0 ? sites[0].id : "");
    if (!finalSiteId) {
      setError(
        isVietnamese
          ? "Vui lòng tạo hoặc chọn công trường trước khi thêm camera."
          : "Please select or create a site before adding a camera."
      );
      return;
    }

    const isDirectStream =
      streamUrl.toLowerCase().includes("webcam") ||
      streamUrl.includes("youtube.com") ||
      streamUrl.includes("youtu.be") ||
      streamUrl.startsWith("http");

    try {
      await onSubmit({
        name: name.trim(),
        code: formattedCode,
        siteId: finalSiteId,
        zoneId: zoneId.trim() ? zoneId.trim() : null,
        sourceType,
        streamUrl: streamUrl.trim(),
        status: isDirectStream ? "ONLINE" : "OFFLINE",
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
      const msg = err instanceof Error ? err.message : (isVietnamese ? "Đã có lỗi xảy ra khi tạo camera" : "An error occurred while creating the camera");
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
              {isVietnamese ? "Tên Camera" : "Camera Name"} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVietnamese ? "VD: Camera Giàn Giáo Tầng 5" : "e.g., 5th Floor Scaffolding Camera"}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
              required
            />
          </div>

          {/* Camera Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Mã Camera" : "Camera Code"} <span className="text-danger">*</span>
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
                <option value="0192d6e3-8f0a-7bb1-8c4d-91b53f608a11">
                  {isVietnamese ? "Công trường Landmark 81" : "Landmark 81 Site"}
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

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Vị trí lắp đặt" : "Physical Location / Floor"}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isVietnamese ? "VD: Cổng vào khu vực giàn giáo phía Bắc" : "e.g., North scaffolding entrance gate"}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
          </div>
        </div>

        {/* Stream URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isVietnamese ? "Địa chỉ URL Luồng Stream" : "Stream URL Endpoint"} <span className="text-danger">*</span>
            </label>
            <span className="text-[11px] text-muted-foreground/80">
              {isVietnamese ? "Hỗ trợ RTSP, HTTP/MP4, YouTube, Webcam" : "Supports RTSP, HTTP/MP4, YouTube, Webcam"}
            </span>
          </div>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder={isVietnamese ? "rtsp://admin:pass@192.168.1.100:554/stream1 hoặc https://..." : "rtsp://admin:pass@192.168.1.100:554/stream1 or https://..."}
            className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 font-mono text-xs shadow-nm-inset focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
            required
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
                if (!name) setName(isVietnamese ? "Webcam Máy Tính Test" : "Local Test Webcam");
                if (!code) setCode("CAM-WEBCAM-01");
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
                if (!name) setName(isVietnamese ? "Camera Giàn Giáo Test" : "Scaffolding Test Camera");
                if (!code) setCode("CAM-TEST-MP4");
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
                if (!name) setName(isVietnamese ? "Camera Công Trường YouTube Live" : "Construction Site YouTube Live");
                if (!code) setCode("CAM-YOUTUBE-01");
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
                if (!name) setName(isVietnamese ? "Camera Cổng Chính RTSP" : "Main Gate RTSP Camera");
                if (!code) setCode("CAM-RTSP-01");
              }}
              className="rounded-lg border border-border/50 bg-surface px-2 py-0.5 text-[10px] text-foreground/80 hover:bg-surface-elevated transition"
            >
              {isVietnamese ? "📡 Luồng RTSP thực" : "📡 Real RTSP Stream"}
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isVietnamese ? "Mô tả / Ghi chú kỹ thuật" : "Technical Notes & Description"}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isVietnamese ? "Ghi chú về góc quay camera, phần cứng, thông số kết nối..." : "Notes on camera angle, hardware, connectivity..."}
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
            <span>{isVietnamese ? "Thêm Camera" : "Add Camera"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
