"use client";

import { Activity, Camera, Edit2, Play, Sliders, Trash2, Wifi } from "lucide-react";
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
            <h4 className="font-bold text-sm text-foreground line-clamp-1">
              {camera.name}
            </h4>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-primary">
                {camera.code}
              </span>
              <span className="text-[11px] text-muted-foreground">•</span>
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {camera.location || camera.siteName || "Khu vực giám sát"}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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

        {/* Specs Pill List */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-lg bg-surface-elevated/60 px-2 py-1 font-mono">
            {camera.sourceType}
          </span>
          <span className="rounded-lg bg-surface-elevated/60 px-2 py-1 font-mono">
            {camera.config?.resolution || "1080p"}
          </span>
          <span className="rounded-lg bg-surface-elevated/60 px-2 py-1 font-mono">
            {camera.config?.captureFps || 25} FPS
          </span>
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

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewLive(camera)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Xem trực tiếp</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
