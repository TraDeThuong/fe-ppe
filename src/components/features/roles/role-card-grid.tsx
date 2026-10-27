"use client";

import { Edit2, Key, Lock, Shield, Trash2, Users } from "lucide-react";
import type { RoleDto } from "@/types";
import { Button } from "@/components/ui/button";

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
        <p className="text-sm text-muted-foreground">Không tìm thấy vai trò nào phù hợp.</p>
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
            className="flex flex-col justify-between rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] transition-all duration-200 hover:shadow-[6px_6px_14px_rgba(0,0,0,0.08),-6px_-6px_14px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {role.name}
                    </h4>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {role.name.toUpperCase()}
                    </span>
                  </div>
                </div>

                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                    <Lock className="h-3 w-3" />
                    Hệ thống
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-border/40 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Tùy chỉnh
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground/80 line-clamp-2 min-h-[32px]">
                {role.description || "Chưa có mô tả chi tiết quyền hạn cho vai trò này."}
              </p>

              {/* Stats Bar */}
              <div className="flex items-center gap-4 rounded-xl border border-border/30 bg-surface-elevated/40 p-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <span>
                    <strong className="text-foreground">{permCount}</strong> quyền
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-success" />
                  <span>
                    <strong className="text-foreground">{userCount}</strong> nhân sự
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-border/30 pt-3.5 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigurePermissions(role)}
                className="flex items-center gap-1.5 rounded-xl text-xs"
              >
                <Key className="h-3.5 w-3.5 text-primary" />
                <span>Phân quyền</span>
              </Button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEdit(role)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-primary hover:text-primary"
                  aria-label={`Edit ${role.name}`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                {!role.isSystem && (
                  <button
                    type="button"
                    onClick={() => onDelete(role)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition hover:border-danger hover:text-danger"
                    aria-label={`Delete ${role.name}`}
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
