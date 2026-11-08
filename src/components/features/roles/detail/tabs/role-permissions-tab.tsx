"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckSquare,
  Filter,
  Key,
  Layers,
  Lock,
  RotateCcw,
  Save,
  Search,
  Shield,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import {
  RESOURCE_CATEGORY_ORDER,
  getPermissionCategory,
  type PermissionDto,
  type ResourceCategory,
  type RoleDto,
} from "@/types";

export interface RolePermissionsTabProps {
  role: RoleDto;
  allPermissions: PermissionDto[];
  categoryFilter: ResourceCategory | "ALL";
  onCategoryFilterChange: (cat: ResourceCategory | "ALL") => void;
  onSavePermissions: (roleId: string, permissionIds: string[]) => Promise<void>;
  saving?: boolean;
}

const ADMIN_LOCKED_PERMISSIONS = new Set([
  "ROLE_READ",
  "ROLE_UPDATE",
  "ROLE_PERMISSION_ASSIGN",
  "USER_ROLE_ASSIGN",
  "SYSTEM_CONFIG_MANAGE",
  "MAINTENANCE_MANAGE",
]);

export function RolePermissionsTab({
  role,
  allPermissions,
  categoryFilter,
  onCategoryFilterChange,
  onSavePermissions,
  saving = false,
}: RolePermissionsTabProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const can = useCan();
  const canAssign = can("ROLE_PERMISSION_ASSIGN");
  const isAdminRole = role.name.toUpperCase() === "ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GRANTED" | "UNGRANTED">(
    "ALL",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Original permission IDs of the role
  const originalIds = useMemo(
    () => new Set((role.permissions || []).map((p) => p.id)),
    [role.permissions],
  );

  useEffect(() => {
    setSelectedIds(new Set((role.permissions || []).map((p) => p.id)));
  }, [role]);

  // Effective catalog: fallback to role.permissions if allPermissions hasn't loaded
  const effectivePermissions = useMemo(() => {
    if (allPermissions.length > 0) return allPermissions;
    return role.permissions || [];
  }, [allPermissions, role.permissions]);

  // Diff calculation
  const diffStats = useMemo(() => {
    let added = 0;
    let removed = 0;
    selectedIds.forEach((id) => {
      if (!originalIds.has(id)) added++;
    });
    originalIds.forEach((id) => {
      if (!selectedIds.has(id)) removed++;
    });
    return {
      added,
      removed,
      hasChanges: added > 0 || removed > 0,
    };
  }, [selectedIds, originalIds]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return effectivePermissions.filter((perm) => {
      const cat = getPermissionCategory(perm);

      if (categoryFilter !== "ALL" && cat !== categoryFilter) {
        return false;
      }

      const isGranted = selectedIds.has(perm.id);
      if (statusFilter === "GRANTED" && !isGranted) return false;
      if (statusFilter === "UNGRANTED" && isGranted) return false;

      if (q) {
        const resTitle = t(`rbac.resource.${perm.resource}`).toLowerCase();
        const matchesName = perm.name.toLowerCase().includes(q);
        const matchesDesc = (perm.description || "").toLowerCase().includes(q);
        const matchesRes =
          String(perm.resource).toLowerCase().includes(q) || resTitle.includes(q);
        if (!matchesName && !matchesDesc && !matchesRes) return false;
      }

      return true;
    });
  }, [effectivePermissions, categoryFilter, statusFilter, selectedIds, search, t]);

  // Group filtered permissions by Category -> Resource
  const groupedByCategoryAndResource = useMemo(() => {
    return RESOURCE_CATEGORY_ORDER
      .map((cat) => {
        const permsInCat = filteredPermissions.filter(
          (p) => getPermissionCategory(p) === cat,
        );

        // Group by resource inside category
        const resourceMap = new Map<string, PermissionDto[]>();
        permsInCat.forEach((p) => {
          const resKey = String(p.resource);
          const list = resourceMap.get(resKey) || [];
          list.push(p);
          resourceMap.set(resKey, list);
        });

        return {
          category: cat,
          title: t(`rbac.category.${cat}`),
          permissions: permsInCat,
          resources: Array.from(resourceMap.entries()).map(([resource, perms]) => ({
            resource,
            resourceLabel:
              t(`rbac.resource.${resource}`) !== `rbac.resource.${resource}`
                ? t(`rbac.resource.${resource}`)
                : resource,
            permissions: perms,
          })),
        };
      })
      .filter((g) => g.permissions.length > 0);
  }, [filteredPermissions, t]);

  const handleTogglePerm = (perm: PermissionDto) => {
    if (!canAssign) return;
    if (isAdminRole && ADMIN_LOCKED_PERMISSIONS.has(perm.name)) {
      toast.error(t("roles.permissions.antiLockoutHelp"));
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(perm.id)) {
        next.delete(perm.id);
      } else {
        next.add(perm.id);
      }
      return next;
    });
  };

  const handleToggleGroup = (perms: PermissionDto[], selectAll: boolean) => {
    if (!canAssign) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (selectAll) {
          next.add(p.id);
        } else if (!isAdminRole || !ADMIN_LOCKED_PERMISSIONS.has(p.name)) {
          next.delete(p.id);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error(t("roles.permissions.minRequiredError"));
      return;
    }
    await onSavePermissions(role.id, Array.from(selectedIds));
  };

  const handleReset = () => {
    setSelectedIds(new Set(originalIds));
  };

  const categoriesList: Array<{ key: ResourceCategory | "ALL"; label: string }> = [
    { key: "ALL", label: isVietnamese ? "Tất cả phân hệ" : "All Domains" },
    ...RESOURCE_CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: t(`rbac.category.${cat}`),
    })),
  ];

  return (
    <div className="space-y-4">
      {/* ── FLOATING UNSAVED CHANGES BAR ──────────────────────────────── */}
      {diffStats.hasChanges && canAssign && (
        <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-surface/95 p-3 sm:px-4 shadow-[0_10px_25px_rgba(0,0,0,0.12)] backdrop-blur-md dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">
                {isVietnamese
                  ? "Bạn có thay đổi phân quyền chưa lưu"
                  : "You have unsaved permission changes"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  {t("roles.permissions.selectedCount", {
                    count: selectedIds.size,
                    total: effectivePermissions.length,
                  })}
                </span>
                {diffStats.added > 0 && (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{diffStats.added} {isVietnamese ? "mới" : "added"}
                  </span>
                )}
                {diffStats.removed > 0 && (
                  <span className="font-mono font-bold text-danger">
                    -{diffStats.removed} {isVietnamese ? "gỡ bỏ" : "removed"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isVietnamese ? "Hoàn tác" : "Reset"}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 gap-1.5 text-xs font-bold"
            >
              <Save className="h-3.5 w-3.5" />
              <span>
                {saving
                  ? t("roles.permissions.saving")
                  : t("roles.permissions.save")}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH TOOLBAR ───────────────────────────────────── */}
      <div className="rounded-2xl border border-white/80 bg-surface p-3.5 sm:p-4 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("roles.permissions.searchPlaceholder")}
              className="h-9 w-full rounded-xl border border-border/40 bg-background/70 pl-9 pr-3 text-xs text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] focus:border-primary focus:outline-none dark:border-white/10 dark:bg-background/50"
            />
          </div>

          {/* Status Filter Segmented Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-xl border border-border/40 bg-background/60 p-1 shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              {(
                [
                  {
                    key: "ALL",
                    label: isVietnamese
                      ? `Tất cả (${effectivePermissions.length})`
                      : `All (${effectivePermissions.length})`,
                  },
                  {
                    key: "GRANTED",
                    label: isVietnamese
                      ? `Đã cấp (${selectedIds.size})`
                      : `Granted (${selectedIds.size})`,
                  },
                  {
                    key: "UNGRANTED",
                    label: isVietnamese
                      ? `Chưa cấp (${Math.max(0, effectivePermissions.length - selectedIds.size)})`
                      : `Not Granted (${Math.max(0, effectivePermissions.length - selectedIds.size)})`,
                  },
                ] as const
              ).map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    statusFilter === st.key
                      ? "bg-card text-primary shadow-sm border border-primary/25 font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {canAssign && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedIds(new Set(effectivePermissions.map((p) => p.id)))
                  }
                  className="h-8 text-xs px-2.5 rounded-xl"
                >
                  {t("roles.permissions.selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isAdminRole) {
                      const locked = effectivePermissions
                        .filter((p) => ADMIN_LOCKED_PERMISSIONS.has(p.name))
                        .map((p) => p.id);
                      setSelectedIds(new Set(locked));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="h-8 text-xs px-2.5 rounded-xl"
                >
                  {t("roles.permissions.deselectAll")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-1" />
          {categoriesList.map((cat) => {
            const isActive = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => onCategoryFilterChange(cat.key)}
                className={`shrink-0 rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 font-bold shadow-sm"
                    : "border border-border/30 bg-background/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PERMISSION DOMAINS & RESOURCE GROUPS ──────────────────────── */}
      {groupedByCategoryAndResource.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-surface p-12 text-center">
          <Key className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-foreground">
            {t("roles.guide.noPermsFound")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByCategoryAndResource.map((catGroup) => {
            const allInCatSelected = catGroup.permissions.every((p) =>
              selectedIds.has(p.id),
            );
            const grantedInCatCount = catGroup.permissions.filter((p) =>
              selectedIds.has(p.id),
            ).length;

            return (
              <section
                key={catGroup.category}
                className="rounded-2xl border border-white/80 bg-surface p-4 sm:p-5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:border-white/[0.06] dark:bg-card dark:shadow-[6px_6px_14px_rgba(0,0,0,0.45)] space-y-4"
              >
                {/* Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        {catGroup.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {catGroup.resources.length}{" "}
                        {isVietnamese ? "nhóm tài nguyên" : "resource groups"} •{" "}
                        <strong className="text-primary font-mono">
                          {grantedInCatCount}/{catGroup.permissions.length}
                        </strong>{" "}
                        {isVietnamese ? "quyền được bật" : "granted"}
                      </p>
                    </div>
                  </div>

                  {canAssign && (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleGroup(catGroup.permissions, !allInCatSelected)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
                    >
                      {allInCatSelected ? (
                        <>
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>
                            {isVietnamese ? "Bỏ chọn phân hệ" : "Deselect Domain"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3.5 w-3.5" />
                          <span>{t("roles.permissions.selectCategory")}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Resource Subgroups */}
                <div className="space-y-4">
                  {catGroup.resources.map((resGroup) => (
                    <div
                      key={resGroup.resource}
                      className="rounded-xl border border-border/30 bg-background/45 p-3 sm:p-3.5 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_rgba(255,255,255,0.75)] dark:bg-background/30 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {resGroup.resourceLabel}
                          </span>
                          <Badge
                            variant="outline"
                            size="sm"
                            className="font-mono text-[10px] px-1.5 py-0 text-muted-foreground"
                          >
                            {resGroup.resource}
                          </Badge>
                        </div>

                        <span className="font-mono text-[11px] font-semibold text-primary">
                          {
                            resGroup.permissions.filter((p) =>
                              selectedIds.has(p.id),
                            ).length
                          }
                          /{resGroup.permissions.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {resGroup.permissions.map((perm) => {
                          const isChecked = selectedIds.has(perm.id);
                          const isLocked =
                            isAdminRole && ADMIN_LOCKED_PERMISSIONS.has(perm.name);

                          return (
                            <div
                              key={perm.id}
                              role={canAssign ? "button" : undefined}
                              tabIndex={canAssign ? 0 : undefined}
                              onClick={() => handleTogglePerm(perm)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleTogglePerm(perm);
                                }
                              }}
                              className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-all ${
                                isChecked
                                  ? "border-primary/40 bg-surface shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_rgba(255,255,255,0.85)] dark:bg-card"
                                  : "border-border/30 bg-background/50 opacity-75 hover:opacity-100"
                              } ${
                                canAssign && !isLocked
                                  ? "cursor-pointer hover:border-primary/50"
                                  : isLocked
                                  ? "cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                  isChecked
                                    ? "border-primary bg-primary text-white"
                                    : "border-muted-foreground/40 bg-surface"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-mono text-xs font-bold text-foreground truncate">
                                    {perm.name}
                                  </p>
                                  {isLocked && (
                                    <span title={t("roles.permissions.antiLockoutHelp")}>
                                      <Lock className="h-3 w-3 shrink-0 text-warning" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                                  {perm.description ||
                                    `${perm.action} — ${resGroup.resourceLabel}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
