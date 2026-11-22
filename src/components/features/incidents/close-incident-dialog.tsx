"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) {
      setCloseNote("");
    }
  }, [open, incident?.id]);

  const handleConfirm = async () => {
    if (!incident) return;
    try {
      await onConfirm(incident.id, {
        closeNote: closeNote.trim() || undefined,
      });
      setCloseNote("");
      onOpenChange(false);
    } catch {
      // Lỗi đã được hiển thị qua mutation toast; giữ dialog mở để người dùng không mất ghi chú
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      preventClose={loading}
      icon={<Archive className="h-5 w-5 text-primary" />}
      title={t("incidents.modals.closeTitle")}
      description={
        incident
          ? (isVietnamese
              ? `Bạn có chắc chắn muốn nghiệm thu và đóng hồ sơ sự cố #${incident.id.slice(0, 8)}? Sau khi đóng, hồ sơ sẽ được lưu trữ và không thể chỉnh sửa trạng thái.`
              : `Are you sure you want to review and close incident record #${incident.id.slice(0, 8)}? Once closed, the record will be archived and its status cannot be modified.`)
          : undefined
      }
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
            variant="primary"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <span>{t("incidents.modals.closeConfirm")}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-foreground sm:text-sm">
          {t("incidents.modals.closeNote")}
        </label>
        <textarea
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
          rows={3}
          placeholder={
            isVietnamese
              ? "Ghi chú nghiệm thu, đánh giá kết quả xử lý..."
              : "Closing notes, resolution evaluation..."
          }
          className="w-full resize-none rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </Dialog>
  );
}
