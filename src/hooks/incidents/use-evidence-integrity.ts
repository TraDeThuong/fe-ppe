"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { ChecksumVerifyResult } from "@/types";

export function useEvidenceIntegrity(evidenceId: string, enabled = false) {
  return useQuery<ChecksumVerifyResult>({
    queryKey: incidentKeys.integrity(evidenceId),
    queryFn: () => incidentService.verifyEvidenceIntegrity(evidenceId),
    enabled: Boolean(evidenceId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerifyEvidenceMutation() {
  return useMutation({
    mutationFn: (evidenceId: string) =>
      incidentService.verifyEvidenceIntegrity(evidenceId),
    onSuccess: (result) => {
      if (!result.isTampered) {
        toast.success(
          pickLocaleText(
            "BẰNG CHỨNG TOÀN VẸN: Khớp 100% mã băm SHA-256 gốc.",
            "EVIDENCE VERIFIED: 100% match with original SHA-256 checksum.",
          ),
        );
      } else {
        toast.error(
          pickLocaleText(
            "CẢNH BÁO: Mã băm SHA-256 không khớp! Bằng chứng có dấu hiệu bị can thiệp.",
            "WARNING: SHA-256 checksum mismatch! Evidence may have been tampered with.",
          ),
        );
      }
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể kiểm tra tính toàn vẹn.",
              "Unable to verify evidence integrity.",
            );
      toast.error(msg);
    },
  });
}
