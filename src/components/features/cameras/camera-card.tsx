"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Edit2,
  Layers,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useCan } from "@/hooks/use-can";
import { CameraVideoPlayer } from "./camera-video-player";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraCardProps {
  camera: CameraItem;
  siteName?: string;
  liveSession?: LiveSessionInfo;
  isBusy?: boolean;
  onStartLive?: (camera: CameraItem) => void;
  onStopLive?: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
  onHealthCheck: (camera: CameraItem) => void;
}

export const CameraCard = memo(function CameraCard({
  camera,
  siteName,
  liveSession,
  isBusy = false,
  onStartLive,
  onStopLive,
  onEdit,
  onDelete,
  onHealthCheck,
}: CameraCardProps) {
  const canManage = useCan()("PPE_CAMERA_MANAGE");
  const isOnline = camera.status === "ONLINE";
  const isLiveRunning = liveSession?.status === "running";

  const metrics = liveSession?.metrics;
  const fpsDisplay =
    isLiveRunning && typeof metrics?.fps === "number"
      ? `${metrics.fps.toFixed(1)}`
      : "--";
  const personsDisplay = isLiveRunning
    ? (metrics?.counts?.person ?? metrics?.active_persons ?? 0)
    : "--";
  const violationsDisplay = isLiveRunning ? (metrics?.active_violations ?? 0) : "--";

  return (
    <article
      className={`group flex flex-col justify-between gap-4 rounded-[26px] p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 ${NM.chassis}`}
    >
      {/* Header: Camera Code + Name + DB & AI Status Pills */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
              {camera.code}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                isOnline
                  ? "bg-primary/15 text-primary"
                  : "bg-foreground/10 text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-primary" : "bg-muted-foreground/50"
                }`}
              />
              {camera.status}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                isLiveRunning
                  ? "bg-accent/15 text-accent"
                  : "bg-foreground/[0.06] text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLiveRunning ? "animate-pulse bg-accent" : "bg-muted-foreground/40"
                }`}
              />
              {isLiveRunning ? "AI LIVE" : "IDLE"}
            </span>
          </div>

          <Link
            href={`/cameras/${camera.id}`}
            className="block truncate text-sm font-extrabold tracking-tight text-foreground transition-colors hover:text-primary sm:text-base"
          >
            {camera.name}
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1 truncate">
              <Building2 className="size-3 shrink-0 text-primary" />
              <span className="truncate">{siteName || camera.siteName || "Chưa gán site"}</span>
            </span>
            {camera.zoneName && (
              <>
                <span className="opacity-40">•</span>
                <span className="inline-flex items-center gap-1 truncate">
                  <Layers className="size-3 shrink-0 text-accent" />
                  <span className="truncate">{camera.zoneName}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <Link
          href={`/cameras/${camera.id}`}
          title="Mở Live Monitor Studio"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      {/* Center: MJPEG Live AI Viewport or Standby */}
      <CameraVideoPlayer
        camera={camera}
        liveSession={liveSession}
        isBusy={isBusy}
        onStartLive={onStartLive}
        onStopLive={onStopLive}
      />

      {/* Recessed Telemetry Row: Real AI metrics when running */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-xl px-2.5 py-2 text-center ${NM.recessed}`}>
          <div className="font-mono text-sm font-black text-foreground">
            {fpsDisplay}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Live FPS
          </div>
        </div>

        <div className={`rounded-xl px-2.5 py-2 text-center ${NM.recessed}`}>
          <div className="font-mono text-sm font-black text-primary">
            {personsDisplay}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Người
          </div>
        </div>

        <div className={`rounded-xl px-2.5 py-2 text-center ${NM.recessed}`}>
          <div
            className={`font-mono text-sm font-black ${
              typeof violationsDisplay === "number" && violationsDisplay > 0
                ? "text-accent"
                : "text-foreground"
            }`}
          >
            {violationsDisplay}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Vi phạm
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          {isLiveRunning ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStopLive?.(camera)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-accent disabled:opacity-50 ${NM.tactileBtn}`}
            >
              <Square className="size-3 fill-current" />
              <span>Dừng AI</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStartLive?.(camera)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              <Play className="size-3 fill-current" />
              <span>{isBusy ? "Đang bật..." : "Bật AI Live"}</span>
            </button>
          )}

          <Link
            href={`/cameras/${camera.id}`}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-foreground hover:text-primary ${NM.tactileBtn}`}
          >
            <span>Chi tiết</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onHealthCheck(camera)}
            title="Kiểm tra kết nối (Ping)"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
          >
            <Activity className="size-3.5" />
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEdit(camera)}
                title="Chỉnh sửa Camera"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-foreground hover:text-primary ${NM.tactileBtn}`}
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(camera)}
                title="Xóa Camera"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-accent ${NM.tactileBtn}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
});
