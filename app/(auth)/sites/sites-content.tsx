"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, MapPin, ShieldAlert } from "lucide-react";
import { Table, TablePagination } from "@/components/ui/table";
import { mapTableSort } from "@/lib/table-utils";
import { useTableState } from "@/hooks/use-table-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
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
  type SiteStatKey,
} from "@/components/features/sites";
import {
  useCreateSite,
  useDeleteSite,
  useSites,
  useSitesCatalog,
  useUpdateSite,
  useArchiveSite,
} from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import type { CreateSitePayload, SiteItem, UpdateSitePayload } from "@/types";

const STAT_TO_URL: Record<SiteStatKey, string> = {
  totalSites: "total-sites",
  totalZones: "zones",
  restrictedAreas: "restricted",
  complianceRate: "compliance",
};

const URL_TO_STAT: Record<string, SiteStatKey> = {
  "total-sites": "totalSites",
  zones: "totalZones",
  restricted: "restrictedAreas",
  compliance: "complianceRate",
  totalSites: "totalSites",
  totalZones: "totalZones",
  restrictedAreas: "restrictedAreas",
  complianceRate: "complianceRate",
};

export default function SitesContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state synchronization for stats (matching /roles)
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: SiteStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Filters & View State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const tableState = useTableState([{ id: "createdAt", desc: true }], `${search}:${statusFilter}`);
  const apiSorting = mapTableSort(tableState.sorting, { name: "name", code: "code", createdAt: "createdAt", status: "status" }, { sortBy: "createdAt", order: "desc" });
  const debouncedSearch = useDebounce(search, 350);

  // Fetch Sites
  const { data, isLoading, isFetching, error, refetch } = useSites({
    page: tableState.pagination.pageIndex + 1,
    limit: tableState.pagination.pageSize,
    sortBy: apiSorting.sortBy,
    sortOrder: apiSorting.order,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,

  });
  const sites = data?.items || [];
  const { data: sitesCatalog = [], isLoading: catalogLoading } = useSitesCatalog();

  // Mutations
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();
  const archiveSite = useArchiveSite();

  // Modals & Drawers State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [zonesDrawerOpen, setZonesDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteItem | null>(null);

  const filteredSites = sites;

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
    const createdSite = await createSite.mutateAsync(payload);

    // Nếu người tạo là Admin, tự động đồng bộ gán quyền công trường cho các cán bộ được chọn
    const officerUserIds = (payload.contactOfficers || [])
      .map((o) => o.userId)
      .filter((id): id is string => Boolean(id));

    if (createdSite?.id && officerUserIds.length > 0 && currentUser?.role === "ADMIN") {
      try {
        await Promise.allSettled(
          officerUserIds.map(async (userId) => {
            const officerDetail = await userService.getUserById(userId);
            const currentSites = officerDetail.siteIds || [];
            if (!currentSites.includes(createdSite.id)) {
              await userService.assignUserSites(userId, [...currentSites, createdSite.id]);
            }
          })
        );
      } catch (err) {
        console.warn("Could not auto-assign site to selected officers:", err);
      }
    }
  };

  const handleEditSubmit = async (id: string, payload: UpdateSitePayload) => {
    await updateSite.mutateAsync({ id, payload });

    const officerUserIds = (payload.contactOfficers || [])
      .map((o) => o.userId)
      .filter((userId): userId is string => Boolean(userId));

    if (id && officerUserIds.length > 0 && currentUser?.role === "ADMIN") {
      try {
        await Promise.allSettled(
          officerUserIds.map(async (userId) => {
            const officerDetail = await userService.getUserById(userId);
            const currentSites = officerDetail.siteIds || [];
            if (!currentSites.includes(id)) {
              await userService.assignUserSites(userId, [...currentSites, id]);
            }
          })
        );
      } catch (err) {
        console.warn("Could not auto-assign site to selected officers:", err);
      }
    }
  };

  const handleDeleteConfirm = async (id: string, name?: string) => {
    await deleteSite.mutateAsync({ id, name });
  };

  const handleArchive = async (site: SiteItem) => {
    await archiveSite.mutateAsync({ id: site.id, name: site.name });
  };

  const toolbar = (<SiteToolbar

    search={search}

    onSearchChange={setSearch}

    statusFilter={statusFilter}

    onStatusFilterChange={setStatusFilter}

    viewMode={viewMode}

    onViewModeChange={setViewMode}

    onCreateSite={handleOpenCreate}

  />);

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
      <SiteKpiSummary

        sites={sitesCatalog}

        loading={catalogLoading}

        selectedStat={selectedStat}

        onSelectStat={handleSelectStat}

        onManageZones={handleManageZones}

        onSafetyConfig={handleSafetyConfig}

        onCreateSite={handleOpenCreate}

      />

      {/* Toolbar & Filters */}
      {viewMode !== "table" ? toolbar : null}

      {/* Tenancy Notice Banner for unassigned personnel */}
      {currentUser?.role !== "ADMIN" && !isLoading && sites.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              {isVietnamese
                ? "Tài khoản của bạn chưa được phân công phụ trách công trường nào"
                : "Your account has not been assigned to any sites yet"}
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {isVietnamese
                ? "Theo chính sách bảo mật phạm vi công trường (Site Tenancy Scoping), bạn chỉ xem được các công trường mà Quản trị viên (Admin) chỉ định. Vui lòng liên hệ Quản trị viên để được cấp quyền theo dõi công trường."
                : "Under site tenancy scoping policy, you can only view sites assigned by an Administrator. Please contact your Admin to assign your responsible sites."}
            </p>
          </div>
        </div>
      )}

      {/* Main View (Grid or Table) */}
      {viewMode === "grid" ? (
        <SiteCardGrid

          sites={filteredSites}

          onManageZones={handleManageZones}

          onSafetyConfig={handleSafetyConfig}

          onEdit={handleOpenEdit}

          onDelete={handleOpenDelete}

          onArchive={handleArchive}

          loading={isLoading}

        />
      ) : (
        <SiteTable

          sites={filteredSites}

          onManageZones={handleManageZones}

          onSafetyConfig={handleSafetyConfig}

          onEdit={handleOpenEdit}

          onDelete={handleOpenDelete}

          onArchive={handleArchive}

          loading={isLoading}

          tableState={{
            ...tableState,
            features: {
              sorting: true,
              globalFilter: false,
              rowSelection: false
            },
            manualPagination: true,
            manualSorting: true,
            manualFiltering: true,
            rowCount: data?.meta?.total ?? sites.length,
            pageCount: data?.meta?.totalPages ?? 1,
            fetching: isFetching,
            error,
            onRetry: () => {
              void refetch();
            },
            toolbar
          }}

        />
      )}

      {viewMode !== "table" ? <Table
        data={[]}
        columns={[]}
        manualPagination
        rowCount={data?.meta?.total ?? sites.length}
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
