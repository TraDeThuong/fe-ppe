"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { ExportAuditParams } from "@/types";

export interface ExportAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (params: ExportAuditParams) => Promise<void>;
  activeFilters?: Partial<ExportAuditParams>;
  loading?: boolean;
}

export function ExportAuditDialog({ open, ...props }: ExportAuditDialogProps) {
  return open ? <ExportAuditForm {...props} /> : null;
}

function ExportAuditForm({
  onOpenChange,
  onExport,
  activeFilters,
  loading = false,
}: Omit<ExportAuditDialogProps, "open">) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";

  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applyActiveFilters, setApplyActiveFilters] = useState(true);

  const hasToolbarFilters = Boolean(
    activeFilters?.action ||
      activeFilters?.targetType ||
      activeFilters?.status ||
      activeFilters?.search ||
      activeFilters?.startDate ||
      activeFilters?.endDate ||
      (activeFilters?.category && activeFilters.category !== "ALL"),
  );

  // Khoảng ngày thực sự được gửi đi: ưu tiên ngày nhập trong hộp thoại, ô nào trống
  // thì lấy từ bộ lọc đang áp dụng. Phải kiểm tra trên khoảng đã gộp này.
  const filterStart = applyActiveFilters ? activeFilters?.startDate : undefined;
  const filterEnd = applyActiveFilters ? activeFilters?.endDate : undefined;
  const effectiveStart = fromDate || filterStart || "";
  const effectiveEnd = toDate || filterEnd || "";
  // Cả hai cùng định dạng YYYY-MM-DD nên so sánh chuỗi đúng theo thứ tự thời gian.
  const isRangeInvalid = Boolean(effectiveStart && effectiveEnd && effectiveStart > effectiveEnd);
  const usesFilterDate = Boolean((!fromDate && filterStart) || (!toDate && filterEnd));
  const rangeErrorProps = isRangeInvalid
    ? { "aria-invalid": true, "aria-describedby": "audit-export-range-error" }
    : {};

  const formatDateLabel = (value: string) => {
    const [year, month, day] = value.split("-");
    return isVi ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRangeInvalid) return;
    try {
      await onExport({
        ...(applyActiveFilters ? activeFilters : {}),
        format,
        startDate: effectiveStart || undefined,
        endDate: effectiveEnd || undefined,
      });
    } catch {
      // Trang cha đã hiển thị toast lỗi; giữ hộp thoại mở để người dùng chỉnh và thử lại.
      return;
    }
    onOpenChange(false);
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title={t("audit.export.title")}
      description={t("audit.export.prompt")}
      icon={<Download className="h-5 w-5 text-primary" />}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-2">
            {t("audit.export.format")}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                format === "csv"
                  ? "border-primary bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                  : "border-border/40 bg-surface text-muted-foreground hover:bg-surface-elevated/40"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <div>
                <p className="text-xs font-bold text-foreground">CSV</p>
                <p className="text-[10px] text-muted-foreground">Excel / BI</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                format === "json"
                  ? "border-primary bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                  : "border-border/40 bg-surface text-muted-foreground hover:bg-surface-elevated/40"
              }`}
            >
              <FileJson className="h-4 w-4" />
              <div>
                <p className="text-xs font-bold text-foreground">JSON</p>
                <p className="text-[10px] text-muted-foreground">Raw Data</p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t("audit.export.fromDate")}
            </label>
            <input
              type="date"
              value={fromDate}
              max={effectiveEnd || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              {...rangeErrorProps}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none aria-invalid:border-danger"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t("audit.export.toDate")}
            </label>
            <input
              type="date"
              value={toDate}
              min={effectiveStart || undefined}
              onChange={(e) => setToDate(e.target.value)}
              {...rangeErrorProps}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none aria-invalid:border-danger"
            />
          </div>
        </div>

        {isRangeInvalid && (
          <p id="audit-export-range-error" role="alert" className="text-xs font-medium text-danger">
            {t("audit.export.invalidRange", {
              start: formatDateLabel(effectiveStart),
              end: formatDateLabel(effectiveEnd),
            })}
            {usesFilterDate && ` ${t("audit.export.invalidRangeFromFilter")}`}
          </p>
        )}

        {hasToolbarFilters && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/30 bg-surface p-2.5 text-xs text-foreground">
            <input
              type="checkbox"
              checked={applyActiveFilters}
              onChange={(e) => setApplyActiveFilters(e.target.checked)}
              className="accent-primary"
            />
            <span>
              {isVi
                ? "Áp dụng bộ lọc tìm kiếm / danh mục hiện tại"
                : "Apply current toolbar filters"}
            </span>
          </label>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("audit.export.cancel")}
          </Button>

          <Button type="submit" variant="primary" disabled={loading || isRangeInvalid}>
            <Download className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("audit.export.downloading") : t("audit.export.download")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
