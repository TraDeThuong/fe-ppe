"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildThumbnailProxyUrl,
  computeFingerprintFromBlob,
  getManyCachedFingerprints,
  saveCachedFingerprint,
  type VisualFingerprint,
} from "@/lib/visual-fingerprint";
import type { VisualCandidateItem } from "@/lib/notification-grouping-engine";
import type {
  VisualWorkerRequest,
  VisualWorkerResponse,
} from "@/workers/visual-fingerprint.worker";

const MAX_CONCURRENT_JOBS = 3;

export interface UseVisualFingerprintsResult {
  fingerprintsMap: Map<string, VisualFingerprint>;
  isComputing: boolean;
  computedCount: number;
  totalCandidates: number;
}

/**
 * Hook tính toán và cache (IndexedDB + RAM) Perceptual Fingerprint (`dHash` 64-bit + Color Histogram)
 * cho các ảnh bằng chứng ứng viên trong Web Worker mà không làm giật luồng UI chính.
 */
export function useVisualFingerprints(
  candidates: readonly VisualCandidateItem[],
  enabled: boolean,
): UseVisualFingerprintsResult {
  const [fingerprintsMap, setFingerprintsMap] = useState<
    Map<string, VisualFingerprint>
  >(() => new Map());
  const [isComputing, setIsComputing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const failedKeysRef = useRef<Set<string>>(new Set());

  const candidateSignature = useMemo(
    () => candidates.map((c) => c.cacheKey).sort().join("|"),
    [candidates],
  );

  // Dọn worker khi unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || candidates.length === 0) {
      setIsComputing(false);
      return;
    }

    let cancelled = false;

    const getOrCreateWorker = (): Worker | null => {
      if (typeof Worker === "undefined") return null;
      if (workerRef.current) return workerRef.current;
      try {
        const w = new Worker(
          new URL("../../workers/visual-fingerprint.worker.ts", import.meta.url),
          { type: "module" },
        );
        workerRef.current = w;
        return w;
      } catch {
        return null;
      }
    };

    const computeOne = async (
      item: VisualCandidateItem,
    ): Promise<VisualFingerprint | null> => {
      const proxiedUrl = buildThumbnailProxyUrl(item.imageUrl);
      if (!proxiedUrl) return null;

      const worker = getOrCreateWorker();
      if (worker) {
        return new Promise<VisualFingerprint | null>((resolve) => {
          const requestId = `${item.cacheKey}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
          const onMessage = (ev: MessageEvent<VisualWorkerResponse>) => {
            if (ev.data?.requestId !== requestId) return;
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            resolve(ev.data.fingerprint ?? null);
          };
          const onError = () => {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            resolve(null);
          };
          worker.addEventListener("message", onMessage);
          worker.addEventListener("error", onError);
          const payload: VisualWorkerRequest = {
            requestId,
            cacheKey: item.cacheKey,
            imageUrl: proxiedUrl,
            cropBox: item.cropBox,
          };
          worker.postMessage(payload);
        });
      }

      // Fallback main-thread nếu trình duyệt/môi trường không hỗ trợ Web Worker
      try {
        const res = await fetch(proxiedUrl, {
          credentials: "same-origin",
          cache: "force-cache",
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await computeFingerprintFromBlob(blob, item.cacheKey, item.cropBox);
      } catch {
        return null;
      }
    };

    const run = async () => {
      const keys = candidates.map((c) => c.cacheKey);
      const cached = await getManyCachedFingerprints(keys);
      if (cancelled) return;

      if (cached.size > 0) {
        setFingerprintsMap((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [k, v] of cached.entries()) {
            if (!next.has(k)) {
              next.set(k, v);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }

      const toCompute = candidates.filter(
        (c) =>
          !cached.has(c.cacheKey) &&
          !inFlightKeysRef.current.has(c.cacheKey) &&
          !failedKeysRef.current.has(c.cacheKey),
      );

      if (toCompute.length === 0) {
        setIsComputing(false);
        return;
      }

      setIsComputing(true);
      let cursor = 0;

      const workerLoop = async () => {
        while (!cancelled && cursor < toCompute.length) {
          const item = toCompute[cursor++];
          inFlightKeysRef.current.add(item.cacheKey);
          try {
            const fp = await computeOne(item);
            if (fp) {
              await saveCachedFingerprint(fp);
              if (!cancelled) {
                setFingerprintsMap((prev) => {
                  const next = new Map(prev);
                  next.set(fp.id, fp);
                  return next;
                });
              }
            } else {
              failedKeysRef.current.add(item.cacheKey);
            }
          } catch {
            failedKeysRef.current.add(item.cacheKey);
          } finally {
            inFlightKeysRef.current.delete(item.cacheKey);
          }
        }
      };

      const concurrency = Math.min(MAX_CONCURRENT_JOBS, toCompute.length);
      await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
      if (!cancelled) {
        setIsComputing(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, candidateSignature]);

  return {
    fingerprintsMap,
    isComputing,
    computedCount: fingerprintsMap.size,
    totalCandidates: candidates.length,
  };
}
