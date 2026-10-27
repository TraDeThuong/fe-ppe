"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, ResolveIncidentPayload } from "@/types";

export interface ResolveIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  onSubmit: (id: string, payload: ResolveIncidentPayload) => Promise<void>;
  loading?: boolean;
}

export function ResolveIncidentModal({
  open,
  onOpenChange,
  incident,
  onSubmit,
  loading = false,
}: ResolveIncidentModalProps) {
  const { t } = useLocale();

  const [resolutionNote, setResolutionNote] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setError(null);

    if (!resolutionNote.trim()) {
      setError("Vui lòng nhập ghi chú biện pháp xử lý sự cố.");
      return;
    }

    try {
      await onSubmit(incident.id, {
        resolutionNote: resolutionNote.trim(),
        correctiveAction: correctiveAction.trim() || undefined,
      });

      onOpenChange(false);
      setResolutionNote("");
      setCorrectiveAction("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi giải quyết sự cố";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("incidents.modals.resolveTitle")}
      description={
        incident
          ? `Ghi nhận biện pháp khắc phục cho sự cố vi phạm #${incident.id.slice(0, 8)}`
          : undefined
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {incident && (
          <div className="p-3 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm space-y-1">
            <div className="font-medium text-[var(--neu-text-primary)]">
              {incident.violationType} • {incident.cameraName || incident.cameraId}
            </div>
            <div className="text-xs text-[var(--neu-text-secondary)]">
              Khu vực: {incident.siteName || "N/A"} • Thời điểm: {new Date(incident.detectedAt).toLocaleString("vi-VN")}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)] flex items-center gap-1">
            {t("incidents.modals.resolutionNote")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={3}
            placeholder="Mô tả chi tiết hành động khắc phục, xử phạt hoặc trang bị lại đồ bảo hộ..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)]">
            {t("incidents.modals.correctiveAction")}
          </label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            rows={3}
            placeholder="Biện pháp phòng ngừa lặp lại, khuyến nghị cải thiện an toàn lao động..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--neu-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {t("incidents.modals.resolveSubmit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
