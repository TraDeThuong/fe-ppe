"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  Key,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto, ResourceCategory, UserResponseDto } from "@/types";
import { RESOURCE_CATEGORY_MAP } from "@/types";

export type RoleStatKey = "totalRoles" | "systemRoles" | "totalPermissions" | "assignedUsers";

export interface RoleStatsDetailPanelProps {
  activeStat: RoleStatKey;
  roles: RoleDto[];
  permissions?: PermissionDto[];
  totalPermissionsCount: number;
  onClose: () => void;
  onConfigurePermissions?: (role: RoleDto) => void;
  onCreateRole?: () => void;
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateInput?: string | Date | null, loc: string = "vi-VN"): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString(loc, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function RoleStatsDetailPanel({
  activeStat,
  roles,
  permissions = [],
  totalPermissionsCount,
  onClose,
  onConfigurePermissions,
  onCreateRole,
}: RoleStatsDetailPanelProps) {
  const { t, locale } = useLocale();

  const systemRoles = useMemo(() => roles.filter((r) => r.isSystem), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.isSystem), [roles]);

  // Fetch users for the 2-column assigned users layout
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const allUsers: UserResponseDto[] = useMemo(() => usersData?.data ?? [], [usersData]);

  // State for selected role in the 2-column assignedUsers panel
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  useEffect(() => {
    if (roles.length > 0) {
      if (!selectedRoleId || !roles.some((r) => r.id === selectedRoleId)) {
        setSelectedRoleId(roles[0].id);
      }
    }
  }, [roles, selectedRoleId]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId],
  );

  // Filter users belonging to the currently selected role
  const selectedRoleUsers = useMemo(() => {
    if (!selectedRole) return [];
    return allUsers.filter((u) => {
      if (u.roleId && u.roleId === selectedRole.id) return true;
      if (u.role?.id && u.role.id === selectedRole.id) return true;
      if (u.role?.name && u.role.name.toUpperCase() === selectedRole.name.toUpperCase()) return true;
      return false;
    });
  }, [allUsers, selectedRole]);

  // Helper count of users per role
  const roleUsersCountMap = useMemo(() => {
    const map = new Map<string, number>();
    roles.forEach((r) => {
      const matched = allUsers.filter(
        (u) =>
          u.roleId === r.id ||
          u.role?.id === r.id ||
          u.role?.name?.toUpperCase() === r.name?.toUpperCase(),
      );
      map.set(r.id, Math.max(r.userCount || 0, matched.length));
    });
    return map;
  }, [roles, allUsers]);

  const totalAssignedUsers = useMemo(() => {
    let sum = 0;
    roleUsersCountMap.forEach((v) => {
      sum += v;
    });
    return sum;
  }, [roleUsersCountMap]);

  // Nhóm quyền hạn theo 4 nhóm danh mục lớn
  const groupedPermissions = useMemo(() => {
    const groups: Record<
      ResourceCategory,
      { category: ResourceCategory; title: string; perms: PermissionDto[]; resources: Set<string> }
    > = {
      MONITORING: {
        category: "MONITORING",
        title: t("rbac.category.MONITORING"),
        perms: [],
        resources: new Set(),
      },
      ANALYTICS: {
        category: "ANALYTICS",
        title: t("rbac.category.ANALYTICS"),
        perms: [],
        resources: new Set(),
      },
      IDENTITY: {
        category: "IDENTITY",
        title: t("rbac.category.IDENTITY"),
        perms: [],
        resources: new Set(),
      },
      SYSTEM: {
        category: "SYSTEM",
        title: t("rbac.category.SYSTEM"),
        perms: [],
        resources: new Set(),
      },
    };

    permissions.forEach((p) => {
      const cat = (RESOURCE_CATEGORY_MAP[p.resource as keyof typeof RESOURCE_CATEGORY_MAP] ||
        "SYSTEM") as ResourceCategory;
      if (groups[cat]) {
        groups[cat].perms.push(p);
        groups[cat].resources.add(String(p.resource));
      } else {
        groups.SYSTEM.perms.push(p);
        groups.SYSTEM.resources.add(String(p.resource));
      }
    });

    return groups;
  }, [permissions, t]);

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3 sm:p-4.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar - Tinh gọn cho Mobile */}
      <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "totalRoles" && <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "systemRoles" && <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "totalPermissions" && <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "assignedUsers" && <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "totalRoles" && t("roles.detail.totalRolesTitle")}
                {activeStat === "systemRoles" && t("roles.detail.systemRolesTitle")}
                {activeStat === "totalPermissions" && t("roles.detail.permissionsTitle")}
                {activeStat === "assignedUsers" && t("roles.detail.assignedUsersTitle")}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-foreground px-1.5 py-0">
                {activeStat === "totalRoles" && `${roles.length}`}
                {activeStat === "systemRoles" && `${systemRoles.length}`}
                {activeStat === "totalPermissions" && `${totalPermissionsCount}`}
                {activeStat === "assignedUsers" && `${totalAssignedUsers}`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "totalRoles" && t("roles.detail.totalRolesDesc")}
              {activeStat === "systemRoles" && t("roles.detail.systemRolesDesc")}
              {activeStat === "totalPermissions" && t("roles.detail.permissionsDesc")}
              {activeStat === "assignedUsers" && t("roles.detail.assignedUsersDesc")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "totalRoles" && onCreateRole && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateRole}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("roles.detail.createRole")}</span>
            </Button>
          )}

          {activeStat === "totalPermissions" && roles[0] && onConfigurePermissions && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onConfigurePermissions(roles[0])}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t("roles.detail.matrixBtn")}</span>
            </Button>
          )}

          {activeStat === "assignedUsers" && (
            <Link href="/users">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
              >
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t("roles.detail.usersManagerBtn")}</span>
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={t("roles.detail.closeAria")}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG SỐ VAI TRÒ ────────────────────────────────────────── */}
      {activeStat === "totalRoles" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>
              {t("roles.detail.systemCustomCount", {
                system: systemRoles.length,
                custom: customRoles.length,
              })}
            </span>
            <span className="text-[10px] italic">{t("roles.detail.clickToViewPerms")}</span>
          </div>

          {/* MOBILE VIEW: THẺ GỌN CHO ĐIỆN THOẠI (Không bị tràn bảng) */}
          <div className="block sm:hidden max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1.5 dark:border-black/50 dark:bg-card/70"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {role.isSystem ? (
                      <Lock className="h-3 w-3 text-primary shrink-0" />
                    ) : (
                      <Shield className="h-3 w-3 text-primary shrink-0" />
                    )}
                    <span className="font-mono text-xs font-bold text-foreground truncate">{role.name}</span>
                    <Badge variant={role.isSystem ? "outline" : "secondary"} size="sm" className="text-[9px] px-1 py-0 shrink-0">
                      {role.isSystem ? t("roles.badge.system") : t("roles.badge.custom")}
                    </Badge>
                  </div>

                  {onConfigurePermissions && (
                    <button
                      type="button"
                      onClick={() => onConfigurePermissions(role)}
                      className="text-[11px] font-semibold text-primary hover:underline shrink-0 flex items-center gap-0.5"
                    >
                      <Eye className="h-3 w-3" />
                      <span>{t("roles.detail.viewPerms")}</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                    ? t(`roles.desc.${role.name}`)
                    : role.description || t("roles.detail.noDescription")}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-1">
                  <span>{t("roles.detail.permsCount", { count: role.permissions?.length ?? 0 })}</span>
                  <span>{t("roles.detail.userCount", { count: roleUsersCountMap.get(role.id) ?? role.userCount ?? 0 })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: BẢNG TIÊU CHUẨN */}
          <div className="hidden sm:block max-h-[280px] overflow-y-auto rounded-xl border border-border/30 bg-background/50 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3.5">{t("roles.table.roleName")}</th>
                  <th className="py-2.5 px-3">{t("roles.table.type")}</th>
                  <th className="py-2.5 px-3">{t("roles.table.description")}</th>
                  <th className="py-2.5 px-3 text-center">{t("roles.table.permsCount")}</th>
                  <th className="py-2.5 px-3 text-center">{t("roles.table.personnel")}</th>
                  <th className="py-2.5 px-3 text-right">{t("roles.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="transition-colors hover:bg-muted/30 group"
                  >
                    <td className="py-2.5 px-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        {role.isSystem ? (
                          <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <span className="font-mono">{role.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {role.isSystem ? (
                        <Badge variant="outline" size="sm" shape="pill" className="text-[10px] text-foreground">
                          {t("roles.badge.system")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" size="sm" shape="pill" className="text-[10px]">
                          {t("roles.badge.custom")}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px] truncate text-muted-foreground">
                      {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                        ? t(`roles.desc.${role.name}`)
                        : role.description || t("roles.detail.noDescription")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {role.permissions?.length ?? 0} {t("roles.table.permsCount").toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {roleUsersCountMap.get(role.id) ?? role.userCount ?? 0} {t("roles.table.personnel").toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {onConfigurePermissions && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onConfigurePermissions(role)}
                          className="h-7 px-2.5 text-xs text-primary hover:text-primary gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("roles.detail.viewPerms")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 2. NỘI DUNG: VAI TRÒ HỆ THỐNG ─────────────────────────────────────── */}
      {activeStat === "systemRoles" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2 sm:gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-[260px] overflow-y-auto pr-0.5">
            {systemRoles.map((role) => (
              <div
                key={role.id}
                className="flex flex-col justify-between rounded-xl border border-border/40 bg-background/60 p-2.5 sm:p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                      <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                      {role.name}
                    </span>
                    <Badge variant="outline" size="sm" className="text-[9px] sm:text-[10px] text-primary border-primary/30 shrink-0">
                      {t("roles.detail.immutable")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                      ? t(`roles.desc.${role.name}`)
                      : role.description || t("roles.badge.systemHelp")}
                  </p>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-border/20 pt-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                  <span>{t("roles.detail.permsCount", { count: role.permissions?.length ?? 0 })}</span>
                  <span>{t("roles.detail.userCount", { count: roleUsersCountMap.get(role.id) ?? role.userCount ?? 0 })}</span>
                  {onConfigurePermissions && (
                    <button
                      type="button"
                      onClick={() => onConfigurePermissions(role)}
                      className="text-primary hover:underline font-semibold"
                    >
                      {t("roles.detail.viewPerms")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. NỘI DUNG: TỔNG SỐ QUYỀN HẠN ────────────────────────────────────── */}
      {activeStat === "totalPermissions" && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {(Object.keys(groupedPermissions) as ResourceCategory[]).map((catKey) => {
              const group = groupedPermissions[catKey];
              return (
                <div
                  key={catKey}
                  className="rounded-xl border border-border/40 bg-background/60 p-2.5 sm:p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <span className="text-[11px] sm:text-xs font-bold text-foreground truncate" title={group.title}>
                      {group.title}
                    </span>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] text-primary border-primary/30 shrink-0 px-1 py-0">
                      {group.perms.length}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    {t("roles.detail.resourceGroups", { count: group.resources.size })}
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
                    {Array.from(group.resources).map((res) => (
                      <span
                        key={res}
                        className="rounded bg-muted/60 px-1 py-0.5 text-[9px] font-mono text-muted-foreground truncate max-w-full"
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-border/30 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">{t("roles.detail.actions")}</span>
              <div className="flex flex-wrap gap-1">
                {["READ", "CREATE", "UPDATE", "DELETE", "ASSIGN"].map((act) => (
                  <Badge key={act} variant="secondary" size="sm" className="text-[9px] py-0 px-1 text-foreground">
                    {act}
                  </Badge>
                ))}
              </div>
            </div>
            <span className="text-[10px] hidden sm:inline">{t("roles.detail.leastPrivilege")}</span>
          </div>
        </div>
      )}

      {/* ── 4. NỘI DUNG: NGƯỜI DÙNG ĐÃ GÁN (TỐI ƯU MOBILE & 2 CỘT) ───────────── */}
      {activeStat === "assignedUsers" && (
        <div className="space-y-2.5">
          {/* MOBILE ROLE CHIPS (Cuộn ngang tiện lợi, KHÔNG chiếm chỗ) */}
          <div className="md:hidden overflow-x-auto pb-1 -mx-0.5 px-0.5">
            <div className="flex items-center gap-1.5 min-w-max">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const count = roleUsersCountMap.get(role.id) ?? role.userCount ?? 0;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-background text-primary border border-primary/40 shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
                        : "border border-border/30 bg-background/50 text-muted-foreground"
                    }`}
                  >
                    {role.isSystem ? <Lock className="h-3 w-3 shrink-0" /> : <Shield className="h-3 w-3 shrink-0" />}
                    <span className="font-mono">{role.name}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* CỘT TRÁI: DANH SÁCH CÁC VAI TRÒ (DESKTOP) */}
            <div className="hidden md:block md:col-span-4 lg:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("roles.detail.rolesList", { count: roles.length })}
                </span>
                <span className="text-[10px] text-muted-foreground">{t("roles.detail.selectRole")}</span>
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                {roles.map((role) => {
                  const isSelected = selectedRole?.id === role.id;
                  const count = roleUsersCountMap.get(role.id) ?? role.userCount ?? 0;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full text-left p-2 rounded-xl border transition-all duration-150 flex items-center justify-between gap-1.5 text-xs ${
                        isSelected
                          ? "!bg-background/90 !border-primary/50 text-primary font-bold shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:!border-primary/60 dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.7)]"
                          : "border-border/30 bg-background/50 hover:bg-muted/40 text-foreground dark:border-black/40 dark:hover:border-black dark:hover:bg-background/80"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {role.isSystem ? (
                          <Lock className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        ) : (
                          <Shield className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                        <span className="font-mono truncate">{role.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={isSelected ? "outline" : "secondary"}
                          size="sm"
                          className={`font-mono text-[9px] px-1.5 py-0 ${isSelected ? "border-primary/40 text-primary" : ""}`}
                        >
                          {count}
                        </Badge>
                        <ChevronRight className={`h-3 w-3 ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CỘT PHẢI: DANH SÁCH CÁC THÔNG TIN CỦA NGƯỜI ĐÓ */}
            <div className="col-span-12 md:col-span-8 lg:col-span-8 space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="hidden sm:inline">{t("roles.detail.rolePersonnel")}</span>
                  <span className="font-mono text-primary font-black uppercase">
                    {selectedRole?.name || "—"}
                  </span>
                  <Badge variant="outline" size="sm" className="font-mono text-[10px] text-primary border-primary/30 px-1 py-0">
                    {selectedRoleUsers.length} {t("roles.table.personnel").toLowerCase()}
                  </Badge>
                </span>

                <Link
                  href={`/users?role=${selectedRole?.id || ""}`}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <span>{t("roles.detail.viewAll")}</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </div>

              {/* Danh sách người dùng trong vai trò đã chọn */}
              <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
                {usersLoading ? (
                  <div className="rounded-xl border border-border/30 bg-background/50 p-4 text-center text-xs text-muted-foreground">
                    {t("roles.detail.loadingUsers")}
                  </div>
                ) : selectedRoleUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center text-xs text-muted-foreground space-y-2">
                    <User className="h-6 w-6 text-muted-foreground/40" />
                    <div>
                      <p className="font-semibold text-foreground text-xs">{t("roles.detail.noUsersInRole")}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t("roles.detail.noUsersHint")}
                      </p>
                    </div>
                    <Link href="/users">
                      <Button variant="outline" size="sm" className="h-6 text-[11px] text-primary gap-1 px-2.5">
                        <Users className="h-3 w-3" />
                        {t("roles.detail.assignNow")}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  selectedRoleUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-2 sm:p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar Initials */}
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary font-bold text-[11px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
                          {getInitials(user.fullName || user.email)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-foreground truncate">
                              {user.fullName || t("roles.detail.unnamed")}
                            </p>
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0 text-[9px] font-medium text-primary">
                                <span className="h-1 w-1 rounded-full bg-primary" /> {t("roles.detail.active")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0 text-[9px] font-medium text-muted-foreground">
                                {t("roles.detail.locked")}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate">
                            {user.email || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:block text-right text-[10px] text-muted-foreground">
                          <p className="font-mono">{user.phoneNumber || "—"}</p>
                          <p>{t("roles.detail.created", { date: formatDate(user.createdAt, locale) })}</p>
                        </div>

                        <Link href={`/users?search=${encodeURIComponent(user.email || user.fullName || "")}`}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] sm:text-xs text-primary hover:text-primary gap-0.5"
                          >
                            <Eye className="h-3 w-3" />
                            <span>{t("roles.detail.detailBtn")}</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
