"use client";

import Link from "next/link";
import { Activity, Building2, Camera, Edit2, Play, ShieldAlert, Sliders, Trash2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraVideoPlayer } from "./camera-video-player";
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
  const isOnline = camera.status === "ONLINE";

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:shadow-[6px_6px_14px_rgba(0,0,0,0.08),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      {/* Video Preview */}
      <div className="p-3">
        <CameraVideoPlayer
          camera={camera}
          showControls={false}
          onSnapshot={onSnapshot}
        />
      </div>

      {/* Info Section */}
      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/cameras/${camera.id}`}
              className="font-bold text-sm text-foreground line-clamp-1 hover:text-primary transition hover:underline"
              title="Mở Camera AI Intelligence Studio"
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
                  title="Mở trung tâm điều hành công trường này"
                >
                  <Building2 className="h-3 w-3 text-primary shrink-0" />
                  <span className="line-clamp-1">{camera.siteName || "Công trường"}</span>
                </Link>
              ) : (
                <span className="line-clamp-1">{camera.siteName || "Công trường"}</span>
              )}
              {camera.location && (
                <>
                  <span>•</span>
                  <span className="line-clamp-1">{camera.location}</span>
                </>
              )}
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-danger/10 text-danger"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-danger"
              }`}
            />
            {camera.status}
          </span>
        </div>

        {/* Specs Pill List & Incident Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg bg-surface-elevated/60 px-2 py-0.5 font-mono">
              {camera.sourceType}
            </span>
            <span className="rounded-lg bg-surface-elevated/60 px-2 py-0.5 font-mono">
              {camera.config?.resolution || "1080p"}
            </span>
            <span className="rounded-lg bg-surface-elevated/60 px-2 py-0.5 font-mono">
              {camera.config?.captureFps || 25} FPS
            </span>
          </div>

          {/* Quick link to this Camera's Incidents */}
          <Link
            href={`/incidents?cameraId=${camera.id}&cameraCode=${camera.code}`}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-600 hover:bg-amber-500/20 transition hover:underline dark:text-amber-400"
            title={`Xem danh sách các sự cố do ${camera.code} phát hiện`}
          >
            <ShieldAlert className="h-3 w-3 shrink-0" />
            <span>Sự cố</span>
          </Link>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between border-t border-border/30 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPing(camera)}
              title="Đo ping kiểm tra kết nối"
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
            >
              <Activity className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onConfigureRoi(camera)}
              title="Cấu hình AI ROI"
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
            >
              <Sliders className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onEdit(camera)}
              title="Chỉnh sửa thông số camera"
              className="rounded-xl p-2 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition"
            >
              <Edit2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(camera)}
              title="Xóa camera"
              className="rounded-xl p-2 text-danger/80 hover:bg-danger/10 hover:text-danger transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <Link
            href={`/cameras/${camera.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
            title="Mở Camera AI Intelligence Studio riêng biệt"
          >
            <Play className="h-3 w-3 fill-primary" />
            <span>AI Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
