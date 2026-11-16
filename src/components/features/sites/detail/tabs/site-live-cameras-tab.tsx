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
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { data: siteZones = [] } = useSiteZones(site.id);
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
  const { data: camerasData, isLoading, refetch, isFetching } = useCameras({
    siteId: site.id,
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    zoneId: selectedZone !== "ALL" ? selectedZone : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sourceType: sourceFilter !== "ALL" ? sourceFilter : undefined,
  });

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
  } = useCameraLiveSessions({ enabled: true });

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

  const handleDeleteCamera = async (id: string, name?: string) => {
    await deleteCameraMutation.mutateAsync({ id, name });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-4 shadow-sm dark:border-black/60 dark:bg-card/90">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
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
              className="h-9 w-full rounded-xl border border-border/40 bg-surface-elevated pl-8.5 pr-7 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8.5 gap-1 rounded-xl px-2.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Đặt lại" : "Reset"}</span>
              </Button>
            )}

            {canManage && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="h-8.5 gap-1.5 rounded-xl px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Thêm Camera" : "Add Camera"}</span>
              </Button>
            )}

            <Link
              href={`/cameras?siteId=${site.id}&view=wall`}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-2.5 sm:px-3 text-xs font-semibold text-primary hover:bg-primary/15 transition shadow-sm"
              title={
                isVietnamese
                  ? "Mở toàn bộ camera của công trường này trên Video Wall toàn màn hình"
                  : "Open all site cameras on full-screen Video Wall"
              }
            >
              <Maximize2 className="h-3 w-3 shrink-0" />
              <span className="sm:hidden">Wall</span>
              <span className="hidden sm:inline">
                {isVietnamese ? "Mở Video Wall" : "Open Video Wall"}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isFetching}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-border/40 text-muted-foreground hover:text-primary transition dark:border-black/40"
              title={isVietnamese ? "Làm mới luồng" : "Refresh feeds"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/20 pt-2.5 text-xs">
          {/* Zone Filter */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                setPage(1);
              }}
              aria-label={isVietnamese ? "Lọc theo phân khu" : "Filter by zone"}
              className="rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
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
          </div>

          {/* Status Filter (All 5 BE Camera Statuses) */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label={isVietnamese ? "Lọc theo trạng thái" : "Filter by status"}
            className="rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
          >
            <option value="ALL">{isVietnamese ? "Tất cả trạng thái" : "All Statuses"}</option>
            <option value="ONLINE">{isVietnamese ? "Đang trực (ONLINE)" : "ONLINE"}</option>
            <option value="OFFLINE">{isVietnamese ? "Mất kết nối (OFFLINE)" : "OFFLINE"}</option>
            <option value="CONNECTING">{isVietnamese ? "Đang kết nối (CONNECTING)" : "CONNECTING"}</option>
            <option value="ERROR">{isVietnamese ? "Lỗi tín hiệu (ERROR)" : "ERROR"}</option>
            <option value="MAINTENANCE">{isVietnamese ? "Bảo trì (MAINTENANCE)" : "MAINTENANCE"}</option>
          </select>

          {/* Source Type Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            aria-label={isVietnamese ? "Lọc theo giao thức nguồn" : "Filter by source type"}
            className="rounded-xl border border-border/40 bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none dark:border-black/40 dark:bg-background/60"
          >
            <option value="ALL">{isVietnamese ? "Mọi nguồn stream" : "All Sources"}</option>
            <option value="RTSP">RTSP</option>
            <option value="HLS">HLS</option>
            <option value="HTTP">HTTP</option>
            <option value="FILE">FILE</option>
          </select>

          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {totalCount} {isVietnamese ? "camera" : "cameras"}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface-elevated/40" />
          ))}
        </div>
      ) : cameras.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center dark:border-black/50 dark:bg-card/70">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-bold text-foreground">
            {isVietnamese ? "Không tìm thấy Camera nào" : "No Cameras Found"}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            {hasFilters
              ? isVietnamese
                ? "Không có camera nào khớp với bộ lọc đang chọn."
                : "No cameras match the selected filters."
              : isVietnamese
                ? "Hiện tại chưa có camera nào được gán vào công trường này."
                : "No cameras assigned to this site yet."}
          </p>
          {canManage && !hasFilters && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="mt-4 gap-1.5 rounded-xl text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Đăng ký Camera đầu tiên" : "Register First Camera"}</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Camera Grid with Live AI Stream Viewport */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cameras.map((cam) => {
              const isOnline = cam.status === "ONLINE";
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
                  className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-border/40 bg-surface p-3.5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:-translate-y-0.5 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)]"
                >
                  {/* Header Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                          {cam.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                            isOnline
                              ? "bg-primary/15 text-primary"
                              : cam.status === "ERROR"
                                ? "bg-danger/15 text-danger"
                                : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isOnline
                                ? "bg-primary"
                                : cam.status === "ERROR"
                                  ? "bg-danger"
                                  : "bg-muted-foreground/50"
                            }`}
                          />
                          {cam.status}
                        </span>
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                          {cam.sourceType}
                        </span>
                      </div>

                      <Link
                        href={`/cameras/${cam.id}`}
                        className="mt-1 block truncate text-xs sm:text-sm font-extrabold text-foreground hover:text-primary transition-colors"
                      >
                        {cam.name}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {resolvedZoneName}
                        {cam.location ? ` • ${cam.location}` : ""}
                      </p>
                    </div>

                    <Link
                      href={`/cameras/${cam.id}`}
                      title={isVietnamese ? "Mở Studio Chi tiết" : "Open Camera Studio"}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/40 text-primary hover:bg-primary/10 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {/* Real Live AI / Preview Viewport */}
                  <CameraVideoPlayer
                    camera={cam}
                    liveSession={session}
                    productionMode={productionMode}
                    isBusy={startingCameraId === cam.id}
                    onStartLive={(c) => void startLive({ camera: c })}
                    onStopLive={(c) => void stopLive(c)}
                    compact
                  />

                  {/* Footer Actions & Telemetry */}
                  <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span>{liveFps} FPS</span>
                      <span>•</span>
                      <span>{cam.config?.resolution || "1080p"}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => pingCameraMutation.mutate(cam.id)}
                          disabled={pingCameraMutation.isPending}
                          title={isVietnamese ? "Ping kiểm tra kết nối" : "Ping camera"}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                        >
                          <Wifi className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setHealthTarget(cam)}
                        title={isVietnamese ? "Nhật ký nhịp tim & chẩn đoán" : "Health logs"}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                      >
                        <Activity className="h-3.5 w-3.5" />
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditTarget(cam)}
                            title={isVietnamese ? "Sửa camera" : "Edit camera"}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cam)}
                            title={isVietnamese ? "Xóa camera" : "Delete camera"}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger transition"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-surface px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {isVietnamese
                  ? `Trang ${page} / ${totalPages} (${totalCount} camera)`
                  : `Page ${page} of ${totalPages} (${totalCount} cameras)`}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
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
