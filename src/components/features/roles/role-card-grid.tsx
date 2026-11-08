"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Edit2, Key, Lock, Shield, Trash2, Users } from "lucide-react";
import type { RoleDto } from "@/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface RoleCardGridProps {
  roles: RoleDto[];
  onConfigurePermissions: (role: RoleDto) => void;
  onEdit: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
  loading?: boolean;
}

export function RoleCardGrid({
  roles,
  onConfigurePermissions,
  onEdit,
  onDelete,
  loading = false,
}: RoleCardGridProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const isVietnamese = locale === "vi-VN";

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface-elevated/40" />
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => {
        const permCount = role.permissions?.length ?? 0;
        const userCount = role.userCount ?? 0;

        return (
          <div
            key={role.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/roles/${role.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/roles/${role.id}`);
              }
            }}
            className="group cursor-pointer flex flex-col justify-between rounded-xl sm:rounded-2xl border border-border/40 bg-surface p-3.5 sm:p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[8px_14px_24px_rgba(0,0,0,0.1),-6px_-6px_14px_rgba(255,255,255,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-black/60 dark:bg-card/90 dark:shadow-[5px_5px_14px_rgba(0,0,0,0.55)] dark:hover:border-primary/40 dark:hover:bg-card dark:hover:shadow-[0_20px_36px_rgba(0,0,0,0.9),8px_12px_24px_rgba(0,0,0,0.85)]"
          >
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-200 group-hover:scale-105 dark:bg-primary/15 dark:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {role.name}
                      </h4>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 -translate-y-0.5 translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0" />
                    </div>
                    <span className="font-mono text-[11px] sm:text-xs font-semibold text-primary">
                      {role.name.toUpperCase()}
                    </span>
                  </div>
                </div>

                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark)] shrink-0 dark:border-black/50 dark:bg-background/80">
                    <Lock className="h-3 w-3 text-primary" />
                    {t("roles.badge.system")}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground shrink-0 dark:border-black/40">
                    {t("roles.badge.custom")}
                  </span>
                )}
              </div>

              <p className="text-[11px] sm:text-xs text-foreground/80 line-clamp-2 min-h-0 sm:min-h-[32px]">
                {t(`roles.desc.${role.name}`) !== `roles.desc.${role.name}`
                  ? t(`roles.desc.${role.name}`)
                  : role.description || t("roles.detail.noDescription")}
              </p>

              {/* Stats Bar */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-surface-elevated/40 p-2 sm:p-2.5 text-[11px] sm:text-xs dark:border-black/50 dark:bg-background/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    <span>
                      <strong className="text-foreground">{permCount}</strong>{" "}
                      {t("roles.table.permsCount").toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>
                      <strong className="text-foreground">{userCount}</strong>{" "}
                      {t("roles.table.personnel").toLowerCase()}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-primary/80 group-hover:text-primary group-hover:underline">
                  {isVietnamese ? "Chi tiết →" : "Details →"}
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between border-t border-border/30 dark:border-black/40 pt-2.5 sm:pt-3.5 mt-2.5 sm:mt-4"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigurePermissions(role);
                }}
                className="flex items-center gap-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs h-7 sm:h-8 px-2.5 sm:px-3 dark:border-black/60 dark:hover:border-black"
              >
                <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                <span>{t("roles.actions.permissions")}</span>
              </Button>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(role);
                  }}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary dark:border-black/50 dark:hover:border-black dark:bg-background/40"
                  aria-label={`${t("roles.actions.edit")} ${role.name}`}
                  title={`${t("roles.actions.edit")} ${role.name}`}
                >
                  <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>

                {!role.isSystem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(role);
                    }}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-danger hover:text-danger dark:border-black/50 dark:hover:border-black dark:bg-background/40"
                    aria-label={`${t("roles.actions.delete")} ${role.name}`}
                    title={`${t("roles.actions.delete")} ${role.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
