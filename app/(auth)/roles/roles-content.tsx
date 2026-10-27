"use client";

import { useMemo, useState } from "react";
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

export default function RolesContent() {
  const { t } = useLocale();

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={ShieldCheck}
        title={t("roles.title")}
        description={t("roles.description")}
        badge="RBAC Security"
        badgeIcon={ShieldCheck}
      />

      {/* KPI Bento Summary */}
      <RoleKpiSummary
        roles={roles}
        totalPermissionsCount={permissions.length}
        loading={rolesLoading || permsLoading}
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
