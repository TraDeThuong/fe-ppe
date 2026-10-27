"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckSquare, Key, Lock, Shield, Square } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
    MONITORING: "1. Giám sát An toàn Công trường (Cameras, Sites, Incidents)",
    ANALYTICS: "2. Báo cáo & Trí tuệ Nhân tạo (Analytics, AI Metrics, Models)",
    IDENTITY: "3. Định danh & Phân quyền (Users, Roles, Permissions)",
    SYSTEM: "4. Cấu hình & Hạ tầng Hệ thống (Configs, Logs, Notifications)",
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Ma trận Phân quyền: ${role?.name || ""}`}
      description="Cấp hoặc thu hồi chi tiết các quyền hạn truy cập API và chức năng cho vai trò này."
      icon={<Key className="h-5 w-5 text-primary" />}
      size="xl"
    >
      <div className="space-y-6">
        {/* Anti-lockout warning banner if Admin */}
        {isAdminRole && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              <strong>Cơ chế Anti-lockout kích hoạt:</strong> Các quyền quản trị cốt lõi của vai
              trò ADMIN được khóa cố định nhằm bảo vệ hệ thống không bị tự tước quyền điều hành.
            </span>
          </div>
        )}

        {/* Selected count badge */}
        <div className="flex items-center justify-between border-b border-border/30 pb-3">
          <span className="text-xs text-muted-foreground">
            Đã chọn: <strong className="text-primary font-bold">{selectedIds.size}</strong> /{" "}
            {allPermissions.length} quyền hạn
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set(allPermissions.map((p) => p.id)))}
              className="text-xs h-7"
            >
              Chọn tất cả
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
              Bỏ chọn tất cả
            </Button>
          </div>
        </div>

        {/* Permission Groups */}
        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
          {(Object.keys(groupedPermissions) as ResourceCategory[]).map((cat) => {
            const perms = groupedPermissions[cat];
            if (perms.length === 0) return null;

            const allSelected = perms.every((p) => selectedIds.has(p.id));

            return (
              <div
                key={cat}
                className="rounded-2xl border border-border/40 bg-surface p-4 shadow-[2px_2px_6px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between border-b border-border/30 pb-2.5 mb-3">
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
                        <CheckSquare className="h-3.5 w-3.5" /> Bỏ chọn nhóm
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" /> Chọn cả nhóm
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {perms.map((perm) => {
                    const isChecked = selectedIds.has(perm.id);
                    const isLocked = isAdminRole && lockedPermissionNames.has(perm.name);

                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleToggle(perm)}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                          isChecked
                            ? "border-primary/40 bg-primary/5 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]"
                            : "border-border/30 bg-surface hover:bg-surface-elevated/40"
                        } ${isLocked ? "opacity-75 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition mt-0.5 ${
                            isChecked
                              ? "border-primary bg-primary text-white"
                              : "border-muted-foreground/40 bg-surface"
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>

          <Button type="button" variant="primary" onClick={handleSave} disabled={loading}>
            <Shield className="mr-1.5 h-4 w-4" />
            <span>{loading ? "Đang lưu quyền..." : "Lưu Ma trận Quyền"}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
