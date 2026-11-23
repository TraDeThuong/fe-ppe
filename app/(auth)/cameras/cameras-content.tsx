"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import { useSite } from "@/contexts/SiteContext";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import { NM } from "@/components/features/ai-test/nm-styles";
import {
  filterSessionsForCameras,
  selectAutoStartCandidates,
} from "@/components/features/cameras/camera-live-helpers";
import {
  CameraCard,
  CameraFleetHeader,
  CameraHealthDialog,
  CameraKpiSummary,
  CameraTable,
  CameraToolbar,
  CameraVideoWall,
  CreateCameraModal,
  DeleteCameraDialog,
  EditCameraModal,
  type CameraFleetViewMode,
  type CameraKpiFilterKey,
} from "@/components/features/cameras";
import {
  useCameraLiveSessions,
  useCameras,
  useCamerasCatalog,
  useCameraStatusCounts,
  useCreateCamera,
  useDeleteCamera,
  useUpdateCamera,
} from "@/hooks/cameras";
import type {
  CameraItem,
  CreateCameraPayload,
  UpdateCameraPayload,
} from "@/types";

export default function CamerasContent() {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canCreate = useCan()("PPE_CAMERA_MANAGE");
  const { siteId: globalSiteId } = useSite();
  const { getSiteName } = useEntityLookup();

  const urlSearch = searchParams.get("search") || "";
  const urlSiteId = searchParams.get("siteId") || "";
  const urlZoneId = searchParams.get("zoneId") || "";
  const urlView = searchParams.get("view");
  const urlLayout = searchParams.get("layout");

  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [kpiFilter, setKpiFilter] = useState<CameraKpiFilterKey>("all");
  const [siteFilter, setSiteFilter] = useState(urlSiteId || globalSiteId || "");
  const [zoneFilter, setZoneFilter] = useState(urlZoneId);
  const [viewMode, setViewMode] = useState<CameraFleetViewMode>(
    urlView === "wall" || urlView === "table" ? urlView : "grid",
  );
  const [wallLayout, setWallLayout] = useState<"1x1" | "2x2" | "3x3">(
    urlLayout === "1x1" || urlLayout === "3x3" ? urlLayout : "2x2",
  );

  // Sync URL query params
  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) setSearch(s);
    const sid = searchParams.get("siteId");
    if (sid !== null) setSiteFilter(sid);
    const zid = searchParams.get("zoneId");
    if (zid !== null) setZoneFilter(zid);
    const v = searchParams.get("view");
    if (v === "wall" || v === "table" || v === "grid") setViewMode(v);
    const l = searchParams.get("layout");
    if (l === "1x1" || l === "2x2" || l === "3x3") setWallLayout(l);
  }, [searchParams]);

  // Sync global site context when not explicitly specified in URL
  useEffect(() => {
    if (!urlSiteId) {
      setSiteFilter(globalSiteId || "");
      setZoneFilter("");
    }
  }, [globalSiteId, urlSiteId]);

  const syncUrlView = (mode: CameraFleetViewMode, layout?: "1x1" | "2x2" | "3x3") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "grid") {
      params.delete("view");
    } else {
      params.set("view", mode);
    }
    if (layout) {
      params.set("layout", layout);
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const debouncedSearch = useDebounce(search, 300);

  const filterKey = `${debouncedSearch}:${siteFilter}:${zoneFilter}:${statusFilter}:${sourceTypeFilter}:${kpiFilter}`;
  const tableState = useTableState(
    [{ id: "createdAt", desc: true }],
    filterKey,
  );

  const {
    pagination: { pageIndex, pageSize },
    sorting,
    onPaginationChange,
  } = tableState;

  const sortParams = mapTableSort(
    sorting,
    {
      name: "name",
      code: "code",
      status: "status",
      createdAt: "createdAt",
    },
    { sortBy: "createdAt", order: "desc" },
  );

  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Queries: Status Counts (lightweight KPI), Lazy Catalog (when KPI detail opens or sessions need reconciliation), Filtered Page (Grid/Wall/Table), Live AI Sessions
  const {
    data: cameraStatusCounts,
    isLoading: statusCountsLoading,
    refetch: refetchStatusCounts,
  } = useCameraStatusCounts(siteFilter || undefined);

  const {
    data: camerasResponse,
    isLoading: camerasLoading,
    isFetching: camerasFetching,
    refetch: refetchCameras,
  } = useCameras({
    page: pageIndex + 1,
    limit: pageSize,
    search: debouncedSearch || undefined,
    siteId: siteFilter || undefined,
    zoneId: zoneFilter || undefined,
    status: statusFilter || (kpiFilter === "online" ? "ONLINE" : undefined),
    sourceType: sourceTypeFilter || undefined,
    sortBy: sortParams.sortBy,
    sortOrder: sortParams.order,
  });

  const {
    engineOnline,
    engineError,
    productionMode,
    maxSessions,
    autoSyncEnabled,
    models,
    videos,
    sessions,
    getSessionForCamera,
    isLoadingSessions,
    startLive,
    stopLive,
    stopOrphanedSessions,
    triggerSync,
    isSyncingLive,
    startingCameraId,
    refreshAll: refreshAiEngine,
  } = useCameraLiveSessions({ enabled: true, pollIntervalMs: 2500 });

  const rawCameras = useMemo(
    () => camerasResponse?.items || [],
    [camerasResponse?.items],
  );
  const meta = camerasResponse?.meta;

  const hasActiveQueryFilters = Boolean(
    debouncedSearch || zoneFilter || statusFilter || sourceTypeFilter,
  );
  const totalFleetCameras =
    cameraStatusCounts?.total ?? (!hasActiveQueryFilters ? meta?.total : undefined);

  const shouldLoadCatalog =
    kpiDetailOpen ||
    (sessions.length > 0 &&
      (Boolean(siteFilter) ||
        hasActiveQueryFilters ||
        (totalFleetCameras !== undefined && totalFleetCameras > rawCameras.length)));

  const {
    data: rawCatalogCameras = [],
    isLoading: catalogLoading,
    refetch: refetchCatalog,
  } = useCamerasCatalog({ enabled: shouldLoadCatalog });

  const catalogCameras = useMemo(
    () =>
      siteFilter
        ? rawCatalogCameras.filter((c) => c.siteId === siteFilter)
        : rawCatalogCameras,
    [rawCatalogCameras, siteFilter],
  );

  const autoAttemptedIdsRef = useRef<Set<string>>(new Set());
  const stoppedOrphanIdsRef = useRef<Set<string>>(new Set());
  const autoStartRunningRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createMutation = useCreateCamera();
  const updateMutation = useUpdateCamera();
  const deleteMutation = useDeleteCamera();

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CameraItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraItem | null>(null);
  const [healthTarget, setHealthTarget] = useState<CameraItem | null>(null);

  const allKnownCameras = useMemo(
    () => (catalogCameras.length > 0 ? catalogCameras : rawCameras),
    [catalogCameras, rawCameras],
  );

  const hasCompleteCameraCatalog =
    !camerasLoading &&
    !statusCountsLoading &&
    (totalFleetCameras === 0 ||
      (!catalogLoading && rawCatalogCameras.length > 0) ||
      (!hasActiveQueryFilters &&
        totalFleetCameras !== undefined &&
        rawCameras.length >= totalFleetCameras));

  const { activeFleetSessions, orphanedSessions } = useMemo(() => {
    if (totalFleetCameras === 0) {
      return { activeFleetSessions: [], orphanedSessions: siteFilter ? [] : sessions };
    }
    if (hasCompleteCameraCatalog) {
      const { matchedSessions, orphanedSessions: orphans } =
        filterSessionsForCameras(sessions, allKnownCameras);
      return {
        activeFleetSessions: matchedSessions,
        orphanedSessions: siteFilter ? [] : orphans,
      };
    }
    return { activeFleetSessions: sessions, orphanedSessions: [] };
  }, [allKnownCameras, hasCompleteCameraCatalog, sessions, siteFilter, totalFleetCameras]);

  // Automatically stop orphaned AI Live sessions whose cameras were deleted from DB
  useEffect(() => {
    if (
      !engineOnline ||
      isLoadingSessions ||
      !hasCompleteCameraCatalog ||
      !canCreate ||
      siteFilter
    ) {
      return;
    }
    const orphanIdsToStop = orphanedSessions
      .filter(
        (s) =>
          (s.status === "running" ||
            s.status === "initializing" ||
            s.status === "reconnecting") &&
          !stoppedOrphanIdsRef.current.has(s.camera_id),
      )
      .map((s) => s.camera_id);

    if (orphanIdsToStop.length === 0) return;

    for (const id of orphanIdsToStop) {
      stoppedOrphanIdsRef.current.add(id);
    }
    void stopOrphanedSessions(orphanIdsToStop);
  }, [
    canCreate,
    engineOnline,
    hasCompleteCameraCatalog,
    isLoadingSessions,
    orphanedSessions,
    siteFilter,
    stopOrphanedSessions,
  ]);

  const camerasWithSite = useMemo(
    () =>
      rawCameras.map((c) => ({
        ...c,
        siteName: c.siteName || getSiteName(c.siteId),
      })),
    [rawCameras, getSiteName],
  );

  // Client filter when user clicks AI Live / Violations KPI Pod
  const visibleCameras = useMemo(() => {
    if (kpiFilter === "ai_live") {
      return camerasWithSite.filter(
        (c) => getSessionForCamera(c)?.status === "running",
      );
    }
    if (kpiFilter === "violations") {
      return camerasWithSite.filter((c) => {
        const s = getSessionForCamera(c);
        return s?.status === "running" && (s.metrics?.active_violations ?? 0) > 0;
      });
    }
    return camerasWithSite;
  }, [camerasWithSite, getSessionForCamera, kpiFilter]);

  const runningSessionsCount = useMemo(
    () => activeFleetSessions.filter((s) => s.status === "running").length,
    [activeFleetSessions],
  );

  const totalCount = meta?.total ?? visibleCameras.length;
  const pageCount = Math.max(1, meta?.totalPages ?? Math.ceil(totalCount / pageSize));

  const handleRefreshAll = () => {
    autoAttemptedIdsRef.current.clear();
    stoppedOrphanIdsRef.current.clear();
    setIsManualRefreshing(true);
    void Promise.all([
      refetchCameras(),
      refetchStatusCounts(),
      shouldLoadCatalog ? refetchCatalog() : Promise.resolve(),
      refreshAiEngine(),
    ]).finally(() => {
      if (isMountedRef.current) {
        setIsManualRefreshing(false);
      }
    });
  };

  const handleKpiSelect = (key: CameraKpiFilterKey) => {
    setKpiFilter(key);
    if (key === "online") {
      setStatusFilter("ONLINE");
    } else if (statusFilter === "ONLINE") {
      setStatusFilter("");
    }
  };

  const handleCreateSubmit = async (payload: CreateCameraPayload) => {
    await createMutation.mutateAsync(payload);
  };

  const handleEditSubmit = async (id: string, payload: UpdateCameraPayload) => {
    await updateMutation.mutateAsync({ id, payload });
  };

  const handleDeleteConfirm = async (id: string, name?: string, code?: string) => {
    await deleteMutation.mutateAsync({ id, name, code });
  };

  const handleStartLive = useCallback((camera: CameraItem) => {
    autoAttemptedIdsRef.current.add(camera.id);
    void startLive({ camera }).catch(() => {
      // toast handled inside mutation
    });
  }, [startLive]);

  const handleStopLive = useCallback((camera: CameraItem) => {
    autoAttemptedIdsRef.current.add(camera.id);
    void stopLive(camera).catch(() => {
      // toast handled inside mutation
    });
  }, [stopLive]);

  // Auto-start eligible ONLINE cameras only when BE 24/7 Auto-Sync is disabled (e.g. sandbox mode)
  useEffect(() => {
    if (!engineOnline || isLoadingSessions) return;
    if (autoSyncEnabled) return;
    if (viewMode !== "grid" && viewMode !== "wall") return;
    if (autoStartRunningRef.current) return;

    const candidates = selectAutoStartCandidates(
      visibleCameras,
      sessions,
      videos,
      {
        maxTotalSessions: maxSessions,
        productionMode,
        attemptedIds: autoAttemptedIdsRef.current,
      },
    );
    if (candidates.length === 0) return;

    autoStartRunningRef.current = true;
    void (async () => {
      try {
        for (const cam of candidates) {
          if (!isMountedRef.current) break;
          autoAttemptedIdsRef.current.add(cam.id);
          try {
            await startLive({ camera: cam, silent: true });
          } catch {
            break;
          }
        }
      } finally {
        autoStartRunningRef.current = false;
      }
    })();
  }, [
    autoSyncEnabled,
    engineOnline,
    isLoadingSessions,
    maxSessions,
    productionMode,
    sessions,
    startLive,
    videos,
    viewMode,
    visibleCameras,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-10">
      {/* Layer 1: Neumorphism Console Header */}
      <CameraFleetHeader
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          syncUrlView(mode);
        }}
        engineOnline={engineOnline}
        engineError={engineError}
        productionMode={productionMode}
        autoSyncEnabled={autoSyncEnabled}
        maxSessions={maxSessions}
        isSyncingLive={isSyncingLive}
        onTriggerSync={
          productionMode && canCreate
            ? () => {
                void triggerSync().catch(() => {});
              }
            : undefined
        }
        models={models}
        totalCameras={cameraStatusCounts?.total ?? totalCount}
        runningSessionsCount={runningSessionsCount}
        isRefreshing={camerasFetching || isManualRefreshing}
        canCreateCamera={canCreate}
        onRefreshAll={handleRefreshAll}
        onCreateCamera={() => setCreateOpen(true)}
      />

      {/* Layer 2: 4 Bento Telemetry Pods (Status Counts + Live Sessions + Lazy Detail) */}
      <CameraKpiSummary
        cameras={catalogCameras.length > 0 ? catalogCameras : rawCameras}
        statusCounts={cameraStatusCounts}
        sessions={activeFleetSessions}
        activeFilter={kpiFilter}
        onSelectFilter={handleKpiSelect}
        onDetailOpenChange={setKpiDetailOpen}
        loading={statusCountsLoading && !cameraStatusCounts && camerasLoading}
      />

      {/* Layer 3: Search & Portal Select Filter Bar */}
      <CameraToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          if (val !== "ONLINE" && kpiFilter === "online") setKpiFilter("all");
        }}
        sourceTypeFilter={sourceTypeFilter}
        onSourceTypeFilterChange={setSourceTypeFilter}
        siteFilter={siteFilter}
        onSiteFilterChange={setSiteFilter}
        zoneFilter={zoneFilter}
        onZoneFilterChange={setZoneFilter}
        viewMode={viewMode}
        wallLayout={wallLayout}
        onWallLayoutChange={(layout) => {
          setWallLayout(layout);
          syncUrlView(viewMode, layout);
        }}
        totalCount={totalCount}
        filteredCount={visibleCameras.length}
        hasExtraFilter={kpiFilter !== "all"}
        onResetAll={() => setKpiFilter("all")}
      />

      {/* Layer 4: Main Viewport (Grid / Video Wall / Table) */}
      {viewMode === "wall" ? (
        <CameraVideoWall
          cameras={visibleCameras}
          layout={wallLayout}
          getSessionForCamera={getSessionForCamera}
          productionMode={productionMode}
          startingCameraId={startingCameraId}
          onStartLive={handleStartLive}
          onStopLive={handleStopLive}
        />
      ) : viewMode === "table" ? (
        <CameraTable
          cameras={visibleCameras}
          getSessionForCamera={getSessionForCamera}
          onStartLive={handleStartLive}
          onStopLive={handleStopLive}
          onPing={setHealthTarget}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
          loading={camerasLoading}
          isRefreshing={camerasFetching || isManualRefreshing}
          onRefresh={handleRefreshAll}
          tableState={{
            manualPagination: true,
            manualSorting: true,
            pageCount,
            rowCount: totalCount,
            pagination: tableState.pagination,
            sorting: tableState.sorting,
            onPaginationChange: tableState.onPaginationChange,
            onSortingChange: tableState.onSortingChange,
          }}
        />
      ) : (
        /* Grid Mode */
        <div className="space-y-6">
          {camerasLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-[400px] animate-pulse rounded-[26px] p-5 ${NM.chassis}`}
                />
              ))}
            </div>
          ) : visibleCameras.length === 0 ? (
            <div
              className={`flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-[28px] p-10 text-center ${NM.chassis}`}
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-primary ${NM.recessed}`}
              >
                <Camera className="size-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-extrabold text-foreground">
                  {isVietnamese ? "Không tìm thấy camera nào" : "No cameras found"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isVietnamese
                    ? "Hãy thử thay đổi điều kiện lọc hoặc thêm thiết bị camera mới vào hệ thống."
                    : "Try adjusting your filters or add a new camera device to the system."}
                </p>
              </div>
              {canCreate && !search && !statusFilter && kpiFilter === "all" && (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105"
                >
                  <Plus className="size-4" />
                  <span>{isVietnamese ? "Thêm Camera Mới" : "Add New Camera"}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visibleCameras.map((camera) => (
                <CameraCard
                  key={camera.id}
                  camera={camera}
                  siteName={camera.siteName}
                  liveSession={getSessionForCamera(camera)}
                  productionMode={productionMode}
                  isBusy={startingCameraId === camera.id}
                  onStartLive={handleStartLive}
                  onStopLive={handleStopLive}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                  onHealthCheck={setHealthTarget}
                />
              ))}
            </div>
          )}

          {/* Clean standalone Neumorphism Pagination */}
          {pageCount > 1 && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${NM.chassis}`}
            >
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {isVietnamese ? "Trang" : "Page"}{" "}
                <strong className="text-foreground">{pageIndex + 1}</strong> /{" "}
                {pageCount} ({totalCount} {isVietnamese ? "camera" : "cameras"})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pageIndex === 0}
                  onClick={() =>
                    onPaginationChange((p) => ({
                      ...p,
                      pageIndex: Math.max(0, p.pageIndex - 1),
                    }))
                  }
                  className={`inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-bold text-foreground disabled:opacity-40 ${NM.tactileBtn}`}
                >
                  <ChevronLeft className="size-3.5" />
                  <span>{isVietnamese ? "Trước" : "Prev"}</span>
                </button>
                <button
                  type="button"
                  disabled={pageIndex + 1 >= pageCount}
                  onClick={() =>
                    onPaginationChange((p) => ({
                      ...p,
                      pageIndex: Math.min(pageCount - 1, p.pageIndex + 1),
                    }))
                  }
                  className={`inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-bold text-foreground disabled:opacity-40 ${NM.tactileBtn}`}
                >
                  <span>{isVietnamese ? "Sau" : "Next"}</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <CreateCameraModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
        loading={createMutation.isPending}
        defaultSiteId={siteFilter || undefined}
      />

      <EditCameraModal
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        camera={editTarget}
        onSubmit={handleEditSubmit}
        loading={updateMutation.isPending}
      />

      <DeleteCameraDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        camera={deleteTarget}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
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
