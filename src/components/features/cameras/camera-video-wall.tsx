"use client";

import { useMemo } from "react";
import { MonitorPlay } from "lucide-react";
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
  const { t } = useLocale();

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
  );
}
