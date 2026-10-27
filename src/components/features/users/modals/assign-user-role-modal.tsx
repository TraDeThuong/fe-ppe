"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useRoles, useAssignUserRole } from "@/hooks/rbac";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface AssignUserRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
}

export function AssignUserRoleModal({ open, onOpenChange, user }: AssignUserRoleModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { user: currentAdmin } = useAuth();
  const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
  const assignRoleMutation = useAssignUserRole();

  const [selectedRoleId, setSelectedRoleId] = useState("");

  const isSelf = Boolean(currentAdmin?.id && user?.id === currentAdmin.id);

  useEffect(() => {
    if (user) {
      setSelectedRoleId(user.roleId || user.role?.id || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoleId) return;

    if (isSelf) {
      toast.error(
        isVietnamese
          ? "Anti-Lockout: Bạn không thể tự đổi vai trò của chính mình!"
          : "Anti-Lockout: You cannot change your own role!",
      );
      return;
    }

    try {
      await assignRoleMutation.mutateAsync({
        userId: user.id,
        payload: { roleId: selectedRoleId },
      });
      onOpenChange(false);
    } catch {
      // Handled by mutation toast
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isAssigningAdmin = selectedRole?.name === "ADMIN";

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? "Phân vai trò người dùng" : "Assign User Role"}
      description={
        isVietnamese
          ? `Cập nhật vai trò RBAC cho tài khoản: ${user?.fullName || user?.email || ""}`
          : `Update RBAC role for account: ${user?.fullName || user?.email || ""}`
      }
      icon={<Shield className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={assignRoleMutation.isPending}
          >
            {isVietnamese ? "Hủy" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="assign-role-form"
            variant="primary"
            disabled={
              assignRoleMutation.isPending ||
              isSelf ||
              !selectedRoleId ||
              selectedRoleId === user?.roleId
            }
          >
            {assignRoleMutation.isPending
              ? isVietnamese
                ? "Đang lưu..."
                : "Saving..."
              : isVietnamese
              ? "Lưu vai trò"
              : "Save Role"}
          </Button>
        </>
      }
    >
      <form id="assign-role-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
        {isSelf && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-foreground flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
            <div className="space-y-1">
              <span className="font-bold text-accent">
                {isVietnamese ? "Cảnh báo Anti-Lockout:" : "Anti-Lockout Warning:"}
              </span>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {isVietnamese
                  ? "Bạn đang xem tài khoản của chính mình. Để bảo đảm hệ thống luôn có người quản trị, tính năng đổi vai trò cho chính mình bị khóa an toàn."
                  : "You are viewing your own account. To ensure the system always has an administrator, self-role assignment is safely locked."}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {isVietnamese ? "Chọn vai trò mới trong hệ thống" : "Select a new role in the system"}
          </label>

          <div className="space-y-2">
            {roles.map((role) => {
              const isCurrent = role.id === user?.roleId;
              const isSelected = role.id === selectedRoleId;

              return (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] ring-1 ring-primary"
                      : "border-border/60 bg-background hover:bg-card"
                  } ${isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    name="roleSelection"
                    value={role.id}
                    checked={isSelected}
                    disabled={isSelf}
                    onChange={() => setSelectedRoleId(role.id)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs">{role.name}</span>
                      {isCurrent && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {isVietnamese ? "Hiện tại" : "Current"}
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {isAssigningAdmin && !isSelf && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-foreground flex items-start gap-2">
            <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="text-primary">{isVietnamese ? "Chú ý:" : "Notice:"}</strong>{" "}
              {isVietnamese
                ? "Vai trò ADMIN có toàn quyền quản trị cấu hình hệ thống, quản lý camera, quyền hạn và tài khoản người dùng khác."
                : "The ADMIN role has full administrative privileges over system configurations, camera streams, permissions, and user accounts."}
            </p>
          </div>
        )}
      </form>
    </SculptedModal>
  );
}
