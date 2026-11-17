"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import {
  buildCameraStartPayload,
  deriveLiveDefaultsFromConfig,
  findSessionForCamera,
  resolveInitialCameraSource,
  toSafeLiveCameraId,
  type CameraLiveFormValues,
} from "@/components/features/cameras/camera-live-helpers";
import type {
  LiveRuntimeConfigResponse,
  LiveSessionInfo,
  LiveVideoItem,
  ModelInfo,
} from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export const liveEngineKeys = {
  all: ["ai-live-engine"] as const,
  sessions: () => [...liveEngineKeys.all, "sessions"] as const,
  runtimeConfig: () => [...liveEngineKeys.all, "runtime-config"] as const,
  models: () => [...liveEngineKeys.all, "models"] as const,
  videos: () => [...liveEngineKeys.all, "videos"] as const,
  stats: (liveId: string) => [...liveEngineKeys.all, "stats", liveId] as const,
};

export function useCameraLiveSessions(options?: {
  enabled?: boolean;
  pollIntervalMs?: number;
}) {
  const enabled = options?.enabled ?? true;
  const pollIntervalMs = options?.pollIntervalMs ?? 2500;
  const queryClient = useQueryClient();

  const modelsQuery = useQuery<ModelInfo[]>({
    queryKey: liveEngineKeys.models(),
    queryFn: () => aiTestService.getModels(),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const videosQuery = useQuery<LiveVideoItem[]>({
    queryKey: liveEngineKeys.videos(),
    queryFn: () => aiTestService.listLiveVideos(),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });

  const runtimeConfigQuery = useQuery<LiveRuntimeConfigResponse | null>({
    queryKey: liveEngineKeys.runtimeConfig(),
    queryFn: async () => {
      try {
        return await aiTestService.getLiveRuntimeConfig();
      } catch (err) {
        if (isAiEndpointNotFoundError(err)) {
          return null;
        }
        throw err;
      }
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: (query) => (enabled && query.state.data !== null ? 15_000 : false),
    retry: false,
  });

  const sessionsQuery = useQuery<{
    sessions: LiveSessionInfo[];
    maxSessions: number | null;
  }>({
    queryKey: liveEngineKeys.sessions(),
    queryFn: () => aiTestService.listLiveSessionsWithMeta(),
    enabled,
    refetchInterval: enabled ? pollIntervalMs : false,
    retry: 1,
  });

  const productionMode =
    runtimeConfigQuery.data !== null &&
    (Boolean(runtimeConfigQuery.data) || sessionsQuery.data?.maxSessions !== null && sessionsQuery.data?.maxSessions !== undefined);
  const autoSyncEnabled = Boolean(runtimeConfigQuery.data?.auto_sync_enabled);
  const maxSessions =
    runtimeConfigQuery.data?.max_sessions ??
    sessionsQuery.data?.maxSessions ??
    (productionMode ? 16 : 4);

  const startMutation = useMutation({
    mutationFn: async ({
      camera,
      overrides,
    }: {
      camera: CameraItem;
      overrides?: Partial<CameraLiveFormValues>;
      silent?: boolean;
    }) => {
      const models = modelsQuery.data ?? [];
      const defaultModel =
        models.find((m) => m.is_default)?.path ?? models[0]?.path;
      const videos = videosQuery.data ?? [];
      const resolved = resolveInitialCameraSource(camera, videos, {
        productionMode,
      });
      const defaults = deriveLiveDefaultsFromConfig(camera.config);

      const source = (overrides?.source ?? resolved.source).trim();
      if (!source && !productionMode) {
        throw new Error(
          pickLocaleText(
            `Camera ${camera.code} chưa có nguồn video hợp lệ. Mở Studio chi tiết để chọn video hoặc Upload & Stream.`,
            `Camera ${camera.code} has no valid video source. Open Camera Studio to select a video or Upload & Stream.`,
          ),
        );
      }

      const payload = buildCameraStartPayload(
        camera,
        {
          ...defaults,
          cameraUuid: camera.id,
          model: overrides?.model ?? defaultModel ?? null,
          source,
          ...overrides,
        },
        { productionMode },
      );

      return aiTestService.startLiveStream(payload);
    },
    onSuccess: (_res, { camera, silent }) => {
      const liveId = toSafeLiveCameraId(camera);
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.stats(liveId) });
      if (!silent) {
        toast.success(
          pickLocaleText(
            `Đã bật AI Live Tracking cho ${camera.code}`,
            `Enabled AI Live Tracking for ${camera.code}`,
          ),
        );
      }
    },
    onError: (err, { silent }) => {
      if (!silent) {
        toast.error(
          err instanceof Error
            ? err.message
            : pickLocaleText(
                "Không thể khởi chạy AI Live Tracking",
                "Unable to start AI Live Tracking",
              ),
        );
      }
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (cameraOrLiveId: Pick<CameraItem, "id" | "code"> | string) => {
      const liveId = toSafeLiveCameraId(cameraOrLiveId);
      return aiTestService.stopLiveStream(liveId);
    },
    onSuccess: (_res, cameraOrLiveId) => {
      const liveId = toSafeLiveCameraId(cameraOrLiveId);
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.stats(liveId) });
      toast.success(
        pickLocaleText(
          `Đã dừng AI Live cho ${liveId}`,
          `Stopped AI Live for ${liveId}`,
        ),
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể dừng AI Live Session",
              "Unable to stop AI Live Session",
            ),
      );
    },
  });

  const triggerSyncMutation = useMutation({
    mutationFn: () => aiTestService.triggerLiveSync(),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
      toast.success(
        pickLocaleText(
          `Đã đồng bộ ${res.last_synced_count} luồng AI (${res.max_sessions} slot tối đa)`,
          `Synced ${res.last_synced_count} AI streams (${res.max_sessions} max slots)`,
        ),
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể đồng bộ camera 24/7",
              "Unable to sync 24/7 cameras",
            ),
      );
    },
  });

  const updateRuntimeConfigMutation = useMutation({
    mutationFn: (payload: { max_sessions?: number; trigger_sync?: boolean }) =>
      aiTestService.updateLiveRuntimeConfig(payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      toast.success(
        pickLocaleText(
          `Đã cập nhật AI Engine Runtime (${res.max_sessions} slot tối đa)`,
          `Updated AI Engine Runtime (${res.max_sessions} max slots)`,
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update AI runtime config");
    },
  });

  const sessions = useMemo(
    () => sessionsQuery.data?.sessions ?? [],
    [sessionsQuery.data?.sessions],
  );

  const sessionMap = useMemo(() => {
    const map = new Map<string, LiveSessionInfo>();
    for (const s of sessions) {
      map.set(s.camera_id, s);
    }
    return map;
  }, [sessions]);

  const getSessionForCamera = useCallback(
    (camera: Pick<CameraItem, "id" | "code">) =>
      findSessionForCamera(sessionMap, camera),
    [sessionMap],
  );

  const stopOrphanedSessions = useCallback(
    async (liveIds: string[]) => {
      if (liveIds.length === 0) return;
      await Promise.allSettled(
        liveIds.map((id) => aiTestService.stopLiveStream(toSafeLiveCameraId(id))),
      );
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
    },
    [queryClient],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      modelsQuery.refetch(),
      videosQuery.refetch(),
      runtimeConfigQuery.refetch(),
      sessionsQuery.refetch(),
    ]);
  }, [modelsQuery, runtimeConfigQuery, videosQuery, sessionsQuery]);

  const engineOnline =
    !sessionsQuery.isError && (!modelsQuery.isError || Boolean(sessionsQuery.data));

  return {
    engineOnline,
    engineError:
      sessionsQuery.error instanceof Error
        ? sessionsQuery.error.message
        : modelsQuery.error instanceof Error
          ? modelsQuery.error.message
          : null,
    productionMode,
    maxSessions,
    autoSyncEnabled,
    dispatchEnabled: runtimeConfigQuery.data?.dispatch_enabled ?? false,
    syncStatus: runtimeConfigQuery.data?.sync ?? null,
    models: modelsQuery.data ?? [],
    videos: videosQuery.data ?? [],
    sessions,
    sessionMap,
    getSessionForCamera,
    isLoadingSessions: sessionsQuery.isLoading,
    isFetchingSessions: sessionsQuery.isFetching,
    startLive: startMutation.mutateAsync,
    isStartingLive: startMutation.isPending,
    startingCameraId: startMutation.variables?.camera.id ?? null,
    stopLive: stopMutation.mutateAsync,
    stopOrphanedSessions,
    isStoppingLive: stopMutation.isPending,
    triggerSync: triggerSyncMutation.mutateAsync,
    isSyncingLive: triggerSyncMutation.isPending,
    updateRuntimeConfig: updateRuntimeConfigMutation.mutateAsync,
    isUpdatingRuntimeConfig: updateRuntimeConfigMutation.isPending,
    refreshAll,
  };
}

