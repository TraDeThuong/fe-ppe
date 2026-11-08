"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Cctv,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Cpu,
  Key,
  Lock,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Square,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto, ResourceCategory } from "@/types";
import { RESOURCE_CATEGORY_ORDER, getPermissionCategory } from "@/types";

export interface PermissionMatrixDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDto | null;
  allPermissions: PermissionDto[];
  onSave: (roleId: string, permissionIds: string[]) => Promise<void>;
  loading?: boolean;
}

const CATEGORY_ICONS: Record<ResourceCategory, typeof Shield> = {
  INCIDENTS_SAFETY: ShieldAlert,
  SITES_CAMERAS: Cctv,
  ANALYTICS_AI: Cpu,
  USER_MANAGEMENT: Users,
  RBAC_SECURITY: ShieldCheck,
  NOTIFICATIONS: Bell,
  WEBHOOK: Webhook,
  SYSTEM_OPS: Settings2,
};

export function PermissionMatrixDrawer({
  open,
  onOpenChange,
  role,
  allPermissions,
  onSave,
  loading = false,
}: PermissionMatrixDrawerProps) {
  const { t, locale } = useLocale();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | ResourceCategory>("ALL");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ResourceCategory>>(
    new Set(),
  );

  const isAdminRole = role?.name?.toUpperCase() === "ADMIN";

  // Core permissions that cannot be removed from ADMIN to prevent accidental lockout
  const lockedPermissionNames = useMemo(
    () =>
      new Set([
        "ROLE_READ",
        "ROLE_UPDATE",
        "ROLE_PERMISSION_ASSIGN",
        "USER_ROLE_ASSIGN",
        "SYSTEM_CONFIG_MANAGE",
        "MAINTENANCE_MANAGE",
      ]),
    [],
  );

  useEffect(() => {
    if (role && role.permissions) {
      const ids = new Set(role.permissions.map((p) => p.id));
      setSelectedIds(ids);
    }
    setSearchQuery("");
    setActiveCategory("ALL");
    setCollapsedCategories(new Set());
  }, [role, open]);

  // Group all permissions by 8 categories (unfiltered for badge counts)
  const allGroupedPermissions = useMemo(() => {
    const groups = Object.fromEntries(
      RESOURCE_CATEGORY_ORDER.map((cat) => [cat, [] as PermissionDto[]]),
    ) as Record<ResourceCategory, PermissionDto[]>;

    allPermissions.forEach((p) => {
      const cat = getPermissionCategory(p);
      const target = groups[cat] ?? groups.SYSTEM_OPS;
      target.push(p);
    });

    return groups;
  }, [allPermissions]);

  // Filtered permissions by search query
  const filteredGroupedPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groups = Object.fromEntries(
      RESOURCE_CATEGORY_ORDER.map((cat) => [cat, [] as PermissionDto[]]),
    ) as Record<ResourceCategory, PermissionDto[]>;

    RESOURCE_CATEGORY_ORDER.forEach((cat) => {
      const perms = allGroupedPermissions[cat] ?? [];
      groups[cat] = perms.filter((p) => {
        if (!query) return true;
        const resKey = `rbac.resource.${p.resource}`;
        const resLabel = t(resKey) !== resKey ? t(resKey).toLowerCase() : "";
        return (
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          String(p.resource).toLowerCase().includes(query) ||
          resLabel.includes(query)
        );
      });
    });

    return groups;
  }, [allGroupedPermissions, searchQuery, t]);

  const toggleCollapseCategory = (cat: ResourceCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleToggle = (perm: PermissionDto) => {
    if (isAdminRole && lockedPermissionNames.has(perm.name)) {
      return; // Protected by anti-lockout rule
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

  const handleSelectAllGroup = (perms: PermissionDto[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (select) {
          next.add(p.id);
        } else {
          if (!isAdminRole || !lockedPermissionNames.has(p.name)) {
            next.delete(p.id);
          }
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!role) return;
    await onSave(role.id, Array.from(selectedIds));
    onOpenChange(false);
  };

  const visibleCategories = useMemo(() => {
    if (activeCategory === "ALL") {
      return RESOURCE_CATEGORY_ORDER;
    }
    return [activeCategory];
  }, [activeCategory]);

  const totalMatchingPermissions = useMemo(() => {
    return visibleCategories.reduce(
      (acc, cat) => acc + (filteredGroupedPermissions[cat]?.length ?? 0),
      0,
    );
  }, [visibleCategories, filteredGroupedPermissions]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("roles.matrix.title", { role: role?.name || "" })}
      description={t("roles.matrix.description")}
      icon={<Key className="h-5 w-5 text-primary" />}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {t("roles.matrix.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <Shield className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("roles.matrix.saving") : t("roles.matrix.save")}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Anti-lockout warning banner if Admin */}
        {isAdminRole && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t("roles.matrix.antiLockout")}</span>
          </div>
        )}

        {/* Top Bar: Selected count + Select/Deselect All */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3">
          <span className="text-xs font-medium text-muted-foreground">
            {t("roles.matrix.selectedCount", {
              selected: selectedIds.size,
              total: allPermissions.length,
            })}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set(allPermissions.map((p) => p.id)))}
              className="text-xs h-7"
            >
              {t("roles.matrix.selectAll")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isAdminRole) {
                  const coreIds = allPermissions
                    .filter((p) => lockedPermissionNames.has(p.name))
                    .map((p) => p.id);
                  setSelectedIds(new Set(coreIds));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              className="text-xs h-7"
            >
              {t("roles.matrix.deselectAll")}
            </Button>
          </div>
        </div>

        {/* Search & 8-Group Quick Filter Toolbar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("roles.permissions.searchPlaceholder")}
              className="w-full rounded-xl border border-border/40 bg-background/60 pl-8.5 pr-8 py-2 text-xs text-foreground shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)] focus:border-primary focus:outline-none dark:border-black/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 8 Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold shrink-0 transition-all ${
                activeCategory === "ALL"
                  ? "border-primary/50 bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)]"
                  : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t("roles.guide.allCategories")}</span>
              <span className="font-mono text-[10px] opacity-80">
                ({selectedIds.size}/{allPermissions.length})
              </span>
            </button>

            {RESOURCE_CATEGORY_ORDER.map((cat) => {
              const allCatPerms = allGroupedPermissions[cat] ?? [];
              if (allCatPerms.length === 0) return null;
              const selectedInCat = allCatPerms.filter((p) => selectedIds.has(p.id)).length;
              const isActive = activeCategory === cat;
              const CategoryIcon = CATEGORY_ICONS[cat] || Shield;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(isActive ? "ALL" : cat)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold shrink-0 transition-all ${
                    isActive
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.06)]"
                      : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CategoryIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[160px]">{t(`rbac.category.${cat}`)}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({selectedInCat}/{allCatPerms.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permission Groups (8 Categories) */}
        {totalMatchingPermissions === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-background/40 p-8 text-center text-xs text-muted-foreground">
            {t("roles.guide.noPermsFound")}
          </div>
        ) : (
          <div className="space-y-3.5">
            {visibleCategories.map((cat) => {
              const perms = filteredGroupedPermissions[cat] ?? [];
              if (perms.length === 0) return null;

              const allCatPerms = allGroupedPermissions[cat] ?? perms;
              const selectedInGroup = allCatPerms.filter((p) => selectedIds.has(p.id)).length;
              const allSelected = perms.every((p) => selectedIds.has(p.id));
              const isCollapsed = collapsedCategories.has(cat) && !searchQuery.trim();
              const CategoryIcon = CATEGORY_ICONS[cat] || Shield;

              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-border/40 bg-surface p-3 sm:p-4 shadow-[2px_2px_6px_rgba(0,0,0,0.04)] dark:border-black/50 dark:bg-card/70"
                >
                  <div
                    className={`flex items-center justify-between gap-2 ${
                      !isCollapsed
                        ? "border-b border-border/30 pb-2.5 mb-3 dark:border-black/40"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCollapseCategory(cat)}
                      className="flex items-center gap-2 text-left min-w-0 group"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CategoryIcon className="h-3.5 w-3.5" />
                      </span>
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {t(`rbac.category.${cat}`)}
                      </h4>
                      <Badge
                        variant={selectedInGroup === allCatPerms.length ? "outline" : "secondary"}
                        size="sm"
                        className={`font-mono text-[10px] px-1.5 py-0 shrink-0 ${
                          selectedInGroup > 0 ? "text-primary border-primary/30" : ""
                        }`}
                      >
                        {selectedInGroup}/{allCatPerms.length}
                      </Badge>
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAllGroup(perms, !allSelected)}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline shrink-0"
                    >
                      {allSelected ? (
                        <>
                          <CheckSquare className="h-3.5 w-3.5" />{" "}
                          <span>{t("roles.matrix.deselectGroup")}</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3.5 w-3.5" />{" "}
                          <span>{t("roles.matrix.selectGroup")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {perms.map((perm) => {
                        const isChecked = selectedIds.has(perm.id);
                        const isLocked = isAdminRole && lockedPermissionNames.has(perm.name);
                        const resKey = `rbac.resource.${perm.resource}`;
                        const resLabel =
                          t(resKey) !== resKey ? t(resKey) : String(perm.resource);

                        return (
                          <div
                            key={perm.id}
                            onClick={() => handleToggle(perm)}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                              isChecked
                                ? "border-primary/40 bg-primary/5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)] dark:bg-primary/10"
                                : "border-border/30 bg-surface hover:bg-surface-elevated/40 dark:border-black/40 dark:bg-background/40 dark:hover:border-black"
                            } ${isLocked ? "opacity-75 cursor-not-allowed" : ""}`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition mt-0.5 ${
                                isChecked
                                  ? "border-primary bg-primary text-white"
                                  : "border-muted-foreground/40 bg-surface dark:bg-background/60"
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>

                            <div className="space-y-0.5 overflow-hidden flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-mono text-xs font-semibold text-foreground truncate">
                                  {perm.name}
                                </p>
                                {isLocked && (
                                  <Lock
                                    className="h-3 w-3 text-warning shrink-0"
                                    aria-label={
                                      locale === "en-US" ? "Locked permission" : "Quyền cố định"
                                    }
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {perm.description || `${perm.action} — ${resLabel}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
