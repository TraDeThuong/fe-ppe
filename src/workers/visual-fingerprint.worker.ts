/// <reference lib="webworker" />

import {
  computeFingerprintFromBlob,
  type VisualFingerprint,
} from "../lib/visual-fingerprint";
import type { NormalizedBox } from "../lib/notification-enrichment";

export interface VisualWorkerRequest {
  requestId: string;
  cacheKey: string;
  imageUrl: string;
  cropBox?: NormalizedBox | null;
}

export interface VisualWorkerResponse {
  requestId: string;
  cacheKey: string;
  fingerprint: VisualFingerprint | null;
  error?: string;
}

self.onmessage = async (event: MessageEvent<VisualWorkerRequest>) => {
  const { requestId, cacheKey, imageUrl, cropBox } = event.data;
  try {
    const res = await fetch(imageUrl, {
      credentials: "same-origin",
      cache: "force-cache",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const fingerprint = await computeFingerprintFromBlob(blob, cacheKey, cropBox);
    const reply: VisualWorkerResponse = {
      requestId,
      cacheKey,
      fingerprint,
    };
    self.postMessage(reply);
  } catch (err) {
    const reply: VisualWorkerResponse = {
      requestId,
      cacheKey,
      fingerprint: null,
      error: err instanceof Error ? err.message : "Fingerprint worker failed",
    };
    self.postMessage(reply);
  }
};
