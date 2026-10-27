"use client";

import { ConfirmDialog } from "@/components/ui/dialog";
import { useDeleteUser, useRestoreUser } from "@/hooks/users";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface ConfirmUserDeleteModalProps {
  open: boolean;
  onClose: () => void;
  user: UserResponseDto | null;
  mode?: "delete" | "restore";
}

export function ConfirmUserDeleteModal({
  open,
  onClose,
  user,
  mode = "delete",
}: ConfirmUserDeleteModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { user: currentAdmin } = useAuth();
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();

  const isSelf = Boolean(currentAdmin?.id && user?.id === currentAdmin.id);

  const handleConfirm = async () => {
    if (!user) return;

    if (mode === "delete" && isSelf) {
      toast.error(
        isVietnamese
          ? "Anti-Lockout: Bạn không thể tự khóa hoặc xóa tài khoản của chính mình!"
          : "Anti-Lockout: You cannot lock or deactivate your own account!"
      );
      onClose();
      return;
    }

    try {
      if (mode === "restore") {
        await restoreMutation.mutateAsync(user.id);
      } else {
        await deleteMutation.mutateAsync(user.id);
      }
      onClose();
    } catch {
      // Handled by mutation toast
    }
  };

  if (!user) return null;

  if (isSelf && mode === "delete") {
    return (
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={onClose}
        variant="warning"
        title={
          isVietnamese
            ? "Thao tác bị chặn (Anti-Lockout)"
            : "Action Blocked (Anti-Lockout)"
        }
        description={
          isVietnamese
            ? "Bạn đang cố gắng khóa hoặc xóa tài khoản của chính mình. Vì lý do an toàn để bảo đảm hệ thống luôn có người quản trị, thao tác này không được phép thực hiện."
            : "You are attempting to deactivate or delete your own account. To ensure system stability and admin availability, this action is prohibited."
        }
        confirmText={isVietnamese ? "Đã hiểu" : "Understood"}
        cancelText={isVietnamese ? "Đóng" : "Close"}
        itemName={user.email || user.fullName || (isVietnamese ? "Tài khoản hiện tại" : "Current Account")}
      />
    );
  }

  if (mode === "restore") {
    return (
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={handleConfirm}
        variant="default"
        loading={restoreMutation.isPending}
        title={t("users.modal.restoreConfirmTitle")}
        description={t("users.modal.restoreConfirmBody", {
          name: user.fullName || user.email || "",
        })}
        confirmText={t("users.actions.restore")}
        cancelText={isVietnamese ? "Hủy" : "Cancel"}
        itemName={user.email || user.fullName || ""}
      />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      variant="danger"
      loading={deleteMutation.isPending}
      title={t("users.modal.deleteConfirmTitle")}
      description={t("users.modal.deleteConfirmBody", {
        name: user.fullName || user.email || "",
      })}
      confirmText={t("users.actions.lock")}
      cancelText={isVietnamese ? "Hủy" : "Cancel"}
      itemName={user.email || user.fullName || ""}
    />
  );
}
