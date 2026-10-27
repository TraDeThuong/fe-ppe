"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto } from "@/types";

export interface ConfirmDeleteNotificationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  notification: NotificationItemDto | null;
  loading?: boolean;
}

export function ConfirmDeleteNotificationModal({
  open,
  onClose,
  onConfirm,
  notification,
  loading = false,
}: ConfirmDeleteNotificationModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="danger"
      loading={loading}
      title={isVietnamese ? "Xóa thông báo khỏi hộp thư" : "Delete Notification"}
      itemName={notification?.title}
      description={
        isVietnamese
          ? "Hành động này sẽ xóa vĩnh viễn thông báo này khỏi hòm thư cá nhân của bạn. Dữ liệu sự cố vi phạm an toàn lao động vẫn được lưu trữ nguyên vẹn trên hệ thống."
          : "This will remove the notification from your inbox. The safety violation incident record remains preserved on the platform."
      }
      confirmText={isVietnamese ? "Xóa thông báo" : "Delete"}
      cancelText={isVietnamese ? "Hủy bỏ" : "Cancel"}
    />
  );
}
