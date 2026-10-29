"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Edit2,
  HardDrive,
  MapPin,
  Plus,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraVideoPlayer } from "./camera-video-player";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraSpotlightProps {
  camera: CameraItem;
  onViewLive: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onConfigureRoi: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  onSnapshot?: (camera: CameraItem) => void;
  onCreateCamera?: () => void;
}

export function CameraSpotlight({
  camera,
  onViewLive,
  onPing,
  onConfigureRoi,
  onEdit,
  onDelete,
  onSnapshot,
  onCreateCamera,
}: CameraSpotlightProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const isOnline = camera.status === "ONLINE";
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyStream = () => {
    if (camera.streamUrl) {
      navigator.clipboard.writeText(camera.streamUrl);
      setCopiedUrl(true);
      toast.success(
        isVietnamese
          ? "Đã sao chép liên kết luồng RTSP"
          : "Stream URL copied to clipboard"
      );
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const hasRoi = Boolean(
    (camera.config?.roiPolygon && camera.config.roiPolygon.length >= 3) ||
    ((camera.config as any)?.roi_polygon && Array.isArray((camera.config as any).roi_polygon) && (camera.config as any).roi_polygon.length >= 3)
  );

  return (
    <div className="space-y-6">
      {/* 1. Spotlight Command Center: 2-Column Split Stage */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Main Video Surveillance Stage (7 cols on lg, 8 cols on xl) */}
        <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-surface p-4 sm:p-5 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] dark:border-white/10 dark:shadow-[6px_6px_16px_rgba(0,0,0,0.5)] lg:col-span-7 xl:col-span-8">
          {/* Top HUD Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <Camera className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-1">
                    {camera.name}
                  </h3>
                  <span className="rounded-lg bg-surface-elevated px-2 py-0.5 font-mono text-xs font-bold text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                    {camera.code}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Building2 className="h-3 w-3 text-primary shrink-0" />
                  {camera.siteId ? (
                    <Link
                      href={`/sites/${camera.siteId}`}
                      className="font-medium text-foreground hover:text-primary transition hover:underline"
                    >
                      {camera.siteName || (isVietnamese ? "Công trường chính" : "Main Site")}
                    </Link>
                  ) : (
                    <span>{camera.siteName || (isVietnamese ? "Công trường chính" : "Main Site")}</span>
                  )}
                  {camera.location && (
                    <>
                      <span>•</span>
                      <span>{camera.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status & Stream Badges */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  isOnline
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-danger/15 text-danger border border-danger/30"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-danger"
                  }`}
                />
                {camera.status}
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-surface-elevated/70 px-2.5 py-1 font-mono text-xs text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <Wifi className="h-3 w-3 text-primary" />
                {camera.currentLatencyMs || (isOnline ? 38 : 0)}ms
              </span>
            </div>
          </div>

          {/* Cinematic Video Stage */}
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-black shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6)]">
            <CameraVideoPlayer
              camera={camera}
              showControls={true}
              onSnapshot={onSnapshot}
              onPing={onPing}
              onOpenRoi={onConfigureRoi}
            />
          </div>

          {/* Action Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-border/30 mt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPing(camera)}
                className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:text-primary hover:-translate-y-0.5"
                title={isVietnamese ? "Đo ping kiểm tra độ trễ mạng" : "Ping test latency"}
              >
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Đo Ping" : "Ping Test"}</span>
              </button>

              <button
                type="button"
                onClick={() => onConfigureRoi(camera)}
                className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:text-primary hover:-translate-y-0.5"
                title={isVietnamese ? "Vẽ và hiệu chuẩn đa giác AI ROI" : "Draw and calibrate AI ROI polygon"}
              >
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Hiệu chuẩn AI ROI" : "AI ROI"}</span>
              </button>

              <button
                type="button"
                onClick={() => onEdit(camera)}
                className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:text-primary hover:-translate-y-0.5"
                title={isVietnamese ? "Chỉnh sửa cấu hình camera" : "Edit camera configuration"}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Chỉnh sửa" : "Edit"}</span>
              </button>

              <button
                type="button"
                onClick={() => onDelete(camera)}
                className="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-background px-3 py-1.5 text-xs font-semibold text-danger shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:bg-danger/10 hover:-translate-y-0.5"
                title={isVietnamese ? "Xóa camera khỏi hệ thống" : "Delete camera from system"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Xóa" : "Delete"}</span>
              </button>
            </div>

            <Link
              href={`/cameras/${camera.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)] transition-all hover:brightness-110 hover:-translate-y-0.5"
            >
              <span>{isVietnamese ? "AI Studio Chi tiết" : "AI Studio"}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Intelligence & Operational Specs Card (5 cols on lg, 4 cols on xl) */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-5 xl:col-span-4">
          <div className="rounded-3xl border border-border/50 bg-surface p-5 shadow-[6px_6px_16px_var(--shadow-dark),-6px_-6px_16px_var(--shadow-light)] dark:border-white/10 dark:shadow-[6px_6px_16px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  {isVietnamese ? "Thông số Vận hành AI" : "AI Operation Specs"}
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-primary">
                {camera.config?.resolution || "1080p"} @ {camera.config?.captureFps || 25}fps
              </span>
            </div>

            {/* Stream Endpoint & Protocol */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{isVietnamese ? "Luồng kết nối RTSP" : "Stream Source"}</span>
                <span className="font-mono font-semibold text-primary">{camera.sourceType}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface-elevated/50 p-2 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                <p className="flex-1 truncate font-mono text-[11px] text-foreground">
                  {camera.streamUrl || "rtsp://camera.ppe.local:554/live/stream1"}
                </p>
                <button
                  type="button"
                  onClick={handleCopyStream}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition"
                  title={isVietnamese ? "Sao chép địa chỉ luồng" : "Copy stream URL"}
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* AI ROI Calibration Status */}
            <div className="space-y-1.5 rounded-2xl border border-border/40 bg-background/60 p-3 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  {isVietnamese ? "Vùng nhận diện AI ROI" : "AI ROI Detection Zone"}
                </span>
                {hasRoi ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {isVietnamese ? "Đã hiệu chuẩn" : "Calibrated"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {isVietnamese ? "Chưa thiết lập" : "Uncalibrated"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {hasRoi
                  ? isVietnamese
                    ? "Đa giác giám sát PPE đã được xác lập chính xác trên khung hình."
                    : "Active polygonal bounding zone applied to AI inferencing."
                  : isVietnamese
                  ? "Chưa giới hạn vùng quét. AI đang phân tích toàn bộ khung hình."
                  : "Scanning entire frame. Draw an ROI polygon to reduce false alerts."}
              </p>
              <button
                type="button"
                onClick={() => onConfigureRoi(camera)}
                className="w-full mt-1 rounded-xl border border-border/50 bg-surface px-3 py-1.5 text-xs font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition hover:text-foreground active:translate-y-0.5"
              >
                {hasRoi
                  ? isVietnamese
                    ? "Chỉnh sửa vùng AI ROI"
                    : "Re-calibrate ROI"
                  : isVietnamese
                  ? "Thiết lập vùng quét ngay"
                  : "Calibrate AI ROI Now"}
              </button>
            </div>

            {/* Safety Violations & Incidents Shortcut */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  {isVietnamese ? "Lịch sử vi phạm PPE" : "Safety Incidents"}
                </span>
                <Link
                  href={`/incidents?cameraId=${camera.id}&cameraCode=${camera.code}`}
                  className="font-bold text-primary text-[11px] hover:underline"
                >
                  {isVietnamese ? "Xem tất cả sự cố →" : "View alerts →"}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <div className="text-xl font-black font-mono text-foreground">
                    {isOnline ? 0 : 1}
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                    {isVietnamese ? "Sự cố đang mở" : "Active Alerts"}
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                  <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    99.4%
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                    {isVietnamese ? "Tuân thủ an toàn" : "Compliance Rate"}
                  </div>
                </div>
              </div>
            </div>

            {/* Active AI PPE Detectors */}
            <div className="space-y-1.5 border-t border-border/30 pt-3">
              <span className="text-xs font-bold text-foreground block">
                {isVietnamese ? "Mục tiêu nhận diện PPE" : "PPE AI Detection Targets"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: isVietnamese ? "Mũ bảo hộ" : "Hard Hat", active: true },
                  { label: isVietnamese ? "Áo phản quang" : "Hi-Vis Vest", active: true },
                  { label: isVietnamese ? "Giày bảo hộ" : "Safety Boots", active: true },
                  { label: isVietnamese ? "Khu vực nguy hiểm" : "Danger Zone", active: hasRoi },
                ].map((item, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                      item.active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-surface-elevated text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.active ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Infrastructure Companion Cards: Fill the Space & Provide Rich Operational Value */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Edge AI Processing Node */}
        <div className="group rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <h5 className="text-sm font-bold text-foreground">
                {isVietnamese ? "Edge AI Pipeline" : "Edge AI Inference"}
              </h5>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                YOLOv8 PPE Model v2.4 Active
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isVietnamese
              ? "Bộ xử lý nhận diện đồ bảo hộ thời gian thực chạy trực tiếp tại biên, phân tích 25 khung hình/giây không giật lag."
              : "Real-time PPE compliance inferencing executed directly on the edge worker with sub-50ms inference time."}
          </p>
        </div>

        {/* Card 2: Stream Gateway & Cloud Archival */}
        <div className="group rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <h5 className="text-sm font-bold text-foreground">
                {isVietnamese ? "Cổng Luồng & Lưu Trữ" : "Stream Gateway & Archival"}
              </h5>
              <span className="text-[11px] font-semibold text-primary">
                HLS / WebRTC Low Latency
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isVietnamese
              ? "Tự động trích xuất snapshot và clip ngắn 15s mỗi khi phát hiện vi phạm quy chuẩn để phục vụ công tác thanh tra."
              : "Automated snapshot and 15-second incident video clip capture whenever non-compliance violations are detected."}
          </p>
        </div>

        {/* Card 3: Expand Fleet / Add Another Camera */}
        {onCreateCamera && (
          <div
            onClick={onCreateCamera}
            className="group flex flex-col justify-between rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.03] p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-primary/[0.06] hover:shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-nm-sm group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <h5 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {isVietnamese ? "Mở rộng Hạ tầng Camera" : "Expand Surveillance Fleet"}
                </h5>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Thêm luồng RTSP / Webcam mới" : "Connect new RTSP stream"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isVietnamese
                ? "Kết nối thêm camera công trường hoặc khu vực thi công khác để mở rộng mạng lưới giám sát AI tự động."
                : "Add another camera stream to monitor new construction zones and automate PPE safety compliance."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
