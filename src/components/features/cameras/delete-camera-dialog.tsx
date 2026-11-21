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
  onConfirm: (id: string, name?: string, code?: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteCameraDialog({
  open,
  onOpenChange,
  camera,
  onConfirm,
  loading = false,
}: DeleteCameraDialogProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const handleConfirm = async () => {
    if (!camera) return;
    await onConfirm(camera.id, camera.name, camera.code);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("cameras.modals.deleteTitle")}
      description={t("cameras.modals.deletePrompt")}
      icon={<AlertTriangle className="h-5 w-5 text-danger" />}
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
            {t("common.cancel")}
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{isVietnamese ? "Xác nhận xóa" : "Confirm Delete"}</span>
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center">
        <p className="font-mono text-sm font-bold text-danger break-all">
          {camera?.code}
        </p>
        <p className="mt-1 text-xs font-semibold text-foreground break-words [overflow-wrap:anywhere]">
          {camera?.name}
        </p>
        {camera?.location && (
          <p className="mt-0.5 text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere]">
            {camera.location}
          </p>
        )}
      </div>
    </Modal>
  );
}
