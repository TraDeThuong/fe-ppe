"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { SiteItem } from "@/types";

export interface DeleteSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteItem | null;
  onConfirm: (id: string, name?: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteSiteDialog({
  open,
  onOpenChange,
  site,
  onConfirm,
  loading = false,
}: DeleteSiteDialogProps) {
  const { t } = useLocale();

  const handleConfirm = async () => {
    if (!site) return;
    await onConfirm(site.id, site.name);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("sites.modals.deleteTitle")}
      description={t("sites.modals.deletePrompt")}
      icon={<AlertTriangle className="h-5 w-5 text-danger" />}
      size="sm"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-center">
          <p className="font-mono text-sm font-bold text-danger">
            {site?.code}
          </p>
          <p className="mt-1 text-xs text-foreground font-semibold">
            {site?.name}
          </p>
          {site?.address && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {site.address}
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
