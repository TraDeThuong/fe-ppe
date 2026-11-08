"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeleteRole,
  usePermissions,
  useRoleDetail,
  useRolesCatalog,
  useSyncRolePermissions,
  useUpdateRole,
} from "@/hooks/rbac";
import { useUsers } from "@/hooks/users";
import { useAuditLogs } from "@/hooks/audit";
import { useLocale } from "@/providers/locale-provider";
import type { ResourceCategory, UpdateRolePayload, UserResponseDto } from "@/types";
import { EditRoleModal } from "../edit-role-modal";
import { DeleteRoleDialog } from "../delete-role-dialog";
import { PermissionMatrixDrawer } from "../permission-matrix-drawer";
import { RoleDetailHero } from "./role-detail-hero";
import { RoleDetailKpiBar } from "./role-detail-kpi-bar";
import { RoleDetailTabs, type RoleDetailTabKey } from "./role-detail-tabs";
import { RolePermissionsTab } from "./tabs/role-permissions-tab";
import { RoleUsersTab } from "./tabs/role-users-tab";
import { RoleCapabilitiesTab } from "./tabs/role-capabilities-tab";
import { RoleComparisonTab } from "./tabs/role-comparison-tab";
import { RoleAuditTab } from "./tabs/role-audit-tab";
import { getRoleKnowledgeProfile } from "../role-guide-data";

export interface RoleDetailContentProps {
  roleId: string;
}

export function RoleDetailContent({ roleId }: RoleDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();

  const resolveTab = (tabStr: string | null): RoleDetailTabKey => {
    if (!tabStr) return "permissions";
    if (tabStr === "permissions" || tabStr === "perms") return "permissions";
    if (tabStr === "users" || tabStr === "personnel") return "users";
    if (tabStr === "capabilities" || tabStr === "scope") return "capabilities";
    if (tabStr === "comparison" || tabStr === "compare") return "comparison";
    if (tabStr === "audit" || tabStr === "audit-logs") return "audit-logs";
    return "permissions";
  };

  const [activeTab, setActiveTab] = useState<RoleDetailTabKey>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const tParam = searchParams.get("tab");
    if (tParam) {
      setActiveTab(resolveTab(tParam));
    }
  }, [searchParams]);

  // Modals & Drawers state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matrixDrawerOpen, setMatrixDrawerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | "ALL">(
    "ALL",
  );

  // Queries
  const { data: role, isLoading: roleLoading, error: roleError } = useRoleDetail(roleId);
  const { data: allRoles = [] } = useRolesCatalog();
  const { data: allPermissions = [] } = usePermissions();
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  // Audit count for KPI
  const { data: auditData } = useAuditLogs({
    targetType: "ROLE",
    targetId: roleId,
    limit: 1,
  });

  // Filter users belonging to this specific role
  const roleUsers = useMemo(() => {
    if (!role) return [];
    return allUsers.filter((u) => {
      if (u.roleId && u.roleId === role.id) return true;
      if (u.role?.id && u.role.id === role.id) return true;
      if (u.role?.name && u.role.name.toUpperCase() === role.name.toUpperCase())
        return true;
      return false;
    });
  }, [allUsers, role]);

  const activeUsersCount = useMemo(
    () =>
      roleUsers.filter(
        (u) =>
          u.isActive &&
          !u.deletedAt &&
          (!u.lockedUntil || new Date(u.lockedUntil) <= new Date()),
      ).length,
    [roleUsers],
  );

  const twoFactorUsersCount = useMemo(
    () => roleUsers.filter((u) => u.twoFactorEnabled).length,
    [roleUsers],
  );

  const profile = useMemo(() => {
    if (!role) return null;
    return getRoleKnowledgeProfile(role, locale);
  }, [role, locale]);

  const accessiblePagesCount = useMemo(() => {
    if (!profile) return 0;
    return profile.pageCapabilities.filter((p) => p.accessLevel !== "none").length;
  }, [profile]);

  const totalPagesCount = profile?.pageCapabilities.length || 12;

  // Mutations
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const syncPermissionsMutation = useSyncRolePermissions();

  const handleUpdateRole = async (id: string, payload: UpdateRolePayload) => {
    await updateRoleMutation.mutateAsync({ id, payload });
    setEditModalOpen(false);
  };

  const handleDeleteRole = async (id: string, name?: string) => {
    await deleteRoleMutation.mutateAsync({ id, name });
    setDeleteDialogOpen(false);
    router.push("/roles");
  };

  const handleSavePermissions = async (rId: string, permissionIds: string[]) => {
    await syncPermissionsMutation.mutateAsync({
      roleId: rId,
      permissionIds,
      roleName: role?.name,
    });
    setMatrixDrawerOpen(false);
  };

  const handleTabChange = (nextTab: RoleDetailTabKey) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`/roles/${roleId}?${params.toString()}`, { scroll: false });
  };

  const handleSelectCategoryFilter = (cat: ResourceCategory) => {
    setCategoryFilter(cat);
    handleTabChange("permissions");
  };

  // Skeleton Loading
  if (roleLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-surface-elevated/40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-elevated/40" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-surface-elevated/40" />
      </div>
    );
  }

  // Not Found State
  if (roleError || !role) {
    return (
      <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center max-w-lg mx-auto my-12 dark:border-black/60 dark:bg-card/90">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-bold text-foreground">
          {t("roles.detailPage.notFound")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("roles.detailPage.notFoundDesc")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/roles")}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("roles.detailPage.back")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Hero Overview Banner */}
      <RoleDetailHero
        role={role}
        allRoles={allRoles}
        allPermissions={allPermissions}
        activeTab={activeTab}
        onConfigurePermissions={() => setMatrixDrawerOpen(true)}
        onEdit={() => setEditModalOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        onViewUsers={() => handleTabChange("users")}
        onSelectCategoryFilter={handleSelectCategoryFilter}
      />

      {/* 2. Bento Quick KPI Console */}
      <RoleDetailKpiBar
        role={role}
        totalPermissionsCount={allPermissions.length || 54}
        assignedUsersCount={Math.max(roleUsers.length, role.userCount || 0)}
        activeUsersCount={activeUsersCount}
        twoFactorUsersCount={twoFactorUsersCount}
        accessiblePagesCount={accessiblePagesCount}
        totalPagesCount={totalPagesCount}
        auditLogsCount={auditData?.meta?.total ?? 0}
        onSelectTab={handleTabChange}
      />

      {/* 3. Neumorphic Segmented Navigation Tabs */}
      <RoleDetailTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        permissionsCount={role.permissions?.length ?? 0}
        usersCount={Math.max(roleUsers.length, role.userCount || 0)}
        capabilitiesCount={accessiblePagesCount}
        auditLogsCount={auditData?.meta?.total}
      />

      {/* 4. Active Tab Content Pane */}
      <div className="transition-all duration-200">
        {activeTab === "permissions" && (
          <RolePermissionsTab
            role={role}
            allPermissions={allPermissions}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onSavePermissions={handleSavePermissions}
            saving={syncPermissionsMutation.isPending}
          />
        )}

        {activeTab === "users" && (
          <RoleUsersTab
            role={role}
            roleUsers={roleUsers}
            allUsers={allUsers}
            loading={usersLoading}
          />
        )}

        {activeTab === "capabilities" && <RoleCapabilitiesTab role={role} />}

        {activeTab === "comparison" && (
          <RoleComparisonTab
            currentRole={role}
            allRoles={allRoles}
            allPermissions={allPermissions}
          />
        )}

        {activeTab === "audit-logs" && <RoleAuditTab role={role} />}
      </div>

      {/* Modals & Drawers */}
      <EditRoleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        role={role}
        onSubmit={handleUpdateRole}
        loading={updateRoleMutation.isPending}
      />

      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        role={role}
        onConfirm={handleDeleteRole}
        loading={deleteRoleMutation.isPending}
      />

      <PermissionMatrixDrawer
        open={matrixDrawerOpen}
        onOpenChange={setMatrixDrawerOpen}
        role={role}
        allPermissions={allPermissions}
        onSave={handleSavePermissions}
        loading={syncPermissionsMutation.isPending}
      />
    </div>
  );
}
