"use client";

import { Edit2, Key, Lock, Shield, Trash2, Users } from "lucide-react";
import type { RoleDto } from "@/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface RoleTableProps {
  roles: RoleDto[];
  onConfigurePermissions: (role: RoleDto) => void;
  onEdit: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
  loading?: boolean;
}

export function RoleTable({
  roles,
  onConfigurePermissions,
  onEdit,
  onDelete,
  loading = false,
}: RoleTableProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-elevated/40" />
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-surface p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("roles.empty.title")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border/40 bg-surface-elevated/40 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3.5">{t("roles.table.roleName")}</th>
            <th className="px-5 py-3.5">{t("roles.table.description")}</th>
            <th className="px-5 py-3.5">{t("roles.table.permsCount")}</th>
            <th className="px-5 py-3.5">{t("roles.table.personnel")}</th>
            <th className="px-5 py-3.5">{t("roles.table.type")}</th>
            <th className="px-5 py-3.5 text-right">{t("roles.table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {roles.map((role) => (
            <tr
              key={role.id}
              className="transition-colors duration-150 hover:bg-surface-elevated/30"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-foreground text-xs">{role.name}</p>
                    <span className="font-mono text-[11px] text-primary">{role.name.toUpperCase()}</span>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-xs text-foreground/80 max-w-xs truncate">
                {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                  ? t(`roles.desc.${role.name}`)
                  : role.description || "—"}
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
                  <Key className="h-3 w-3 text-primary" />
                  {role.permissions?.length ?? 0}
                </span>
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground">
                  <Users className="h-3 w-3 text-primary" />
                  {role.userCount ?? 0}
                </span>
              </td>

              <td className="px-5 py-4">
                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
                    <Lock className="h-3 w-3 text-primary" />
                    {t("roles.badge.system")}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {t("roles.badge.custom")}
                  </span>
                )}
              </td>

              <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfigurePermissions(role)}
                    className="flex items-center gap-1 rounded-lg text-xs"
                  >
                    <Key className="h-3 w-3 text-primary" />
                    <span>{t("roles.actions.permissions")}</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => onEdit(role)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary"
                    aria-label={`${t("roles.actions.edit")} ${role.name}`}
                    title={`${t("roles.actions.edit")} ${role.name}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={() => onDelete(role)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-danger hover:text-danger"
                      aria-label={`${t("roles.actions.delete")} ${role.name}`}
                      title={`${t("roles.actions.delete")} ${role.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
