"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  CreateSiteModal,
  DeleteSiteDialog,
  EditSiteModal,
  SiteCardGrid,
  SiteKpiSummary,
  SiteSafetyConfigModal,
  SiteTable,
  SiteToolbar,
  SiteZonesDrawer,
} from "@/components/features/sites";
import {
  useCreateSite,
  useDeleteSite,
  useSites,
  useUpdateSite,
} from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { CreateSitePayload, SiteItem, UpdateSitePayload } from "@/types";

export default function SitesContent() {
  const { t } = useLocale();

  // Filters & View State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Fetch Sites
  const { data, isLoading } = useSites({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });
  const sites = data?.items || [];

  // Mutations
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  // Modals & Drawers State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [zonesDrawerOpen, setZonesDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteItem | null>(null);

  // Filtered sites fallback
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchSearch =
        !search.trim() ||
        site.name.toLowerCase().includes(search.toLowerCase()) ||
        site.code.toLowerCase().includes(search.toLowerCase()) ||
        (site.address && site.address.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = !statusFilter || site.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sites, search, statusFilter]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (site: SiteItem) => {
    setSelectedSite(site);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (site: SiteItem) => {
    setSelectedSite(site);
    setDeleteDialogOpen(true);
  };

  const handleManageZones = (site: SiteItem) => {
    setSelectedSite(site);
    setZonesDrawerOpen(true);
  };

  const handleSafetyConfig = (site: SiteItem) => {
    setSelectedSite(site);
    setSafetyModalOpen(true);
  };

  const handleCreateSubmit = async (payload: CreateSitePayload) => {
    await createSite.mutateAsync(payload);
  };

  const handleEditSubmit = async (id: string, payload: UpdateSitePayload) => {
    await updateSite.mutateAsync({ id, payload });
  };

  const handleDeleteConfirm = async (id: string, name?: string) => {
    await deleteSite.mutateAsync({ id, name });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Building2}
        title={t("sites.title")}
        description={t("sites.description")}
        badge="Spatial Safety"
        badgeIcon={MapPin}
      />

      {/* KPI Bento Summary */}
      <SiteKpiSummary sites={sites} loading={isLoading} />

      {/* Toolbar & Filters */}
      <SiteToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateSite={handleOpenCreate}
      />

      {/* Main View (Grid or Table) */}
      {viewMode === "grid" ? (
        <SiteCardGrid
          sites={filteredSites}
          onManageZones={handleManageZones}
          onSafetyConfig={handleSafetyConfig}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          loading={isLoading}
        />
      ) : (
        <SiteTable
          sites={filteredSites}
          onManageZones={handleManageZones}
          onSafetyConfig={handleSafetyConfig}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          loading={isLoading}
        />
      )}

      {/* Create Site Modal */}
      <CreateSiteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateSubmit}
        loading={createSite.isPending}
      />

      {/* Edit Site Modal */}
      <EditSiteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        site={selectedSite}
        onSubmit={handleEditSubmit}
        loading={updateSite.isPending}
      />

      {/* Delete Site Dialog */}
      <DeleteSiteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        site={selectedSite}
        onConfirm={handleDeleteConfirm}
        loading={deleteSite.isPending}
      />

      {/* Safety Rules Config Modal */}
      <SiteSafetyConfigModal
        open={safetyModalOpen}
        onOpenChange={setSafetyModalOpen}
        site={selectedSite}
      />

      {/* Zones & Restricted Areas Drawer */}
      <SiteZonesDrawer
        open={zonesDrawerOpen}
        onOpenChange={setZonesDrawerOpen}
        site={selectedSite}
      />
    </div>
  );
}
