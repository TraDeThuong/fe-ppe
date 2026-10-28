"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import {
  RoleKpiSummary,
  RoleToolbar,
  RoleCardGrid,
  RoleTable,
  PermissionMatrixDrawer,
  CreateRoleModal,
  EditRoleModal,
  DeleteRoleDialog,
  RolePermissionsGuide,
  type RoleStatKey,
} from "@/components/features/roles";
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useSyncRolePermissions,
} from "@/hooks/rbac";
import { useLocale } from "@/providers/locale-provider";
import type { CreateRolePayload, RoleDto, UpdateRolePayload } from "@/types";

const STAT_TO_URL: Record<RoleStatKey, string> = {
  totalRoles: "total-roles",
  systemRoles: "system-roles",
  totalPermissions: "permissions",
  assignedUsers: "assigned-users",
};

const URL_TO_STAT: Record<string, RoleStatKey> = {
  "total-roles": "totalRoles",
  "system-roles": "systemRoles",
  permissions: "totalPermissions",
  "assigned-users": "assignedUsers",
  totalRoles: "totalRoles",
  systemRoles: "systemRoles",
  totalPermissions: "totalPermissions",
  assignedUsers: "assignedUsers",
};

export default function RolesContent() {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state synchronization for stats
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: RoleStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Data fetching
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: permissions = [], isLoading: permsLoading } = usePermissions();

  // Mutations
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const syncPermissions = useSyncRolePermissions();

  // Filtering & View state
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState<"all" | "system" | "custom">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Dialog & Drawer state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matrixDrawerOpen, setMatrixDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(search.toLowerCase()));

      // System filter
      const matchesSystem =
        systemFilter === "all" ||
        (systemFilter === "system" && role.isSystem) ||
        (systemFilter === "custom" && !role.isSystem);

      return matchesSearch && matchesSystem;
    });
  }, [roles, search, systemFilter]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (role: RoleDto) => {
    setSelectedRole(role);
    setEditModalOpen(true);
  };

  const handleOpenDelete = (role: RoleDto) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const handleOpenMatrix = (role: RoleDto) => {
    setSelectedRole(role);
    setMatrixDrawerOpen(true);
  };

  const handleCreateSubmit = async (payload: CreateRolePayload) => {
    await createRole.mutateAsync(payload);
  };

  const handleEditSubmit = async (id: string, payload: UpdateRolePayload) => {
    await updateRole.mutateAsync({ id, payload });
  };

  const handleDeleteConfirm = async (id: string, name?: string) => {
    await deleteRole.mutateAsync({ id, name });
  };

  const handleSavePermissions = async (roleId: string, permissionIds: string[]) => {
    await syncPermissions.mutateAsync({ roleId, permissionIds });
  };

  // View mode from URL: guide vs list
  const viewParam = searchParams.get("view");
  const isGuideView = viewParam === "guide";
  const guideRoleParam = searchParams.get("role");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={ShieldCheck}
        title={isGuideView ? t("roles.guide.title") : t("roles.title")}
        description={
          isGuideView ? t("roles.guide.description") : t("roles.description")
        }
        badge={isGuideView ? t("roles.guide.badge") : t("roles.badge.security")}
        badgeIcon={ShieldCheck}
      />

      {isGuideView ? (
        /* Giao diện Cẩm nang tài liệu hướng dẫn (Không có thẻ stats) */
        <RolePermissionsGuide
          roles={roles}
          allPermissions={permissions}
          selectedRoleId={
            roles.find(
              (r) =>
                r.id === guideRoleParam ||
                r.name.toUpperCase() === guideRoleParam?.toUpperCase(),
            )?.id
          }
          onSelectRole={(id) => {
            const targetRole = roles.find((r) => r.id === id);
            const params = new URLSearchParams(searchParams.toString());
            if (targetRole) {
              params.set("role", targetRole.name);
            }
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          onBackToList={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("view");
            params.delete("role");
            const q = params.toString();
            router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
          }}
          onConfigurePermissions={handleOpenMatrix}
        />
      ) : (
        /* Giao diện Quản trị Vai trò chuẩn (Có thẻ stats + Toolbar + Danh sách vai trò) */
        <>
          {/* KPI Bento Summary */}
          <RoleKpiSummary
            roles={roles}
            permissions={permissions}
            totalPermissionsCount={permissions.length}
            loading={rolesLoading || permsLoading}
            selectedStat={selectedStat}
            onSelectStat={handleSelectStat}
            onConfigurePermissions={handleOpenMatrix}
            onCreateRole={handleOpenCreate}
          />

          {/* Filter & Action Toolbar */}
          <RoleToolbar
            search={search}
            onSearchChange={setSearch}
            systemFilter={systemFilter}
            onSystemFilterChange={setSystemFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreateRole={handleOpenCreate}
            onOpenGuide={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("view", "guide");
              params.delete("stat");
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
          />

          {/* Roles Display (Grid or Table) */}
          {viewMode === "grid" ? (
            <RoleCardGrid
              roles={filteredRoles}
              onConfigurePermissions={handleOpenMatrix}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              loading={rolesLoading}
            />
          ) : (
            <RoleTable
              roles={filteredRoles}
              onConfigurePermissions={handleOpenMatrix}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              loading={rolesLoading}
            />
          )}
        </>
      )}

      {/* Create Role Modal */}
      <CreateRoleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateSubmit}
        loading={createRole.isPending}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        role={selectedRole}
        onSubmit={handleEditSubmit}
        loading={updateRole.isPending}
      />

      {/* Delete Role Dialog */}
      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        role={selectedRole}
        onConfirm={handleDeleteConfirm}
        loading={deleteRole.isPending}
      />

      {/* Permission Matrix Drawer */}
      <PermissionMatrixDrawer
        open={matrixDrawerOpen}
        onOpenChange={setMatrixDrawerOpen}
        role={selectedRole}
        allPermissions={permissions}
        onSave={handleSavePermissions}
        loading={syncPermissions.isPending}
      />
    </div>
  );
}
