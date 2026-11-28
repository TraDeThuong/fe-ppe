"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { evidenceViewUrlKey, fetchEvidenceViewUrl } from "@/hooks/incidents/use-evidences";
import { isSignedInternalMinioUrl, resolveEvidenceUrl } from "@/lib/evidence-url";
import { useLocale } from "@/providers/locale-provider";
import { EVIDENCE_TYPE, type EvidenceItem } from "@/types";
import type { GalleryMediaItem } from "./evidence-lightbox-modal";
import {
  formatConfidencePct,
  formatViolationLabel,
  isReferenceEvidenceItem,
  isVideoEvidence,
  resolveEvidenceImageUrl,
  resolveIncidentSnapshot,
} from "./evidence-media-utils";

export { isReferenceEvidenceItem };

export interface IncidentGalleryInput {
  evidence?: EvidenceItem | null;
  evidences?: EvidenceItem[];
  snapshotUrl?: string;
  violationType: string;
  confidence?: number | null;
  cameraId?: string;
  incidentId?: string;
}

/**
 * Danh sách ảnh/video bằng chứng của một sự cố theo thứ tự hiển thị:
 * ảnh vi phạm (tô đỏ) → video clip → ảnh đối chứng → ảnh camera → ảnh bổ sung.
 * Dùng chung cho IncidentEvidenceViewer (desktop) và IncidentMobileDetail (mobile)
 * để hai bản luôn chọn cùng một bộ ảnh.
 */
const EVIDENCE_VIEW_URL_STALE_MS = 45 * 60 * 1000;

function hasDirectBrowserUrl(e: EvidenceItem): boolean {
  const url = e.url?.trim() || "";
  return /^(https?:|blob:|data:)/i.test(url) && !isSignedInternalMinioUrl(url) && !/\/\/(?:ppe-minio|minio)(?::\d+)?\//i.test(url);
}

/**
 * Presigned VIEW URL (`GET /evidences/:id/download-url?action=VIEW`) cho từng tệp bằng chứng chưa có
 * URL trình duyệt mở được. Cache 45 phút (BE ký 60 phút), dùng chung key với trang /evidences.
 * URL bị BE ký theo host nội bộ Docker (thiếu PPE_MINIO_PUBLIC_ENDPOINT) thì bỏ qua để giữ cách cũ.
 */
function useEvidencePresignedUrls(evidences: readonly EvidenceItem[]): ReadonlyMap<string, string> {
  const targets = evidences.filter((e) => e.id && e.storageKey && !hasDirectBrowserUrl(e));
  const queries = useQueries({
    queries: targets.map((e) => ({
      queryKey: evidenceViewUrlKey(e.id),
      queryFn: () => fetchEvidenceViewUrl(e.id),
      staleTime: EVIDENCE_VIEW_URL_STALE_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });
  const urls = queries.map((q) => q.data ?? "");
  const key = targets.map((e, i) => `${e.id}=${urls[i]}`).join("|");
  return useMemo(() => {
    const map = new Map<string, string>();
    targets.forEach((e, i) => {
      const url = urls[i];
      if (url && !isSignedInternalMinioUrl(url)) map.set(e.id, url);
    });
    return map;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useIncidentGalleryPhotos({
  evidence,
  evidences: rawEvidences = [],
  snapshotUrl,
  violationType,
  confidence,
  cameraId = "",
  incidentId = "",
}: IncidentGalleryInput) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  // Ưu tiên presigned URL do BE ký thay cho link bucket ghép từ storageKey.
  const presignedById = useEvidencePresignedUrls(
    rawEvidences.length > 0 ? rawEvidences : evidence ? [evidence] : [],
  );
  const withPresigned = (e: EvidenceItem): EvidenceItem => {
    const url = presignedById.get(e.id);
    return url ? { ...e, url } : e;
  };
  const evidences = useMemo(
    () => rawEvidences.map(withPresigned),
    [rawEvidences, presignedById], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const evidencePrimary = useMemo(
    () => (evidence ? withPresigned(evidence) : evidence),
    [evidence, presignedById], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { getCamera } = useEntityLookup();
  const targetCamera = useMemo(() => getCamera(cameraId), [getCamera, cameraId]);

  const violationLabel = formatViolationLabel(violationType, isVietnamese);
  const confidencePct = formatConfidencePct(confidence);

  const incidentFallbackUrl = useMemo(() => {
    if (typeof window === "undefined" || !incidentId) return "";
    return resolveIncidentSnapshot(sessionStorage.getItem(`ppe_incident_evidence_${incidentId}`));
  }, [incidentId]);

  const cameraSnapshotUrl = resolveIncidentSnapshot(targetCamera?.snapshotUrl);

  const incidentRefFallbackUrl = useMemo(() => {
    if (typeof window === "undefined" || !incidentId) return "";
    return resolveIncidentSnapshot(sessionStorage.getItem(`ppe_incident_ref_evidence_${incidentId}`));
  }, [incidentId]);

  const galleryPhotos = useMemo<GalleryMediaItem[]>(() => {
    const list: GalleryMediaItem[] = [];
    const resolvedSnap = resolveIncidentSnapshot(snapshotUrl);
    const allEvidences = evidences.length > 0 ? evidences : evidencePrimary ? [evidencePrimary] : [];

    // Tệp chỉ trỏ tới ảnh mẫu (hoặc không có đường dẫn) bị loại khỏi bộ ảnh.
    const imageEvidences = allEvidences.filter(
      (e) => !isVideoEvidence(e) && resolveEvidenceImageUrl(e),
    );
    const videoEvidences = allEvidences.filter((e) => isVideoEvidence(e));

    const isSnapAnnotated =
      resolvedSnap.includes("-evidence") ||
      resolvedSnap.includes("evidence_") ||
      resolvedSnap.includes("_red") ||
      resolvedSnap.includes("annotated");

    const snapshotItem =
      imageEvidences.find((e) => e.evidenceType === EVIDENCE_TYPE.SNAPSHOT) ||
      imageEvidences.find((e) => e.fileName?.includes("_red") || e.storageKey?.includes("_red")) ||
      imageEvidences.find((e) => !isReferenceEvidenceItem(e));

    const primaryUrl =
      (isSnapAnnotated ? resolvedSnap : null) ||
      resolveEvidenceImageUrl(snapshotItem) ||
      resolvedSnap ||
      incidentFallbackUrl;

    if (primaryUrl || videoEvidences.length === 0) {
      const confClauseVi =
        confidencePct !== null ? ` với độ tin cậy ${confidencePct}%` : "";
      const confClauseEn =
        confidencePct !== null ? ` (${confidencePct}% confidence)` : "";

      list.push({
        id: snapshotItem?.id || "photo-annotated",
        title: isVietnamese
          ? "Ảnh Vi Phạm PPE (Tô Đỏ Vi Phạm)"
          : "PPE Violation Snapshot (Red Highlight)",
        category: "annotated",
        badgeLabel: isVietnamese ? "TÔ ĐỎ VI PHẠM (AI)" : "VIOLATION (AI)",
        badgeColor: "danger",
        url: primaryUrl,
        description: isVietnamese
          ? `Ảnh chụp vi phạm ${violationLabel} từ camera giám sát được hệ thống AI phát hiện${confClauseVi}.`
          : `Surveillance camera violation snapshot: ${violationLabel} detected by AI${confClauseEn}.`,
        isAiAnnotated: true,
        evidenceType: EVIDENCE_TYPE.SNAPSHOT,
        evidenceItem: snapshotItem,
      });
    }

    // 2. Bổ sung VIDEO_CLIP bằng chứng (phát trực tiếp bằng <video controls>)
    for (const vidEv of videoEvidences) {
      const vidUrl = vidEv.url
        ? resolveEvidenceUrl(vidEv.url)
        : vidEv.storageKey
          ? resolveEvidenceUrl(vidEv.storageKey)
          : "";
      list.push({
        id: vidEv.id,
        title: isVietnamese ? "Video Clip Bằng Chứng Vi Phạm" : "Violation Evidence Video Clip",
        category: "video",
        badgeLabel: isVietnamese ? "VIDEO CLIP" : "VIDEO CLIP",
        badgeColor: "info",
        url: vidUrl,
        description: isVietnamese
          ? `Đoạn video clip trích xuất quanh thời điểm phát hiện vi phạm ${violationLabel} (${vidEv.fileName}).`
          : `Recorded video clip captured around the ${violationLabel} violation (${vidEv.fileName}).`,
        isAiAnnotated: false,
        evidenceType: EVIDENCE_TYPE.VIDEO_CLIP,
        evidenceItem: vidEv,
      });
    }

    // 3. Ảnh Đối Chứng Hợp Lệ (REFERENCE_SNAPSHOT)
    const refEvidenceItem = imageEvidences.find((e) => isReferenceEvidenceItem(e));
    const resolvedRefUrl = resolveEvidenceImageUrl(refEvidenceItem) || incidentRefFallbackUrl;

    if (resolvedRefUrl && resolvedRefUrl !== primaryUrl) {
      list.push({
        id: refEvidenceItem?.id || "photo-reference",
        title: isVietnamese ? "Ảnh Đối Chứng Hợp Lệ" : "Reference Snapshot",
        category: "reference",
        badgeLabel: isVietnamese ? "ĐỐI CHỨNG" : "REFERENCE",
        badgeColor: "success",
        url: resolvedRefUrl,
        description: isVietnamese
          ? "Ảnh đối chứng thời điểm công nhân tuân thủ bảo hộ hoặc lúc mới bước vào vùng camera (T=0s)."
          : "Reference baseline snapshot when worker was compliant or at T=0s.",
        isAiAnnotated: false,
        evidenceType: EVIDENCE_TYPE.REFERENCE_SNAPSHOT,
        evidenceItem: refEvidenceItem,
      });
    }

    // 4. Ảnh từ camera để tham chiếu hiện trường
    if (cameraSnapshotUrl && cameraSnapshotUrl !== primaryUrl && cameraSnapshotUrl !== resolvedRefUrl) {
      list.push({
        id: "photo-raw",
        title: isVietnamese ? "Ảnh tham chiếu từ camera" : "Camera Reference Photo",
        category: "raw",
        badgeLabel: isVietnamese ? "ẢNH CAMERA" : "CAMERA SNAPSHOT",
        badgeColor: "default",
        url: cameraSnapshotUrl,
        description: isVietnamese
          ? "Ảnh hiện có của camera để tham chiếu hiện trường. Thời điểm chụp có thể khác thời điểm sự cố."
          : "Available camera snapshot for scene reference. It may have been captured at a different time from the incident.",
        isAiAnnotated: false,
        evidenceType: "RAW_FRAME",
      });
    }

    // 5. Các ảnh đính kèm bổ sung khác
    for (const ev of imageEvidences) {
      const evUrl = resolveEvidenceImageUrl(ev);
      if (
        evUrl &&
        evUrl !== primaryUrl &&
        evUrl !== resolvedRefUrl &&
        evUrl !== cameraSnapshotUrl &&
        !list.some((item) => item.url === evUrl)
      ) {
        const isRef = isReferenceEvidenceItem(ev);
        list.push({
          id: ev.id,
          title: isRef
            ? isVietnamese
              ? "Ảnh Đối Chứng Hợp Lệ"
              : "Reference Snapshot"
            : isVietnamese
              ? "Ảnh Bằng Chứng Bổ Sung"
              : "Additional Evidence",
          category: isRef ? "reference" : "annotated",
          badgeLabel: isRef
            ? isVietnamese
              ? "ĐỐI CHỨNG"
              : "REFERENCE"
            : isVietnamese
              ? "BỔ SUNG"
              : "ADDITIONAL",
          badgeColor: isRef ? "success" : "info",
          url: evUrl,
          description: isRef
            ? isVietnamese
              ? "Ảnh đối chứng thời điểm công nhân tuân thủ bảo hộ."
              : "Reference baseline."
            : isVietnamese
              ? "Ảnh bằng chứng bổ sung từ hệ thống."
              : "Additional evidence photo.",
          isAiAnnotated: !isRef,
          evidenceType: ev.evidenceType,
          evidenceItem: ev,
        });
      }
    }

    return list;
  }, [
    snapshotUrl,
    evidences,
    evidencePrimary,
    incidentFallbackUrl,
    incidentRefFallbackUrl,
    cameraSnapshotUrl,
    isVietnamese,
    violationLabel,
    confidencePct,
  ]);

  return { galleryPhotos, incidentFallbackUrl, violationLabel, confidencePct };
}
