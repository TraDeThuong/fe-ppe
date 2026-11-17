"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isChecksumVerifyValid } from "@/lib/evidence-utils";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import type { ChecksumVerifyResult } from "@/types";
import { incidentKeys } from "./incident.query-keys";

export function useEvidenceIntegrity(evidenceId: string, enabled = false) {
  return useQuery<ChecksumVerifyResult>({
    queryKey: incidentKeys.integrity(evidenceId),
    queryFn: () => incidentService.verifyEvidenceIntegrity(evidenceId),
    enabled: Boolean(evidenceId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerifyEvidenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evidenceId: string) =>
      incidentService.verifyEvidenceIntegrity(evidenceId),
    onSuccess: (result, evidenceId) => {
      queryClient.setQueryData(incidentKeys.integrity(evidenceId), result);

      if (isChecksumVerifyValid(result)) {
        toast.success(
          pickLocaleText(
            `BẰNG CHỨNG TOÀN VẸN: Khớp 100% SHA-256 (${result.actualChecksum?.slice(0, 12) || ""}...).`,
            `EVIDENCE VERIFIED: 100% SHA-256 match (${result.actualChecksum?.slice(0, 12) || ""}...).`,
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

export interface BatchVerifyProgress {
  total: number;
  done: number;
  valid: number;
  tampered: number;
  missingOrError: number;
}

/**
 * Verify SHA-256 integrity across multiple selected evidences with bounded concurrency
 * and populate React Query's per-evidence integrity cache so cards/tables reflect status immediately.
 */
export function useBatchVerifyEvidences() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchVerifyProgress | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setProgress(null);
  }, []);

  const runBatch = useCallback(
    async (evidenceIds: string[]) => {
      if (evidenceIds.length === 0 || isRunning) return;
      abortRef.current = false;
      setIsRunning(true);

      const summary: BatchVerifyProgress = {
        total: evidenceIds.length,
        done: 0,
        valid: 0,
        tampered: 0,
        missingOrError: 0,
      };
      setProgress({ ...summary });

      const queue = [...evidenceIds];
      const concurrency = 3;

      const worker = async () => {
        while (queue.length > 0 && !abortRef.current) {
          const id = queue.shift();
          if (!id) break;
          try {
            const res = await incidentService.verifyEvidenceIntegrity(id);
            queryClient.setQueryData(incidentKeys.integrity(id), res);
            if (isChecksumVerifyValid(res)) {
              summary.valid += 1;
            } else {
              summary.tampered += 1;
            }
          } catch {
            summary.missingOrError += 1;
          } finally {
            summary.done += 1;
            setProgress({ ...summary });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, evidenceIds.length) }, () => worker()),
      );

      setIsRunning(false);

      if (!abortRef.current) {
        if (summary.tampered > 0) {
          toast.error(
            pickLocaleText(
              `Phát hiện ${summary.tampered}/${summary.total} minh chứng không khớp SHA-256!`,
              `Detected ${summary.tampered}/${summary.total} tampered evidence files!`,
            ),
          );
        } else if (summary.valid > 0) {
          toast.success(
            pickLocaleText(
              `Đã giám định ${summary.valid}/${summary.total} minh chứng hợp lệ` +
                (summary.missingOrError > 0
                  ? ` (${summary.missingOrError} chưa có checksum/lỗi).`
                  : "."),
              `Verified ${summary.valid}/${summary.total} valid evidence files` +
                (summary.missingOrError > 0
                  ? ` (${summary.missingOrError} missing checksum/errors).`
                  : "."),
            ),
          );
        } else {
          toast.error(
            pickLocaleText(
              "Không thể giám định các minh chứng đã chọn (thiếu checksum hoặc lỗi kết nối).",
              "Could not verify selected evidences (missing checksum or request error).",
            ),
          );
        }
      }
    },
    [isRunning, queryClient],
  );

  return {
    isRunning,
    progress,
    runBatch,
    reset,
  };
}
