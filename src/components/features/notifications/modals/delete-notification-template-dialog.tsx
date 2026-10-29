"use client";

import { AlertTriangle, Trash2, X, ShieldAlert } from "lucide-react";
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
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const deleteMutation = useDeleteNotificationTemplate({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  if (!open || !template) return null;

  const handleDelete = () => {
    if (isSystemTemplate) return;
    deleteMutation.mutate(template.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="relative my-auto w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-white/60 bg-background p-4 sm:p-6 shadow-[8px_8px_24px_var(--shadow-dark),-8px_-8px_24px_var(--shadow-light)] dark:border-white/10">
        {/* Top Rim Specular Highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"
        />

        {/* Modal Header */}
        <div className="flex items-start gap-3 border-b border-border/30 pb-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {isSystemTemplate
                ? isVietnamese
                  ? "Mẫu Hệ Thống Được Bảo Vệ"
                  : "Protected System Template"
                : isVietnamese
                  ? "Xác Nhận Xóa Mẫu Thông Báo"
                  : "Delete Notification Template"}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isSystemTemplate
                ? isVietnamese
                  ? "Mẫu thông báo mặc định của hệ thống không thể xóa"
                  : "Built-in templates are protected and cannot be deleted"
                : isVietnamese
                  ? "Thao tác này sẽ xóa vĩnh viễn mẫu và không thể hoàn tác"
                  : "This action cannot be undone"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="my-4 space-y-3">
          <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary">{template.code}</span>
              <Badge variant={isSystemTemplate ? "outline" : "secondary"} size="sm">
                {template.channel}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-foreground">{template.name}</p>
          </div>

          {isSystemTemplate ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <p>
                {isVietnamese
                  ? "Đây là mẫu cốt lõi của nền tảng Smart PPE Monitoring. Bạn chỉ có thể sửa nội dung câu chữ hoặc tắt kích hoạt (INACTIVE), không thể xóa bỏ hoàn toàn."
                  : "This is a core system template essential to Smart PPE operations. You can edit the text or disable it, but cannot delete it."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isVietnamese
                ? "Bạn có chắc chắn muốn xóa mẫu thông báo tùy chỉnh này? Các dịch vụ hoặc webhook sử dụng mã mẫu này sẽ không thể gửi thông báo nữa."
                : "Are you sure you want to delete this custom template? Any dispatches referencing this template code will fail."}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {isSystemTemplate ? (isVietnamese ? "Đã hiểu" : "Got it") : isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>

          {!isSystemTemplate && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="flex items-center gap-1.5 font-bold shadow-[2px_2px_6px_var(--shadow-dark)]"
            >
              <Trash2 className="size-3.5" />
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
      </div>
    </div>
  );
}
