"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SystemConfigItem } from "@/types";

export interface DeleteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SystemConfigItem | null;
  onConfirm: (key: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteConfigDialog({
  open,
  onOpenChange,
  config,
  onConfirm,
  loading = false,
}: DeleteConfigDialogProps) {
  const { t } = useLocale();
  const [confirmKey, setConfirmKey] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmKey("");
    }
  }, [open, config]);

  const targetKey = config?.key || "";
  const isMatch = confirmKey.trim() === targetKey;

  const handleConfirm = async () => {
    if (!config || !isMatch) return;
    await onConfirm(config.key);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("system.modals.deleteTitle")}
      description={t("system.modals.deletePrompt")}
      icon={<AlertTriangle className="h-5 w-5 text-danger" />}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Mã cấu hình sẽ bị xóa vĩnh viễn:</p>
          <p className="font-mono text-sm font-bold text-danger select-all">
            {targetKey}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/80 block">
            Vui lòng nhập lại chính xác mã <span className="font-mono font-bold text-primary">{targetKey}</span> để xác nhận xóa:
          </label>
          <input
            type="text"
            value={confirmKey}
            onChange={(e) => setConfirmKey(e.target.value)}
            placeholder={targetKey}
            className="w-full rounded-xl border border-border/50 bg-surface px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)]"
            disabled={loading}
          />
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
            variant="danger"
            onClick={handleConfirm}
            disabled={!isMatch || loading}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("system.modals.deleting") : t("system.modals.confirmDelete")}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
