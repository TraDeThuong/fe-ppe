"use client";

import { useEffect, useState } from "react";
import { VideoOff } from "lucide-react";
import { isDockerInternalMinioUrl, resolveEvidenceUrl } from "@/lib/evidence-url";
import { useLocale } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type { EvidenceItem } from "@/types";

export interface EvidenceVideoPlayerProps {
  evidence?: Partial<EvidenceItem> | null;
  src?: string;
  poster?: string;
  title?: string;
  className?: string;
}

export function EvidenceVideoPlayer(props: EvidenceVideoPlayerProps) {
  const { evidence, src } = props;
  const sourceKey = JSON.stringify([evidence?.id, evidence?.storageKey, evidence?.url, src]);
  return <EvidenceVideo key={sourceKey} {...props} />;
}

function EvidenceVideo({
  evidence,
  src,
  poster,
  title,
  className = "max-h-[520px] w-full object-contain",
}: EvidenceVideoPlayerProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const evidenceId = evidence?.id;
  const directSrc = resolveEvidenceUrl(src || evidence?.url || evidence?.storageKey);
  const [signedUrl, setSignedUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(evidenceId));
  const [failedSources, setFailedSources] = useState<string[]>([]);

  useEffect(() => {
    if (!evidenceId) return;
    const controller = new AbortController();

    incidentService
      .getEvidenceDownloadUrl(evidenceId, { action: "VIEW" }, {
        signal: controller.signal,
        suppressToast: true,
      })
      .then(({ downloadUrl }) => {
        if (!controller.signal.aborted && !isDockerInternalMinioUrl(downloadUrl)) {
          setSignedUrl(downloadUrl);
        }
      })
      .catch(() => {
        // Evidence created before presigned URLs may still have a direct source.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [evidenceId]);

  const effectiveSrc = loading
    ? undefined
    : [signedUrl, directSrc].find((url) => url && !failedSources.includes(url));

  if (!loading && !effectiveSrc) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
        <VideoOff className="h-8 w-8 opacity-60" />
        <span className="text-xs font-medium">
          {isVietnamese
            ? "Không thể tải hoặc phát video bằng chứng"
            : "Unable to load or play evidence video clip"}
        </span>
      </div>
    );
  }

  return (
    <video
      key={effectiveSrc}
      src={effectiveSrc}
      poster={poster || undefined}
      controls
      preload="metadata"
      playsInline
      aria-busy={loading}
      aria-label={
        title || (isVietnamese ? "Trình phát video bằng chứng" : "Evidence video player")
      }
      className={className}
      onError={() => {
        if (effectiveSrc) setFailedSources((prev) => [...prev, effectiveSrc]);
      }}
    />
  );
}
