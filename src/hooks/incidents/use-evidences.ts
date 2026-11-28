"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEvidenceFileSize } from "@/lib/evidence-utils";
import { isDockerInternalMinioUrl, resolveEvidenceUrl } from "@/lib/evidence-url";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import {
  EVIDENCE_TYPE,
  type EvidenceFilterParams,
  type EvidenceItem,
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
 * KPI toàn kho bằng 1 request `GET /evidences/summary`, truyền đúng bộ lọc server-side đang áp dụng
 * (công trường, camera, vi phạm, vòng đời, checksum, thời gian, tìm kiếm). Không truyền `evidenceType`
 * để 4 thẻ KPI luôn hiện đủ số theo từng loại.
 */
export function useEvidenceVaultCounts(
  filters?: Omit<EvidenceFilterParams, "evidenceType">,
  enabled = true,
) {
  return useQuery<EvidenceVaultCounts>({
    queryKey: [...incidentKeys.evidences(), "summary", filters ?? {}] as const,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const summary = await incidentService.getEvidencesSummary(filters);
      return {
        total: summary.total,
        snapshot: summary.byType[EVIDENCE_TYPE.SNAPSHOT] ?? 0,
        referenceSnapshot: summary.byType[EVIDENCE_TYPE.REFERENCE_SNAPSHOT] ?? 0,
        videoClip: summary.byType[EVIDENCE_TYPE.VIDEO_CLIP] ?? 0,
        totalBytes: summary.totalBytes,
        withChecksumCount: summary.withChecksumCount,
      };
    },
  });
}

/** Thời hạn presigned VIEW URL xin từ BE (giây) và thời gian cache an toàn trước khi hết hạn. */
const EVIDENCE_VIEW_URL_TTL_SECONDS = 3600;
const EVIDENCE_VIEW_URL_STALE_MS = 45 * 60 * 1000;

export const evidenceViewUrlKey = (evidenceId: string) =>
  [...incidentKeys.all, "evidence-view-url", evidenceId] as const;

function directEvidenceUrl(evidence?: Pick<EvidenceItem, "url"> | null): string {
  const url = evidence?.url?.trim();
  if (!url) return "";
  if (isDockerInternalMinioUrl(url)) return "";
  return /^(https?:|blob:|data:)/i.test(url) ? url : "";
}

/**
 * Lấy presigned VIEW URL (`GET /evidences/:id/download-url?action=VIEW`) cho ảnh/video xem trước:
 * dùng được với bucket private, giữ nguyên chữ ký SigV4 và để BE ghi EvidenceAccessLog (VIEW).
 * URL được cache 45 phút theo từng bằng chứng (BE ký 60 phút) nên chuyển trang qua lại không gọi lại;
 * key nằm ngoài `incidentKeys.evidences()` để invalidate danh sách không kéo theo ký lại URL.
 */
export function useEvidenceViewUrl(
  evidence?: Pick<EvidenceItem, "id" | "url" | "storageKey"> | null,
  enabled = true,
) {
  const direct = directEvidenceUrl(evidence);
  const evidenceId = evidence?.id ?? "";
  const query = useQuery({
    queryKey: evidenceViewUrlKey(evidenceId),
    enabled: enabled && Boolean(evidenceId) && !direct,
    staleTime: EVIDENCE_VIEW_URL_STALE_MS,
    gcTime: EVIDENCE_VIEW_URL_STALE_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const res = await incidentService.getEvidenceDownloadUrl(
        evidenceId,
        { action: "VIEW", expiresInSeconds: EVIDENCE_VIEW_URL_TTL_SECONDS },
        { signal, suppressToast: true },
      );
      return resolveEvidenceUrl(res?.downloadUrl) || res?.downloadUrl || "";
    },
  });
  // Khi chưa có presigned URL (đang tải/lỗi) chỉ dùng bucket công khai nếu được cấu hình qua env.
  const fallback = evidence ? resolveEvidenceUrl(evidence.storageKey) : "";
  return {
    url: direct || query.data || (query.isLoading ? "" : fallback),
    isLoading: !direct && query.isLoading,
    isError: query.isError,
  };
}

/**
 * Xin presigned VIEW URL mới ngay lúc cần (VD: nút "Sao chép Link"), không dùng URL thô của bucket.
 */
export async function fetchEvidenceViewUrl(evidenceId: string): Promise<string> {
  const res = await incidentService.getEvidenceDownloadUrl(evidenceId, {
    action: "VIEW",
    expiresInSeconds: EVIDENCE_VIEW_URL_TTL_SECONDS,
  });
  return resolveEvidenceUrl(res?.downloadUrl) || res?.downloadUrl || "";
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

/** BE giới hạn 100 ID mỗi lần gọi `POST /evidences/batch-delete`. */
const BATCH_DELETE_CHUNK = 100;

/**
 * Xóa hàng loạt qua `POST /evidences/batch-delete` (chia lô 100 ID), theo dõi tiến độ theo từng lô.
 * BE bỏ qua bằng chứng ngoài phạm vi công trường hoặc thuộc sự cố CLOSED (trả về `skippedIds`).
 */
export function useBatchDeleteEvidences() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchDeleteProgress | null>(null);
  const abortRef = useRef(false);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
    setProgress(null);
  }, []);

  const runBatchDelete = useCallback(
    async (
      targets: Array<{ id: string; fileSize?: number | string }>,
    ): Promise<BatchDeleteProgress> => {
      const uniqueTargets = Array.from(new Map(targets.map((t) => [t.id, t])).values());
      const summary: BatchDeleteProgress = {
        total: uniqueTargets.length,
        done: 0,
        deleted: 0,
        failed: 0,
        freedBytes: 0,
      };
      if (uniqueTargets.length === 0 || runningRef.current) return summary;

      runningRef.current = true;
      abortRef.current = false;
      setIsRunning(true);
      setProgress({ ...summary });

      const sizeById = new Map(
        uniqueTargets.map((t) => {
          const n = typeof t.fileSize === "string" ? Number(t.fileSize) : Number(t.fileSize ?? 0);
          return [t.id, Number.isFinite(n) && n > 0 ? n : 0] as const;
        }),
      );

      try {
        for (let i = 0; i < uniqueTargets.length && !abortRef.current; i += BATCH_DELETE_CHUNK) {
          const chunk = uniqueTargets.slice(i, i + BATCH_DELETE_CHUNK).map((t) => t.id);
          try {
            const res = await incidentService.batchDeleteEvidences(chunk);
            summary.deleted += res.deletedIds.length || res.deletedCount;
            summary.failed += chunk.length - (res.deletedIds.length || res.deletedCount);
            for (const id of res.deletedIds) summary.freedBytes += sizeById.get(id) ?? 0;
          } catch {
            summary.failed += chunk.length;
          } finally {
            summary.done += chunk.length;
            setProgress({ ...summary });
          }
        }
      } finally {
        runningRef.current = false;
        setIsRunning(false);
        void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
        void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: incidentKeys.details() });
      }

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
              `Đã xóa ${summary.deleted}/${summary.total} tệp${sizeLabel}; ${summary.failed} tệp bị bỏ qua (sự cố đã đóng, ngoài phạm vi hoặc lỗi).`,
              `Deleted ${summary.deleted}/${summary.total} files${sizeLabel}; ${summary.failed} skipped (closed incident, out of scope or failed).`,
            ),
          );
        } else {
          toast.error(
            pickLocaleText(
              "Không xóa được tệp nào (bằng chứng thuộc sự cố đã đóng, ngoài phạm vi hoặc lỗi).",
              "No files were deleted (closed incident, out of scope or failed).",
            ),
          );
        }
      }

      return summary;
    },
    [queryClient],
  );

  return {
    isRunning,
    progress,
    runBatchDelete,
    reset,
  };
}
