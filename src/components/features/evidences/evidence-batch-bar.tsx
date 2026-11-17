"use client";

import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BatchDeleteProgress, BatchVerifyProgress } from "@/hooks/incidents";
import { formatEvidenceFileSize } from "@/lib/evidence-utils";
import { useLocale } from "@/providers/locale-provider";

export interface EvidenceBatchBarProps {
  selectedCount: number;
  selectedTotalBytes?: number;
  allVisibleSelected: boolean;
  canDelete?: boolean;
  isArchiveView?: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onBatchVerify: () => void;
  onBatchDownload: () => void;
  onBatchExportCsv?: () => void;
  onBatchArchive?: () => void;
  onBatchDelete?: () => void;
  isBatchVerifying: boolean;
  batchProgress: BatchVerifyProgress | null;
  isBatchDeleting?: boolean;
  batchDeleteProgress?: BatchDeleteProgress | null;
}

export function EvidenceBatchBar({
  selectedCount,
  selectedTotalBytes = 0,
  allVisibleSelected,
  canDelete = false,
  isArchiveView = false,
  onSelectAllVisible,
  onClearSelection,
  onBatchVerify,
  onBatchDownload,
  onBatchExportCsv,
  onBatchArchive,
  onBatchDelete,
  isBatchVerifying,
  batchProgress,
  isBatchDeleting = false,
  batchDeleteProgress = null,
}: EvidenceBatchBarProps) {
  const { t, locale } = useLocale();
  const isVi = locale === "vi-VN";
  const isBusy = isBatchVerifying || isBatchDeleting;

  if (selectedCount === 0 && !isBusy) return null;

  const verifyPct =
    batchProgress && batchProgress.total > 0
      ? Math.round((batchProgress.done / batchProgress.total) * 100)
      : 0;

  const deletePct =
    batchDeleteProgress && batchDeleteProgress.total > 0
      ? Math.round((batchDeleteProgress.done / batchDeleteProgress.total) * 100)
      : 0;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 rounded-2xl border border-primary/30 bg-surface/95 px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-xl bg-primary/15 px-2 text-xs font-bold text-primary">
            {selectedCount}
          </span>
          <div className="text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-bold text-foreground">
                {t("evidences.batch.selectedLabel", { count: selectedCount })}
              </p>
              {selectedTotalBytes > 0 && (
                <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)]">
                  {formatEvidenceFileSize(selectedTotalBytes)}
                </span>
              )}
            </div>

            {batchDeleteProgress && isBatchDeleting ? (
              <p className="text-[11px] font-semibold text-danger">
                {isVi
                  ? `Đang xóa ${batchDeleteProgress.done}/${batchDeleteProgress.total} tệp (${deletePct}%)...`
                  : `Deleting ${batchDeleteProgress.done}/${batchDeleteProgress.total} files (${deletePct}%)...`}
              </p>
            ) : (
              batchProgress && (
                <p className="text-[11px] text-muted-foreground">
                  {t("evidences.batch.progressSummary", {
                    done: batchProgress.done,
                    total: batchProgress.total,
                    valid: batchProgress.valid,
                    tampered: batchProgress.tampered,
                  })}
                </p>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!allVisibleSelected && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSelectAllVisible}
              disabled={isBusy}
              className="gap-1.5 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>{t("evidences.batch.selectPage")}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={onBatchVerify}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-xs"
          >
            {isBatchVerifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            <span>
              {isBatchVerifying
                ? t("evidences.batch.verifyingPct", { pct: verifyPct })
                : t("evidences.batch.verifyBtn")}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onBatchDownload}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t("evidences.batch.downloadBtn")}</span>
          </Button>

          {onBatchExportCsv && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchExportCsv}
              disabled={isBusy || selectedCount === 0}
              className="gap-1.5 text-xs"
              title={
                isVi
                  ? "Xuất bản kê lưu trữ CSV cho các bằng chứng đang chọn"
                  : "Export CSV archive manifest for selected evidences"
              }
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isVi ? "Xuất CSV" : "Export CSV"}</span>
            </Button>
          )}

          {onBatchArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBatchArchive}
              disabled={isBusy || selectedCount === 0}
              className="gap-1.5 text-xs"
              title={
                isArchiveView
                  ? isVi
                    ? "Khôi phục các mục đã chọn về Kho chính"
                    : "Restore selected items to Active Vault"
                  : isVi
                    ? "Cất gọn các mục đã chọn vào Kho Lưu trữ (ẩn khỏi danh sách chính)"
                    : "Move selected items to Archive Vault"
              }
            >
              {isArchiveView ? (
                <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Archive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>
                {isArchiveView
                  ? isVi
                    ? "Khôi phục"
                    : "Restore"
                  : isVi
                    ? "Lưu trữ"
                    : "Archive"}
              </span>
            </Button>
          )}

          {canDelete && onBatchDelete && (
            <Button
              size="sm"
              variant="danger"
              onClick={onBatchDelete}
              disabled={isBusy || selectedCount === 0}
              className="gap-1.5 text-xs"
            >
              {isBatchDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>
                {isBatchDeleting
                  ? `${deletePct}%`
                  : isVi
                    ? `Xóa (${selectedCount})`
                    : `Delete (${selectedCount})`}
              </span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isBusy}
            aria-label={t("evidences.batch.clear")}
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(isBatchVerifying || isBatchDeleting) && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isBatchDeleting ? "bg-danger" : "bg-primary"
            }`}
            style={{ width: `${isBatchDeleting ? deletePct : verifyPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
