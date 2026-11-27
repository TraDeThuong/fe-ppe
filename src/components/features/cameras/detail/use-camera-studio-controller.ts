"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { extractPlottedBoundaryPoints } from "@/components/features/sites/restricted-area-drawer";
import {
  buildCameraHotConfigPayload,
  buildCameraStartPayload,
  canAutoStartCameraSource,
  deriveLiveDefaultsFromConfig,
  resolveCameraSourceIssue,
  toLiveRoiPolygons,
  toSafeLiveCameraId,
} from "@/components/features/cameras/camera-live-helpers";
import {
  cameraKeys,
  useCameraConfig,
  useCameraDetail,
  useCameraLiveSessions,
  useUpdateCamera,
  useUpdateCameraConfig,
} from "@/hooks/cameras";
import {
  useDeleteCameraSafetyConfig,
  useEffectiveSafetyConfig,
  useUpdateCameraSafetyConfig,
} from "@/hooks/sites/use-site-safety-config";
import { useCan } from "@/hooks/use-can";
import { useSitesCatalog } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import { cameraService } from "@/services/camera.service";
import { incidentService } from "@/services/incident.service";
import { useCameraLivePolling } from "./use-camera-live-polling";
import type { CameraStudioTab } from "./camera-studio-header";
import type { EvidenceItem } from "@/types/ai-test.types";
import type { RestrictedAreaPoint, UpdateCameraPayload } from "@/types";

export function useCameraStudioController(cameraId: string) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const queryClient = useQueryClient();
  const can = useCan();
  const canReadCamera = can("PPE_CAMERA_READ");
  const canManage = can("PPE_CAMERA_MANAGE");
  const canReadSites = can("PPE_SITE_READ");
  const canReadSafety = can("PPE_SAFETY_CONFIG_READ");
  const canManageSafety = can("PPE_SAFETY_CONFIG_MANAGE");
  const canPlotRoi = canManage && can("PPE_RESTRICTED_AREA_MANAGE");
  const canReadIncidents = can("PPE_INCIDENT_READ");

  const [activeTab, setActiveTabState] = useState<CameraStudioTab>("live");
  const [visitedIncidentsTab, setVisitedIncidentsTab] = useState(false);
  const [visitedDeviceTab, setVisitedDeviceTab] = useState(false);
  const isIncidentsTabReady = visitedIncidentsTab || activeTab === "incidents";
  const isDeviceTabReady = visitedDeviceTab || activeTab === "device";
  const setActiveTab = useCallback((nextTab: CameraStudioTab) => {
    setActiveTabState(nextTab);
    if (nextTab === "incidents") setVisitedIncidentsTab(true);
    if (nextTab === "device") setVisitedDeviceTab(true);
  }, []);

  const {
    data: camera,
    isLoading: cameraLoading,
    isFetching: cameraFetching,
    refetch: refetchCamera,
  } = useCameraDetail(cameraId, canReadCamera);

  const { data: sitesCatalog = [] } = useSitesCatalog({
    enabled: Boolean(camera?.siteId && !camera?.siteName) && canReadSites,
  });
  const getSiteName = useCallback(
    (siteId?: string | null) =>
      sitesCatalog.find((s) => s.id === siteId)?.name ??
      (isVietnamese ? "Công trường xây dựng" : "Construction Site"),
    [isVietnamese, sitesCatalog],
  );

  const {
    data: cameraConfig,
    isFetching: configFetching,
    refetch: refetchConfig,
  } = useCameraConfig(cameraId, Boolean(cameraId) && canReadCamera);

  const updateCameraMutation = useUpdateCamera();
  const updateConfigMutation = useUpdateCameraConfig();

  const {
    data: effectiveSafety,
    isFetching: safetyFetching,
    refetch: refetchSafety,
  } = useEffectiveSafetyConfig(
    { siteId: camera?.siteId ?? "", cameraId: camera?.id },
    Boolean(camera?.siteId && camera?.id && canReadSafety),
  );
  const updateCameraSafetyMutation = useUpdateCameraSafetyConfig();
  const deleteCameraSafetyMutation = useDeleteCameraSafetyConfig();

  const needsServerVideos =
    canManage &&
    (isDeviceTabReady ||
      camera?.sourceType === "FILE" ||
      Boolean(camera?.streamUrl && !camera.streamUrl.includes("://")));

  const {
    engineOnline,
    engineError,
    productionMode,
    autoSyncEnabled,
    models,
    videos: liveVideos,
    getSessionForCamera,
    refreshAll: refreshAiEngine,
  } = useCameraLiveSessions({
    enabled: canReadCamera,
    pollIntervalMs: 8000,
    includeVideos: needsServerVideos,
  });

  // Lightweight count query (limit=1) for Tab 02 Incidents & Evidence badge while on Tab 01
  const {
    data: incidentsData,
    isFetching: incidentsFetching,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ["camera-detail-incidents", cameraId, "count"],
    queryFn: () =>
      incidentService.getIncidents({ cameraId, limit: 1, sortOrder: "desc" }),
    enabled: Boolean(cameraId) && canReadIncidents,
    staleTime: 15_000,
  });

  const dbIncidentsTotal =
    incidentsData?.meta?.total ?? incidentsData?.items?.length ?? 0;

  const [overrideSource, setOverrideSource] = useState<string>("");
  const [overrideHighlightTick, setOverrideHighlightTick] = useState<number>(0);
  const [diagnosticsHighlightTick, setDiagnosticsHighlightTick] =
    useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [targetFps, setTargetFps] = useState<number>(25);
  const [aiFps, setAiFps] = useState<number>(15);
  const [confirmHelmetSec, setConfirmHelmetSec] = useState<number>(2.0);
  const [confirmVestSec, setConfirmVestSec] = useState<number>(4.0);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
  const [cooldownSec, setCooldownSec] = useState<number>(30);

  const [enableNoHelmet, setEnableNoHelmet] = useState<boolean>(true);
  const [enableNoVest, setEnableNoVest] = useState<boolean>(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState<boolean>(true);
  const [enableSceneCut, setEnableSceneCut] = useState<boolean>(true);
  const [configHydrated, setConfigHydrated] = useState<boolean>(false);

  const [streamNonce, setStreamNonce] = useState<number>(() => Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    items: EvidenceItem[];
    index: number;
  }>({ open: false, items: [], index: 0 });

  const liveCameraId = useMemo(
    () => (camera ? toSafeLiveCameraId(camera) : toSafeLiveCameraId(cameraId)),
    [camera, cameraId],
  );

  useEffect(() => {
    if (models.length === 0) return;
    if (!models.some((m) => m.path === selectedModel)) {
      const def = models.find((m) => m.is_default) ?? models[0];
      setSelectedModel(def.path);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (!cameraConfig || configHydrated) return;
    const defaults = deriveLiveDefaultsFromConfig(cameraConfig, effectiveSafety);
    setTargetFps(defaults.targetFps);
    setAiFps(defaults.aiFps);
    setConfirmHelmetSec(defaults.confirmHelmetSec);
    setConfirmVestSec(defaults.confirmVestSec);
    if (defaults.confidenceThreshold !== undefined) {
      setConfidenceThreshold(defaults.confidenceThreshold);
    }
    if (defaults.cooldownSec !== undefined) {
      setCooldownSec(defaults.cooldownSec);
    }
    setEnableNoHelmet(defaults.enableNoHelmet);
    setEnableNoVest(defaults.enableNoVest);
    setEnableRestrictedArea(defaults.enableRestrictedArea);
    setEnableSceneCut(defaults.enableSceneCut);
    setConfigHydrated(true);
  }, [cameraConfig, configHydrated, effectiveSafety]);

  useEffect(() => {
    if (!effectiveSafety) return;
    const defaults = deriveLiveDefaultsFromConfig(cameraConfig, effectiveSafety);
    setEnableNoHelmet(defaults.enableNoHelmet);
    setEnableNoVest(defaults.enableNoVest);
    setEnableRestrictedArea(defaults.enableRestrictedArea);
    setConfirmHelmetSec(defaults.confirmHelmetSec);
    setConfirmVestSec(defaults.confirmVestSec);
    if (defaults.confidenceThreshold !== undefined) {
      setConfidenceThreshold(defaults.confidenceThreshold);
    }
    if (defaults.cooldownSec !== undefined) {
      setCooldownSec(defaults.cooldownSec);
    }
    const configuredModelPath = effectiveSafety.modelVersion?.modelPath;
    if (
      typeof configuredModelPath === "string" &&
      configuredModelPath.trim() &&
      models.length > 0
    ) {
      const targetName = configuredModelPath.trim().split("/").pop();
      const matched = models.find(
        (m) =>
          m.path === configuredModelPath.trim() ||
          m.path.endsWith(`/${targetName}`),
      );
      if (matched) {
        setSelectedModel(matched.path);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSafety, models]);

  const runningSession = useMemo(
    () => (camera ? getSessionForCamera(camera) : undefined),
    [camera, getSessionForCamera],
  );

  const dbRunnableSource = useMemo(() => {
    if (!camera) return "";
    if (!canAutoStartCameraSource(camera, liveVideos, { productionMode })) {
      return "";
    }
    return (camera.streamUrl ?? "").trim();
  }, [camera, liveVideos, productionMode]);

  const effectiveSource = useMemo(() => {
    if (overrideSource.trim()) return overrideSource.trim();
    if (runningSession?.status === "running" && runningSession.source) {
      return runningSession.source;
    }
    return dbRunnableSource;
  }, [dbRunnableSource, overrideSource, runningSession]);

  const sourceNote = useMemo(() => {
    if (!camera) return null;
    if (overrideSource.trim() || runningSession?.status === "running") {
      return null;
    }
    return resolveCameraSourceIssue(camera, liveVideos, { productionMode });
  }, [camera, liveVideos, overrideSource, productionMode, runningSession]);

  useEffect(() => {
    if (!runningSession || runningSession.status !== "running") return;
    if (typeof runningSession.target_fps === "number") {
      setTargetFps(runningSession.target_fps);
    }
    if (typeof runningSession.ai_fps === "number") {
      setAiFps(runningSession.ai_fps);
    }
  }, [runningSession]);

  const invalidateCameraIncidents = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["camera-detail-incidents", cameraId],
    });
  }, [cameraId, queryClient]);

  const {
    stats,
    setStats,
    isRunning,
    effectiveStats,
    liveEvidences,
  } = useCameraLivePolling({
    camera,
    liveCameraId,
    activeTab,
    runningSession,
    onRefreshAiEngine: refreshAiEngine,
    onInvalidateIncidents: invalidateCameraIncidents,
  });

  const totalIncidentsCount = Math.max(dbIncidentsTotal, liveEvidences.length);

  const syncCameraProcessingState = useCallback(
    async (camId: string, processingEnabled: boolean) => {
      const req = cameraService.updateCameraConfig(camId, { processingEnabled });
      await (autoSyncEnabled ? req : req.catch(() => undefined));
      void queryClient.invalidateQueries({ queryKey: cameraKeys.config(camId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.detail(camId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
    },
    [autoSyncEnabled, queryClient],
  );

  const handleStartStream = useCallback(
    async (nextOverride?: string, options?: { silent?: boolean }) => {
      if (!camera || !canManage) return;
      const sourceToRun = (nextOverride ?? effectiveSource).trim();
      if (!sourceToRun && !productionMode) {
        if (!options?.silent) {
          toast.error(
            isVietnamese
              ? "Camera chưa có nguồn AI khả dụng trực tiếp — hãy gắn Nguồn Override trong Tab 03."
              : "Camera has no directly runnable AI source — set an Override Source in Tab 03.",
          );
        }
        return;
      }

      setIsStarting(true);
      try {
        if (
          camera.id &&
          canManage &&
          (autoSyncEnabled || cameraConfig?.processingEnabled !== true)
        ) {
          await syncCameraProcessingState(camera.id, true);
        }

        const payload = buildCameraStartPayload(
          camera,
          {
            source: sourceToRun,
            cameraUuid: camera.id,
            model: selectedModel || null,
            targetFps,
            aiFps,
            confirmHelmetSec,
            confirmVestSec,
            confidenceThreshold,
            cooldownSec,
            enableNoHelmet,
            enableNoVest,
            enableRestrictedArea,
            enableSceneCut,
            roiPolygon: cameraConfig?.roiPolygon,
          },
          {
            productionMode,
            useRegisteredSource: !nextOverride && !overrideSource.trim(),
          },
        );
        const started = await aiTestService.startLiveStream(payload);
        setStreamNonce(Date.now());
        const fresh = await aiTestService
          .getLiveStats(started.camera_id)
          .catch(() => null);
        setStats(
          fresh ?? { camera_id: started.camera_id, status: "initializing" },
        );
        void refreshAiEngine();
        if (fresh?.status === "running" && !options?.silent) {
          toast.success(
            isVietnamese
              ? `Đã bật Live AI Tracking cho ${liveCameraId}`
              : `Enabled Live AI Tracking for ${liveCameraId}`,
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : isVietnamese
              ? "Không thể khởi chạy Live Stream"
              : "Unable to start Live Stream",
        );
      } finally {
        setIsStarting(false);
      }
    },
    [
      aiFps,
      autoSyncEnabled,
      camera,
      cameraConfig?.processingEnabled,
      cameraConfig?.roiPolygon,
      canManage,
      confirmHelmetSec,
      confirmVestSec,
      confidenceThreshold,
      cooldownSec,
      effectiveSource,
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      enableSceneCut,
      isVietnamese,
      liveCameraId,
      overrideSource,
      productionMode,
      refreshAiEngine,
      selectedModel,
      setStats,
      syncCameraProcessingState,
      targetFps,
    ],
  );

  const handleUploadOverrideStream = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const uploaded = await aiTestService.uploadVideo(file);
        const uploadedSource =
          uploaded.filename ||
          uploaded.path ||
          uploaded.video_name ||
          file.name;
        setOverrideSource(uploadedSource);
        setActiveTab("live");
        await handleStartStream(uploadedSource);
      } catch (error) {
        if (isAiEndpointNotFoundError(error)) {
          toast.error(
            isVietnamese
              ? "AI Production Server (24/7) không hỗ trợ upload video offline — hãy chọn video sẵn có trên server hoặc RTSP."
              : "AI Production Server (24/7) does not support offline video uploads — choose a server video or RTSP stream.",
          );
        } else {
          toast.error(
            error instanceof Error
              ? error.message
              : isVietnamese
                ? "Upload & stream thất bại"
                : "Upload & stream failed",
          );
        }
      } finally {
        setIsUploading(false);
      }
    },
    [handleStartStream, isVietnamese],
  );

  const handleApplyOverrideStream = useCallback(
    async (nextSource: string) => {
      const cleaned = nextSource.trim();
      if (!cleaned) return;
      setOverrideSource(cleaned);
      setActiveTab("live");
      await handleStartStream(cleaned);
    },
    [handleStartStream],
  );

  const handleStopStream = useCallback(async () => {
    if (!canManage) return;
    setIsStopping(true);
    try {
      if (camera?.id && canManage) {
        await syncCameraProcessingState(camera.id, false);
      }

      try {
        await aiTestService.stopLiveStream(liveCameraId);
      } catch (stopErr) {
        if (!(camera?.id && isAiEndpointNotFoundError(stopErr))) {
          throw stopErr;
        }
      }
      setStats((prev) => (prev ? { ...prev, status: "stopped" } : prev));
      void refreshAiEngine();
      toast.success(
        isVietnamese
          ? `Đã dừng Live Tracking ${liveCameraId}`
          : `Stopped Live Tracking ${liveCameraId}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isVietnamese
            ? "Không thể dừng Live Stream"
            : "Unable to stop Live Stream",
      );
    } finally {
      setIsStopping(false);
    }
  }, [
    camera?.id,
    canManage,
    isVietnamese,
    liveCameraId,
    refreshAiEngine,
    setStats,
    syncCameraProcessingState,
  ]);

  const handleSaveToDb = useCallback(async () => {
    if (!camera || (!canManage && !canManageSafety)) return;
    const willSaveSafety = Boolean(canManageSafety && camera.siteId);
    if (canManage) {
      await updateConfigMutation.mutateAsync({
        cameraId: camera.id,
        silent: willSaveSafety,
        payload: {
          captureFps: Math.min(30, Math.max(1, Math.round(targetFps))),
          processingEnabled:
            enableNoHelmet || enableNoVest || enableRestrictedArea,
        },
      });
    }
    if (willSaveSafety) {
      const safeHelmetSec = Math.min(
        30,
        Math.max(1, Number(confirmHelmetSec.toFixed(1))),
      );
      const safeVestSec = Math.min(
        30,
        Math.max(1, Number(confirmVestSec.toFixed(1))),
      );
      await updateCameraSafetyMutation.mutateAsync({
        cameraId: camera.id,
        payload: {
          confidenceThreshold: Math.min(
            0.99,
            Math.max(0.1, Number(confidenceThreshold.toFixed(2))),
          ),
          helmetConfirmationDuration: safeHelmetSec,
          confirmationDuration: safeHelmetSec,
          vestConfirmationDuration: safeVestSec,
          cooldownDuration: Math.min(300, Math.max(5, Math.round(cooldownSec))),
          enableNoHelmet,
          enableNoVest,
          enableRestrictedArea,
        },
      });
    }
    if (canManage && stats?.status === "running") {
      await aiTestService
        .updateLiveConfig(
          liveCameraId,
          buildCameraHotConfigPayload({
            targetFps,
            aiFps,
            confirmHelmetSec,
            confirmVestSec,
            confidenceThreshold,
            cooldownSec,
            enableNoHelmet,
            enableNoVest,
            enableRestrictedArea,
            enableSceneCut,
            roiPolygon: cameraConfig?.roiPolygon,
          }),
        )
        .catch(() => undefined);
    }
  }, [
    aiFps,
    camera,
    cameraConfig?.roiPolygon,
    canManage,
    canManageSafety,
    confidenceThreshold,
    confirmHelmetSec,
    confirmVestSec,
    cooldownSec,
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    enableSceneCut,
    liveCameraId,
    stats?.status,
    targetFps,
    updateCameraSafetyMutation,
    updateConfigMutation,
  ]);

  const handleResetToSiteRules = useCallback(() => {
    if (!camera || !canManageSafety) return;
    void deleteCameraSafetyMutation.mutateAsync(camera.id).catch(() => undefined);
  }, [camera, canManageSafety, deleteCameraSafetyMutation]);

  const handleSaveCameraPolygon = useCallback(
    async (points: RestrictedAreaPoint[]) => {
      if (!camera || !canPlotRoi) return;
      await updateConfigMutation.mutateAsync({
        cameraId: camera.id,
        silent: true,
        payload: {
          roiPolygon: points.length >= 3 ? points : null,
        },
      });
      setEnableRestrictedArea(true);
      if (stats?.status === "running") {
        const roiPolygons = toLiveRoiPolygons(points);
        await aiTestService
          .updateLiveConfig(liveCameraId, {
            roi_polygons: roiPolygons ?? undefined,
            enable_restricted_area: true,
          })
          .catch(() => undefined);
      }
      toast.success(
        isVietnamese
          ? `Đã lưu & áp dụng Vùng cấm (${points.length} điểm) cho ${camera.name}`
          : `Saved & applied Restricted Area (${points.length} pts) for ${camera.name}`,
      );
    },
    [
      camera,
      canPlotRoi,
      isVietnamese,
      liveCameraId,
      stats?.status,
      updateConfigMutation,
    ],
  );

  const cameraRoiPointsCount = useMemo(
    () => extractPlottedBoundaryPoints(cameraConfig?.roiPolygon).length,
    [cameraConfig?.roiPolygon],
  );

  const handleOpenLightbox = useCallback(
    (items: EvidenceItem[], index: number) => {
      setLightbox({
        open: true,
        items,
        index: Math.max(0, Math.min(index, items.length - 1)),
      });
    },
    [],
  );

  const handleEditCamera = async (id: string, payload: UpdateCameraPayload) => {
    await updateCameraMutation.mutateAsync({ id, payload });
  };

  const handleJumpToOverrideTab = useCallback(() => {
    setOverrideHighlightTick((n) => n + 1);
    setActiveTab("device");
  }, [setActiveTab]);

  const handleJumpToDiagnosticsTab = useCallback(() => {
    setDiagnosticsHighlightTick((n) => n + 1);
    setActiveTab("device");
  }, [setActiveTab]);

  const handleClearOverride = useCallback(() => {
    setOverrideSource("");
    toast.success(
      isVietnamese
        ? "Đã khôi phục nguồn theo hồ sơ Camera DB"
        : "Restored stream source from Camera DB",
    );
  }, [isVietnamese]);

  const handleRefreshAll = useCallback(() => {
    setIsManualRefreshing(true);
    invalidateCameraIncidents();
    void Promise.all([
      refetchCamera(),
      refetchConfig(),
      camera?.siteId && camera?.id && canReadSafety
        ? refetchSafety()
        : Promise.resolve(),
      canReadIncidents ? refetchIncidents() : Promise.resolve(),
      queryClient.invalidateQueries({
        queryKey: cameraKeys.healthLogs(cameraId),
      }),
      refreshAiEngine(),
    ]).finally(() => {
      setIsManualRefreshing(false);
    });
  }, [
    camera?.id,
    camera?.siteId,
    cameraId,
    canReadIncidents,
    canReadSafety,
    invalidateCameraIncidents,
    queryClient,
    refetchCamera,
    refetchConfig,
    refetchIncidents,
    refetchSafety,
    refreshAiEngine,
  ]);

  const activeModelName =
    models.find((m) => m.path === selectedModel)?.name ??
    (selectedModel || "best");

  return {
    isVietnamese,
    getSiteName,
    canManage,
    canManageSafety,
    canPlotRoi,
    camera,
    cameraLoading,
    cameraConfig,
    effectiveSafety,
    engineOnline,
    engineError,
    productionMode,
    models,
    liveVideos,
    activeModelName,
    liveCameraId,
    activeTab,
    isIncidentsTabReady,
    isDeviceTabReady,
    setActiveTab,
    overrideSource,
    overrideHighlightTick,
    diagnosticsHighlightTick,
    selectedModel,
    setSelectedModel,
    targetFps,
    setTargetFps,
    aiFps,
    setAiFps,
    confirmHelmetSec,
    setConfirmHelmetSec,
    confirmVestSec,
    setConfirmVestSec,
    confidenceThreshold,
    setConfidenceThreshold,
    cooldownSec,
    setCooldownSec,
    enableNoHelmet,
    setEnableNoHelmet,
    enableNoVest,
    setEnableNoVest,
    enableRestrictedArea,
    setEnableRestrictedArea,
    enableSceneCut,
    setEnableSceneCut,
    effectiveSource,
    sourceNote,
    isRunning,
    effectiveStats,
    stats,
    streamNonce,
    setStreamNonce,
    isStarting,
    isUploading,
    isStopping,
    isSavingDb:
      updateConfigMutation.isPending || updateCameraSafetyMutation.isPending,
    isResettingRules: deleteCameraSafetyMutation.isPending,
    isRefreshing:
      isManualRefreshing ||
      cameraFetching ||
      configFetching ||
      safetyFetching ||
      incidentsFetching,
    isUpdatingCamera: updateCameraMutation.isPending,
    liveEvidences,
    totalIncidentsCount,
    cameraRoiPointsCount,
    editOpen,
    setEditOpen,
    restrictedModalOpen,
    setRestrictedModalOpen,
    lightbox,
    setLightbox,
    handleRefreshAll,
    handleStartDefaultStream: () => void handleStartStream(),
    handleStopStreamClick: () => void handleStopStream(),
    handleSaveToDbClick: () => void handleSaveToDb(),
    handleResetToSiteRules,
    handleSaveCameraPolygon,
    handleOpenLightbox,
    handleEditCamera,
    handleJumpToOverrideTab,
    handleJumpToDiagnosticsTab,
    handleApplyOverrideClick: (next: string) =>
      void handleApplyOverrideStream(next),
    handleUploadOverrideClick: (file: File) =>
      void handleUploadOverrideStream(file),
    handleClearOverride,
  };
}
