"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { aiTestService } from "@/services/ai-test.service";
import {
  buildCameraStartPayload,
  deriveLiveDefaultsFromConfig,
  findSessionForCamera,
  resolveInitialCameraSource,
  toSafeLiveCameraId,
  type CameraLiveFormValues,
} from "@/components/features/cameras/camera-live-helpers";
import type {
  LiveSessionInfo,
  LiveVideoItem,
  ModelInfo,
} from "@/types/ai-test.types";
import type { CameraItem } from "@/types";

export const liveEngineKeys = {
  all: ["ai-live-engine"] as const,
  sessions: () => [...liveEngineKeys.all, "sessions"] as const,
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

  const sessionsQuery = useQuery<LiveSessionInfo[]>({
    queryKey: liveEngineKeys.sessions(),
    queryFn: () => aiTestService.listLiveSessions(),
    enabled,
    refetchInterval: enabled ? pollIntervalMs : false,
    retry: 1,
  });

  const startMutation = useMutation({
    mutationFn: async ({
      camera,
      overrides,
    }: {
      camera: CameraItem;
      overrides?: Partial<CameraLiveFormValues>;
    }) => {
      const models = modelsQuery.data ?? [];
      const defaultModel =
        models.find((m) => m.is_default)?.path ?? models[0]?.path;
      const videos = videosQuery.data ?? [];
      const resolved = resolveInitialCameraSource(camera, videos);
      const defaults = deriveLiveDefaultsFromConfig(camera.config);

      const source = (overrides?.source ?? resolved.source).trim();
      if (!source) {
        throw new Error(
          `Camera ${camera.code} chưa có nguồn video hợp lệ. Mở Studio chi tiết để chọn video hoặc Upload & Stream.`,
        );
      }

      const payload = buildCameraStartPayload(camera, {
        ...defaults,
        model: overrides?.model ?? defaultModel ?? null,
        source,
        ...overrides,
      });

      return aiTestService.startLiveStream(payload);
    },
    onSuccess: (_res, { camera }) => {
      const liveId = toSafeLiveCameraId(camera);
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.stats(liveId) });
      toast.success(`Đã bật AI Live Tracking cho ${camera.code}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể khởi chạy AI Live Tracking",
      );
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
      void queryClient.invalidateQueries({ queryKey: liveEngineKeys.stats(liveId) });
      toast.success(`Đã dừng AI Live cho ${liveId}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Không thể dừng AI Live Session",
      );
    },
  });

  const sessionMap = useMemo(() => {
    const map = new Map<string, LiveSessionInfo>();
    for (const s of sessionsQuery.data ?? []) {
      map.set(s.camera_id, s);
    }
    return map;
  }, [sessionsQuery.data]);

  const getSessionForCamera = useCallback(
    (camera: Pick<CameraItem, "id" | "code">) =>
      findSessionForCamera(sessionMap, camera),
    [sessionMap],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      modelsQuery.refetch(),
      videosQuery.refetch(),
      sessionsQuery.refetch(),
    ]);
  }, [modelsQuery, videosQuery, sessionsQuery]);

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
    models: modelsQuery.data ?? [],
    videos: videosQuery.data ?? [],
    sessions: sessionsQuery.data ?? [],
    sessionMap,
    getSessionForCamera,
    isLoadingSessions: sessionsQuery.isLoading,
    isFetchingSessions: sessionsQuery.isFetching,
    startLive: startMutation.mutateAsync,
    isStartingLive: startMutation.isPending,
    startingCameraId: startMutation.variables?.camera.id ?? null,
    stopLive: stopMutation.mutateAsync,
    isStoppingLive: stopMutation.isPending,
    refreshAll,
  };
}

