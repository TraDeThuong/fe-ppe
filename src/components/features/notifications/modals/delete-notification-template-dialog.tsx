"use client";

import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useDeleteNotificationTemplate } from "@/hooks/notifications/use-notification-templates";
import type { NotificationTemplateItemDto } from "@/types";

export interface DeleteNotificationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationTemplateItemDto | null;
  isSystemTemplate?: boolean;
  onSuccess?: () => void;
}

export function DeleteNotificationTemplateDialog({
  open,
  onOpenChange,
  template,
  isSystemTemplate = false,
  onSuccess,
}: DeleteNotificationTemplateDialogProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const deleteMutation = useDeleteNotificationTemplate({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  if (!template) return null;

  const handleDelete = () => {
    if (isSystemTemplate || deleteMutation.isPending) return;
    deleteMutation.mutate(template.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      preventClose={deleteMutation.isPending}
      title={
        isSystemTemplate
          ? isVietnamese
            ? "Mẫu Hệ Thống Được Bảo Vệ"
            : "Protected System Template"
          : isVietnamese
            ? "Xác Nhận Xóa Mẫu Thông Báo"
            : "Delete Notification Template"
      }
      description={
        isSystemTemplate
          ? isVietnamese
            ? "Mẫu thông báo mặc định của hệ thống không thể xóa."
            : "Built-in templates are protected and cannot be deleted."
          : isVietnamese
            ? "Thao tác này sẽ xóa vĩnh viễn mẫu và không thể hoàn tác."
            : "This action will permanently delete this template and cannot be undone."
      }
      icon={
        isSystemTemplate ? (
          <ShieldAlert className="h-5 w-5 text-amber-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-danger" />
        )
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
            className="w-full sm:w-auto"
          >
            {isSystemTemplate
              ? isVietnamese
                ? "Đã hiểu"
                : "Got it"
              : isVietnamese
                ? "Hủy bỏ"
                : "Cancel"}
          </Button>

          {!isSystemTemplate && (
            <Button
              type="button"
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>
                {deleteMutation.isPending
                  ? isVietnamese
                    ? "Đang xóa..."
                    : "Deleting..."
                  : isVietnamese
                    ? "Xác nhận xóa"
                    : "Delete"}
              </span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5 rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-all font-mono text-xs font-bold text-primary">
              {template.code}
            </span>
            <Badge
              variant={isSystemTemplate ? "outline" : "secondary"}
              size="sm"
              className="shrink-0"
            >
              {template.channel}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-foreground break-words [overflow-wrap:anywhere]">
            {template.name}
          </p>
        </div>

        {isSystemTemplate ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p className="min-w-0 flex-1 break-words">
              {isVietnamese
                ? "Đây là mẫu cốt lõi của nền tảng Smart PPE Monitoring. Bạn chỉ có thể sửa nội dung câu chữ hoặc tắt kích hoạt (INACTIVE), không thể xóa bỏ hoàn toàn."
                : "This is a core system template essential to Smart PPE operations. You can edit the text or disable it, but cannot delete it."}
            </p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground break-words">
            {isVietnamese
              ? "Bạn có chắc chắn muốn xóa mẫu thông báo tùy chỉnh này? Các dịch vụ hoặc webhook sử dụng mã mẫu này sẽ không thể gửi thông báo nữa."
              : "Are you sure you want to delete this custom template? Any dispatches referencing this template code will fail."}
          </p>
        )}
      </div>
    </Modal>
  );
}
