"use client";

import { useState } from "react";
import { CheckCircle2, CheckSquare, Loader2, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, ReviewIncidentPayload } from "@/types";

export interface ReviewIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  onSubmit: (id: string, payload: ReviewIncidentPayload) => Promise<void>;
  loading?: boolean;
}

export function ReviewIncidentModal({
  open,
  onOpenChange,
  incident,
  onSubmit,
  loading = false,
}: ReviewIncidentModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [decision, setDecision] = useState<"CONFIRMED" | "DISMISSED">("CONFIRMED");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setError(null);

    if (decision === "DISMISSED" && !reason.trim()) {
      setError(
        isVietnamese
          ? "Vui lòng cung cấp lý do khi bác bỏ sự cố vi phạm."
          : "Please provide a reason when dismissing an incident."
      );
      return;
    }

    try {
      await onSubmit(incident.id, {
        decision,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã có lỗi xảy ra khi thẩm duyệt sự cố"
            : "An error occurred while reviewing the incident";
      setError(msg);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("incidents.modals.reviewTitle")}
      description={t("incidents.modals.reviewDesc")}
      icon={<CheckSquare className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>

          <Button
            form="review-incident-form"
            type="submit"
            variant={decision === "CONFIRMED" ? "primary" : "secondary"}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            <span>
              {decision === "CONFIRMED" ? "Xác nhận vi phạm" : "Bác bỏ sự cố"}
            </span>
          </Button>
        </div>
      }
    >
      <form id="review-incident-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Incident Summary */}
        <div className="rounded-xl border border-border/40 bg-surface/60 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="font-mono font-bold text-primary">
              #{incident?.id.slice(0, 8)}
            </span>
            <span className="mx-2 text-muted-foreground">•</span>
            <span className="font-semibold text-foreground">
              {incident?.violationType}
            </span>
          </div>
          <span className="font-mono text-muted-foreground">
            {incident?.cameraCode}
          </span>
        </div>

        {/* Decision Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDecision("CONFIRMED")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 transition text-xs font-bold ${
              decision === "CONFIRMED"
                ? "border-rose-500/50 bg-rose-500/10 text-rose-500 shadow-nm-inset"
                : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{isVietnamese ? "Xác nhận Vi phạm" : "Confirm Violation"}</span>
          </button>

          <button
            type="button"
            onClick={() => setDecision("DISMISSED")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 transition text-xs font-bold ${
              decision === "DISMISSED"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-nm-inset"
                : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <XCircle className="h-5 w-5" />
            <span>{isVietnamese ? "Bác bỏ (Báo động ảo)" : "Dismiss (False Alarm)"}</span>
          </button>
        </div>

        {/* Reason when dismissed */}
        {decision === "DISMISSED" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {isVietnamese ? "Lý do bác bỏ" : "Dismissal Reason"} <span className="text-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
              required
            >
              <option value="">
                {isVietnamese ? "-- Chọn nguyên nhân sai sót AI --" : "-- Select AI False Alarm Reason --"}
              </option>
              <option value="FALSE_POSITIVE_ANGLE">
                {isVietnamese ? "Góc quay bị khuất, bóng phản chiếu" : "Occluded angle, shadow reflection"}
              </option>
              <option value="AUTHORISED_EXEMPTION">
                {isVietnamese ? "Khu vực được miễn trừ đồ bảo hộ" : "Authorized PPE exemption area"}
              </option>
              <option value="LUNCH_BREAK_REST">
                {isVietnamese ? "Công nhân nghỉ giải lao / ăn trưa" : "Workers on lunch break / resting"}
              </option>
              <option value="IMAGE_BLURRY">
                {isVietnamese ? "Ảnh mờ, thiếu sáng nghiêm trọng" : "Blurry image, low lighting conditions"}
              </option>
            </select>
          </div>
        )}

        {/* Review Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {isVietnamese ? "Ghi chú thẩm duyệt (Notes)" : "Review Notes"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isVietnamese
                ? "Ghi chú thêm của Cán bộ An toàn..."
                : "Additional notes from Safety Officer..."
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-border/50 bg-background/50 px-3.5 py-2.5 text-xs shadow-nm-inset focus:border-primary focus:outline-none"
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
