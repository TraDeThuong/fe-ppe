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
  const { t } = useLocale();

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
      title={t("system.dialogs.toggleTitle") || "Xác nhận chuyển đổi tính năng"}
      description={
        isTurningOff
          ? "Bạn có chắc chắn muốn TẮT tính năng này không? Việc tắt có thể ảnh hưởng đến trải nghiệm của người dùng hoặc quy trình giám sát."
          : "Bạn có chắc chắn muốn BẬT tính năng này để áp dụng tức thì cho toàn hệ thống không?"
      }
      icon={
        isTurningOff ? (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary" />
        )
      }
      size="sm"
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
                  BẬT TÍNH NĂNG
                </>
              ) : (
                <>
                  <X className="h-3 w-3" />
                  TẮT TÍNH NĂNG
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
            Cơ chế Hot-toggle có hiệu lực ngay lập tức mà không cần khởi động lại dịch vụ.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("system.modals.cancel")}
          </Button>

          <Button
            type="button"
            variant={isTurningOff ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Power className="h-4 w-4" />
            <span>
              {loading
                ? t("system.flags.toggling")
                : targetEnabled
                ? "Xác nhận Bật"
                : "Xác nhận Tắt"}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
