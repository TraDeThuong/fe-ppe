"use client";

import { useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay } from "lucide-react";
import { CameraVideoPlayer } from "./camera-video-player";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface CameraVideoWallProps {
  cameras: CameraItem[];
  layout: "1x1" | "2x2" | "3x3";
  onSnapshot?: (camera: CameraItem) => void;
  onPing?: (camera: CameraItem) => void;
  onOpenRoi?: (camera: CameraItem) => void;
}

export function CameraVideoWall({
  cameras,
  layout,
  onSnapshot,
  onPing,
  onOpenRoi,
}: CameraVideoWallProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const wallContainerRef = useRef<HTMLDivElement>(null);
  const [isWallFullscreen, setIsWallFullscreen] = useState(false);

  const toggleWallFullscreen = async () => {
    if (!wallContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await wallContainerRef.current.requestFullscreen();
        setIsWallFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsWallFullscreen(false);
      }
    } catch {
      // Ignore fullscreen rejection
    }
  };

  const maxSlots = layout === "1x1" ? 1 : layout === "2x2" ? 4 : 9;

  const displayCameras = useMemo(() => {
    return cameras.slice(0, maxSlots);
  }, [cameras, maxSlots]);

  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-surface p-16 text-center">
        <MonitorPlay className="h-12 w-12 text-muted-foreground/60 mb-3" />
        <p className="text-sm font-medium text-foreground">{t("cameras.wall.noCameras")}</p>
      </div>
    );
  }

  const gridClass =
    layout === "1x1"
      ? "grid-cols-1 max-w-4xl mx-auto"
      : layout === "2x2"
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      ref={wallContainerRef}
      className={`relative space-y-3 ${
        isWallFullscreen ? "p-4 bg-background overflow-y-auto" : ""
      }`}
    >
      {/* Wall Toolbar Action */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {isVietnamese
            ? `Hiển thị ${displayCameras.length} luồng camera (${layout})`
            : `Showing ${displayCameras.length} camera feeds (${layout})`}
        </span>
        <button
          type="button"
          onClick={toggleWallFullscreen}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark)] transition-all hover:bg-surface-elevated active:scale-95"
          title={isWallFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình Video Wall"}
        >
          {isWallFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Thu nhỏ" : "Exit Fullscreen"}</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Toàn màn hình SOC" : "SOC Fullscreen"}</span>
            </>
          )}
        </button>
      </div>

      {/* Grid feeds */}
      <div className={`grid gap-4 ${gridClass}`}>
        {displayCameras.map((camera) => (
          <div key={camera.id} className="relative">
            <CameraVideoPlayer
              camera={camera}
              showControls={true}
              onSnapshot={onSnapshot}
              onPing={onPing}
              onOpenRoi={onOpenRoi}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
