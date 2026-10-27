"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CameraItem } from "@/types";

export interface DeleteCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: CameraItem | null;
  onConfirm: (id: string, name?: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteCameraDialog({
  open,
  onOpenChange,
  camera,
  onConfirm,
  loading = false,
}: DeleteCameraDialogProps) {
  const { t } = useLocale();

  const handleConfirm = async () => {
    if (!camera) return;
    await onConfirm(camera.id, camera.name);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.deleteTitle")}
      description={t("cameras.modals.deletePrompt")}
      icon={<AlertTriangle className="h-5 w-5 text-danger" />}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center">
          <p className="font-mono text-sm font-bold text-danger">
            {camera?.code}
          </p>
          <p className="mt-1 text-xs text-foreground font-semibold">
            {camera?.name}
          </p>
          {camera?.location && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {camera.location}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Xác nhận xóa</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
