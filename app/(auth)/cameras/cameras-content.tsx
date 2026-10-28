"use client";

import { useMemo, useState } from "react";
import { Camera, Cctv, Radio } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  CameraCard,
  CameraHealthDialog,
  CameraKpiSummary,
  CameraRoiDrawer,
  CameraTable,
  CameraToolbar,
  CameraVideoWall,
  CreateCameraModal,
  DeleteCameraDialog,
  EditCameraModal,
} from "@/components/features/cameras";
import {
  useCameras,
  useCreateCamera,
  useDeleteCamera,
  useUpdateCamera,
} from "@/hooks/cameras";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem, CreateCameraPayload, UpdateCameraPayload } from "@/types";

export default function CamerasContent() {
  const { t } = useLocale();

  // Filter & View State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table" | "wall">("grid");
  const [wallLayout, setWallLayout] = useState<"1x1" | "2x2" | "3x3">("2x2");

  // Fetch Cameras
  const { data, isLoading } = useCameras({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    siteId: siteFilter || undefined,
  });
  const cameras = data?.items || [];

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

  // Filtered cameras client fallback
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const matchSearch =
        !search.trim() ||
        cam.name.toLowerCase().includes(search.toLowerCase()) ||
        cam.code.toLowerCase().includes(search.toLowerCase()) ||
        (cam.location && cam.location.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = !statusFilter || cam.status === statusFilter;
      const matchSite = !siteFilter || cam.siteId === siteFilter;
      return matchSearch && matchStatus && matchSite;
    });
  }, [cameras, search, statusFilter, siteFilter]);

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
    toast.success(`Đã lưu ảnh snapshot từ ${camera.code} thành công.`);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Cctv}
        title={t("cameras.title")}
        description={t("cameras.description")}
        badge="Live Video Streams"
        badgeIcon={Radio}
      />

      {/* KPI Bento Summary */}
      <CameraKpiSummary
        cameras={cameras}
        loading={isLoading}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Toolbar & Controls */}
      <CameraToolbar
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
      />

      {/* Main View Area */}
      {viewMode === "wall" ? (
        <CameraVideoWall
          cameras={filteredCameras}
          layout={wallLayout}
          onSnapshot={handleSnapshot}
          onPing={handleOpenPing}
          onOpenRoi={handleOpenRoi}
        />
      ) : viewMode === "grid" ? (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-surface-elevated/40"
              />
            ))}
          </div>
        ) : filteredCameras.length === 0 ? (
          <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">{t("cameras.table.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        )
      ) : (
        <CameraTable
          cameras={filteredCameras}
          onViewLive={handleViewLive}
          onPing={handleOpenPing}
          onConfigureRoi={handleOpenRoi}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          loading={isLoading}
        />
      )}

      {/* Create Camera Modal */}
      <CreateCameraModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateSubmit}
        loading={createCamera.isPending}
      />

      {/* Edit Camera Modal */}
      <EditCameraModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        camera={selectedCamera}
        onSubmit={handleEditSubmit}
        loading={updateCamera.isPending}
      />

      {/* Delete Camera Dialog */}
      <DeleteCameraDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        camera={selectedCamera}
        onConfirm={handleDeleteConfirm}
        loading={deleteCamera.isPending}
      />

      {/* AI ROI Calibration Drawer */}
      <CameraRoiDrawer
        open={roiDrawerOpen}
        onOpenChange={setRoiDrawerOpen}
        camera={selectedCamera}
      />

      {/* Camera Health & Diagnostics Dialog */}
      <CameraHealthDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
        camera={selectedCamera}
      />
    </div>
  );
}
