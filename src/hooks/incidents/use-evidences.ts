"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEvidenceFileSize } from "@/lib/evidence-utils";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import {
  EVIDENCE_TYPE,
  type EvidenceQueryParams,
  type EvidenceType,
  type EvidenceVaultCounts,
} from "@/types";
import { incidentKeys } from "./incident.query-keys";

export function useEvidences(params?: EvidenceQueryParams, enabled = true) {
  return useQuery({
    queryKey: incidentKeys.evidenceList(params),
    queryFn: () => incidentService.getAllEvidences(params),
    enabled,
    staleTime: 20_000,
  });
}

/**
 * Fetch exact vault-wide totals per evidence type using lightweight limit=1 queries.
 * Avoids misreporting page-level counts on KPI cards without requiring backend changes.
 */
export function useEvidenceVaultCounts(
  scope?: Pick<EvidenceQueryParams, "cameraId" | "incidentId">,
  enabled = true,
) {
  return useQuery<EvidenceVaultCounts>({
    queryKey: [...incidentKeys.evidences(), "vault-counts", scope ?? {}] as const,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const base: EvidenceQueryParams = {
        page: 1,
        limit: 1,
        cameraId: scope?.cameraId || undefined,
        incidentId: scope?.incidentId || undefined,
      };
      const [allRes, snapRes, refRes, clipRes] = await Promise.all([
        incidentService.getAllEvidences(base),
        incidentService.getAllEvidences({ ...base, evidenceType: EVIDENCE_TYPE.SNAPSHOT }),
        incidentService.getAllEvidences({
          ...base,
          evidenceType: EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
        }),
        incidentService.getAllEvidences({ ...base, evidenceType: EVIDENCE_TYPE.VIDEO_CLIP }),
      ]);
      return {
        total: allRes.meta?.total ?? allRes.items.length,
        snapshot: snapRes.meta?.total ?? snapRes.items.length,
        referenceSnapshot: refRes.meta?.total ?? refRes.items.length,
        videoClip: clipRes.meta?.total ?? clipRes.items.length,
      };
    },
  });
}

export function useEvidenceDetail(evidenceId: string | null, enabled = true) {
  return useQuery({
    queryKey: incidentKeys.evidenceDetail(evidenceId || ""),
    queryFn: () => incidentService.getEvidenceById(evidenceId as string),
    enabled: Boolean(evidenceId) && enabled,
  });
}

async function computeFileSha256Hex(file: File): Promise<string | undefined> {
  if (typeof crypto === "undefined" || !crypto.subtle) return undefined;
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
}

export function useEvidenceMutations() {
  const queryClient = useQueryClient();

  const invalidate = (incidentId?: string) => {
    void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
    if (incidentId) {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
    }
    void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
  };

  const uploadDirect = useMutation({
    mutationFn: (data: {
      incidentId: string;
      cameraId: string;
      evidenceType?: EvidenceType | string;
      file: File;
    }) => incidentService.uploadEvidenceDirect(data),
    onSuccess: (_res, vars) => {
      invalidate(vars.incidentId);
      toast.success(
        pickLocaleText(
          "Đã tải lên và gắn minh chứng thành công.",
          "Evidence uploaded and attached successfully.",
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const uploadViaPresigned = useMutation({
    mutationFn: async (data: {
      incidentId: string;
      cameraId: string;
      siteId: string;
      evidenceType: EvidenceType | string;
      file: File;
    }) => {
      const [init, checksum] = await Promise.all([
        incidentService.requestEvidenceUploadUrl({
          incidentId: data.incidentId,
          cameraId: data.cameraId,
          siteId: data.siteId,
          evidenceType: data.evidenceType,
          fileName: data.file.name,
          mimeType: data.file.type || "application/octet-stream",
          fileSize: data.file.size,
        }),
        computeFileSha256Hex(data.file),
      ]);
      await incidentService.uploadEvidenceToPresignedUrl(init.uploadUrl, data.file);
      return incidentService.addEvidence(data.incidentId, {
        cameraId: data.cameraId,
        evidenceType: data.evidenceType,
        storageKey: init.storageKey,
        fileName: data.file.name,
        mimeType: data.file.type || "application/octet-stream",
        fileSize: data.file.size,
        capturedAt: new Date().toISOString(),
        metadata: checksum ? { checksum } : undefined,
      });
    },
    onSuccess: (_res, vars) => {
      invalidate(vars.incidentId);
      toast.success(
        pickLocaleText(
          "Đã tải lên tệp minh chứng qua Presigned URL.",
          "Evidence uploaded via Presigned URL.",
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const deleteEvidence = useMutation({
    mutationFn: ({ evidenceId }: { evidenceId: string; incidentId?: string }) =>
      incidentService.deleteEvidence(evidenceId),
    onSuccess: (_res, vars) => {
      invalidate(vars.incidentId);
      toast.success(
        pickLocaleText("Đã xóa tệp minh chứng.", "Evidence deleted."),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
  });

  return {
    uploadDirect,
    uploadViaPresigned,
    deleteEvidence,
  };
}

export interface BatchDeleteProgress {
  total: number;
  done: number;
  deleted: number;
  failed: number;
  freedBytes: number;
}

/**
 * Execute parallel evidence deletions with bounded concurrency (4 workers)
 * and live progress tracking without requiring Backend changes.
 */
export function useBatchDeleteEvidences() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchDeleteProgress | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setProgress(null);
  }, []);

  const runBatchDelete = useCallback(
    async (
      targets: Array<{ id: string; fileSize?: number | string }>,
    ): Promise<BatchDeleteProgress> => {
      const summary: BatchDeleteProgress = {
        total: targets.length,
        done: 0,
        deleted: 0,
        failed: 0,
        freedBytes: 0,
      };
      if (targets.length === 0 || isRunning) return summary;

      abortRef.current = false;
      setIsRunning(true);
      setProgress({ ...summary });

      const queue = [...targets];
      const concurrency = 4;

      const worker = async () => {
        while (queue.length > 0 && !abortRef.current) {
          const item = queue.shift();
          if (!item) break;
          try {
            await incidentService.deleteEvidence(item.id);
            summary.deleted += 1;
            const sizeNum =
              typeof item.fileSize === "string"
                ? Number(item.fileSize)
                : Number(item.fileSize ?? 0);
            if (Number.isFinite(sizeNum) && sizeNum > 0) {
              summary.freedBytes += sizeNum;
            }
          } catch {
            summary.failed += 1;
          } finally {
            summary.done += 1;
            setProgress({ ...summary });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, targets.length) }, () =>
          worker(),
        ),
      );

      setIsRunning(false);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.details() });

      if (!abortRef.current) {
        const sizeLabel =
          summary.freedBytes > 0
            ? ` (~${formatEvidenceFileSize(summary.freedBytes)})`
            : "";
        if (summary.deleted > 0 && summary.failed === 0) {
          toast.success(
            pickLocaleText(
              `Đã xóa thành công ${summary.deleted} tệp bằng chứng${sizeLabel}.`,
              `Successfully deleted ${summary.deleted} evidence files${sizeLabel}.`,
            ),
          );
        } else if (summary.deleted > 0 && summary.failed > 0) {
          toast.success(
            pickLocaleText(
              `Đã xóa ${summary.deleted}/${summary.total} tệp${sizeLabel} (${summary.failed} lỗi).`,
              `Deleted ${summary.deleted}/${summary.total} files${sizeLabel} (${summary.failed} failed).`,
            ),
          );
        } else {
          toast.error(
            pickLocaleText(
              "Không thể xóa các tệp bằng chứng đã chọn.",
              "Failed to delete selected evidence files.",
            ),
          );
        }
      }

      return summary;
    },
    [isRunning, queryClient],
  );

  return {
    isRunning,
    progress,
    runBatchDelete,
    reset,
  };
}


