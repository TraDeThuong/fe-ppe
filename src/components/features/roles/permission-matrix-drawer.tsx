"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckSquare, Key, Lock, Shield, Square } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { PermissionDto, RoleDto } from "@/types";
import { RESOURCE_CATEGORY_MAP, type ResourceCategory } from "@/types";

export interface PermissionMatrixDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleDto | null;
  allPermissions: PermissionDto[];
  onSave: (roleId: string, permissionIds: string[]) => Promise<void>;
  loading?: boolean;
}

export function PermissionMatrixDrawer({
  open,
  onOpenChange,
  role,
  allPermissions,
  onSave,
  loading = false,
}: PermissionMatrixDrawerProps) {
  const { t } = useLocale();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      ]),
    [],
  );

  useEffect(() => {
    if (role && role.permissions) {
      const ids = new Set(role.permissions.map((p) => p.id));
      setSelectedIds(ids);
    }
  }, [role]);

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<ResourceCategory, PermissionDto[]> = {
      MONITORING: [],
      ANALYTICS: [],
      IDENTITY: [],
      SYSTEM: [],
    };

    allPermissions.forEach((p) => {
      const cat = (RESOURCE_CATEGORY_MAP[p.resource as keyof typeof RESOURCE_CATEGORY_MAP] ||
        "SYSTEM") as ResourceCategory;
      if (groups[cat]) {
        groups[cat].push(p);
      } else {
        groups.SYSTEM.push(p);
      }
    });

    return groups;
  }, [allPermissions]);

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

  const categoryTitles: Record<ResourceCategory, string> = {
    MONITORING: t("rbac.category.MONITORING"),
    ANALYTICS: t("rbac.category.ANALYTICS"),
    IDENTITY: t("rbac.category.IDENTITY"),
    SYSTEM: t("rbac.category.SYSTEM"),
  };

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
      <div className="space-y-5">
        {/* Anti-lockout warning banner if Admin */}
        {isAdminRole && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{t("roles.matrix.antiLockout")}</span>
          </div>
        )}

        {/* Selected count badge */}
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <span className="text-xs text-muted-foreground">
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
                  // Keep locked ones
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

        {/* Permission Groups */}
        <div className="space-y-4">
          {(Object.keys(groupedPermissions) as ResourceCategory[]).map((cat) => {
            const perms = groupedPermissions[cat];
            if (perms.length === 0) return null;

            const allSelected = perms.every((p) => selectedIds.has(p.id));

            return (
              <div
                key={cat}
                className="rounded-2xl border border-border/40 bg-surface p-3 sm:p-4 shadow-[2px_2px_6px_rgba(0,0,0,0.04)] dark:border-black/50 dark:bg-card/70"
              >
                <div className="flex items-center justify-between border-b border-border/30 pb-2.5 mb-3 dark:border-black/40">
                  <h4 className="text-xs font-bold text-foreground">
                    {categoryTitles[cat]}
                  </h4>

                  <button
                    type="button"
                    onClick={() => handleSelectAllGroup(perms, !allSelected)}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    {allSelected ? (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" /> {t("roles.matrix.deselectGroup")}
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" /> {t("roles.matrix.selectGroup")}
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {perms.map((perm) => {
                    const isChecked = selectedIds.has(perm.id);
                    const isLocked = isAdminRole && lockedPermissionNames.has(perm.name);

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

                        <div className="space-y-0.5 overflow-hidden">
                          <p className="font-mono text-xs font-semibold text-foreground truncate">
                            {perm.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {perm.description || `${perm.action} on ${perm.resource}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
