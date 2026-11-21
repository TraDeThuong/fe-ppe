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
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )
      }
      preventClose={loading}
      size="sm"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {t("system.modals.cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
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
      <div className="space-y-3">
        <div className="space-y-2 rounded-xl border border-border/40 bg-surface-elevated/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-all font-mono text-xs font-bold text-foreground">
              {flag.key}
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                targetEnabled
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "bg-muted/60 text-muted-foreground border border-border/40"
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
            <p className="text-xs leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
              {flag.description}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-background/70 p-3 text-xs text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark)] dark:bg-black/30">
          <p className="flex items-start gap-2 font-medium leading-relaxed">
            <Power className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              {isVietnamese
                ? "Cơ chế Hot-toggle có hiệu lực ngay lập tức mà không cần khởi động lại dịch vụ."
                : "Hot-toggle mechanism takes effect immediately without restarting services."}
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
