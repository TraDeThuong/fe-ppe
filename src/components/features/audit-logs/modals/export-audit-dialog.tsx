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
  loading?: boolean;
}

export function ExportAuditDialog({
  open,
  onOpenChange,
  onExport,
  loading = false,
}: ExportAuditDialogProps) {
  const { t } = useLocale();

  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onExport({
      format,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
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
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t("audit.export.toDate")}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("audit.export.cancel")}
          </Button>

          <Button type="submit" variant="primary" disabled={loading}>
            <Download className="mr-1.5 h-4 w-4" />
            <span>{loading ? t("audit.export.downloading") : t("audit.export.download")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
