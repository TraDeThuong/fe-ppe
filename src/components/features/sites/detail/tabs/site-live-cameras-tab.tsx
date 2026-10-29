"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Layers,
  Maximize2,
  RefreshCw,
  Search,
  ShieldAlert,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCameras } from "@/hooks/cameras";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, SiteItem } from "@/types";

export interface SiteLiveCamerasTabProps {
  site: SiteItem;
}

export function SiteLiveCamerasTab({ site }: SiteLiveCamerasTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch cameras for this specific site
  const { data: camerasData, isLoading, refetch, isFetching } = useCameras({
    siteId: site.id,
    limit: 50,
  });

  const cameras: CameraItem[] = useMemo(() => camerasData?.items ?? [], [camerasData]);

  // Extract unique zones from cameras
  const zones = useMemo(() => {
    return site.zones || [];
  }, [site]);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      if (selectedZone !== "ALL" && cam.zoneId !== selectedZone) return false;
      if (statusFilter !== "ALL" && cam.status !== statusFilter) return false;
      return true;
    });
  }, [cameras, selectedZone, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border/40 bg-surface p-3 sm:p-3.5 shadow-sm dark:border-black/60 dark:bg-card/90">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zone Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            >
              <option value="ALL">
                {isVietnamese ? `Tất cả phân khu (${zones.length})` : `All Zones (${zones.length})`}
              </option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            >
              <option value="ALL">{isVietnamese ? "Tất cả trạng thái" : "All Statuses"}</option>
              <option value="ONLINE">{isVietnamese ? "Đang trực (Online)" : "Online"}</option>
              <option value="OFFLINE">{isVietnamese ? "Mất kết nối (Offline)" : "Offline"}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/cameras?siteId=${site.id}&view=wall`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
            title={
              isVietnamese
                ? "Mở toàn bộ camera của công trường này trên Video Wall toàn màn hình"
                : "Open all site cameras on full-screen Video Wall"
            }
          >
            <Maximize2 className="h-3 w-3 shrink-0" />
            <span className="sm:hidden">{isVietnamese ? "Wall" : "Wall"}</span>
            <span className="hidden sm:inline">
              {isVietnamese ? "Mở Video Wall" : "Open Video Wall"}
            </span>
          </Link>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-primary transition dark:border-black/40"
            title={isVietnamese ? "Làm mới luồng" : "Refresh feeds"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-2xl bg-surface-elevated/40" />
          ))}
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center dark:border-black/50 dark:bg-card/70">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">
            {isVietnamese ? "Không tìm thấy Camera nào" : "No Cameras Found"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {isVietnamese
              ? "Hiện tại chưa có camera nào được gán vào công trường hoặc phân khu này. Bạn có thể sang trang Quản lý Camera để cấu hình."
              : "No cameras assigned to this site or zone yet. You can visit the Cameras management page to configure new cameras."}
          </p>
        </div>
      ) : (
        /* Camera Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCameras.map((cam) => {
            const isOnline = cam.status === "ONLINE";

            return (
              <div
                key={cam.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]"
              >
                {/* Simulated Video Frame Viewport */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900/95 flex items-center justify-center">
                  {/* Subtle Grid overlay for technical/CCTV look */}
                  <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

                  {/* Status Overlay Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isOnline ? "bg-primary animate-pulse" : "bg-danger"
                      }`}
                    />
                    <span>{cam.status}</span>
                  </div>

                  {/* Live Timestamp */}
                  <div className="absolute top-2.5 right-2.5 z-10 rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 font-mono text-[9px] text-white/80">
                    LIVE • {cam.config?.resolution || "1080p"}
                  </div>

                  {/* Stream Status Content */}
                  {isOnline ? (
                    <div className="relative flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Video className="h-8 w-8 mb-1 text-primary/80" />
                      <span className="font-mono text-[10px]">RTSP Stream Active</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 text-xs">
                      <WifiOff className="h-8 w-8 mb-1 text-danger/80" />
                      <span className="font-mono text-[10px]">Signal Disconnected</span>
                    </div>
                  )}

                  {/* Bottom Camera Info Banner on Video */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold leading-tight drop-shadow">{cam.name}</p>
                      <p className="font-mono text-[10px] text-slate-300">
                        {cam.zoneName || (isVietnamese ? "Chưa phân khu" : "Unassigned Zone")}
                      </p>
                    </div>

                    <span className="font-mono text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                      {cam.code}
                    </span>
                  </div>
                </div>

                {/* Footer details */}
                <div className="p-3 bg-surface-elevated/30 flex items-center justify-between text-[11px] text-muted-foreground dark:bg-background/40">
                  <span className="truncate max-w-[160px]">
                    {cam.location || site.name}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px]">
                      {cam.currentFps || cam.config?.captureFps || 25} FPS
                    </span>
                    <Link
                      href={`/cameras?search=${cam.code}&view=wall`}
                      className="text-primary hover:underline flex items-center gap-0.5"
                      title={
                        isVietnamese
                          ? "Mở camera này trên Video Wall"
                          : "Open camera on Video Wall"
                      }
                    >
                      <span>{isVietnamese ? "Xem trực tiếp" : "Live View"}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
