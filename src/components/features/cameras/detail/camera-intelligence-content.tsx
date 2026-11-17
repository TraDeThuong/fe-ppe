"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { NM } from "@/components/features/ai-test/nm-styles";
import { normalizeLiveEvidences } from "@/components/features/ai-test/ai-test-utils";
import { EvidenceGalleryPanel } from "@/components/features/ai-test/evidence-gallery-panel";
import { EvidenceLightboxModal } from "@/components/features/ai-test/evidence-lightbox-modal";
import {
  CameraHealthDialog,
  EditCameraModal,
} from "@/components/features/cameras";
import {
  extractPlottedBoundaryPoints,
  RestrictedAreaDrawer,
} from "@/components/features/sites/restricted-area-drawer";
import {
  buildCameraHotConfigPayload,
  buildCameraStartPayload,
  canAutoStartCameraSource,
  deriveLiveDefaultsFromConfig,
  mergeCameraEvidences,
  normalizeIncidentEvidences,
  resolveCameraSourceIssue,
  toLiveRoiPolygons,
  toSafeLiveCameraId,
} from "@/components/features/cameras/camera-live-helpers";
import {
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
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import { incidentService } from "@/services/incident.service";
import { Loader } from "@/components/ui/loader";
import { CameraIncidentsDeviceTab } from "./camera-incidents-device-tab";
import { CameraLiveControlDeck } from "./camera-live-control-deck";
import { CameraLiveTelemetry } from "./camera-live-telemetry";
import { CameraLiveViewport } from "./camera-live-viewport";
import {
  CameraStudioHeader,
  type CameraStudioTab,
} from "./camera-studio-header";
import type { EvidenceItem, LiveStatsResponse } from "@/types/ai-test.types";
import type { RestrictedAreaPoint, UpdateCameraPayload } from "@/types";

export interface CameraIntelligenceContentProps {
  cameraId: string;
}

function getEvidenceKey(item: {
  event_id?: string;
  evidence_id?: string;
  id?: string;
  filename?: string;
}): string | undefined {
  return item.event_id ?? item.evidence_id ?? item.id ?? item.filename;
}

function areEvidenceArraysUnchanged<
  T extends { event_id?: string; evidence_id?: string; id?: string; filename?: string },
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

export function CameraIntelligenceContent({
  cameraId,
}: CameraIntelligenceContentProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const canManage = useCan()("PPE_CAMERA_MANAGE");
  const { getSiteName } = useEntityLookup();

  const {
    data: camera,
    isLoading: cameraLoading,
    refetch: refetchCamera,
  } = useCameraDetail(cameraId);

  const { data: cameraConfig, refetch: refetchConfig } = useCameraConfig(
    cameraId,
    Boolean(cameraId),
  );

  const updateCameraMutation = useUpdateCamera();
  const updateConfigMutation = useUpdateCameraConfig();

  // Effective safety rules: Camera Override -> Site Level -> System Default
  const { data: effectiveSafety } = useEffectiveSafetyConfig(
    { siteId: camera?.siteId ?? "", cameraId: camera?.id },
    Boolean(camera?.siteId && camera?.id),
  );
  const updateCameraSafetyMutation = useUpdateCameraSafetyConfig();
  const deleteCameraSafetyMutation = useDeleteCameraSafetyConfig();

  const {
    engineOnline,
    engineError,
    productionMode,
    autoSyncEnabled,
    models,
    videos: liveVideos,
    getSessionForCamera,
    refreshAll: refreshAiEngine,
  } = useCameraLiveSessions({ enabled: true, pollIntervalMs: 3000 });

  const {
    data: incidentsData,
    isLoading: incidentsLoading,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ["camera-detail-incidents", cameraId],
    queryFn: () =>
      incidentService.getIncidents({ cameraId, limit: 30, sortOrder: "desc" }),
    enabled: Boolean(cameraId),
    staleTime: 15_000,
  });

  const incidents = useMemo(() => incidentsData?.items ?? [], [incidentsData]);

  const [activeTab, setActiveTab] = useState<CameraStudioTab>("live");
  const [overrideSource, setOverrideSource] = useState<string>("");
  const [overrideHighlightTick, setOverrideHighlightTick] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [targetFps, setTargetFps] = useState<number>(25);
  const [aiFps, setAiFps] = useState<number>(15);
  const [confirmHelmetSec, setConfirmHelmetSec] = useState<number>(2.0);
  const [confirmVestSec, setConfirmVestSec] = useState<number>(4.0);

  const [enableNoHelmet, setEnableNoHelmet] = useState<boolean>(true);
  const [enableNoVest, setEnableNoVest] = useState<boolean>(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState<boolean>(true);
  const [enableSceneCut, setEnableSceneCut] = useState<boolean>(true);
  const [configHydrated, setConfigHydrated] = useState<boolean>(false);

  const [stats, setStats] = useState<LiveStatsResponse | null>(null);
  const [statsCheckedFor, setStatsCheckedFor] = useState<string | null>(null);
  const [streamNonce, setStreamNonce] = useState<number>(() => Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const [pingOpen, setPingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    items: EvidenceItem[];
    index: number;
  }>({ open: false, items: [], index: 0 });

  const autoStartedForRef = useRef<string | null>(null);
  const userStoppedRef = useRef<boolean>(false);
  const prevViolationsCountRef = useRef<number | null>(null);

  const liveCameraId = useMemo(
    () => (camera ? toSafeLiveCameraId(camera) : toSafeLiveCameraId(cameraId)),
    [camera, cameraId],
  );

  // Sync default AI model
  useEffect(() => {
    if (models.length === 0) return;
    if (!models.some((m) => m.path === selectedModel)) {
      const def = models.find((m) => m.is_default) ?? models[0];
      setSelectedModel(def.path);
    }
  }, [models, selectedModel]);

  // Hydrate live defaults from CameraConfigItem once (FPS / processing)
  useEffect(() => {
    if (!cameraConfig || configHydrated) return;
    const defaults = deriveLiveDefaultsFromConfig(cameraConfig, effectiveSafety);
    setTargetFps(defaults.targetFps);
    setAiFps(defaults.aiFps);
    setEnableNoHelmet(defaults.enableNoHelmet);
    setEnableNoVest(defaults.enableNoVest);
    setEnableRestrictedArea(defaults.enableRestrictedArea);
    setEnableSceneCut(defaults.enableSceneCut);
    setConfigHydrated(true);
  }, [cameraConfig, configHydrated, effectiveSafety]);

  // Re-sync safety rules whenever effective config (Site / Camera override) changes
  useEffect(() => {
    if (!effectiveSafety) return;
    const defaults = deriveLiveDefaultsFromConfig(cameraConfig, effectiveSafety);
    setEnableNoHelmet(defaults.enableNoHelmet);
    setEnableNoVest(defaults.enableNoVest);
    setEnableRestrictedArea(defaults.enableRestrictedArea);
    setConfirmHelmetSec(defaults.confirmHelmetSec);
    setConfirmVestSec(defaults.confirmVestSec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSafety]);

  const runningSession = useMemo(
    () => (camera ? getSessionForCamera(camera) : undefined),
    [camera, getSessionForCamera],
  );

  const dbRunnableSource = useMemo(() => {
    if (!camera) return "";
    if (!canAutoStartCameraSource(camera, liveVideos, { productionMode })) {
      return "";
    }
    if (String(camera.sourceType).toUpperCase() === "WEBCAM") {
      const trimmed = (camera.streamUrl ?? "").trim();
      return /^[0-9]$/.test(trimmed) ? trimmed : "0";
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

  // Sync FPS from an already-running session
  useEffect(() => {
    if (!runningSession || runningSession.status !== "running") return;
    if (typeof runningSession.target_fps === "number") {
      setTargetFps(runningSession.target_fps);
    }
    if (typeof runningSession.ai_fps === "number") {
      setAiFps(runningSession.ai_fps);
    }
  }, [runningSession]);

  // Poll GET /api/live/{liveCameraId}/stats every 800ms (continuous tracking)
  useEffect(() => {
    if (!liveCameraId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await aiTestService.getLiveStats(liveCameraId);
        if (!cancelled) {
          setStats((prev) => mergePolledStats(prev, data));
        }
      } catch {
        if (!cancelled) {
          setStats((prev) =>
            prev && prev.status === "running"
              ? { ...prev, status: "stopped" }
              : prev,
          );
        }
      } finally {
        if (!cancelled) {
          setStatsCheckedFor((prev) =>
            prev === liveCameraId ? prev : liveCameraId,
          );
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 800);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveCameraId]);

  const handleStartStream = useCallback(
    async (nextOverride?: string, options?: { silent?: boolean }) => {
      if (!camera) return;
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

      userStoppedRef.current = false;
      setIsStarting(true);
      try {
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
            enableNoHelmet,
            enableNoVest,
            enableRestrictedArea,
            enableSceneCut,
            roiPolygon: cameraConfig?.roiPolygon,
          },
          { productionMode },
        );
        await aiTestService.startLiveStream(payload);
        setStreamNonce(Date.now());
        const fresh = await aiTestService
          .getLiveStats(liveCameraId)
          .catch(() => null);
        if (fresh) setStats(fresh);
        void refreshAiEngine();
        if (!options?.silent) {
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
      camera,
      confirmHelmetSec,
      confirmVestSec,
      effectiveSource,
      enableNoHelmet,
      enableNoVest,
      enableRestrictedArea,
      enableSceneCut,
      liveCameraId,
      productionMode,
      refreshAiEngine,
      selectedModel,
      targetFps,
    ],
  );

  // Auto-Start AI Live once on entering /cameras/[id] if DB camera source is directly runnable
  useEffect(() => {
    if (!camera || !engineOnline) return;
    if (autoSyncEnabled && camera.status === "ONLINE") return;
    if (statsCheckedFor !== liveCameraId) return;
    if (autoStartedForRef.current === camera.id) return;

    if (stats?.status === "running" || runningSession?.status === "running") {
      autoStartedForRef.current = camera.id;
      return;
    }

    if (userStoppedRef.current) return;

    autoStartedForRef.current = camera.id;
    if (dbRunnableSource) {
      void handleStartStream(dbRunnableSource, { silent: true });
    }
  }, [
    autoSyncEnabled,
    camera,
    dbRunnableSource,
    engineOnline,
    handleStartStream,
    liveCameraId,
    runningSession?.status,
    stats?.status,
    statsCheckedFor,
  ]);

  // Auto-refresh DB Incidents whenever Live AI confirms a new violation
  useEffect(() => {
    const count = stats?.recent_violations?.length ?? 0;
    const prev = prevViolationsCountRef.current;
    prevViolationsCountRef.current = count;
    if (prev !== null && count > prev) {
      const timer = window.setTimeout(() => {
        void refetchIncidents();
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [refetchIncidents, stats?.recent_violations?.length]);

  const recentViolations = stats?.recent_violations;
  const rawEvidences = stats?.evidences;

  const liveEvidences = useMemo(
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

  const dbEvidences = useMemo(
    () => normalizeIncidentEvidences(camera?.code ?? liveCameraId, incidents),
    [camera?.code, incidents, liveCameraId],
  );

  const combinedEvidences = useMemo(
    () => mergeCameraEvidences(liveEvidences, dbEvidences),
    [liveEvidences, dbEvidences],
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
    [handleStartStream],
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

  const handleHotConfig = useCallback(async () => {
    setIsApplyingConfig(true);
    try {
      const payload = buildCameraHotConfigPayload({
        targetFps,
        aiFps,
        confirmHelmetSec,
        confirmVestSec,
        enableNoHelmet,
        enableNoVest,
        enableRestrictedArea,
        enableSceneCut,
        roiPolygon: cameraConfig?.roiPolygon,
      });
      await aiTestService.updateLiveConfig(liveCameraId, payload);
      toast.success(
        isVietnamese
          ? `Đã áp dụng Hot Config cho ${liveCameraId}`
          : `Applied Hot Config for ${liveCameraId}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isVietnamese
            ? "Không thể cập nhật Hot Config"
            : "Unable to update Hot Config",
      );
    } finally {
      setIsApplyingConfig(false);
    }
  }, [
    aiFps,
    confirmHelmetSec,
    confirmVestSec,
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    enableSceneCut,
    liveCameraId,
    targetFps,
  ]);

  const handleStopStream = useCallback(async () => {
    userStoppedRef.current = true;
    setIsStopping(true);
    try {
      await aiTestService.stopLiveStream(liveCameraId);
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
  }, [liveCameraId, refreshAiEngine]);

  const handleSaveToDb = useCallback(async () => {
    if (!camera) return;
    await updateConfigMutation.mutateAsync({
      cameraId: camera.id,
      payload: {
        captureFps: Math.min(60, Math.max(1, Math.round(targetFps))),
        processingEnabled:
          enableNoHelmet || enableNoVest || enableRestrictedArea,
      },
    });
    if (camera.siteId) {
      await updateCameraSafetyMutation.mutateAsync({
        cameraId: camera.id,
        payload: {
          confirmationDuration: confirmHelmetSec,
          enableNoHelmet,
          enableNoVest,
          enableRestrictedArea,
        },
      });
    }
  }, [
    camera,
    confirmHelmetSec,
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    targetFps,
    updateCameraSafetyMutation,
    updateConfigMutation,
  ]);

  const handleResetToSiteRules = useCallback(() => {
    if (!camera) return;
    void deleteCameraSafetyMutation.mutateAsync(camera.id).catch(() => undefined);
  }, [camera, deleteCameraSafetyMutation]);

  const handleSaveCameraPolygon = useCallback(
    async (points: RestrictedAreaPoint[]) => {
      if (!camera) return;
      await updateConfigMutation.mutateAsync({
        cameraId: camera.id,
        payload: {
          roiPolygon: points.length >= 3 ? points : null,
          processingEnabled: true,
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
    [camera, isVietnamese, liveCameraId, stats?.status, updateConfigMutation],
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
    setActiveTab("incidents");
  }, []);

  const handleOpenGalleryTab = useCallback(() => {
    setActiveTab("gallery");
  }, []);

  const handleOpenLiveTab = useCallback(() => {
    setActiveTab("live");
  }, []);

  const handleStartDefaultStream = useCallback(() => {
    void handleStartStream();
  }, [handleStartStream]);

  const handleHotConfigClick = useCallback(() => {
    void handleHotConfig();
  }, [handleHotConfig]);

  const handleStopStreamClick = useCallback(() => {
    void handleStopStream();
  }, [handleStopStream]);

  const handleSaveToDbClick = useCallback(() => {
    void handleSaveToDb();
  }, [handleSaveToDb]);

  const handleRefreshIncidents = useCallback(() => {
    void refetchIncidents();
  }, [refetchIncidents]);

  const handleApplyOverrideClick = useCallback(
    (next: string) => {
      void handleApplyOverrideStream(next);
    },
    [handleApplyOverrideStream],
  );

  const handleUploadOverrideClick = useCallback(
    (file: File) => {
      void handleUploadOverrideStream(file);
    },
    [handleUploadOverrideStream],
  );

  const handleClearOverride = useCallback(() => {
    setOverrideSource("");
    toast.success(
      isVietnamese
        ? "Đã khôi phục nguồn theo hồ sơ Camera DB"
        : "Restored stream source from Camera DB",
    );
  }, [isVietnamese]);

  if (cameraLoading) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-[1600px] items-center justify-center">
        <div className={`rounded-3xl p-8 ${NM.chassis}`}>
          <Loader
            size="lg"
            showLabel
            label={
              isVietnamese
                ? "Đang tải hồ sơ Camera Studio..."
                : "Loading Camera Studio..."
            }
          />
        </div>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-[1600px] items-center justify-center">
        <div
          className={`max-w-md space-y-4 rounded-[28px] p-8 text-center ${NM.chassis}`}
        >
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-accent ${NM.recessed}`}
          >
            <Camera className="size-6" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground">
            {isVietnamese ? "Không tìm thấy thiết bị Camera" : "Camera device not found"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isVietnamese
              ? "Camera có thể đã bị xóa hoặc bạn không có quyền truy cập vào công trường này."
              : "This camera may have been deleted or you do not have access to this site."}
          </p>
          <Link
            href="/cameras"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-primary ${NM.tactileBtn}`}
          >
            <ArrowLeft className="size-3.5" />
            <span>{isVietnamese ? "Quay lại danh sách Camera" : "Back to Camera Fleet"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const activeModelName =
    models.find((m) => m.path === selectedModel)?.name ??
    (selectedModel || "best");
  const isRunning = stats?.status === "running";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-10">
      {/* Studio Header */}
      <CameraStudioHeader
        camera={camera}
        siteName={camera.siteName || getSiteName(camera.siteId)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        engineOnline={engineOnline}
        engineError={engineError}
        liveStatus={stats?.status}
        models={models}
        activeModelName={activeModelName}
        galleryCount={combinedEvidences.length}
        incidentsCount={incidents.length}
        isRefreshing={incidentsLoading}
        canManage={canManage}
        onRefreshAll={() => {
          void Promise.all([
            refetchCamera(),
            refetchConfig(),
            refetchIncidents(),
            refreshAiEngine(),
          ]);
        }}
        onOpenPing={() => setPingOpen(true)}
        onOpenEdit={() => setEditOpen(true)}
      />

      {/* Tab 01: Live AI Monitor */}
      <section className={activeTab === "live" ? "space-y-6" : "hidden"}>
        <CameraLiveControlDeck
          liveCameraId={liveCameraId}
          sourceTypeLabel={camera.sourceType || "RTSP"}
          activeSource={effectiveSource || camera.streamUrl || ""}
          isUsingOverride={Boolean(overrideSource.trim())}
          isRunning={isRunning}
          canStart={Boolean(effectiveSource)}
          models={models}
          sourceNote={sourceNote}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          targetFps={targetFps}
          onTargetFpsChange={setTargetFps}
          aiFps={aiFps}
          onAiFpsChange={setAiFps}
          confirmHelmetSec={confirmHelmetSec}
          onConfirmHelmetSecChange={setConfirmHelmetSec}
          confirmVestSec={confirmVestSec}
          onConfirmVestSecChange={setConfirmVestSec}
          enableNoHelmet={enableNoHelmet}
          onEnableNoHelmetChange={setEnableNoHelmet}
          enableNoVest={enableNoVest}
          onEnableNoVestChange={setEnableNoVest}
          enableRestrictedArea={enableRestrictedArea}
          onEnableRestrictedAreaChange={setEnableRestrictedArea}
          enableSceneCut={enableSceneCut}
          onEnableSceneCutChange={setEnableSceneCut}
          isStarting={isStarting}
          isApplyingConfig={isApplyingConfig}
          isStopping={isStopping}
          isSavingDb={updateConfigMutation.isPending || updateCameraSafetyMutation.isPending}
          canManageCamera={canManage}
          onStartStream={handleStartDefaultStream}
          onHotConfig={handleHotConfigClick}
          onStopStream={handleStopStreamClick}
          onSaveToDb={handleSaveToDbClick}
          onOpenDeviceTab={handleJumpToOverrideTab}
          roiPointsCount={cameraRoiPointsCount}
          onOpenRestrictedAreaModal={() => setRestrictedModalOpen(true)}
          safetySource={effectiveSafety?.source}
          onResetToSiteRules={handleResetToSiteRules}
          isResettingRules={deleteCameraSafetyMutation.isPending}
        />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <CameraLiveViewport
            liveCameraId={liveCameraId}
            cameraName={camera.name}
            cameraStreamUrl={overrideSource.trim() || camera.streamUrl}
            sourceErrorReason={sourceNote}
            stats={stats}
            streamNonce={streamNonce}
            isStarting={isStarting}
            canStart={Boolean(effectiveSource)}
            onStartStream={handleStartDefaultStream}
            onReloadStream={() => setStreamNonce(Date.now())}
            onOpenDeviceTab={handleJumpToOverrideTab}
          />

          <CameraLiveTelemetry
            stats={stats}
            galleryCount={combinedEvidences.length}
            onOpenGallery={handleOpenGalleryTab}
          />
        </div>
      </section>

      {/* Tab 02: Unified Evidence Gallery (Live Session + Incident DB) */}
      <section className={activeTab === "gallery" ? "block" : "hidden"}>
        <EvidenceGalleryPanel
          items={combinedEvidences}
          hideSourceFilter
          emptyDescription={
            isVietnamese
              ? "Chưa có ảnh bằng chứng từ Phiên Live hiện tại hoặc Incident DB của camera này."
              : "No evidence images yet from the current Live session or Incident DB for this camera."
          }
          onInspectEvidence={handleOpenLightbox}
          onSeekToJobTime={handleOpenLiveTab}
        />
      </section>

      {/* Tab 03: Incidents DB + Device Specs + Embedded Ping & Health Logs + Dev Override */}
      <section className={activeTab === "incidents" ? "block" : "hidden"}>
        <CameraIncidentsDeviceTab
          camera={camera}
          config={cameraConfig}
          incidents={incidents}
          incidentsLoading={incidentsLoading}
          onRefreshIncidents={handleRefreshIncidents}
          liveVideos={liveVideos}
          overrideSource={overrideSource}
          productionMode={productionMode}
          isUploading={isUploading}
          isStarting={isStarting}
          overrideHighlightTick={overrideHighlightTick}
          onApplyOverrideStream={handleApplyOverrideClick}
          onUploadOverrideStream={handleUploadOverrideClick}
          onClearOverride={handleClearOverride}
          onOpenRestrictedAreaModal={() => setRestrictedModalOpen(true)}
        />
      </section>

      {/* Shared Lightbox Modal for Before / After Pairs */}
      <EvidenceLightboxModal
        open={lightbox.open}
        items={lightbox.items}
        activeIndex={lightbox.index}
        onClose={() => setLightbox((prev) => ({ ...prev, open: false }))}
        onChangeIndex={(nextIndex) =>
          setLightbox((prev) => ({ ...prev, index: nextIndex }))
        }
        onSeekToJobTime={() => {
          setLightbox((prev) => ({ ...prev, open: false }));
          setActiveTab("live");
        }}
      />

      {/* Ping & Edit Modals */}
      <CameraHealthDialog
        open={pingOpen}
        onOpenChange={setPingOpen}
        camera={camera}
      />

      <EditCameraModal
        open={editOpen}
        onOpenChange={setEditOpen}
        camera={camera}
        onSubmit={handleEditCamera}
        loading={updateCameraMutation.isPending}
      />

      {/* Camera-specific Restricted Area (ROI) Plotting Modal */}
      <RestrictedAreaDrawer
        open={restrictedModalOpen}
        onOpenChange={setRestrictedModalOpen}
        siteId={camera.siteId}
        siteName={camera.siteName || getSiteName(camera.siteId)}
        defaultZoneId={camera.zoneId || undefined}
        mode="camera-polygon"
        fixedCamera={{
          id: camera.id,
          name: camera.name,
          code: camera.code,
          zoneId: camera.zoneId,
          streamUrl: effectiveSource || camera.streamUrl,
          snapshotUrl: camera.snapshotUrl,
        }}
        initialPoints={cameraConfig?.roiPolygon ?? null}
        onSaveCameraPolygon={handleSaveCameraPolygon}
      />
    </div>
  );
}
