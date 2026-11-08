"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Camera,
  Cctv,
  Plus,
  Radio,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TablePagination } from "@/components/ui/table";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  CameraCard,
  CameraHealthDialog,
  CameraKpiSummary,
  CameraRoiDrawer,
  CameraSpotlight,
  CameraTable,
  CameraToolbar,
  CameraVideoWall,
  CreateCameraModal,
  DeleteCameraDialog,
  EditCameraModal,
  type CameraKpiStatKey,
} from "@/components/features/cameras";
import {
  useCameras,
  useCamerasCatalog,
  useCreateCamera,
  useDeleteCamera,
  useUpdateCamera,
} from "@/hooks/cameras";
import { useSite } from "@/contexts/SiteContext";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  CameraItem,
  CreateCameraPayload,
  UpdateCameraPayload,
} from "@/types";

const STAT_TO_URL: Record<CameraKpiStatKey, string> = {
  totalCameras: "total-cameras",
  onlineStreams: "live-streams",
  edgeTelemetry: "telemetry",
  signalDiagnostics: "diagnostics",
};

const URL_TO_STAT: Record<string, CameraKpiStatKey> = {
  "total-cameras": "totalCameras",
  "live-streams": "onlineStreams",
  telemetry: "edgeTelemetry",
  diagnostics: "signalDiagnostics",
  totalCameras: "totalCameras",
  onlineStreams: "onlineStreams",
  edgeTelemetry: "edgeTelemetry",
  signalDiagnostics: "signalDiagnostics",
  fleetPulse: "totalCameras",
};

export default function CamerasContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { siteId: globalSiteId } = useSite();
  const { getSiteName } = useEntityLookup();

  // URL state synchronization for stats (Chuẩn phong cách Roles & Sites)
  const statParam = searchParams.get("stat");
  const selectedStat =
    statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: CameraKpiStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const urlSearch = searchParams.get("search") || "";
  const urlSiteId = searchParams.get("siteId") || "";
  const urlView = searchParams.get("view");
  const urlLayout = searchParams.get("layout");

  // Filter & View State
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState(urlSiteId || globalSiteId || "");
  const [zoneFilter, setZoneFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "wall">(
    urlView === "wall" || urlView === "table" ? urlView : "grid"
  );
  const [wallLayout, setWallLayout] = useState<"1x1" | "2x2" | "3x3">(
    urlLayout === "1x1" || urlLayout === "3x3" ? urlLayout : "2x2"
  );

  // Sync state whenever URL searchParams change
  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) setSearch(s);
    const sid = searchParams.get("siteId");
    if (sid !== null) setSiteFilter(sid);
    const v = searchParams.get("view");
    if (v === "wall" || v === "table" || v === "grid") setViewMode(v);
    const l = searchParams.get("layout");
    if (l === "1x1" || l === "2x2" || l === "3x3") setWallLayout(l);
  }, [searchParams]);

  // Đồng bộ với Global Site Selector khi người dùng chọn site từ Header
  useEffect(() => {
    if (!searchParams.get("siteId") && globalSiteId) {
      setSiteFilter(globalSiteId);
    }
  }, [globalSiteId, searchParams]);

  const tableState = useTableState([{ id: "name", desc: false }], `${search}:${statusFilter}:${siteFilter}:${zoneFilter}`);
  const apiSorting = mapTableSort(tableState.sorting, { name: "name", code: "code", createdAt: "createdAt", status: "status" }, { sortBy: "name", order: "asc" });
  const debouncedSearch = useDebounce(search, 350);

  // Fetch Cameras
  const { data, isLoading, isFetching, error, refetch } = useCameras({
    page: tableState.pagination.pageIndex + 1,
    limit: tableState.pagination.pageSize,
    sortBy: apiSorting.sortBy,
    sortOrder: apiSorting.order,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,
    siteId: siteFilter || undefined,
    zoneId: zoneFilter || undefined,

  });
  const cameras = data?.items || [];
  const { data: camerasCatalog = [], isLoading: catalogLoading } = useCamerasCatalog();

  // Mutations
  const createCamera = useCreateCamera();
  const updateCamera = useUpdateCamera();
  const deleteCamera = useDeleteCamera();

  // Modals & Drawers State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roiDrawerOpen, setRoiDrawerOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);

  const filteredCameras = cameras;

  // Breadcrumbs & Header Actions matching Users & Roles
  const breadcrumbs = useMemo(
    () => [{ label: t("nav.cameras") }],
    [t]
  );

  const headerActions = (
    <Button

      variant="primary"

      size="md"

      className="gap-2 shadow-nm-sm hover:shadow-nm transition-all"

      onClick={() => setCreateModalOpen(true)}

    >
      <Plus className="h-4 w-4" />
      <span>{t("cameras.toolbar.createCamera")}</span>
    </Button>
  );

  // Handlers
  const handleOpenCreate = () => {
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (camera: CameraItem) => {
    setSelectedCamera(camera);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (camera: CameraItem) => {
    setSelectedCamera(camera);
    setDeleteDialogOpen(true);
  };

  const handleOpenRoi = (camera: CameraItem) => {
    setSelectedCamera(camera);
    setRoiDrawerOpen(true);
  };

  const handleOpenPing = (camera: CameraItem) => {
    setSelectedCamera(camera);
    setHealthDialogOpen(true);
  };

  const handleViewLive = (camera: CameraItem) => {
    setSelectedCamera(camera);
    setViewMode("wall");
    setWallLayout("1x1");
  };

  const handleSnapshot = (camera: CameraItem) => {
    if (camera.snapshotUrl) {
      const link = document.createElement("a");
      link.href = camera.snapshotUrl;
      link.download = `snapshot-${camera.code || camera.id}-${Date.now()}.jpg`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(
        isVietnamese
          ? `Đã tải ảnh snapshot từ ${camera.name || camera.code}.`
          : `Downloaded snapshot from ${camera.name || camera.code}.`
      );
    } else {
      toast.info(
        isVietnamese
          ? `Camera ${camera.name || camera.code} chưa có ảnh chụp snapshot khả dụng.`
          : `No snapshot available for camera ${camera.name || camera.code}.`
      );
    }
  };

  const handleCreateSubmit = async (payload: CreateCameraPayload) => {
    await createCamera.mutateAsync(payload);
  };

  const handleEditSubmit = async (id: string, payload: UpdateCameraPayload) => {
    await updateCamera.mutateAsync({ id, payload });
  };

  const handleDeleteConfirm = async (id: string, name?: string) => {
    await deleteCamera.mutateAsync({ id, name });
  };

  const toolbar = (<CameraToolbar

    search={search}

    onSearchChange={setSearch}

    statusFilter={statusFilter}

    onStatusFilterChange={setStatusFilter}

    siteFilter={siteFilter}

    onSiteFilterChange={setSiteFilter}

    viewMode={viewMode}

    onViewModeChange={setViewMode}

    wallLayout={wallLayout}

    onWallLayoutChange={setWallLayout}

    onCreateCamera={handleOpenCreate}

    totalCount={data?.meta?.total ?? cameras.length}

    filteredCount={filteredCameras.length}

    onRefresh={() => refetch()}

    isRefreshing={isFetching}

  />);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Page Header (Đầy đủ Breadcrumbs, Badge & Action CTA) */}
      <PageHeader

        icon={Cctv}

        title={t("cameras.title")}

        description={t("cameras.description")}

        badge="Live Video Streams"

        badgeIcon={Radio}

        breadcrumbs={breadcrumbs}

        actions={headerActions}

      />

      {/* 2. KPI Bento Summary (4 Thẻ Đối Xứng Đồng Nhất với Hiệu Ứng Sunken) */}
      <CameraKpiSummary

        cameras={camerasCatalog}

        loading={catalogLoading}

        selectedStat={selectedStat}

        onSelectStat={handleSelectStat}

        activeFilter={statusFilter}

        onFilterChange={setStatusFilter}

        onFilterSite={setSiteFilter}

        onPing={handleOpenPing}

        onOpenRoi={handleOpenRoi}

        onEditCamera={handleOpenEdit}

        onCreateCamera={handleOpenCreate}

        onViewLive={handleViewLive}

      />

      {/* Contextual Filter Chip (Khi lọc theo công trường từ Header hoặc URL) */}
      {siteFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/[0.08] p-3 text-xs shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-surface px-3 py-1.5 text-primary shadow-sm">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isVietnamese ? "Đang lọc theo Công trường:" : "Filtering by Site:"}{" "}
                <strong>{getSiteName(siteFilter)}</strong>
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSiteFilter("");
              setZoneFilter("");
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-border/50 bg-surface px-3 py-1.5 font-semibold text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Xem tất cả công trường" : "View all sites"}</span>
          </button>
        </div>
      )}

      {/* 3. Toolbar & Controls */}
      {viewMode !== "table" ? toolbar : null}

      {/* 4. Main View Area (Giải Quyết Triệt Để Khoảng Trống) */}
      {viewMode === "wall" ? (
        /* Video Wall CCTV Mode */
        <CameraVideoWall

          cameras={filteredCameras}

          layout={wallLayout}

          onSnapshot={handleSnapshot}

          onPing={handleOpenPing}

          onOpenRoi={handleOpenRoi}

        />
      ) : viewMode === "table" ? (
        /* Neumorphic TanStack Data Table (Chuẩn Users Table) */
        <CameraTable

          cameras={filteredCameras}

          onViewLive={handleViewLive}

          onPing={handleOpenPing}

          onConfigureRoi={handleOpenRoi}

          onEdit={handleOpenEdit}

          onDelete={handleOpenDelete}

          loading={isLoading}

          onRefresh={() => refetch()}

          variant="soft"

          tableState={{
            ...tableState,
            manualPagination: true,
            manualSorting: true,
            manualFiltering: true,
            rowCount: data?.meta?.total ?? cameras.length,
            pageCount: data?.meta?.totalPages ?? 1,
            fetching: isFetching,
            error,
            onRetry: () => {
              void refetch();
            },
            toolbar
          }}

        />
      ) : (
        /* Grid / Spotlight Mode */
        isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-surface-elevated/40"
              />
            ))}
          </div>
        ) : filteredCameras.length === 0 ? (
          /* Trạng Thái Rỗng */
          <div className="rounded-3xl border border-border/40 bg-surface p-12 text-center shadow-[4px_4px_12px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_var(--shadow-dark)] mb-4">
              <Camera className="h-7 w-7 text-primary/70" />
            </div>
            <h4 className="text-base font-bold text-foreground">
              {t("cameras.table.empty")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              {isVietnamese
                ? "Không tìm thấy camera nào khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
                : "No cameras matched your search or current filter criteria."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setSiteFilter("");
                }}
              >
                {isVietnamese ? "Xóa bộ lọc" : "Clear filters"}
              </Button>
              <Button

                variant="primary"

                size="sm"

                onClick={handleOpenCreate}

                className="gap-1.5"

              >
                <Plus className="h-4 w-4" />
                <span>{t("cameras.toolbar.createCamera")}</span>
              </Button>
            </div>
          </div>
        ) : filteredCameras.length === 1 ? (
          /* KHẮC PHỤC KHOẢNG TRỐNG: KHI CÓ 1 CAMERA -> HIỂN THỊ COMMAND CENTER SPOTLIGHT */
          <CameraSpotlight

            camera={filteredCameras[0]}

            onViewLive={handleViewLive}

            onPing={handleOpenPing}

            onConfigureRoi={handleOpenRoi}

            onEdit={handleOpenEdit}

            onDelete={handleOpenDelete}

            onSnapshot={handleSnapshot}

            onCreateCamera={handleOpenCreate}

          />
        ) : (
          /* KHI CÓ 2 HOẶC NHIỀU CAMERA -> GRID ĐỐI XỨNG CÂN ĐỐI */
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCameras.map((cam) => (
              <CameraCard

                key={cam.id}

                camera={cam}

                onViewLive={handleViewLive}

                onPing={handleOpenPing}

                onConfigureRoi={handleOpenRoi}

                onEdit={handleOpenEdit}

                onDelete={handleOpenDelete}

                onSnapshot={handleSnapshot}

              />
            ))}

            {/* Thẻ Mở rộng Camera khi danh sách có 2 camera để lấp đầy hàng 3 */}
            {filteredCameras.length === 2 && (
              <div
                onClick={handleOpenCreate}
                className="group flex flex-col justify-center items-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.03] p-8 text-center transition-all duration-300 hover:border-primary hover:bg-primary/[0.06] hover:-translate-y-1 hover:shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] cursor-pointer min-h-[300px]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-nm-sm group-hover:scale-110 transition-transform mb-3">
                  <Plus className="h-6 w-6" />
                </span>
                <h5 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {isVietnamese ? "Thêm Camera Giám Sát Mới" : "Add New Camera Stream"}
                </h5>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  {isVietnamese
                    ? "Kết nối thêm camera để mở rộng mạng lưới giám sát AI PPE trên toàn công trường."
                    : "Connect additional RTSP feeds to expand safety monitoring coverage."}
                </p>
              </div>
            )}
          </div>
        )
      )}

      {/* 5. Modals & Drawers */}
      {viewMode !== "table" ? <Table
        data={[]}
        columns={[]}
        manualPagination
        rowCount={data?.meta?.total ?? cameras.length}
        pageCount={data?.meta?.totalPages ?? 1}
        pagination={tableState.pagination}
        onPaginationChange={tableState.onPaginationChange}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={() => {
          void refetch();
        }}
      ><TablePagination /></Table> : null}

      <CreateCameraModal

        open={createModalOpen}

        onOpenChange={setCreateModalOpen}

        onSubmit={handleCreateSubmit}

        loading={createCamera.isPending}

      />

      <EditCameraModal

        open={editModalOpen}

        onOpenChange={setEditModalOpen}

        camera={selectedCamera}

        onSubmit={handleEditSubmit}

        loading={updateCamera.isPending}

      />

      <DeleteCameraDialog

        open={deleteDialogOpen}

        onOpenChange={setDeleteDialogOpen}

        camera={selectedCamera}

        onConfirm={handleDeleteConfirm}

        loading={deleteCamera.isPending}

      />

      <CameraRoiDrawer
        open={roiDrawerOpen}
        onOpenChange={setRoiDrawerOpen}
        camera={selectedCamera}
      />

      <CameraHealthDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
        camera={selectedCamera}
      />
    </div>
  );
}
