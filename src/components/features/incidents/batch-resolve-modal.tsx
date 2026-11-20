"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Loader2, ShieldAlert, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";

export interface BatchResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidents: IncidentItem[];
  onSubmit: (payload: {
    resolutionNote: string;
    afterFixFile?: File | null;
    closeImmediately?: boolean;
  }) => Promise<void>;
  loading?: boolean;
  canClose?: boolean;
  groupMode?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  failures?: Array<{ id: string; message: string; stage?: "access" | "upload" | "resolve" | "verify" }>;
}

export function BatchResolveModal({
  open,
  onOpenChange,
  incidents,
  onSubmit,
  loading = false,
  canClose = false,
  groupMode = false,
  onDirtyChange,
  failures = [],
}: BatchResolveModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { getCameraCode } = useEntityLookup({ enabled: !groupMode });

  const [resolutionNote, setResolutionNote] = useState("");
  const [afterFixFile, setAfterFixFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [closeImmediately, setCloseImmediately] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = open && (!!resolutionNote.trim() || !!afterFixFile);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const cameraSummary = useMemo(() => {
    const labels = new Set<string>();
    for (const item of incidents) {
      labels.add(item.cameraCode || getCameraCode(item.cameraId) || item.cameraId.slice(0, 8));
    }
    return Array.from(labels).slice(0, 4).join(", ") + (labels.size > 4 ? ` (+${labels.size - 4})` : "");
  }, [incidents, getCameraCode]);

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
    if (loading || incidents.length === 0) return;
    if (!resolutionNote.trim()) {
      setError(
        isVietnamese
          ? "Vui lòng nhập nội dung báo cáo khắc phục."
          : "Please enter a remediation summary.",
      );
      return;
    }
    setError(null);
    try {
      await onSubmit({
        resolutionNote: resolutionNote.trim(),
        afterFixFile,
        closeImmediately: canClose ? closeImmediately : false,
      });
      setResolutionNote("");
      setAfterFixFile(null);
      setCloseImmediately(false);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể báo cáo khắc phục hàng loạt."
            : "Failed to batch resolve incidents.",
      );
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        isVietnamese
          ? `Báo cáo đã khắc phục (${incidents.length} sự cố)`
          : `Batch Report Remediation (${incidents.length} incidents)`
      }
      description={
        groupMode
          ? (isVietnamese ? "Cùng ghi chú và ảnh sẽ áp dụng cho tất cả hồ sơ đã chọn. Chỉ gửi tổng kết khi khắc phục hết nhóm." : "The same note and photo apply to every selected record. A summary is sent only when the entire group is remediated.")
          : isVietnamese
          ? "Gửi 1 báo cáo khắc phục chung cho các sự cố đã chọn và tự động báo tín hiệu nghiệm thu lên Quản lý."
          : "Submit one consolidated remediation report and notify the Safety Manager for acceptance."
      }
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
            form="batch-resolve-form"
            type="submit"
            variant="primary"
            disabled={loading || incidents.length === 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>
              {closeImmediately && canClose
                ? isVietnamese
                  ? `Khắc phục & Đóng (${incidents.length})`
                  : `Resolve & Close (${incidents.length})`
                : isVietnamese
                  ? `Gửi báo cáo (${incidents.length} sự cố)`
                  : `Submit Report (${incidents.length})`}
            </span>
          </Button>
        </div>
      }
    >
      <form id="batch-resolve-form" onSubmit={handleSubmit} className="space-y-4">
        {failures.length > 0 && <ul className="space-y-1 text-xs text-danger" aria-label={isVietnamese ? "Hồ sơ chưa xử lý được" : "Failed records"}>
          {failures.map((failure) => <li key={failure.id} title={failure.id}>#{failure.id.slice(0, 8)}…{failure.id.slice(-4)} · {failure.stage && ({
            access: isVietnamese ? "Quyền / trạng thái" : "Access / status",
            upload: isVietnamese ? "Tải ảnh" : "Photo upload",
            resolve: isVietnamese ? "Cập nhật" : "Update",
            verify: isVietnamese ? "Xác minh" : "Verification",
          }[failure.stage])}: {failure.message}</li>)}
        </ul>}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
          {isVietnamese ? "Camera áp dụng: " : "Cameras: "}
          <strong className="text-foreground">{cameraSummary || "—"}</strong>
        </div>

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
                ? "Ví dụ: Đã kiểm tra hiện trường khu vực camera, toàn bộ công nhân đã trang bị đủ mũ và áo phản quang..."
                : "Example: Verified area on site; all workers are now wearing full PPE..."
            }
            className="w-full resize-none rounded-xl border border-[var(--neu-border)] bg-[var(--neu-inset)] px-3.5 py-2.5 text-sm text-[var(--neu-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {isVietnamese
                ? "Ảnh hiện trường sau khắc phục (tùy chọn — đính kèm chung)"
                : "After-remediation photo (optional — attached to selected)"}
            </span>
          </label>
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="After fix preview" className="max-h-40 w-full object-contain" />
              <button
                type="button"
                disabled={loading}
                onClick={() => setAfterFixFile(null)}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-danger hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3 text-xs text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-600 transition">
              <Camera className="h-4 w-4" />
              <span>
                {isVietnamese ? "Chọn ảnh xác nhận đã khắc phục" : "Select verification photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  setAfterFixFile(e.target.files?.[0] || null);
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
                ? "Nghiệm thu và Đóng toàn bộ hồ sơ ngay sau khi lưu"
                : "Accept and Close all selected records immediately"}
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}
