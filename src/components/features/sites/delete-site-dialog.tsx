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
            <span>{t("sites.modals.confirmDelete")}</span>
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-center">
        <p className="font-mono text-sm font-bold text-danger break-all">
          {site?.code}
        </p>
        <p className="mt-1 text-xs font-semibold text-foreground break-words [overflow-wrap:anywhere]">
          {site?.name}
        </p>
        {site?.address && (
          <p className="mt-0.5 text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere]">
            {site.address}
          </p>
        )}
      </div>
    </Modal>
  );
}
