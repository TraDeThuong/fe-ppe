"use client";

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

  const handleConfirm = async () => {
    if (!config) return;
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
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center">
          <p className="font-mono text-xs font-bold text-danger">
            {config?.key || ""}
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
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("system.modals.deleting") : t("system.modals.confirmDelete")}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
