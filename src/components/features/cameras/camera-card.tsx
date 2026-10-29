"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Edit2,
  Play,
  ShieldAlert,
  Sliders,
  Trash2,
  Wifi,
} from "lucide-react";
import { CameraVideoPlayer } from "./camera-video-player";
import { useLocale } from "@/providers/locale-provider";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import type { CameraItem } from "@/types";

export interface CameraCardProps {
  camera: CameraItem;
  onViewLive: (camera: CameraItem) => void;
  onPing: (camera: CameraItem) => void;
  onConfigureRoi: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  onSnapshot?: (camera: CameraItem) => void;
}

export function CameraCard({
  camera,
  onViewLive,
  onPing,
  onConfigureRoi,
  onEdit,
  onDelete,
  onSnapshot,
}: CameraCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getSiteName } = useEntityLookup();
  const siteName = camera.siteName || (camera.siteId ? getSiteName(camera.siteId) : undefined);
  const isOnline = camera.status === "ONLINE";

  const hasRoi = Boolean(
    (camera.config?.roiPolygon && camera.config.roiPolygon.length >= 3) ||
    ((camera.config as any)?.roi_polygon && Array.isArray((camera.config as any).roi_polygon) && (camera.config as any).roi_polygon.length >= 3)
  );

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_14px_24px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] dark:border-white/10 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.4)]">
      {/* Video Preview */}
      <div className="relative p-3 pb-1">
        <div className="overflow-hidden rounded-xl border border-border/40 bg-black shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
          <CameraVideoPlayer
            camera={camera}
            showControls={false}
            onSnapshot={onSnapshot}
          />
        </div>

        {/* Live Status Overlay Tag */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-sm ${
              isOnline
                ? "bg-primary/90 text-white"
                : "bg-danger/90 text-white"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? "bg-white animate-pulse" : "bg-white"
              }`}
            />
            {camera.status}
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="space-y-3 px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/cameras/${camera.id}`}
              className="font-bold text-sm text-foreground line-clamp-1 hover:text-primary transition hover:underline"
              title={isVietnamese ? "Mở Camera AI Intelligence Studio" : "Open Camera AI Intelligence Studio"}
            >
              {camera.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono font-semibold text-primary">
                {camera.code}
              </span>
              <span>•</span>
              {camera.siteId ? (
                <Link
                  href={`/sites/${camera.siteId}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition hover:underline"
                  title={isVietnamese ? "Mở trung tâm điều hành công trường này" : "Open site operations center"}
                >
                  <Building2 className="h-3 w-3 text-primary shrink-0" />
                  <span className="line-clamp-1">{siteName || (isVietnamese ? "Công trường" : "Site")}</span>
                </Link>
              ) : (
                <span className="line-clamp-1">{siteName || (isVietnamese ? "Công trường" : "Site")}</span>
              )}
              {camera.location && (
                <>
                  <span>•</span>
                  <span className="line-clamp-1">{camera.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Specs & ROI Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg bg-surface-elevated/70 px-2 py-0.5 font-mono text-[10px] shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              {camera.sourceType}
            </span>
            <span className="rounded-lg bg-surface-elevated/70 px-2 py-0.5 font-mono text-[10px] shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              {camera.config?.resolution || "1080p"}
            </span>
            <span className="rounded-lg bg-surface-elevated/70 px-2 py-0.5 font-mono text-[10px] shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              {camera.config?.captureFps || 25} FPS
            </span>
          </div>

          {/* AI ROI Status Indicator */}
          {hasRoi ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              ROI
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onConfigureRoi(camera)}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
              title={isVietnamese ? "Chưa thiết lập vùng quét AI ROI" : "No AI ROI zone configured"}
            >
              <Sliders className="h-2.5 w-2.5" />
              {isVietnamese ? "Cần ROI" : "Set ROI"}
            </button>
          )}

          {/* Incident Shortcut */}
          <Link
            href={`/incidents?cameraId=${camera.id}&cameraCode=${camera.code}`}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600 hover:bg-amber-500/20 transition hover:underline dark:text-amber-400"
            title={isVietnamese ? `Xem danh sách các sự cố do ${camera.code} phát hiện` : `View incidents detected by ${camera.code}`}
          >
            <ShieldAlert className="h-3 w-3 shrink-0" />
            <span>{isVietnamese ? "Sự cố" : "Alerts"}</span>
          </Link>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between border-t border-border/30 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPing(camera)}
              title={isVietnamese ? "Đo ping kiểm tra kết nối" : "Ping test camera stream"}
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition shadow-[inset_1px_1px_2px_transparent] active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Activity className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onConfigureRoi(camera)}
              title={isVietnamese ? "Cấu hình AI ROI" : "Configure AI ROI"}
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition shadow-[inset_1px_1px_2px_transparent] active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Sliders className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onEdit(camera)}
              title={isVietnamese ? "Chỉnh sửa thông số camera" : "Edit camera parameters"}
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition shadow-[inset_1px_1px_2px_transparent] active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Edit2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(camera)}
              title={isVietnamese ? "Xóa camera" : "Delete camera"}
              className="rounded-xl p-2 text-danger/80 hover:bg-danger/10 hover:text-danger transition shadow-[inset_1px_1px_2px_transparent] active:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onViewLive(camera)}
              className="inline-flex items-center gap-1 rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition hover:text-primary hover:-translate-y-0.5 active:translate-y-0"
              title={isVietnamese ? "Mở Video Wall phát trực tiếp" : "Open live Video Wall"}
            >
              <Play className="h-3 w-3 text-primary fill-primary" />
              <span>{isVietnamese ? "Live" : "Live"}</span>
            </button>

            <Link
              href={`/cameras/${camera.id}`}
              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
              title={isVietnamese ? "Mở trang chi tiết Camera AI Intelligence Studio" : "Open Camera AI Intelligence Studio"}
            >
              <span>{isVietnamese ? "Chi tiết" : "Detail"}</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
