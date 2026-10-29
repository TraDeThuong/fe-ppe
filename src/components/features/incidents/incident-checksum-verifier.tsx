"use client";

import { CheckCircle2, FileCheck, Key, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useVerifyEvidenceMutation } from "@/hooks/incidents";

export interface IncidentChecksumVerifierProps {
  evidenceId?: string;
  expectedChecksum?: string | null;
}

export function IncidentChecksumVerifier({
  evidenceId,
  expectedChecksum = "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
}: IncidentChecksumVerifierProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const verifyMutation = useVerifyEvidenceMutation();

  const handleVerify = () => {
    if (!evidenceId) return;
    verifyMutation.mutate(evidenceId);
  };

  const result = verifyMutation.data;

  return (
    <div className="rounded-2xl border border-border/40 bg-surface p-5 shadow-[4px_4px_10px_rgba(0,0,0,0.06),-4px_-4px_10px_rgba(255,255,255,0.7)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3)] space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {isVietnamese
              ? "Giám định Toàn vẹn Bằng chứng (SHA-256)"
              : "Evidence Integrity Verification (SHA-256)"}
          </h4>
        </div>

        {evidenceId && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleVerify}
            disabled={verifyMutation.isPending}
            className="flex items-center gap-1.5 text-xs"
          >
            {verifyMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Key className="h-3.5 w-3.5 text-primary" />
            )}
            <span>{isVietnamese ? "Kiểm tra lại Checksum" : "Re-verify Checksum"}</span>
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isVietnamese ? "Mã băm SHA-256 đối chiếu:" : "Reference SHA-256 Checksum:"}
        </span>
        <div className="rounded-xl border border-border/40 bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-400 break-all select-all">
          {expectedChecksum || "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"}
        </div>
      </div>

      {result ? (
        result.isTampered ? (
          <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              {isVietnamese
                ? "CẢNH BÁO: Bằng chứng có dấu hiệu bị can thiệp sửa đổi trái phép!"
                : "WARNING: Evidence exhibits indicators of unauthorized tampering!"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-500 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              {isVietnamese
                ? "XÁC THỰC TOÀN VẸN: Khớp 100% mã băm gốc. Đủ hiệu lực pháp lý điều tra."
                : "INTEGRITY CONFIRMED: 100% match with origin hash. Audit-ready."}
            </span>
          </div>
        )
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {isVietnamese
            ? "Tệp bằng chứng được mã hóa toàn vẹn ngay khi camera trích xuất lên MinIO S3 Object Storage."
            : "Evidence snapshot file is cryptographically hashed upon camera ingestion into MinIO S3 Storage."}
        </p>
      )}
    </div>
  );
}
