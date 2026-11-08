"use client";

import { ConfirmDialog } from "@/components/ui/dialog";
import { useDeleteUser, useRestoreUser, useUpdateUser } from "@/hooks/users";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface ConfirmUserDeleteModalProps {
  open: boolean;
  onClose: () => void;
  user: UserResponseDto | null;
  mode?: "delete" | "restore" | "activate" | "deactivate";
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
  const updateMutation = useUpdateUser();

  const isSelf = Boolean(currentAdmin?.id && user?.id === currentAdmin.id);

  const handleConfirm = async () => {
    if (!user) return;

    if ((mode === "delete" || mode === "deactivate") && isSelf) {
      toast.error(
        isVietnamese
          ? "Anti-Lockout: Bạn không thể tự khóa hoặc xóa tài khoản của chính mình!"
          : "Anti-Lockout: You cannot lock or deactivate your own account!"
      );
      onClose();
      return;
    }

    try {
      if (mode === "activate" || mode === "deactivate") {
        await updateMutation.mutateAsync({ id: user.id, payload: { isActive: mode === "activate" } });
      } else if (mode === "restore") {
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

  if (isSelf && (mode === "delete" || mode === "deactivate")) {
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

  if (mode === "activate" || mode === "deactivate") return <ConfirmDialog
    confirmText={t("common.confirm")}
    cancelText={t("common.cancel")}
    open={open}
    onClose={onClose}
    onConfirm={handleConfirm}
    loading={updateMutation.isPending}
    variant={mode === "deactivate" ? "danger" : "default"}
    title={mode === "activate" ? (isVietnamese ? "Kích hoạt tài khoản" : "Activate account") : (isVietnamese ? "Vô hiệu hóa tài khoản" : "Deactivate account")}
    description={isVietnamese ? "Thay đổi quyền đăng nhập của tài khoản này." : "Change this account's sign-in availability."}
    itemName={user.email ?? undefined}
  />;

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

      title={isVietnamese ? "Xóa tài khoản" : "Delete account"}

      description={isVietnamese ? "Xóa mềm sẽ vô hiệu hóa tài khoản, thu hồi phiên đăng nhập và có thể ẩn danh email, số điện thoại." : "Soft deletion deactivates this account, revokes sessions and may anonymize its email and phone number."}

      confirmText={t("common.delete")}

      cancelText={isVietnamese ? "Hủy" : "Cancel"}

      itemName={user.email || user.fullName || ""}

    />
  );
}
