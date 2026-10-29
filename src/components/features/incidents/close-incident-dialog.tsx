"use client";

import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { CloseIncidentPayload, IncidentItem } from "@/types";

export interface CloseIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  onConfirm: (id: string, payload?: CloseIncidentPayload) => Promise<void>;
  loading?: boolean;
}

export function CloseIncidentDialog({
  open,
  onOpenChange,
  incident,
  onConfirm,
  loading = false,
}: CloseIncidentDialogProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [closeNote, setCloseNote] = useState("");

  const handleConfirm = async () => {
    if (!incident) return;
    await onConfirm(incident.id, {
      closeNote: closeNote.trim() || undefined,
    });
    setCloseNote("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("incidents.modals.closeTitle")}
      description={
        incident
          ? (isVietnamese
              ? `Bạn có chắc chắn muốn nghiệm thu và đóng hồ sơ sự cố #${incident.id.slice(0, 8)}? Sau khi đóng, hồ sơ sẽ được lưu trữ và không thể chỉnh sửa trạng thái.`
              : `Are you sure you want to review and close incident record #${incident.id.slice(0, 8)}? Once closed, the record will be archived and its status cannot be modified.`)
          : undefined
      }
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("incidents.modals.closeNote")}
          </label>
          <textarea
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            rows={2}
            placeholder={
              isVietnamese
                ? "Ghi chú nghiệm thu, đánh giá kết quả xử lý..."
                : "Closing notes, resolution evaluation..."
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 transition-all resize-none"
          />
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
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2 bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            {t("incidents.modals.closeConfirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
