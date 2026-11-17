"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Play,
  Radio,
  RefreshCw,
  Sliders,
  Square,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/form";
import { Select, type SelectOption } from "@/components/ui/form/selection-controls/select";
import { Loader } from "@/components/ui/loader";
import { useLocale } from "@/providers/locale-provider";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import {
  formatTimeSec,
  formatViolationLabel,
  normalizeLiveEvidences,
  normalizeViolationType,
} from "./ai-test-utils";
import { EvidencePairCard } from "./evidence-pair-card";
import type {
  EvidenceItem,
  LiveSessionInfo,
  LiveStatsResponse,
  LiveVideoItem,
  ModelInfo,
} from "@/types/ai-test.types";

export interface LiveStreamPanelProps {
  models: ModelInfo[];
  maxSessions?: number | null;
  offlineUploadSupported?: boolean;
  activeCameraId: string | null;
  onActiveCameraChange: (cameraId: string | null) => void;
  onLiveEvidencesChange: (items: EvidenceItem[]) => void;
  onInspectEvidence: (items: EvidenceItem[], index: number) => void;
  onOpenGallery: () => void;
}

export function LiveStreamPanel({
  models,
  maxSessions = null,
  offlineUploadSupported = true,
  activeCameraId,
  onActiveCameraChange,
  onLiveEvidencesChange,
  onInspectEvidence,
  onOpenGallery,
}: LiveStreamPanelProps) {
  const { t, locale } = useLocale();
  const [liveVideos, setLiveVideos] = useState<LiveVideoItem[]>([]);
  const [sessions, setSessions] = useState<LiveSessionInfo[]>([]);

  const [cameraId, setCameraId] = useState<string>("CAM-01");
  const [source, setSource] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const [targetFps, setTargetFps] = useState<number>(25);
  const [aiFps, setAiFps] = useState<number>(15);
  const [confirmHelmetSec, setConfirmHelmetSec] = useState<number>(2.0);
  const [confirmVestSec, setConfirmVestSec] = useState<number>(4.0);

  const [enableNoHelmet, setEnableNoHelmet] = useState<boolean>(true);
  const [enableNoVest, setEnableNoVest] = useState<boolean>(true);
  const [enableRestrictedArea, setEnableRestrictedArea] = useState<boolean>(true);
  const [enableSceneCut, setEnableSceneCut] = useState<boolean>(true);

  const [stats, setStats] = useState<LiveStatsResponse | null>(null);
  const [streamNonce, setStreamNonce] = useState<number>(() => Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (models.length === 0) return;
    const valid = models.some((m) => m.path === selectedModel);
    if (!valid) {
      const def = models.find((m) => m.is_default) ?? models[0];
      setSelectedModel(def.path);
    }
  }, [models, selectedModel]);

  const loadVideosAndSessions = useCallback(async () => {
    try {
      const [videos, sessList] = await Promise.all([
        aiTestService.listLiveVideos(),
        aiTestService.listLiveSessions(),
      ]);
      setLiveVideos(videos);
      if (videos.length > 0 && !source) {
        setSource(videos[0].filename);
      }
      setSessions(sessList);
      if (!activeCameraId && sessList.length > 0) {
        const running = sessList.find((s) => s.status === "running") ?? sessList[0];
        onActiveCameraChange(running.camera_id);
        setCameraId(running.camera_id);
        if (!source && running.source) {
          setSource(running.source);
        }
        setStreamNonce(Date.now());
      }
    } catch {
      // Backend offline status handled by header
    }
  }, [activeCameraId, onActiveCameraChange, source]);

  useEffect(() => {
    void loadVideosAndSessions();
  }, [loadVideosAndSessions]);

  // Poll live stats every 800ms for activeCameraId
  useEffect(() => {
    if (!activeCameraId) {
      setStats(null);
      onLiveEvidencesChange([]);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const data = await aiTestService.getLiveStats(activeCameraId);
        if (cancelled) return;
        setStats(data);
        onLiveEvidencesChange(normalizeLiveEvidences(activeCameraId, data));
      } catch {
        // Keep last stats cleanly
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
  }, [activeCameraId, onLiveEvidencesChange]);

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      models.map((m) => ({
        value: m.path,
        label: m.name,
        description:
          typeof m.size_mb === "number" ? `${m.path} (${m.size_mb.toFixed(1)} MB)` : m.path,
      })),
    [models],
  );

  const videoOptions = useMemo<SelectOption[]>(
    () =>
      liveVideos.map((v) => ({
        value: v.filename,
        label: v.filename,
        description:
          typeof v.size_mb === "number" ? `${v.size_mb.toFixed(2)} MB` : undefined,
      })),
    [liveVideos],
  );

  const translateSessionStatus = useCallback(
    (status?: string) => {
      const normalized = (status ?? "idle").toLowerCase();
      const key = `aiTest.live.sessionStatus.${normalized}`;
      const translated = t(key);
      return translated === key ? (status ?? "idle") : translated;
    },
    [t],
  );

  const handleStartStream = async (sourceOverride?: string) => {
    const targetSource = (sourceOverride ?? source).trim();
    const cleanCamId = cameraId.trim() || "CAM-01";
    if (!targetSource) {
      toast.error(t("aiTest.live.toasts.sourceRequired"));
      return;
    }

    setIsStarting(true);
    try {
      const started = await aiTestService.startLiveStream({
        camera_id: cleanCamId,
        source: targetSource,
        model: selectedModel || null,
        target_fps: targetFps,
        ai_fps: aiFps,
        confirmation_duration_s: confirmHelmetSec,
        confirmation_duration_vest_s: confirmVestSec,
        enable_no_helmet: enableNoHelmet,
        enable_no_vest: enableNoVest,
        enable_restricted_area: enableRestrictedArea,
        enable_scene_cut: enableSceneCut,
      });
      const resolvedId = started.camera_id || cleanCamId;
      onActiveCameraChange(resolvedId);
      setStreamNonce(Date.now());
      toast.success(t("aiTest.live.toasts.started", { cameraId: resolvedId }));
      await loadVideosAndSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiTest.live.toasts.startFailed"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleHotConfig = async () => {
    const targetId = activeCameraId || cameraId.trim();
    if (!targetId) return;
    setIsApplyingConfig(true);
    try {
      await aiTestService.updateLiveConfig(targetId, {
        target_fps: targetFps,
        ai_fps: aiFps,
        confirmation_duration_s: confirmHelmetSec,
        confirmation_duration_vest_s: confirmVestSec,
        enable_no_helmet: enableNoHelmet,
        enable_no_vest: enableNoVest,
        enable_restricted_area: enableRestrictedArea,
        enable_scene_cut: enableSceneCut,
      });
      toast.success(t("aiTest.live.toasts.hotConfigApplied", { cameraId: targetId }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiTest.live.toasts.hotConfigFailed"));
    } finally {
      setIsApplyingConfig(false);
    }
  };

  const handleStopStream = async (targetCamId?: string) => {
    const targetId = targetCamId || activeCameraId;
    if (!targetId) return;
    setIsStopping(true);
    try {
      await aiTestService.stopLiveStream(targetId);
      toast.success(t("aiTest.live.toasts.stopped", { cameraId: targetId }));
      await loadVideosAndSessions();
      if (targetId === activeCameraId) {
        const refreshed = await aiTestService.getLiveStats(targetId).catch(() => null);
        if (refreshed) setStats(refreshed);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiTest.live.toasts.stopFailed"));
    } finally {
      setIsStopping(false);
    }
  };

  const handleUploadAndStream = async (file: File) => {
    setIsUploading(true);
    try {
      const uploaded = await aiTestService.uploadVideo(file);
      const uploadedSource =
        uploaded.path || uploaded.video_name || uploaded.filename || file.name;
      setSource(uploadedSource);
      await handleStartStream(uploadedSource);
    } catch (error) {
      if (isAiEndpointNotFoundError(error)) {
        toast.error(
          locale === "vi-VN"
            ? "AI Production Server (24/7) không hỗ trợ upload video offline — hãy dùng video có sẵn trên server, RTSP hoặc YouTube."
            : "AI Production Server (24/7) does not support offline video uploads — use an existing server video, RTSP, or YouTube.",
        );
      } else {
        toast.error(error instanceof Error ? error.message : t("aiTest.live.toasts.uploadFailed"));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isRunning = stats?.status === "running";
  const metrics = stats?.metrics;
  const recentViolations = stats?.recent_violations ?? [];
  const liveEvidences = useMemo(
    () => (activeCameraId ? normalizeLiveEvidences(activeCameraId, stats ?? undefined) : []),
    [activeCameraId, stats],
  );
  const activeModelName =
    models.find((m) => m.path === selectedModel)?.name ?? (selectedModel || "best");
  const enabledRulesCount = [
    enableNoHelmet,
    enableNoVest,
    enableRestrictedArea,
    enableSceneCut,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Control Deck (thu gọn mặc định, click header để mở rộng đầy đủ) */}
      <section
        aria-label={t("aiTest.live.configAriaLabel")}
        className={`relative overflow-hidden rounded-[28px] bg-background shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06] transition-all duration-300 ${
          isConfigExpanded ? "p-5 sm:p-7" : "px-5 py-4 sm:px-6"
        }`}
      >
        {/* Viền ánh sáng đỉnh khối */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="relative space-y-5">
          {/* =====================================================================
        TẦNG 1: HEADER TÓM TẮT (CLICK ĐỂ MỞ / THU GỌN) & TACTILE ACTION SWITCH BAY
       ===================================================================== */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Cụm Tiêu đề & Tóm tắt thông tin cần thiết (click vào để mở rộng/thu gọn) */}
            <button
              type="button"
              aria-expanded={isConfigExpanded}
              onClick={() => setIsConfigExpanded((prev) => !prev)}
              className="group flex flex-1 cursor-pointer items-start gap-3.5 rounded-2xl p-1 text-left transition-colors hover:bg-foreground/[0.02] focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sliders className="size-4" />
                </div>
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isRunning
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                    : "bg-muted-foreground/40"
                    }`}
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                    {t("aiTest.live.configTitle")}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isRunning
                      ? "bg-primary/15 text-primary"
                      : "bg-accent/15 text-accent"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isRunning ? "animate-pulse bg-primary" : "bg-accent"
                        }`}
                    />
                    {isRunning ? t("aiTest.live.statusActive") : t("aiTest.live.statusStandby")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground group-hover:text-primary">
                    {isConfigExpanded ? t("aiTest.live.collapseConfig") : t("aiTest.live.expandConfig")}
                    <ChevronDown
                      className={`size-3 transition-transform duration-200 ${
                        isConfigExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </div>

                {/* Dải tóm tắt nhanh khi thu gọn / mở rộng */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary">
                    {activeCameraId || cameraId}
                  </span>
                  <span className="max-w-[220px] truncate rounded-lg bg-foreground/[0.04] px-2 py-0.5 font-mono text-muted-foreground">
                    {source || t("aiTest.live.noSourceSelected")}
                  </span>
                  <span className="rounded-lg bg-foreground/[0.04] px-2 py-0.5 font-mono font-semibold text-foreground">
                    {activeModelName}
                  </span>
                  <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-mono font-semibold text-accent">
                    {targetFps}/{aiFps} FPS • {confirmHelmetSec}s/{confirmVestSec}s
                  </span>
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                    {t("aiTest.live.rulesSummary", { count: enabledRulesCount })}
                  </span>
                </div>
              </div>
            </button>

            {/* Khay nút bấm cơ học khoét sâu */}
            <div className="flex flex-wrap items-center gap-2.5 self-start rounded-2xl bg-background/80 p-2 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.03)] border border-black/[0.04] dark:border-white/[0.03] xl:self-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadAndStream(file);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                disabled={isUploading || isStarting || !offlineUploadSupported}
                onClick={() => fileInputRef.current?.click()}
                title={
                  !offlineUploadSupported
                    ? "Endpoint /api/upload chỉ khả dụng ở chế độ test-ui/server.py sandbox"
                    : undefined
                }
                className="group inline-flex items-center gap-2 rounded-xl bg-background px-3.5 py-2 text-xs font-bold text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)] hover:text-primary active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] border border-white/50 dark:border-white/[0.05] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
              >
                <Upload className="size-3.5 text-accent transition-transform duration-200 group-hover:-translate-y-0.5" />
                <span>{isUploading ? t("aiTest.live.uploading") : t("aiTest.live.uploadAndStream")}</span>
              </button>

              <button
                type="button"
                disabled={isStarting || !source.trim()}
                onClick={() => void handleStartStream()}
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.16),-3px_-3px_8px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.55),-2px_-2px_6px_rgba(255,255,255,0.04)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
              >
                <Play className="size-3.5 fill-current" />
                <span>{isStarting ? t("aiTest.live.starting") : t("aiTest.live.startStream")}</span>
              </button>

              <div className="hidden h-5 w-[1px] bg-foreground/10 sm:block" />

              <button
                type="button"
                disabled={!activeCameraId || !isRunning || isApplyingConfig}
                onClick={() => void handleHotConfig()}
                className="group inline-flex items-center gap-2 rounded-xl bg-background px-3.5 py-2 text-xs font-bold text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)] hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] border border-primary/25 transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <Activity
                  className={`size-3.5 ${isApplyingConfig
                    ? "animate-spin"
                    : "transition-transform group-hover:scale-110"
                    }`}
                />
                <span>{t("aiTest.live.applyHotConfig")}</span>
              </button>

              <button
                type="button"
                disabled={!activeCameraId || !isRunning || isStopping}
                onClick={() => void handleStopStream()}
                className="group inline-flex items-center gap-2 rounded-xl bg-background px-3.5 py-2 text-xs font-bold text-accent shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)] hover:bg-accent/10 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] border border-accent/30 transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <Square className="size-3.5 fill-current" />
                <span>{t("aiTest.live.stopStream")}</span>
              </button>

              <button
                type="button"
                aria-expanded={isConfigExpanded}
                onClick={() => setIsConfigExpanded((prev) => !prev)}
                title={isConfigExpanded ? t("aiTest.live.collapseConfigTitle") : t("aiTest.live.expandConfigTitle")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] border border-white/40 dark:border-white/[0.05] transition-all cursor-pointer"
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    isConfigExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {isConfigExpanded && (
            <>
              {/* =====================================================================
        TẦNG 2: 3 CỤM THÔNG SỐ ĐÚC NỔI ĐỘC LẬP (EXTRUDED HARDWARE MODULES)
       ===================================================================== */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* MODULE A (4/12): SESSION & AI ENGINE */}
            <div className="space-y-3.5 rounded-2xl bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05] lg:col-span-4">
              <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {t("aiTest.live.moduleSessionTitle")}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.cameraSessionIdLabel")}
                  </label>
                  <Input
                    size="sm"
                    value={cameraId}
                    onChange={(e) => setCameraId(e.target.value)}
                    placeholder="CAM-01"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.modelLabel")}
                  </label>
                  <Select
                    size="sm"
                    options={modelOptions}
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    placeholder={t("aiTest.live.modelPlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* MODULE B (5/12): VIDEO INPUT SOURCE */}
            <div className="space-y-3.5 rounded-2xl bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05] lg:col-span-5">
              <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
                  {t("aiTest.live.moduleSourceTitle")}
                </span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {t("aiTest.live.availableCount", { count: liveVideos.length })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.selectServerVideo", { count: liveVideos.length })}
                  </label>
                  <Select
                    size="sm"
                    options={videoOptions}
                    value={liveVideos.some((v) => v.filename === source) ? source : ""}
                    onValueChange={setSource}
                    placeholder={t("aiTest.live.serverVideoPlaceholder")}
                    emptyMessage={t("aiTest.live.serverVideoEmpty")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.sourceInputLabel")}
                  </label>
                  <Input
                    size="sm"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder={t("aiTest.live.sourceInputPlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* MODULE C (3/12): FRAME RATE CLOCK */}
            <div className="space-y-3.5 rounded-2xl bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05] lg:col-span-3">
              <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {t("aiTest.live.moduleFpsTitle")}
                </span>
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  1–60 Hz
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.targetFpsLabel")}
                  </label>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    value={targetFps}
                    onChange={(e) => setTargetFps(Number(e.target.value) || 25)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    {t("aiTest.live.aiFpsLabel")}
                  </label>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    value={aiFps}
                    onChange={(e) => setAiFps(Number(e.target.value) || 15)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================================
        TẦNG 3: KHAY HOT-CONFIG RULES & ACTIVE SESSIONS RACK (PRIMARY & ACCENT)
       ===================================================================== */}
          <div className="rounded-[22px] border border-black/[0.04] bg-background/80 p-4 shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] dark:border-white/[0.03] dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.03)]">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* CỤM TRÁI (8/12): LUẬT NHẬN DIỆN & NGƯỠNG SUSTAIN (SET MỀM) */}
              <div className="space-y-3.5 rounded-2xl border border-white/40 bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.75)] dark:border-white/[0.05] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] xl:col-span-8">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                    {t("aiTest.live.moduleRulesTitle")}
                  </span>
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                    {t("aiTest.live.hotEditableBadge")}
                  </span>
                </div>

                {/* Hàng 1: 2 ô Sustain Timer cân đối */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: "helmet_sustain",
                      label: t("aiTest.live.sustainHelmetLabel"),
                      ruleTag: "NO_HELMET",
                      enabled: enableNoHelmet,
                      value: confirmHelmetSec,
                      fallback: 2,
                      onChange: setConfirmHelmetSec,
                    },
                    {
                      key: "vest_sustain",
                      label: t("aiTest.live.sustainVestLabel"),
                      ruleTag: "NO_VEST",
                      enabled: enableNoVest,
                      value: confirmVestSec,
                      fallback: 4,
                      onChange: setConfirmVestSec,
                    },
                  ].map((timer) => (
                    <div
                      key={timer.key}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200 ${timer.enabled
                        ? "border-accent/30 bg-accent/[0.06] shadow-[3px_3px_6px_rgba(0,0,0,0.06),-3px_-3px_6px_rgba(255,255,255,0.65)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.35)]"
                        : "border-foreground/[0.06] bg-background/60 opacity-55 shadow-[var(--nm-inset)]"
                        }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 shrink-0 rounded-full ${timer.enabled ? "bg-accent" : "bg-muted-foreground/40"
                              }`}
                          />
                          <span className="text-xs font-bold text-foreground">
                            {timer.label}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-3.5 font-mono text-[10px] text-muted-foreground">
                          {t("aiTest.live.appliesToRule", { rule: timer.ruleTag })}
                        </p>
                      </div>

                      <Input
                        size="sm"
                        type="number"
                        min={0.5}
                        max={30}
                        step={0.5}
                        disabled={!timer.enabled}
                        value={timer.value}
                        onChange={(e) =>
                          timer.onChange(
                            Math.max(0.5, Number(e.target.value) || timer.fallback),
                          )
                        }
                        className="w-20 text-center font-mono font-bold text-primary"
                      />
                    </div>
                  ))}
                </div>

                {/* Hàng 2: 4 Công tắc nhận diện đều nhau (chỉ dùng Primary & Accent) */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      key: "no_helmet",
                      label: "NO_HELMET",
                      checked: enableNoHelmet,
                      onChange: setEnableNoHelmet,
                      mono: true,
                    },
                    {
                      key: "no_vest",
                      label: "NO_VEST",
                      checked: enableNoVest,
                      onChange: setEnableNoVest,
                      mono: true,
                    },
                    {
                      key: "restricted_area",
                      label: "RESTRICTED_AREA",
                      checked: enableRestrictedArea,
                      onChange: setEnableRestrictedArea,
                      mono: true,
                    },
                    {
                      key: "scene_cut",
                      label: t("aiTest.live.ruleSceneCut"),
                      checked: enableSceneCut,
                      onChange: setEnableSceneCut,
                      mono: false,
                    },
                  ].map((rule) => (
                    <div
                      key={rule.key}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all duration-200 ${rule.checked
                        ? "border-primary/35 bg-primary/[0.08] shadow-[3px_3px_6px_rgba(0,0,0,0.07),-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.4)]"
                        : "border-foreground/[0.06] bg-background/60 opacity-65 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.5)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.45)]"
                        }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 shrink-0 rounded-full ${rule.checked
                              ? "bg-primary shadow-[0_0_6px_var(--primary)]"
                              : "bg-muted-foreground/40"
                              }`}
                          />
                          <span
                            className={`truncate text-[11px] font-bold tracking-tight ${rule.mono ? "font-mono" : ""
                              } ${rule.checked ? "text-foreground" : "text-muted-foreground"
                              }`}
                          >
                            {rule.label}
                          </span>
                        </div>
                        <span
                          className={`ml-3.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${rule.checked
                            ? "bg-primary/15 text-primary"
                            : "bg-foreground/10 text-muted-foreground"
                            }`}
                        >
                          {rule.checked ? t("aiTest.common.on") : t("aiTest.common.off")}
                        </span>
                      </div>

                      <Switch
                        size="sm"
                        checked={rule.checked}
                        onCheckedChange={rule.onChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* CỤM PHẢI (4/12): ACTIVE SESSIONS RACK (CHỈ DÙNG PRIMARY & ACCENT) */}
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/40 bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.75)] dark:border-white/[0.05] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] xl:col-span-4">
                <div className="flex items-center justify-between border-b border-foreground/[0.06] pb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent">
                    {t("aiTest.live.moduleSessionsTitle")}
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                      {typeof maxSessions === "number"
                        ? `${sessions.length}/${maxSessions}`
                        : sessions.length}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => void loadVideosAndSessions()}
                    title={t("aiTest.live.refreshSessionsTitle")}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/40 bg-background text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.75)] transition-all active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.14)] dark:border-white/[0.05] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 flex-wrap content-start items-center gap-2 rounded-xl bg-background/70 p-2.5 shadow-[var(--nm-inset)]">
                  {sessions.length === 0 ? (
                    <span className="w-full py-2 text-center text-[11px] text-muted-foreground">
                      {t("aiTest.live.noSessions")}
                    </span>
                  ) : (
                    sessions.map((sess) => {
                      const isSelected = sess.camera_id === activeCameraId;
                      const sessRunning = sess.status === "running";
                      return (
                        <div
                          key={sess.camera_id}
                          className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ${isSelected
                            ? "bg-primary text-primary-foreground shadow-[3px_3px_8px_rgba(0,0,0,0.18)]"
                            : "border border-white/40 bg-background text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.09),-3px_-3px_6px_rgba(255,255,255,0.7)] dark:border-white/[0.05] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]"
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onActiveCameraChange(sess.camera_id);
                              setCameraId(sess.camera_id);
                              if (sess.source) setSource(sess.source);
                              setStreamNonce(Date.now());
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5"
                          >
                            {sessRunning && (
                              <span
                                className={`h-2 w-2 rounded-full ${isSelected
                                  ? "animate-pulse bg-primary-foreground"
                                  : "bg-primary shadow-[0_0_6px_var(--primary)]"
                                  }`}
                              />
                            )}
                            <span>{sess.camera_id}</span>
                            <span
                              className={`text-[10px] font-medium ${isSelected
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                                }`}
                            >
                              ({translateSessionStatus(sess.status)})
                            </span>
                          </button>

                          {sessRunning && (
                            <button
                              type="button"
                              onClick={() => void handleStopStream(sess.camera_id)}
                              className={`ml-1 cursor-pointer rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold transition-colors ${isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                                : "bg-accent/15 text-accent hover:bg-accent/25"
                                }`}
                              title={t("aiTest.live.stopSessionTitle", { cameraId: sess.camera_id })}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </section>

      {/* Main Live Grid: Viewport + Live Telemetry */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* Left: MJPEG Stream Viewport */}
        <section
          aria-label={t("aiTest.live.viewportAriaLabel")}
          className="relative flex flex-col overflow-hidden rounded-[28px] bg-background p-4 sm:p-6 shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06] xl:sticky xl:top-6 xl:col-span-7"
        >
          {/* Viền phản chiếu ánh sáng đỉnh khối */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* =====================================================================
      HEADER: MONITOR BEZEL TITLE & REAL-TIME STREAM TELEMETRY PODS
     ===================================================================== */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Cụm Tiêu đề & Camera Channel */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-4px_-4px_8px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${isRunning
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-primary/15 text-primary"
                    }`}
                >
                  <Radio className={`size-4 ${isRunning ? "animate-pulse" : ""}`} />
                </div>
                {/* Đèn LED báo tín hiệu góc icon */}
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isRunning
                      ? "bg-accent shadow-[0_0_8px_hsl(var(--accent))]"
                      : "bg-muted-foreground/40"
                    }`}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                    {t("aiTest.live.viewportTitle")}
                  </h2>
                  {activeCameraId && (
                    <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-extrabold text-primary">
                      {activeCameraId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("aiTest.live.viewportSubtitle")}
                </p>
              </div>
            </div>

            {/* Cụm Thông Số Tín Hiệu Đúc Nổi */}
            {activeCameraId ? (
              <div className="flex flex-wrap items-center gap-2 self-start rounded-2xl bg-background/80 p-1.5 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03] sm:self-center">
                {/* Badge LIVE / STOPPED */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)] ${isRunning
                      ? "bg-accent text-accent-foreground"
                      : "bg-background text-muted-foreground"
                    }`}
                >
                  {isRunning && (
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent-foreground" />
                  )}
                  {isRunning
                    ? t("aiTest.live.badgeLive")
                    : stats?.status
                      ? translateSessionStatus(stats.status).toUpperCase()
                      : t("aiTest.live.badgeStopped")}
                </span>

                {/* Badge Display FPS */}
                <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]">
                  {typeof metrics?.fps === "number" ? `${metrics.fps.toFixed(1)}` : "--"}
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    FPS
                  </span>
                </span>

                {/* Badge AI FPS */}
                <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-primary shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]">
                  <span className="text-[10px] font-extrabold uppercase text-accent">
                    AI
                  </span>
                  {typeof metrics?.ai_fps_actual === "number"
                    ? `${metrics.ai_fps_actual.toFixed(1)}`
                    : "--"}
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    fps
                  </span>
                </span>
              </div>
            ) : (
              <span className="self-start rounded-xl bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] border border-white/40 dark:border-white/[0.05] sm:self-center">
                {t("aiTest.live.noSessionSelected")}
              </span>
            )}
          </div>

          {/* =====================================================================
      VIEWPORT SCREEN: KHUNG MÀN HÌNH KHOÉT SÂU (RECESSED OPTICAL DISPLAY)
     ===================================================================== */}
          <div className="relative flex aspect-video w-full max-h-[540px] items-center justify-center overflow-hidden rounded-[24px] bg-background/85 p-3 shadow-[inset_7px_7px_14px_rgba(0,0,0,0.14),inset_-7px_-7px_14px_rgba(255,255,255,0.75)] dark:shadow-[inset_7px_7px_14px_rgba(0,0,0,0.65),inset_-5px_-5px_12px_rgba(255,255,255,0.03)] border border-black/[0.05] dark:border-white/[0.04]">
            {/* 4 Góc ngắm kỹ thuật (Viewfinder Corner Brackets) tạo cảm giác màn hình giám sát chuyên dụng */}
            <span className="pointer-events-none absolute left-4 top-4 h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-primary/40" />
            <span className="pointer-events-none absolute right-4 top-4 h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-primary/40" />
            <span className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-primary/40" />
            <span className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-primary/40" />

            {activeCameraId && isRunning ? (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground/[0.03] p-1 shadow-[4px_4px_10px_rgba(0,0,0,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${activeCameraId}-${streamNonce}`}
                  src={aiTestService.getLiveStreamUrl(activeCameraId, streamNonce)}
                  alt={`AI Live MJPEG Stream ${activeCameraId}`}
                  className="h-full w-full rounded-xl object-contain"
                />

                {/* Thanh HUD nổi tinh tế góc dưới trái trên khung hình */}
                <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl bg-background/85 px-3 py-1.5 backdrop-blur-md shadow-[4px_4px_10px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/10">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <span className="font-mono text-[11px] font-extrabold tracking-wider text-foreground">
                    REC • {activeCameraId}
                  </span>
                </div>
              </div>
            ) : isStarting ? (
              <div className="rounded-2xl bg-background px-8 py-6 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/[0.05]">
                <Loader
                  size="lg"
                  showLabel
                  label={t("aiTest.live.initializingStream")}
                />
              </div>
            ) : (
              /* Trạng thái chờ: Đĩa radar đúc nổi ở trung tâm */
              <div className="mx-auto max-w-md space-y-4 p-6 text-center">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-background shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/50 dark:border-white/[0.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08)]">
                    <Radio className="size-6" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-extrabold tracking-tight text-foreground">
                    {activeCameraId
                      ? t("aiTest.live.sessionStateNotice", {
                          cameraId: activeCameraId,
                          status: translateSessionStatus(stats?.status ?? "stopped"),
                        })
                      : t("aiTest.live.noRunningSession")}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("aiTest.live.emptyViewportHintBefore")}
                    <strong className="font-bold text-primary">
                      {t("aiTest.live.startStream")}
                    </strong>
                    {t("aiTest.live.emptyViewportHintAfter")}
                  </p>
                </div>

                {stats?.error && (
                  <div className="mx-auto inline-block rounded-xl bg-accent/15 px-3.5 py-2 text-xs font-bold text-accent border border-accent/25">
                    {t("aiTest.live.sessionError", { error: stats.error })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: Telemetry, Violations & Recent Evidences */}
        <div className="space-y-6 xl:col-span-5">
          {/* =====================================================================
      KHỐI 1: BENTO TELEMETRY MATRIX (4 MODULE ĐỒNG HỒ ĐÚC NỔI)
     ===================================================================== */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* TILE 1: DISPLAY / AI FPS */}
            <div className="relative overflow-hidden rounded-[22px] bg-background p-4 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.45),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("aiTest.live.metrics.fpsTitle")}
                </span>
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              </div>

              <div className="mt-2.5 flex items-baseline gap-1.5 font-mono">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {typeof metrics?.fps === "number" ? metrics.fps.toFixed(1) : "--"}
                </span>
                <span className="text-xs font-semibold text-primary">
                  /{" "}
                  {typeof metrics?.ai_fps_actual === "number"
                    ? `${metrics.ai_fps_actual.toFixed(1)} ai`
                    : "--"}
                </span>
              </div>

              {/* Thanh đo xung nhịp khoét sâu */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{
                    width: `${typeof metrics?.ai_fps_actual === "number"
                      ? Math.min(100, Math.max(8, (metrics.ai_fps_actual / 30) * 100))
                      : 0
                      }%`,
                  }}
                />
              </div>
            </div>

            {/* TILE 2: INFERENCE / E2E LATENCY */}
            <div className="relative overflow-hidden rounded-[22px] bg-background p-4 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.45),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("aiTest.live.metrics.latencyTitle")}
                </span>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  MS
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline gap-1.5 font-mono">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {typeof metrics?.inference_latency_ms === "number"
                    ? `${metrics.inference_latency_ms.toFixed(1)}`
                    : "--"}
                </span>
                <span className="text-xs font-bold text-muted-foreground">ms</span>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-foreground/[0.06] pt-2 text-[11px]">
                <span className="font-medium text-muted-foreground">
                  {t("aiTest.live.metrics.e2eAlert")}
                </span>
                <span className="font-mono font-bold text-primary">
                  {typeof metrics?.e2e_alert_latency_ms === "number"
                    ? `${metrics.e2e_alert_latency_ms.toFixed(1)} ms`
                    : "--"}
                </span>
              </div>
            </div>

            {/* TILE 3: COUNTS (PERSON / HELMET / VEST) */}
            <div className="relative overflow-hidden rounded-[22px] bg-background p-4 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.45),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("aiTest.live.metrics.entityCounts")}
                </span>
                <span className="text-[10px] font-bold text-primary">
                  {t("aiTest.live.metrics.ppeTrack")}
                </span>
              </div>

              {/* 3 Ô đếm con khoét sâu (Recessed Mini-Wells) */}
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-background/80 px-2 py-1.5 text-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)]">
                  <div className="font-mono text-sm font-black text-foreground">
                    {metrics?.counts?.person ?? metrics?.active_persons ?? 0}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("aiTest.live.metrics.person")}
                  </div>
                </div>

                <div className="rounded-xl bg-background/80 px-2 py-1.5 text-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)]">
                  <div className="font-mono text-sm font-black text-primary">
                    {metrics?.counts?.helmet ?? 0}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("aiTest.live.metrics.helmet")}
                  </div>
                </div>

                <div className="rounded-xl bg-background/80 px-2 py-1.5 text-center shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)]">
                  <div className="font-mono text-sm font-black text-accent">
                    {metrics?.counts?.safety_vest ?? 0}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("aiTest.live.metrics.vest")}
                  </div>
                </div>
              </div>
            </div>

            {/* TILE 4: ACTIVE / RECENT VIOLATIONS */}
            <div className="relative overflow-hidden rounded-[22px] bg-background p-4 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.45),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t("aiTest.live.metrics.activeViolations")}
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  {(metrics?.active_violations ?? 0) > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${(metrics?.active_violations ?? 0) > 0
                      ? "bg-accent shadow-[0_0_8px_hsl(var(--accent))]"
                      : "bg-muted-foreground/30"
                      }`}
                  />
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2 font-mono">
                <span
                  className={`text-2xl font-black tracking-tight ${(metrics?.active_violations ?? 0) > 0
                    ? "text-accent"
                    : "text-foreground"
                    }`}
                >
                  {metrics?.active_violations ?? 0}
                </span>
                <span className="font-sans text-xs font-medium text-muted-foreground">
                  {t("aiTest.live.metrics.violatingNow")}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-foreground/[0.06] pt-2 text-[11px]">
                <span className="font-medium text-muted-foreground">
                  {t("aiTest.live.metrics.totalRecorded")}
                </span>
                <span className="rounded-full bg-accent/15 px-2 py-0.2 font-mono text-[10px] font-extrabold text-accent">
                  {recentViolations.length}
                </span>
              </div>
            </div>
          </div>

          {/* =====================================================================
      KHỐI 2: RECENT VIOLATIONS FEED (NHẬT KÝ SỰ KIỆN ĐÚC NỔI + KHAY LÕM)
     ===================================================================== */}
          <section className="relative overflow-hidden rounded-[26px] bg-background p-4 sm:p-5 shadow-[12px_12px_24px_rgba(0,0,0,0.11),-12px_-12px_24px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.5),-8px_-8px_18px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                    {t("aiTest.live.recentViolations.title")}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {t("aiTest.live.recentViolations.subtitle")}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-xs font-extrabold text-accent">
                {recentViolations.length}
              </span>
            </div>

            {recentViolations.length === 0 ? (
              <div className="rounded-2xl bg-background/80 px-4 py-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03]">
                {t("aiTest.live.recentViolations.empty")}
              </div>
            ) : (
              <div className="max-h-56 space-y-2.5 overflow-y-auto rounded-2xl bg-background/80 p-2.5 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03]">
                {recentViolations
                  .slice()
                  .reverse()
                  .map((v) => {
                    const norm = normalizeViolationType(v.violation_type);
                    const isCritical =
                      norm === "NO_HELMET" || norm === "RESTRICTED_AREA";

                    return (
                      <div
                        key={v.event_id}
                        className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl bg-background px-3.5 py-2.5 text-xs shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] border border-white/40 dark:border-white/[0.05] transition-transform duration-200 hover:translate-x-0.5"
                      >
                        {/* Vạch chỉ thị dọc phân loại bằng Accent hoặc Primary */}
                        <span
                          className={`absolute inset-y-1.5 left-1 w-1 rounded-full ${isCritical ? "bg-accent" : "bg-primary"
                            }`}
                        />

                        <div className="flex flex-wrap items-center gap-2 pl-2">
                          <span
                            className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${isCritical
                              ? "bg-accent/15 text-accent"
                              : "bg-primary/15 text-primary"
                              }`}
                          >
                            {formatViolationLabel(v.violation_type, locale)}
                          </span>

                          <span className="font-bold text-foreground">
                            {t("aiTest.common.personNumber", {
                              id: v.canonical_person_id ?? v.person_id ?? "-",
                            })}
                          </span>

                          {typeof v.frame === "number" && (
                            <span className="rounded bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                              F#{v.frame}
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-[11px] font-medium text-muted-foreground">
                          {formatTimeSec(v.confirmed_t ?? v.start_t)} •{" "}
                          <strong className="font-bold text-foreground">
                            {(v.duration_s ?? 0).toFixed(1)}s
                          </strong>
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* =====================================================================
      KHỐI 3: RECENT LIVE EVIDENCES (KHO ẢNH BẰNG CHỨNG BEFORE / AFTER)
     ===================================================================== */}
          <section className="relative overflow-hidden rounded-[26px] bg-background p-4 sm:p-5 shadow-[12px_12px_24px_rgba(0,0,0,0.11),-12px_-12px_24px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.5),-8px_-8px_18px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                  {t("aiTest.live.evidences.title")}
                </h3>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-extrabold text-primary">
                  {liveEvidences.length}
                </span>
              </div>

              {liveEvidences.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-background px-3 py-1.5 text-xs font-bold text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.09),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
                >
                  <span>{t("aiTest.live.evidences.viewGallery")}</span>
                </button>
              )}
            </div>

            {liveEvidences.length === 0 ? (
              <div className="rounded-2xl bg-background/80 px-4 py-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03]">
                {t("aiTest.live.evidences.empty")}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 rounded-2xl bg-background/80 p-3 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03] sm:grid-cols-2">
                {liveEvidences
                  .slice(-4)
                  .reverse()
                  .map((item) => {
                    const idx = liveEvidences.findIndex((e) => e.id === item.id);
                    return (
                      <EvidencePairCard
                        key={item.id}
                        item={item}
                        compact
                        onInspect={() =>
                          onInspectEvidence(liveEvidences, Math.max(0, idx))
                        }
                      />
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
