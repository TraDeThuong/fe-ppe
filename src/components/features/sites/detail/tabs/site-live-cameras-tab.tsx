"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  Layers,
  Maximize2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  ChevronDown,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshIconButton } from "@/components/ui/refresh-action";
import {
  CameraHealthDialog,
  CameraVideoPlayer,
  CreateCameraModal,
  DeleteCameraDialog,
  EditCameraModal,
} from "@/components/features/cameras";
import {
  useCameraLiveSessions,
  useCameras,
  useCreateCamera,
  useDeleteCamera,
  usePingCamera,
  useUpdateCamera,
} from "@/hooks/cameras";
import { useDebounce } from "@/hooks/use-debounce";
import { useSiteZones } from "@/hooks/sites";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraItem,
  CreateCameraPayload,
  SiteItem,
  UpdateCameraPayload,
} from "@/types";

export interface SiteLiveCamerasTabProps {
  site: SiteItem;
  initialZoneId?: string;
}

export function SiteLiveCamerasTab({
  site,
  initialZoneId = "",
}: SiteLiveCamerasTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canReadCameras = can("PPE_CAMERA_READ");
  const canReadZones = can("PPE_ZONE_READ");
  const canManage = can("PPE_CAMERA_MANAGE");

  const [selectedZone, setSelectedZone] = useState<string>(initialZoneId || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    if (initialZoneId !== undefined) {
      setSelectedZone(initialZoneId || "ALL");
      setPage(1);
    }
  }, [initialZoneId]);

  const debouncedSearch = useDebounce(search, 350);

  // Live zones for zone name resolution & filter dropdown
  const { data: siteZones = [] } = useSiteZones(site.id, canReadZones);
  const zones = useMemo(
    () => (siteZones.length > 0 ? siteZones : site.zones || []),
    [siteZones, site.zones],
  );
  const zoneLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones) {
      map.set(z.id, z.name);
    }
    return map;
  }, [zones]);

  // Server-backed cameras query
  const { data: camerasData, isLoading, refetch, isFetching } = useCameras(
    {
      siteId: site.id,
      page,
      limit,
      search: debouncedSearch.trim() || undefined,
      zoneId: selectedZone !== "ALL" ? selectedZone : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      sourceType: sourceFilter !== "ALL" ? sourceFilter : undefined,
    },
    { enabled: canReadCameras && Boolean(site.id) },
  );

  const cameras: CameraItem[] = useMemo(() => camerasData?.items ?? [], [camerasData]);
  const totalCount = camerasData?.meta?.total ?? cameras.length;
  const totalPages = Math.max(1, camerasData?.meta?.totalPages ?? 1);

  // Live AI Stream Engine integration (matches /cameras)
  const {
    productionMode,
    getSessionForCamera,
    startLive,
    stopLive,
    startingCameraId,
    refreshAll: refreshLiveSessions,
  } = useCameraLiveSessions({
    enabled: canReadCameras,
    pollIntervalMs: 5000,
    includeVideos: false,
  });

  // Mutations & dialogs
  const createCameraMutation = useCreateCamera();
  const updateCameraMutation = useUpdateCamera();
  const deleteCameraMutation = useDeleteCamera();
  const pingCameraMutation = usePingCamera();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CameraItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraItem | null>(null);
  const [healthTarget, setHealthTarget] = useState<CameraItem | null>(null);

  const hasFilters =
    Boolean(search.trim()) ||
    selectedZone !== "ALL" ||
    statusFilter !== "ALL" ||
    sourceFilter !== "ALL";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedZone("ALL");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setPage(1);
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), refreshLiveSessions()]);
  };

  const handleCreateCamera = async (payload: CreateCameraPayload) => {
    await createCameraMutation.mutateAsync(payload);
    setCreateOpen(false);
  };

  const handleUpdateCamera = async (id: string, payload: UpdateCameraPayload) => {
    await updateCameraMutation.mutateAsync({ id, payload });
    setEditTarget(null);
  };

  const handleDeleteCamera = async (id: string, name?: string, code?: string) => {
    await deleteCameraMutation.mutateAsync({ id, name, code });
    setDeleteTarget(null);
  };

  return (
<div className="space-y-5">
  {/* =========================================================
      1. NEUMORPHIC CONTROL & FILTER BAR
  ========================================================= */}
  <div className="space-y-4 rounded-[24px] border border-white/60 bg-surface p-4 sm:p-5 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Recessed Search Well */}
      <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-primary/80">
          <Search className="h-3.5 w-3.5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            isVietnamese
              ? "Tìm mã, tên hoặc vị trí camera..."
              : "Search camera code, name, location..."
          }
          className="h-10 w-full rounded-[14px] bg-background/65 pl-9 pr-8 text-xs font-medium text-foreground shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all placeholder:text-muted-foreground/75 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-black/35 dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.7),inset_-1px_-1px_4px_rgba(255,255,255,0.04)]"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="absolute inset-y-0 right-1.5 my-auto flex h-6 w-6 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:text-foreground dark:bg-card dark:shadow-[2px_2px_4px_rgba(0,0,0,0.6)]"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {hasFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] border border-white/70 bg-surface px-3 text-xs font-bold text-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Đặt lại" : "Reset"}</span>
          </button>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[13px] bg-primary px-3.5 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all duration-150 hover:brightness-105 active:scale-[0.98] dark:shadow-[4px_4px_14px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.05)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Thêm Camera" : "Add Camera"}</span>
          </button>
        )}

        <Link
          href={`/cameras?siteId=${site.id}&view=wall`}
          title={
            isVietnamese
              ? "Mở toàn bộ camera của công trường này trên Video Wall toàn màn hình"
              : "Open all site cameras on full-screen Video Wall"
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-[13px] border border-primary/25 bg-primary/[0.08] px-3 sm:px-3.5 text-xs font-extrabold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] transition-all duration-150 hover:bg-primary/15 active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] dark:bg-primary/15 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.03)]"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
          <span className="sm:hidden">Wall</span>
          <span className="hidden sm:inline">
            {isVietnamese ? "Mở Video Wall" : "Open Video Wall"}
          </span>
        </Link>

        <RefreshIconButton
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
          title={isVietnamese ? "Làm mới luồng" : "Refresh feeds"}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[13px] border border-white/70 bg-surface text-muted-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.85)] hover:text-primary active:shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] disabled:opacity-50 dark:border-white/[0.06] dark:bg-card dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_6px_rgba(255,255,255,0.03)] dark:active:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65)]"
          iconClassName="h-3.5 w-3.5"
        />
      </div>
    </div>

    {/* Recessed Filter Tray */}
    <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] bg-background/60 p-2.5 text-xs shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_rgba(255,255,255,0.85)] dark:bg-black/30 dark:shadow-[inset_3px_3px_9px_rgba(0,0,0,0.7),inset_-1px_-1px_5px_rgba(255,255,255,0.03)]">
      {/* Zone Filter */}
      <div className="relative flex items-center">
        <Layers className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-primary" />
        <select
          value={selectedZone}
          onChange={(e) => {
            setSelectedZone(e.target.value);
            setPage(1);
          }}
          aria-label={isVietnamese ? "Lọc theo phân khu" : "Filter by zone"}
          className="cursor-pointer appearance-none rounded-[11px] border border-white/60 bg-surface py-1.5 pl-8 pr-7 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]"
        >
          <option value="ALL">
            {isVietnamese
              ? `Tất cả phân khu (${zones.length})`
              : `All Zones (${zones.length})`}
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Status Filter */}
      <div className="relative flex items-center">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label={isVietnamese ? "Lọc theo trạng thái" : "Filter by status"}
          className="cursor-pointer appearance-none rounded-[11px] border border-white/60 bg-surface py-1.5 pl-3 pr-7 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]"
        >
          <option value="ALL">{isVietnamese ? "Tất cả trạng thái" : "All Statuses"}</option>
          <option value="ONLINE">{isVietnamese ? "Đang trực (ONLINE)" : "ONLINE"}</option>
          <option value="OFFLINE">{isVietnamese ? "Mất kết nối (OFFLINE)" : "OFFLINE"}</option>
          <option value="CONNECTING">{isVietnamese ? "Đang kết nối (CONNECTING)" : "CONNECTING"}</option>
          <option value="ERROR">{isVietnamese ? "Lỗi tín hiệu (ERROR)" : "ERROR"}</option>
          <option value="MAINTENANCE">{isVietnamese ? "Bảo trì (MAINTENANCE)" : "MAINTENANCE"}</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Source Type Filter */}
      <div className="relative flex items-center">
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          aria-label={isVietnamese ? "Lọc theo giao thức nguồn" : "Filter by source type"}
          className="cursor-pointer appearance-none rounded-[11px] border border-white/60 bg-surface py-1.5 pl-3 pr-7 text-xs font-bold text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] focus:border-primary/40 focus:outline-none dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_6px_rgba(0,0,0,0.55)]"
        >
          <option value="ALL">{isVietnamese ? "Mọi nguồn stream" : "All Sources"}</option>
          <option value="RTSP">RTSP</option>
          <option value="HLS">HLS</option>
          <option value="HTTP">HTTP</option>
          <option value="FILE">FILE</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Extruded Counter Pill */}
      <span className="ml-auto rounded-xl border border-white/60 bg-surface px-3 py-1 font-mono text-[11px] font-extrabold text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.55)]">
        {totalCount} {isVietnamese ? "camera" : "cameras"}
      </span>
    </div>
  </div>

  {/* =========================================================
      2. LOADING / EMPTY / CAMERA GRID
  ========================================================= */}
  {isLoading ? (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-[24px] border border-white/50 bg-surface shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.8)] dark:border-white/[0.04] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.5)]"
        />
      ))}
    </div>
  ) : cameras.length === 0 ? (
    <div className="rounded-[24px] border border-white/60 bg-surface p-12 text-center shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55)]">
      {/* Recessed Empty Icon Pod */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-background/70 text-muted-foreground/60 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_rgba(255,255,255,0.85)] dark:bg-black/35 dark:shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7)]">
        <Camera className="h-8 w-8" />
      </div>
      <h4 className="text-sm font-extrabold text-foreground">
        {isVietnamese ? "Không tìm thấy Camera nào" : "No Cameras Found"}
      </h4>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {hasFilters
          ? isVietnamese
            ? "Không có camera nào khớp với bộ lọc đang chọn."
            : "No cameras match the selected filters."
          : isVietnamese
            ? "Hiện tại chưa có camera nào được gán vào công trường này."
            : "No cameras assigned to this site yet."}
      </p>
      {canManage && !hasFilters && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_12px_rgba(var(--primary-rgb),0.35),-3px_-3px_8px_rgba(255,255,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{isVietnamese ? "Đăng ký Camera đầu tiên" : "Register First Camera"}</span>
        </button>
      )}
    </div>
  ) : (
    <>
      {/* Camera Grid with Live AI Stream Viewport */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cameras.map((cam) => {
          const isOnline = cam.status === "ONLINE";
          const isError = cam.status === "ERROR";
          const session = getSessionForCamera(cam);
          const isLiveRunning = session?.status === "running";
          const resolvedZoneName =
            cam.zoneName ||
            (cam.zoneId ? zoneLookup.get(cam.zoneId) : undefined) ||
            (isVietnamese ? "Chưa phân khu" : "Unassigned Zone");
          const liveFps =
            isLiveRunning && typeof session?.metrics?.fps === "number"
              ? session.metrics.fps.toFixed(1)
              : (cam.config?.captureFps ?? 25);

          return (
            <div
              key={cam.id}
              className={`group relative flex flex-col justify-between gap-3.5 rounded-[24px] border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                isOnline
                  ? "border-primary/25 bg-surface shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_rgba(255,255,255,0.9)] dark:border-primary/20 dark:bg-card dark:shadow-[8px_8px_20px_rgba(0,0,0,0.55),-3px_-3px_10px_rgba(255,255,255,0.03)]"
                  : "border-white/60 bg-surface shadow-[7px_7px_16px_var(--shadow-dark),-7px_-7px_16px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[7px_7px_18px_rgba(0,0,0,0.5),-3px_-3px_8px_rgba(255,255,255,0.025)]"
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Recessed Code Pill */}
                    <span className="rounded-lg bg-primary/[0.08] px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.75)] dark:bg-primary/15 dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                      {cam.code}
                    </span>

                    {/* Status Badge with LED Dot */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.75)] dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)] ${
                        isOnline
                          ? "bg-primary/10 text-primary"
                          : isError
                            ? "bg-danger/10 text-danger"
                            : "bg-background/70 text-muted-foreground dark:bg-black/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isOnline
                            ? "bg-primary shadow-[0_0_6px_var(--primary)]"
                            : isError
                              ? "bg-danger shadow-[0_0_6px_var(--danger)]"
                              : "bg-muted-foreground/50"
                        }`}
                      />
                      {cam.status}
                    </span>

                    <span className="rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] dark:bg-black/30">
                      {cam.sourceType}
                    </span>
                  </div>

                  <Link
                    href={`/cameras/${cam.id}`}
                    className="mt-2 block truncate text-xs sm:text-sm font-extrabold text-foreground transition-colors hover:text-primary"
                  >
                    {cam.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    {resolvedZoneName}
                    {cam.location ? ` • ${cam.location}` : ""}
                  </p>
                </div>

                {/* Extruded Studio Link Button */}
                <Link
                  href={`/cameras/${cam.id}`}
                  title={isVietnamese ? "Mở Studio Chi tiết" : "Open Camera Studio"}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/70 bg-surface text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all duration-150 hover:scale-105 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_8px_rgba(0,0,0,0.55)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Recessed Monitor Bezel around Video Viewport */}
              <div className="overflow-hidden rounded-[18px] bg-background/70 p-1.5 shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_rgba(255,255,255,0.85)] dark:bg-black/40 dark:shadow-[inset_3px_3px_9px_rgba(0,0,0,0.75),inset_-1px_-1px_4px_rgba(255,255,255,0.03)]">
                <div className="overflow-hidden rounded-[13px]">
                  <CameraVideoPlayer
                    camera={cam}
                    liveSession={session}
                    productionMode={productionMode}
                    isBusy={startingCameraId === cam.id}
                    onStartLive={canManage ? (c) => void startLive({ camera: c }) : undefined}
                    onStopLive={canManage ? (c) => void stopLive(c) : undefined}
                    compact
                  />
                </div>
              </div>

              {/* Grooved Footer Actions & Telemetry */}
              <div className="relative flex items-center justify-between gap-2 pt-3 before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-border/45 before:to-transparent">
                {/* Recessed Telemetry Readout */}
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-background/60 px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.75)] dark:bg-black/30 dark:shadow-[inset_1.5px_1.5px_4px_rgba(0,0,0,0.65)]">
                  <span className="text-foreground">{liveFps} FPS</span>
                  <span className="opacity-40">•</span>
                  <span>{cam.config?.resolution || "1080p"}</span>
                </div>

                {/* Tactile Micro Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => pingCameraMutation.mutate(cam.id)}
                      disabled={pingCameraMutation.isPending}
                      title={isVietnamese ? "Ping kiểm tra kết nối" : "Ping camera"}
                      className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                    >
                      <Wifi className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setHealthTarget(cam)}
                    title={isVietnamese ? "Nhật ký nhịp tim & chẩn đoán" : "Health logs"}
                    className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                  >
                    <Activity className="h-3.5 w-3.5" />
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditTarget(cam)}
                        title={isVietnamese ? "Sửa camera" : "Edit camera"}
                        className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cam)}
                        title={isVietnamese ? "Xóa camera" : "Delete camera"}
                        className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/60 bg-surface text-muted-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] transition-all hover:text-danger active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] dark:border-white/[0.05] dark:bg-card dark:shadow-[2px_2px_5px_rgba(0,0,0,0.5)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================
          3. NEUMORPHIC PAGINATION BAR
      ========================================================= */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-[20px] border border-white/60 bg-surface px-4 py-3 text-xs shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_rgba(255,255,255,0.85)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
          <span className="font-medium text-muted-foreground">
            {isVietnamese ? (
              <>
                Trang <strong className="font-mono font-extrabold text-foreground">{page}</strong> /{" "}
                <span className="font-mono">{totalPages}</span> ({totalCount} camera)
              </>
            ) : (
              <>
                Page <strong className="font-mono font-extrabold text-foreground">{page}</strong> of{" "}
                <span className="font-mono">{totalPages}</span> ({totalCount} cameras)
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label={isVietnamese ? "Trang trước" : "Previous page"}
              className="flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/70 bg-surface text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_5px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label={isVietnamese ? "Trang sau" : "Next page"}
              className="flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/70 bg-surface text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_rgba(255,255,255,0.85)] transition-all hover:text-primary active:shadow-[inset_2px_2px_5px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.06] dark:bg-card dark:shadow-[3px_3px_7px_rgba(0,0,0,0.5)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )}

  {/* Site-scoped Modals */}
  <CreateCameraModal
    open={createOpen}
    onOpenChange={setCreateOpen}
    onSubmit={handleCreateCamera}
    loading={createCameraMutation.isPending}
    defaultSiteId={site.id}
    defaultZoneId={selectedZone !== "ALL" ? selectedZone : undefined}
  />

  <EditCameraModal
    open={Boolean(editTarget)}
    onOpenChange={(open) => {
      if (!open) setEditTarget(null);
    }}
    camera={editTarget}
    onSubmit={handleUpdateCamera}
    loading={updateCameraMutation.isPending}
  />

  <DeleteCameraDialog
    open={Boolean(deleteTarget)}
    onOpenChange={(open) => {
      if (!open) setDeleteTarget(null);
    }}
    camera={deleteTarget}
    onConfirm={handleDeleteCamera}
    loading={deleteCameraMutation.isPending}
  />

  <CameraHealthDialog
    open={Boolean(healthTarget)}
    onOpenChange={(open) => {
      if (!open) setHealthTarget(null);
    }}
    camera={healthTarget}
  />
</div>
  );
}
