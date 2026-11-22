"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, Loader2, ShieldAlert, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, ResolveIncidentPayload } from "@/types";

export interface ResolveIncidentSubmitPayload extends ResolveIncidentPayload {
  afterFixFile?: File | null;
  closeImmediately?: boolean;
  advance?: boolean;
}

export interface ResolveIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentItem | null;
  onSubmit: (id: string, payload: ResolveIncidentSubmitPayload) => Promise<void>;
  loading?: boolean;
  canClose?: boolean;
  groupMode?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ResolveIncidentModal({
  open,
  onOpenChange,
  incident,
  onSubmit,
  loading = false,
  canClose = false,
  groupMode = false,
  onDirtyChange,
}: ResolveIncidentModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [resolutionNote, setResolutionNote] = useState("");
  const [afterFixFile, setAfterFixFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [closeImmediately, setCloseImmediately] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = open && (!!resolutionNote.trim() || !!afterFixFile);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!afterFixFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(afterFixFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [afterFixFile]);

  useEffect(() => {
    if (!open) {
      setResolutionNote("");
      setError(null);
      setAfterFixFile(null);
      setCloseImmediately(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || loading) return;
    setError(null);

    if (resolutionNote.trim().length < 3) {
      setError(
        isVietnamese
          ? "Vui lòng nhập ghi chú biện pháp xử lý sự cố (tối thiểu 3 ký tự)."
          : "Please enter incident resolution notes (at least 3 characters).",
      );
      return;
    }

    try {
      await onSubmit(incident.id, {
        resolutionNote: resolutionNote.trim(),
        afterFixFile,
        closeImmediately: canClose ? closeImmediately : false,
        advance: groupMode && (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "next",
      });

      onOpenChange(false);
      setResolutionNote("");
      setAfterFixFile(null);
      setCloseImmediately(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Đã có lỗi xảy ra khi giải quyết sự cố"
            : "An error occurred while resolving incident";
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
          ? isVietnamese
            ? `Báo cáo kết quả khắc phục tại hiện trường cho sự cố #${incident.id.slice(0, 8)}`
            : `Report field remediation results for incident #${incident.id.slice(0, 8)}`
          : undefined
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            form="resolve-incident-form"
            type="submit"
            variant={groupMode ? "outline" : "primary"}
            disabled={loading}
            className={groupMode ? "gap-2" : "gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {groupMode ? (isVietnamese ? "Lưu báo cáo" : "Save report") : closeImmediately && canClose
              ? isVietnamese
                ? "Khắc phục & Đóng luôn"
                : "Resolve & Close"
              : isVietnamese
                ? "Gửi báo cáo khắc phục"
                : t("incidents.modals.resolveSubmit")}
          </Button>
          {groupMode && <Button form="resolve-incident-form" type="submit" value="next" variant="primary" disabled={loading}>
            {isVietnamese ? "Báo cáo & tiếp theo" : "Report & next"}
          </Button>}
        </div>
      }
    >
      <form id="resolve-incident-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {incident && (
          <div className="p-3 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm space-y-1">
            <div className="font-medium text-[var(--neu-text-primary)]">
              {incident.violationType} • {incident.cameraCode || incident.cameraName || incident.cameraId}
            </div>
            <div className="text-xs text-[var(--neu-text-secondary)]">
              {isVietnamese ? "Khu vực: " : "Area: "}
              {incident.siteName || "N/A"} •{" "}
              {isVietnamese ? "Thời điểm: " : "Detected at: "}
              {new Date(incident.detectedAt).toLocaleString(isVietnamese ? "vi-VN" : "en-US")}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--neu-text-primary)] flex items-center gap-1">
            {t("incidents.modals.resolutionNote")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            disabled={loading}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={3}
            placeholder={
              isVietnamese
                ? "Ví dụ: Đã nhắc nhở công nhân đội đủ mũ bảo hộ và mặc áo phản quang đúng quy định..."
                : "Example: Instructed worker to equip mandatory helmet and reflective vest..."
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--neu-inset)] border border-[var(--neu-border)] text-sm text-[var(--neu-text-primary)] placeholder-[var(--neu-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none"
            required
          />
        </div>

        {/* Ảnh đối chứng sau khắc phục (Tùy chọn) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {isVietnamese
                ? "Ảnh hiện trường sau khi khắc phục (tùy chọn)"
                : "After-remediation scene photo (optional)"}
            </span>
          </label>

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="After remediation preview"
                className="max-h-44 w-full object-contain"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setAfterFixFile(null)}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-danger hover:text-white transition"
                title={isVietnamese ? "Bỏ ảnh" : "Remove photo"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-xs text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600 transition">
              <Camera className="h-4 w-4" />
              <span>
                {isVietnamese
                  ? "Chọn hoặc chụp ảnh xác nhận đã khắc phục (JPG/PNG)"
                  : "Upload or take verification photo (JPG/PNG)"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setAfterFixFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {canClose && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={closeImmediately}
              onChange={(e) => setCloseImmediately(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded accent-emerald-600"
            />
            <span>
              {isVietnamese
                ? "Nghiệm thu và Đóng hồ sơ ngay sau khi lưu"
                : "Accept and Close incident record immediately"}
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}
