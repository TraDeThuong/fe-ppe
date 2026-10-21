"use client";

import { useEffect, useState } from "react";
import { Download, KeyRound, X } from "lucide-react";

import { Button } from "@ui/button";

import { useLocale } from "@/providers/locale-provider";

export interface BackupCodesModalProps {
  /** 8 mã dự phòng trả 1 lần duy nhất từ BE (bật 2FA / tạo lại) */
  codes: string[] | null;
  onClose: () => void;
}

/**
 * Modal hiển thị mã dự phòng — chỉ xuất hiện 1 lần sau khi bật/tạo lại 2FA.
 * Bắt buộc xác nhận "đã lưu" mới đóng được (spec 7.2) + nút tải .txt.
 */
export function BackupCodesModal({ codes, onClose }: BackupCodesModalProps) {
  const { t } = useLocale();
  const [confirmed, setConfirmed] = useState(false);

  // Mỗi bộ mã mới phải xác nhận lại từ đầu
  useEffect(() => {
    setConfirmed(false);
  }, [codes]);

  if (codes === null) return null;

  const codeList = codes;

  function handleDownload() {
    const content = [
      "Smart PPE Monitoring — Backup codes",
      `Ngày tạo: ${new Date().toLocaleString()}`,
      "",
      ...codeList,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ppe-backup-codes.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      data-testid="backup-codes-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-codes-title"
    >
      <div className="w-full max-w-md rounded-[1.4rem] border border-border/40 bg-card p-6 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <h2 id="backup-codes-title" className="text-lg font-bold tracking-tight">
              {t("security.2fa.backupCodesTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("security.2fa.cancel")}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {t("security.2fa.backupCodesMessage")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {codes.map((code) => (
            <code
              key={code}
              className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-2 text-center font-mono text-sm font-semibold tracking-wider"
            >
              {code}
            </code>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              data-testid="backup-codes-confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="size-4 accent-primary"
            />
            {t("security.2fa.backupCodesConfirm")}
          </label>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleDownload}
          >
            <Download className="size-4" aria-hidden="true" />
            {t("security.2fa.backupCodesDownload")}
          </Button>

          <Button type="button" className="w-full" disabled={!confirmed} onClick={onClose}>
            {t("security.2fa.backupCodesDone")}
          </Button>
        </div>
      </div>
    </div>
  );
}
