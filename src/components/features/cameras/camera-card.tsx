"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Edit2,
  Layers,
  Trash2,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { CameraVideoPlayer } from "./camera-video-player";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraCardProps {
  camera: CameraItem;
  siteName?: string;
  liveSession?: LiveSessionInfo;
  productionMode?: boolean;
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
  productionMode = false,
  isBusy = false,
  onStartLive,
  onStopLive,
  onEdit,
  onDelete,
  onHealthCheck,
}: CameraCardProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const canManage = useCan()("PPE_CAMERA_MANAGE");
  const isOnline = camera.status === "ONLINE";
  const isError = camera.status === "ERROR";
  const isMaintenance =
    camera.status === "MAINTENANCE" || camera.status === "CONNECTING";
  const isLiveRunning = liveSession?.status === "running";
  const isLiveStarting =
    liveSession?.status === "initializing" ||
    liveSession?.status === "reconnecting";

  const statusBadge = isLiveRunning
    ? {
        label: "AI LIVE",
        pillClass: "bg-accent/15 text-accent",
        dotClass: "animate-pulse bg-accent",
        title: isVietnamese
          ? "Đang phân tích AI thời gian thực"
          : "Real-time AI tracking active",
      }
    : isLiveStarting
      ? {
          label: isVietnamese ? "ĐANG KẾT NỐI AI" : "AI CONNECTING",
          pillClass: "bg-warning/15 text-warning",
          dotClass: "animate-pulse bg-warning",
          title: isVietnamese
            ? "Đang khởi tạo hoặc kết nối lại phiên AI"
            : "Initializing or reconnecting AI session",
        }
      : isOnline
        ? {
            label: isVietnamese ? "SẴN SÀNG (ONLINE)" : "READY (ONLINE)",
            pillClass: "bg-primary/15 text-primary",
            dotClass: "bg-primary",
            title: isVietnamese
              ? "Thiết bị trực tuyến, chờ bật AI Live"
              : "Device online, AI Live on standby",
          }
        : isError
          ? {
              label: isVietnamese ? "LỖI TÍN HIỆU" : "ERROR",
              pillClass: "bg-danger/15 text-danger",
              dotClass: "bg-danger",
              title: isVietnamese
                ? "Lỗi tín hiệu kết nối thiết bị"
                : "Device connection fault",
            }
          : isMaintenance
            ? {
                label:
                  camera.status === "MAINTENANCE"
                    ? isVietnamese
                      ? "BẢO TRÌ"
                      : "MAINTENANCE"
                    : isVietnamese
                      ? "ĐANG KẾT NỐI"
                      : "CONNECTING",
                pillClass: "bg-warning/15 text-warning",
                dotClass: "bg-warning",
                title: camera.status,
              }
            : {
                label: isVietnamese ? "NGOẠI TUYẾN (OFFLINE)" : "OFFLINE",
                pillClass: "bg-foreground/10 text-muted-foreground",
                dotClass: "bg-muted-foreground/50",
                title: isVietnamese ? "Thiết bị ngoại tuyến" : "Device offline",
              };

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
              title={statusBadge.title}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold ${statusBadge.pillClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass}`} />
              {statusBadge.label}
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
              <span className="truncate">
                {siteName ||
                  camera.siteName ||
                  (isVietnamese ? "Chưa gán site" : "Unassigned site")}
              </span>
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
          title={isVietnamese ? "Mở Live Monitor Studio" : "Open Live Monitor Studio"}
          aria-label={isVietnamese ? "Mở Live Monitor Studio" : "Open Live Monitor Studio"}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      {/* Center: MJPEG Live AI Viewport or Standby */}
      <CameraVideoPlayer
        camera={camera}
        liveSession={liveSession}
        productionMode={productionMode}
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
            {isVietnamese ? "Người" : "Persons"}
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
            {isVietnamese ? "Vi phạm" : "Violations"}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/[0.06] pt-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/cameras/${camera.id}`}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-foreground hover:text-primary ${NM.tactileBtn}`}
          >
            <span>{isVietnamese ? "Chi tiết Studio" : "Studio Details"}</span>
            <ArrowUpRight className="size-3.5 text-primary" />
          </Link>
          <span className="rounded-lg bg-foreground/[0.05] px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">
            {camera.sourceType || "RTSP"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onHealthCheck(camera)}
            title={
              canManage
                ? isVietnamese
                  ? "Kiểm tra kết nối (Ping)"
                  : "Check connection (Ping)"
                : isVietnamese
                  ? "Xem nhật ký kết nối"
                  : "View connection logs"
            }
            aria-label={
              canManage
                ? isVietnamese
                  ? "Kiểm tra kết nối (Ping)"
                  : "Check connection (Ping)"
                : isVietnamese
                  ? "Xem nhật ký kết nối"
                  : "View connection logs"
            }
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
          >
            <Activity className="size-3.5" />
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEdit(camera)}
                title={isVietnamese ? "Chỉnh sửa Camera" : "Edit Camera"}
                aria-label={isVietnamese ? "Chỉnh sửa Camera" : "Edit Camera"}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-foreground hover:text-primary ${NM.tactileBtn}`}
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(camera)}
                title={isVietnamese ? "Xóa Camera" : "Delete Camera"}
                aria-label={isVietnamese ? "Xóa Camera" : "Delete Camera"}
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
