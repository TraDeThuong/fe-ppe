"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeLiveEvidences } from "@/components/features/ai-test/ai-test-utils";
import { computeSyncedLiveFps } from "@/components/features/cameras/camera-live-helpers";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useCan } from "@/hooks/use-can";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import type { CameraStudioTab } from "./camera-studio-header";
import type {
  EvidenceItem,
  LiveSessionInfo,
  LiveStatsResponse,
} from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

function getEvidenceKey(item: {
  event_id?: string;
  evidence_id?: string;
  id?: string;
  filename?: string;
}): string | undefined {
  return item.event_id ?? item.evidence_id ?? item.id ?? item.filename;
}

function areEvidenceArraysUnchanged<
  T extends {
    event_id?: string;
    evidence_id?: string;
    id?: string;
    filename?: string;
  },
>(prev: T[] | undefined, next: T[] | undefined): boolean {
  if (prev === next) return true;
  if (!prev || !next || prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  const lastPrev = getEvidenceKey(prev[prev.length - 1]);
  const lastNext = getEvidenceKey(next[next.length - 1]);
  return lastPrev !== undefined && lastPrev === lastNext;
}

function mergePolledStats(
  prev: LiveStatsResponse | null,
  next: LiveStatsResponse,
): LiveStatsResponse {
  if (!prev) return next;
  const sameViolations = areEvidenceArraysUnchanged(
    prev.recent_violations,
    next.recent_violations,
  );
  const sameEvidences = areEvidenceArraysUnchanged(
    prev.evidences,
    next.evidences,
  );
  if (!sameViolations && !sameEvidences) return next;
  return {
    ...next,
    recent_violations: sameViolations
      ? prev.recent_violations
      : next.recent_violations,
    evidences: sameEvidences ? prev.evidences : next.evidences,
  };
}

export interface UseCameraLivePollingOptions {
  camera?: CameraItem | null;
  liveCameraId: string;
  activeTab: CameraStudioTab;
  runningSession?: LiveSessionInfo;
  onRefreshAiEngine: () => Promise<unknown>;
  onInvalidateIncidents: () => void;
}

export function useCameraLivePolling({
  camera,
  liveCameraId,
  activeTab,
  runningSession,
  onRefreshAiEngine,
  onInvalidateIncidents,
}: UseCameraLivePollingOptions) {
  const { lastAlert } = useRealtime();
  const canManageCamera = useCan()("PPE_CAMERA_MANAGE");
  const [stats, setStats] = useState<LiveStatsResponse | null>(null);
  const prevViolationsCountRef = useRef<number | null>(null);
  const lastAutoSyncAtRef = useRef<number>(0);

  const isSessionActive =
    runningSession?.status === "running" ||
    runningSession?.status === "initializing" ||
    runningSession?.status === "reconnecting" ||
    stats?.status === "running" ||
    stats?.status === "initializing" ||
    stats?.status === "reconnecting";

  useEffect(() => {
    if (runningSession?.status === "stopped" && stats?.status === "running") {
      setStats((prev) => (prev ? { ...prev, status: "stopped" } : prev));
    }
  }, [runningSession?.status, stats?.status]);

  // Poll GET /api/live/{liveCameraId}/stats ONLY when session is active and Live tab is visible
  useEffect(() => {
    if (!liveCameraId || !isSessionActive || activeTab !== "live") return;
    let cancelled = false;

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const data = await aiTestService.getLiveStats(liveCameraId);
        if (!cancelled) {
          setStats((prev) => mergePolledStats(prev, data));
          if (canManageCamera && data.status === "running") {
            const now = Date.now();
            const syncedFps = computeSyncedLiveFps(data.metrics);
            if (syncedFps && now - lastAutoSyncAtRef.current >= 2500) {
              lastAutoSyncAtRef.current = now;
              void aiTestService
                .updateLiveConfig(liveCameraId, syncedFps)
                .catch(() => undefined);
            }
          }
        }
      } catch (err) {
        if (!cancelled && isAiEndpointNotFoundError(err)) {
          setStats((prev) => (prev ? { ...prev, status: "stopped" } : null));
          void onRefreshAiEngine();
        }
      }
    };

    void poll();
    const isBootstrapping =
      stats?.status === "initializing" ||
      runningSession?.status === "initializing";
    const timer = window.setInterval(() => {
      void poll();
    }, isBootstrapping ? 600 : 1200);

    const handleVisibility = () => {
      if (!document.hidden) {
        void poll();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [activeTab, canManageCamera, isSessionActive, liveCameraId, onRefreshAiEngine, runningSession?.status, stats?.status]);

  // Refresh DB Incidents on SSE violation alerts or sandbox live violation confirmation
  useEffect(() => {
    if (
      !lastAlert ||
      lastAlert.type !== "notification:ppe_violation" ||
      !camera
    ) {
      return;
    }
    const payload =
      lastAlert.data && typeof lastAlert.data === "object"
        ? (lastAlert.data as Record<string, unknown>)
        : null;
    const alertCamId =
      typeof payload?.cameraId === "string" ? payload.cameraId : undefined;
    const alertCamCode =
      typeof payload?.cameraCode === "string" ? payload.cameraCode : undefined;
    if (
      (alertCamId && alertCamId !== camera.id) ||
      (!alertCamId && alertCamCode && alertCamCode !== camera.code)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      onInvalidateIncidents();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [camera, lastAlert, onInvalidateIncidents]);

  useEffect(() => {
    const count = stats?.recent_violations?.length ?? 0;
    const prev = prevViolationsCountRef.current;
    prevViolationsCountRef.current = count;
    if (prev !== null && count > prev) {
      const timer = window.setTimeout(() => {
        onInvalidateIncidents();
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [onInvalidateIncidents, stats?.recent_violations?.length]);

  const recentViolations = stats?.recent_violations;
  const rawEvidences = stats?.evidences;

  const liveEvidences = useMemo<EvidenceItem[]>(
    () =>
      normalizeLiveEvidences(
        liveCameraId,
        recentViolations || rawEvidences
          ? ({
              camera_id: liveCameraId,
              recent_violations: recentViolations,
              evidences: rawEvidences,
            } satisfies LiveStatsResponse)
          : undefined,
      ),
    [liveCameraId, rawEvidences, recentViolations],
  );

  const effectiveStats: LiveStatsResponse | null =
    stats ??
    (runningSession
      ? {
          camera_id: liveCameraId,
          status: runningSession.status,
          reconnect_count: runningSession.reconnect_count,
          error: runningSession.error,
          metrics: runningSession.metrics,
        }
      : null);

  return {
    stats,
    setStats,
    isRunning: effectiveStats?.status === "running",
    effectiveStats,
    liveEvidences,
  };
}
