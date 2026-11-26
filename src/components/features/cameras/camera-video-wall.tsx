"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowUpRight, MonitorOff, Radio } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import { CameraVideoPlayer } from "./camera-video-player";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export interface CameraVideoWallProps {
  cameras: CameraItem[];
  layout: "1x1" | "2x2" | "3x3";
  getSessionForCamera: (camera: CameraItem) => LiveSessionInfo | undefined;
  productionMode?: boolean;
  startingCameraId?: string | null;
  onStartLive?: (camera: CameraItem) => void;
  onStopLive?: (camera: CameraItem) => void;
}

export const CameraVideoWall = memo(function CameraVideoWall({
  cameras,
  layout,
  getSessionForCamera,
  productionMode = false,
  startingCameraId,
  onStartLive,
  onStopLive,
}: CameraVideoWallProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const maxSlots = layout === "1x1" ? 1 : layout === "2x2" ? 4 : 9;
  const visibleCameras = cameras.slice(0, maxSlots);

  const gridClass =
    layout === "1x1"
      ? "grid-cols-1"
      : layout === "2x2"
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  if (visibleCameras.length === 0) {
    return (
      <div
        className={`flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-[28px] p-10 text-center ${NM.chassis}`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${NM.recessed}`}
        >
          <MonitorOff className="size-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-extrabold text-foreground">
          {isVietnamese
            ? "Không có camera trong khung Video Wall"
            : "No cameras in Video Wall"}
        </h3>
        <p className="max-w-md text-xs text-muted-foreground">
          {isVietnamese
            ? "Điều chỉnh bộ lọc công trường/trạng thái hoặc thêm camera mới để bắt đầu theo dõi đa luồng."
            : "Adjust site/status filters or add a new camera to start multi-stream monitoring."}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {visibleCameras.map((camera) => {
        const session = getSessionForCamera(camera);
        const isLive = session?.status === "running";

        return (
          <div
            key={camera.id}
            className={`flex flex-col gap-3 rounded-[24px] p-3.5 sm:p-4 ${NM.chassis}`}
          >
            {/* Top Wall Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isLive
                      ? "bg-accent text-accent-foreground"
                      : `${NM.recessed} text-primary`
                  }`}
                >
                  <Radio className={`size-3.5 ${isLive ? "animate-pulse" : ""}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-extrabold text-primary">
                      {camera.code}
                    </span>
                    <span className="truncate text-xs font-bold text-foreground">
                      {camera.name}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {camera.siteName || "Site"} {camera.zoneName ? `· ${camera.zoneName}` : ""}
                  </p>
                </div>
              </div>

              <Link
                href={`/cameras/${camera.id}`}
                title={isVietnamese ? "Mở Studio Chi Tiết" : "Open Camera Studio"}
                aria-label={isVietnamese ? "Mở Studio Chi Tiết" : "Open Camera Studio"}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary ${NM.tactileBtn}`}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <CameraVideoPlayer
              camera={camera}
              liveSession={session}
              productionMode={productionMode}
              isBusy={startingCameraId === camera.id}
              onStartLive={onStartLive}
              onStopLive={onStopLive}
              compact={layout === "3x3"}
            />
          </div>
        );
      })}
    </div>
  );
});
