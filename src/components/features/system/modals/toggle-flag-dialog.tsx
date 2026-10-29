"use client";

import { AlertTriangle, Check, Power, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SystemConfigItem } from "@/types";

export interface ToggleFlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: SystemConfigItem | null;
  targetEnabled: boolean;
  onConfirm: (flag: SystemConfigItem, enabled: boolean) => Promise<void>;
  loading?: boolean;
}

export function ToggleFlagDialog({
  open,
  onOpenChange,
  flag,
  targetEnabled,
  onConfirm,
  loading = false,
}: ToggleFlagDialogProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (!flag) return null;

  const handleConfirm = async () => {
    await onConfirm(flag, targetEnabled);
    onOpenChange(false);
  };

  const isTurningOff = !targetEnabled;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("system.dialogs.toggleTitle") || (isVietnamese ? "Xác nhận chuyển đổi tính năng" : "Confirm Feature Toggle")}
      description={
        isTurningOff
          ? (isVietnamese
              ? "Bạn có chắc chắn muốn TẮT tính năng này không? Việc tắt có thể ảnh hưởng đến trải nghiệm của người dùng hoặc quy trình giám sát."
              : "Are you sure you want to DISABLE this feature? Disabling may affect user experience or monitoring workflows.")
          : (isVietnamese
              ? "Bạn có chắc chắn muốn BẬT tính năng này để áp dụng tức thì cho toàn hệ thống không?"
              : "Are you sure you want to ENABLE this feature to take effect immediately system-wide?")
      }
      icon={
        isTurningOff ? (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )
      }
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {t("system.modals.cancel")}
          </Button>

          <Button
            type="button"
            variant={isTurningOff ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
          >
            <Power className="h-4 w-4" />
            <span>
              {loading
                ? t("system.flags.toggling")
                : targetEnabled
                ? (isVietnamese ? "Xác nhận Bật" : "Confirm Enable")
                : (isVietnamese ? "Xác nhận Tắt" : "Confirm Disable")}
            </span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/40 bg-surface-elevated/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-primary">
              {flag.key}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                targetEnabled
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-muted text-muted-foreground border border-border/30"
              }`}
            >
              {targetEnabled ? (
                <>
                  <Check className="h-3 w-3" />
                  {isVietnamese ? "BẬT TÍNH NĂNG" : "ENABLE FEATURE"}
                </>
              ) : (
                <>
                  <X className="h-3 w-3" />
                  {isVietnamese ? "TẮT TÍNH NĂNG" : "DISABLE FEATURE"}
                </>
              )}
            </span>
          </div>

          {flag.description && (
            <p className="text-xs text-muted-foreground">{flag.description}</p>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <p className="flex items-center gap-1.5 font-medium">
            <Power className="h-3.5 w-3.5 shrink-0" />
            {isVietnamese
              ? "Cơ chế Hot-toggle có hiệu lực ngay lập tức mà không cần khởi động lại dịch vụ."
              : "Hot-toggle mechanism takes effect immediately without restarting services."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
