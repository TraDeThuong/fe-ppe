"use client";

import { useState } from "react";
import { Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type {
  FeedbackDatasetItem,
  FeedbackDatasetLabel,
  ViolationType,
} from "@/types";

const CSV_HEADERS = [
  "incidentId",
  "label",
  "status",
  "violationType",
  "confidence",
  "trackId",
  "siteId",
  "cameraId",
  "detectedAt",
  "reviewedBy",
  "reviewedAt",
  "reviewReason",
  "snapshotStorageKey",
  "aiDetections",
] as const;

function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const value = String(raw);
  const str = typeof raw === "string" && /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Chuyển đổi mảng FeedbackDatasetItem sang chuỗi CSV chuẩn RFC-4180 (kèm UTF-8 BOM cho Excel).
 */
export function serializeFeedbackDatasetToCsv(
  items: readonly FeedbackDatasetItem[],
): string {
  const headerLine = CSV_HEADERS.join(",");
  const rows = items.map((item) =>
    [
      item.incidentId,
      item.label,
      item.status,
      item.violationType,
      item.confidence ?? "",
      item.trackId ?? "",
      item.siteId,
      item.cameraId,
      item.detectedAt,
      item.reviewedBy ?? "",
      item.reviewedAt ?? "",
      item.reviewReason ?? "",
      item.snapshotStorageKey ?? "",
      item.aiDetections == null ? "" : JSON.stringify(item.aiDetections),
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return `\uFEFF${[headerLine, ...rows].join("\r\n")}`;
}

export function serializeFeedbackDatasetToJson(
  items: readonly FeedbackDatasetItem[],
  total?: number,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: items.length,
      totalMatched: total ?? items.length,
      items,
    },
    null,
    2,
  );
}

export interface ExportFeedbackDatasetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId?: string;
  cameraId?: string;
  cameraIds?: string[];
  violationType?: ViolationType | string;
  fromDate?: string;
  toDate?: string;
}

export function ExportFeedbackDatasetModal({
  open,
  onOpenChange,
  siteId,
  cameraId,
  cameraIds,
  violationType,
  fromDate,
  toDate,
}: ExportFeedbackDatasetModalProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [labelFilter, setLabelFilter] = useState<"" | FeedbackDatasetLabel>("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const { items, total } = await incidentService.exportFeedbackDatasetAll({
        siteId: siteId || undefined,
        cameraId: cameraId || undefined,
        cameraIds,
        violationType: violationType || undefined,
        label: labelFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      if (items.length === 0) {
        toast.info(
          isVietnamese
            ? "Chưa có bản ghi phản hồi True Violation / False Alarm nào khớp bộ lọc hiện tại."
            : "No reviewed feedback records matched the current filters.",
        );
        return;
      }

      const content =
        format === "csv"
          ? serializeFeedbackDatasetToCsv(items)
          : serializeFeedbackDatasetToJson(items, total);
      const mimeType =
        format === "csv"
          ? "text/csv;charset=utf-8;"
          : "application/json;charset=utf-8;";
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      const suffix = labelFilter ? `_${labelFilter.toLowerCase()}` : "";
      anchor.href = url;
      anchor.download = `ppe_ai_feedback_dataset${suffix}_${dateStamp}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      const count = items.length < total ? `${items.length}/${total}` : String(items.length);
      toast.success(isVietnamese
        ? `Đã xuất ${count} mẫu phản hồi AI (${format.toUpperCase()}).`
        : `Exported ${count} AI feedback samples (${format.toUpperCase()}).`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isVietnamese
            ? "Không thể xuất tập dữ liệu phản hồi AI."
            : "Failed to export AI feedback dataset.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isVietnamese
          ? "Xuất Dữ Liệu Phản Hồi Cải Tiến Mô Hình AI"
          : "Export AI Model Feedback Dataset"
      }
      description={
        isVietnamese
          ? "Trích xuất tập dữ liệu đã qua Human Review (True Violation / False Alarm) theo Mục 1 & Ví dụ 6 Đề tài D08 phục vụ đánh giá và huấn luyện lại YOLO."
          : "Export human-reviewed True Violation / False Alarm records for YOLO evaluation and retraining."
      }
    >
      <form onSubmit={handleExport} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label
            htmlFor="feedback-label-select"
            className="block text-xs font-bold text-foreground"
          >
            {isVietnamese ? "Nhãn thẩm định (Label)" : "Review Label"}
          </label>
          <select
            id="feedback-label-select"
            value={labelFilter}
            onChange={(e) =>
              setLabelFilter(e.target.value as "" | FeedbackDatasetLabel)
            }
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">
              {isVietnamese
                ? "Tất cả (True Violation + False Alarm)"
                : "All Reviewed (True Violation + False Alarm)"}
            </option>
            <option value="TRUE_VIOLATION">
              {isVietnamese
                ? "Chỉ True Violation (Xác nhận vi phạm thật)"
                : "True Violation Only (CONFIRMED / RESOLVED)"}
            </option>
            <option value="FALSE_ALARM">
              {isVietnamese
                ? "Chỉ False Alarm (Cảnh báo giả đã bác bỏ)"
                : "False Alarm Only (DISMISSED)"}
            </option>
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-bold text-foreground">
            {isVietnamese ? "Định dạng tệp tải về" : "Export File Format"}
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {(["csv", "json"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFormat(opt)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  format === opt
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border/50 bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>
                  {opt === "csv" ? "CSV (Excel / Pandas)" : "JSON (AI Detections)"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="rounded-xl border border-border/40 bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
          {isVietnamese
            ? "Tự động kế thừa bộ lọc phạm vi đang chọn trên trang (Công trường, Phân khu/Camera, Loại vi phạm, Khoảng thời gian)."
            : "Automatically inherits active page filters (Site, Zone/Camera, Violation Type, Time Range)."}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={exporting}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>
              {exporting
                ? isVietnamese
                  ? "Đang trích xuất..."
                  : "Exporting..."
                : isVietnamese
                  ? `Tải xuống ${format.toUpperCase()}`
                  : `Download ${format.toUpperCase()}`}
            </span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
