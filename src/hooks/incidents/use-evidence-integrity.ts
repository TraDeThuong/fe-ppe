"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
        toast.success("BẰNG CHỨNG TOÀN VẸN: Khớp 100% mã băm SHA-256 gốc.");
      } else {
        toast.error("CẢNH BÁO: Mã băm SHA-256 không khớp! Bằng chứng có dấu hiệu bị can thiệp.");
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể kiểm tra tính toàn vẹn.";
      toast.error(msg);
    },
  });
}
