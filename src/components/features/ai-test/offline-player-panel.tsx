"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Images,
  Play,
  RefreshCw,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, type SelectOption } from "@/components/ui/form/selection-controls/select";
import { Loader } from "@/components/ui/loader";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useLocale } from "@/providers/locale-provider";
import { aiTestService } from "@/services/ai-test.service";
import {
  buildFrameLookupMap,
  computePersonTracks,
  extractAssociationPpeStatus,
  extractJobViolationsSummary,
  findFrameEntryForTime,
  formatTimeSec,
  formatViolationLabel,
  normalizeJobEvidences,
  parseNdjsonLog,
} from "./ai-test-utils";
import { EvidencePairCard } from "./evidence-pair-card";
import type {
  EvidenceItem,
  FrameLogEntry,
  JobMeta,
  JobStatus,
  JobSummary,
  ModelInfo,
} from "@/types/ai-test.types";

type InspectorSubTab = "associations" | "violations" | "evidences";

export interface OfflinePlayerPanelProps {
  models: ModelInfo[];
  jobs: JobSummary[];
  onRefreshJobs: () => Promise<void>;
  activeJobId: string | null;
  onActiveJobChange: (jobId: string | null) => void;
  onJobEvidencesChange: (items: EvidenceItem[]) => void;
  onInspectEvidence: (items: EvidenceItem[], index: number) => void;
  externalSeekTimeSec?: { timeSec: number; nonce: number } | null;
}

const JOB_STATUS_BADGE: Record<
  JobStatus,
  { variant: "default" | "info" | "warning" | "success" | "danger"; labelKey: string }
> = {
  idle: { variant: "default", labelKey: "aiTest.player.status.idle" },
  queued: { variant: "info", labelKey: "aiTest.player.status.queued" },
  running: { variant: "warning", labelKey: "aiTest.player.status.running" },
  done: { variant: "success", labelKey: "aiTest.player.status.done" },
  error: { variant: "danger", labelKey: "aiTest.player.status.error" },
};

export function OfflinePlayerPanel({
  models,
  jobs,
  onRefreshJobs,
  activeJobId,
  onActiveJobChange,
  onJobEvidencesChange,
  onInspectEvidence,
  externalSeekTimeSec,
}: OfflinePlayerPanelProps) {
  const { t, locale } = useLocale();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(activeJobId);
  const [runningJobStatus, setRunningJobStatus] = useState<JobSummary | null>(null);

  // Job inference config
  const [model, setModel] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);

  // Loaded player state
  const [jobMeta, setJobMeta] = useState<JobMeta | null>(null);
  const [logEntries, setLogEntries] = useState<FrameLogEntry[]>([]);
  const [videoNonce, setVideoNonce] = useState<number>(() => Date.now());
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [inspectorTab, setInspectorTab] = useState<InspectorSubTab>("associations");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (models.length === 0) return;
    if (!models.some((m) => m.path === model)) {
      const def = models.find((m) => m.is_default) ?? models[0];
      setModel(def.path);
    }
  }, [models, model]);

  useEffect(() => {
    if (activeJobId && activeJobId !== selectedJobId) {
      setSelectedJobId(activeJobId);
    }
  }, [activeJobId, selectedJobId]);

  const loadJobArtifacts = useCallback(
    async (jobId: string) => {
      setIsLoadingArtifacts(true);
      try {
        const [meta, logText] = await Promise.all([
          aiTestService.getJobMeta(jobId).catch(() => null),
          aiTestService.getJobLogText(jobId).catch(() => ""),
        ]);
        const parsedEntries = parseNdjsonLog(logText);
        setJobMeta(meta);
        setLogEntries(parsedEntries);
        setVideoNonce(Date.now());
        setCurrentTimeSec(0);
        onActiveJobChange(jobId);

        const evidences = normalizeJobEvidences(jobId, meta, parsedEntries);
        onJobEvidencesChange(evidences);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("aiTest.player.toasts.loadJobFailed"),
        );
      } finally {
        setIsLoadingArtifacts(false);
      }
    },
    [onActiveJobChange, onJobEvidencesChange, t],
  );

  // Poll job status every 800ms while a selected job is queued/running
  useEffect(() => {
    if (!selectedJobId) {
      setRunningJobStatus(null);
      return;
    }

    const currentInList = jobs.find((j) => j.job_id === selectedJobId);
    if (currentInList && currentInList.status !== "running" && currentInList.status !== "queued") {
      setRunningJobStatus(currentInList);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const statusRes = await aiTestService.getJobStatus(selectedJobId);
        if (cancelled) return;
        setRunningJobStatus(statusRes);
        if (statusRes.status === "done") {
          await onRefreshJobs();
          await loadJobArtifacts(selectedJobId);
        } else if (statusRes.status === "error") {
          toast.error(statusRes.error || t("aiTest.player.toasts.jobError"));
          await onRefreshJobs();
        }
      } catch {
        // Ignore transient status poll error
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
  }, [jobs, loadJobArtifacts, onRefreshJobs, selectedJobId, t]);

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await aiTestService.uploadVideo(file);
      toast.success(t("aiTest.player.toasts.uploaded", { jobId: res.job_id.slice(0, 8) }));
      setSelectedJobId(res.job_id);
      await onRefreshJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiTest.player.toasts.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartJob = async () => {
    if (!selectedJobId) {
      toast.error(t("aiTest.player.toasts.selectJobFirst"));
      return;
    }
    setIsStartingJob(true);
    try {
      await aiTestService.startJob(selectedJobId, model || undefined);
      toast.success(t("aiTest.player.toasts.started", { jobId: selectedJobId.slice(0, 8) }));
      setRunningJobStatus({
        job_id: selectedJobId,
        status: "running",
        progress: 0,
      });
      await onRefreshJobs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiTest.player.toasts.startFailed"));
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleSelectJob = async (job: JobSummary) => {
    setSelectedJobId(job.job_id);
    setRunningJobStatus(job);
    if (job.status === "done" || job.has_video || job.has_log) {
      await loadJobArtifacts(job.job_id);
    }
  };

  const fps = jobMeta?.fps ?? runningJobStatus?.fps ?? 25;

  const seekToTime = useCallback((timeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, timeSec);
    video.currentTime = clamped;
    setCurrentTimeSec(clamped);
  }, []);

  useEffect(() => {
    if (externalSeekTimeSec) {
      seekToTime(externalSeekTimeSec.timeSec);
    }
  }, [externalSeekTimeSec, seekToTime]);

  const stepFrame = (deltaFrames: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const stepSec = deltaFrames / (fps > 0 ? fps : 25);
    seekToTime(video.currentTime + stepSec);
  };

  const frameMap = useMemo(() => buildFrameLookupMap(logEntries), [logEntries]);

  const { targetFrameIdx, entry: currentFrameEntry } = useMemo(
    () => findFrameEntryForTime(logEntries, frameMap, currentTimeSec, fps),
    [logEntries, frameMap, currentTimeSec, fps],
  );

  const personTracks = useMemo(
    () => computePersonTracks(logEntries, fps),
    [logEntries, fps],
  );

  const jobViolations = useMemo(
    () => extractJobViolationsSummary(logEntries, fps),
    [logEntries, fps],
  );

  const jobEvidences = useMemo(
    () =>
      activeJobId ? normalizeJobEvidences(activeJobId, jobMeta, logEntries) : [],
    [activeJobId, jobMeta, logEntries],
  );

  const maxFrame = useMemo(() => {
    if (jobMeta?.total_frames && jobMeta.total_frames > 0) return jobMeta.total_frames;
    if (logEntries.length > 0) return logEntries[logEntries.length - 1].frame_idx;
    return 1;
  }, [jobMeta?.total_frames, logEntries]);

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

  const inspectorOptions: SegmentedControlOption<InspectorSubTab>[] = [
    {
      value: "associations",
      label: t("aiTest.player.inspector.tabs.associations"),
      icon: <Users className="size-4" />,
      badge: currentFrameEntry?.associations?.length
        ? String(currentFrameEntry.associations.length)
        : undefined,
    },
    {
      value: "violations",
      label: t("aiTest.player.inspector.tabs.violations"),
      icon: <AlertTriangle className="size-4" />,
      badge: jobViolations.length > 0 ? String(jobViolations.length) : undefined,
    },
    {
      value: "evidences",
      label: t("aiTest.player.inspector.tabs.evidences"),
      icon: <Images className="size-4" />,
      badge: jobEvidences.length > 0 ? String(jobEvidences.length) : undefined,
    },
  ];

  const isRunning =
    runningJobStatus?.status === "running" || runningJobStatus?.status === "queued";

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
      {/* Left Sidebar: Upload, Parameters, Running Progress, Jobs Queue */}
      {/* Left Sidebar: Upload, Parameters, Running Progress, Jobs Queue */}
      <aside className="space-y-6 xl:col-span-4">
        {/* =====================================================================
      KHỐI 1: JOB CREATOR & INFERENCE LAUNCHER (TACTILE CONTROL MODULE)
     ===================================================================== */}
        <section
          aria-label={t("aiTest.player.creator.ariaLabel")}
          className="relative overflow-hidden rounded-[28px] bg-background p-5 sm:p-6 shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06] transition-all duration-300"
        >
          {/* Viền phản chiếu ánh sáng đỉnh khối */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative space-y-5">
            {/* Header Module */}
            <div className="flex items-start gap-3.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-4px_-4px_8px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
                  <Upload className="size-4" />
                </div>
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isRunning
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                    : "bg-accent"
                    }`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-foreground">
                    {t("aiTest.player.creator.title")}
                  </h2>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("aiTest.player.creator.subtitle")}
                </p>
              </div>
            </div>

            {/* Khay nút thao tác chính khoét sâu (Recessed Action Bay) */}
            <div className="grid grid-cols-1 gap-2.5 rounded-2xl bg-background/80 p-2 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55),inset_-3px_-3px_6px_rgba(255,255,255,0.03)] border border-black/[0.04] dark:border-white/[0.03] sm:grid-cols-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadFile(f);
                  e.target.value = "";
                }}
              />

              {/* Nút Upload Video Mới */}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-background px-3.5 py-2.5 text-xs font-bold text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45),-3px_-3px_6px_rgba(255,255,255,0.03)] hover:text-primary active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] border border-white/50 dark:border-white/[0.05] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
              >
                <Upload className="size-3.5 text-accent transition-transform duration-200 group-hover:-translate-y-0.5" />
                <span>
                  {isUploading ? t("aiTest.player.creator.uploading") : t("aiTest.player.creator.uploadNew")}
                </span>
              </button>

              {/* Nút Bắt đầu Phân Tích */}
              <button
                type="button"
                disabled={!selectedJobId || isStartingJob || isRunning}
                onClick={() => void handleStartJob()}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-[4px_4px_10px_rgba(0,0,0,0.16),-3px_-3px_8px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.55),-2px_-2px_6px_rgba(255,255,255,0.04)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
              >
                <Play className="size-3.5 fill-current" />
                <span>
                  {isRunning ? t("aiTest.player.creator.running") : t("aiTest.player.creator.startAnalysis")}
                </span>
              </button>
            </div>

            {/* Khay Thông Tin Job Đang Chọn & Thanh Tiến Độ Khoét Sâu */}
            {selectedJobId && (
              <div className="relative overflow-hidden rounded-2xl bg-background/85 p-3.5 text-xs shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55),inset_-4px_-4px_8px_rgba(255,255,255,0.03)] border border-black/[0.04] dark:border-white/[0.03]">
                {/* Vạch chỉ thị dọc bên trái */}
                <span
                  className={`absolute inset-y-2.5 left-1.5 w-1 rounded-full ${isRunning ? "bg-primary animate-pulse" : "bg-accent"
                    }`}
                />

                <div className="flex items-center justify-between gap-2 pl-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("aiTest.player.creator.activeTargetJob")}
                    </span>
                    <span className="font-mono text-xs font-extrabold text-foreground">
                      {selectedJobId.slice(0, 12)}
                    </span>
                  </div>

                  {runningJobStatus?.status && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${isRunning
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/15 text-accent"
                        }`}
                    >
                      {JOB_STATUS_BADGE[runningJobStatus.status]
                        ? t(JOB_STATUS_BADGE[runningJobStatus.status].labelKey)
                        : runningJobStatus.status}
                    </span>
                  )}
                </div>

                {isRunning && (
                  <div className="mt-3 space-y-1.5 pl-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted-foreground">
                        {t("aiTest.player.creator.inferenceProgress")}
                      </span>
                      <span className="font-mono font-extrabold text-primary">
                        {Math.round(runningJobStatus?.progress ?? 0)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-background p-0.5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(4, runningJobStatus?.progress ?? 0)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Module Chọn Model AI Đúc Nổi */}
            <div className="space-y-2 rounded-2xl bg-background p-3.5 shadow-[6px_6px_12px_rgba(0,0,0,0.08),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45),-5px_-5px_10px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {t("aiTest.player.creator.modelLabel")}
                </label>
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>
              <Select
                size="sm"
                options={modelOptions}
                value={model}
                onValueChange={setModel}
                placeholder={t("aiTest.live.modelPlaceholder")}
              />
            </div>
          </div>
        </section>

        {/* =====================================================================
      KHỐI 2: JOBS QUEUE LIST (DANH SÁCH HÀNG ĐỢI ĐÚC NỔI + KHAY LÕM)
     ===================================================================== */}
        <section
          aria-label={t("aiTest.player.jobs.ariaLabel")}
          className="relative overflow-hidden rounded-[28px] bg-background p-5 sm:p-6 shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06]"
        >
          {/* Header Danh sách Jobs */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-extrabold tracking-tight text-foreground">
                {t("aiTest.player.jobs.title")}
              </h2>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-extrabold text-primary">
                {jobs.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void onRefreshJobs()}
              title={t("aiTest.player.jobs.refreshTitle")}
              className="group inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
            >
              <RefreshCw className="size-3.5 transition-transform duration-500 group-hover:rotate-90" />
            </button>
          </div>

          {/* Khay chứa danh sách Jobs khoét sâu */}
          {jobs.length === 0 ? (
            <div className="rounded-2xl bg-background/80 px-4 py-8 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03]">
              {t("aiTest.player.jobs.empty")}
            </div>
          ) : (
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto rounded-2xl bg-background/80 p-2.5 shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03]">
              {jobs.map((job) => {
                const isSelected = job.job_id === selectedJobId;
                const badgeConfig = JOB_STATUS_BADGE[job.status];
                const badgeLabel = badgeConfig ? t(badgeConfig.labelKey) : job.status;
                const isJobRunning = job.status === "running";

                return (
                  <button
                    key={job.job_id}
                    type="button"
                    onClick={() => void handleSelectJob(job)}
                    className={`group relative w-full overflow-hidden rounded-2xl p-3.5 text-left transition-all duration-200 cursor-pointer ${isSelected
                      ? "bg-background shadow-[inset_4px_4px_8px_rgba(0,0,0,0.12),inset_-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)] ring-1 ring-primary/40"
                      : "bg-background shadow-[5px_5px_10px_rgba(0,0,0,0.09),-5px_-5px_10px_rgba(255,255,255,0.75)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45)] hover:translate-x-0.5 border border-white/40 dark:border-white/[0.05]"
                      }`}
                  >
                    {/* Thanh chỉ thị cạnh trái */}
                    <span
                      className={`absolute inset-y-2 left-1 w-1 rounded-full transition-colors ${isSelected
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : isJobRunning
                          ? "bg-accent animate-pulse"
                          : "bg-foreground/10 group-hover:bg-primary/40"
                        }`}
                    />

                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-xs font-extrabold transition-colors ${isSelected ? "text-primary" : "text-foreground"
                            }`}
                        >
                          {job.video_name || job.filename || job.job_id}
                        </span>

                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${isSelected || isJobRunning
                            ? "bg-primary/15 text-primary"
                            : "bg-accent/15 text-accent"
                            }`}
                        >
                          {badgeLabel}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                        <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 font-mono">
                          ID: {job.job_id.slice(0, 8)}
                        </span>

                        {job.model && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-primary">
                            {job.model}
                          </span>
                        )}

                        {typeof job.evidence_count === "number" && (
                          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-accent">
                            {t("aiTest.player.jobs.evidenceCount", { count: job.evidence_count })}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </aside>

      {/* Main Column: Annotated Video Player + Person Tracks + Synchronized Telemetry */}
      <div className="space-y-6 xl:col-span-8">
        {/* =====================================================================
      KHỐI 1: ANNOTATED VIDEO PLAYER & PERSON TRACKS TIMELINE
     ===================================================================== */}
        <section
          aria-label={t("aiTest.player.viewport.ariaLabel")}
          className="relative overflow-hidden rounded-[28px] bg-background p-5 sm:p-6 shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06] transition-all duration-300"
        >
          {/* Viền phản chiếu ánh sáng đỉnh khối */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative space-y-5">
            {/* Header Trình phát & Frame Sync Telemetry Pods */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45),-4px_-4px_8px_rgba(255,255,255,0.03)] border border-white/40 dark:border-white/[0.05]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
                    <Film className="size-4" />
                  </div>
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${activeJobId
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : "bg-muted-foreground/40"
                      }`}
                  />
                </div>

                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                    {t("aiTest.player.viewport.title")}
                  </h2>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t("aiTest.player.viewport.subtitle")}
                  </p>
                </div>
              </div>

              {activeJobId && (
                <div className="flex flex-wrap items-center gap-2 self-start rounded-2xl bg-background/80 p-1.5 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] border border-black/[0.03] dark:border-white/[0.03] sm:self-center">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1 font-mono text-[11px] font-extrabold text-primary-foreground shadow-sm">
                    {t("aiTest.player.viewport.frameCounter", { frame: targetFrameIdx })}
                    <span className="opacity-75">/ {maxFrame}</span>
                  </span>

                  <span className="inline-flex items-center rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]">
                    {formatTimeSec(currentTimeSec)}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-xl bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-accent shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)]">
                    {fps.toFixed(1)}
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      fps
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Bệ Màn Hình Video Khoét Sâu (Recessed Optical Viewport) */}
            <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[24px] bg-background/85 p-3 shadow-[inset_7px_7px_14px_rgba(0,0,0,0.14),inset_-7px_-7px_14px_rgba(255,255,255,0.75)] dark:shadow-[inset_7px_7px_14px_rgba(0,0,0,0.65),inset_-5px_-5px_12px_rgba(255,255,255,0.03)] border border-black/[0.05] dark:border-white/[0.04]">
              {/* 4 Góc ngắm kỹ thuật */}
              <span className="pointer-events-none absolute left-4 top-4 h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-primary/40" />
              <span className="pointer-events-none absolute right-4 top-4 h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-primary/40" />
              <span className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-primary/40" />
              <span className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-primary/40" />

              {isLoadingArtifacts ? (
                <div className="rounded-2xl bg-background px-8 py-6 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/[0.05]">
                  <Loader
                    size="lg"
                    showLabel
                    label={t("aiTest.player.viewport.loadingArtifacts")}
                  />
                </div>
              ) : activeJobId ? (
                <div className="w-full overflow-hidden rounded-2xl bg-foreground/[0.04] p-1 shadow-[4px_4px_12px_rgba(0,0,0,0.14)]">
                  <video
                    key={`${activeJobId}-${videoNonce}`}
                    ref={videoRef}
                    src={aiTestService.getJobVideoUrl(activeJobId, videoNonce)}
                    controls
                    playsInline
                    className="max-h-[460px] w-full rounded-xl bg-black"
                    onTimeUpdate={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
                    onSeeked={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-md space-y-4 p-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-background shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.03)] border border-white/50 dark:border-white/[0.06]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08)]">
                      <Film className="size-6" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-extrabold tracking-tight text-foreground">
                      {t("aiTest.player.viewport.emptyTitle")}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("aiTest.player.viewport.emptyHintBefore")}
                      <strong className="font-bold text-primary">
                        {t("aiTest.player.status.done")}
                      </strong>
                      {t("aiTest.player.viewport.emptyHintAfter")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Thanh Điều Khiển Bước Frame & Tốc Độ Phát (Tactile Transport Bar) */}
            {activeJobId && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background/80 p-2.5 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03]">
                {/* Cụm Nút Bước Frame */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepFrame(-1)}
                    className="group inline-flex items-center gap-1.5 rounded-xl bg-background px-3.5 py-2 text-xs font-bold text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] hover:text-primary active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
                  >
                    <SkipBack className="size-3.5 text-primary transition-transform group-hover:-translate-x-0.5" />
                    <span>{t("aiTest.player.viewport.prevFrame")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => stepFrame(1)}
                    className="group inline-flex items-center gap-1.5 rounded-xl bg-background px-3.5 py-2 text-xs font-bold text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] hover:text-primary active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.14)] border border-white/50 dark:border-white/[0.05] transition-all cursor-pointer"
                  >
                    <span>{t("aiTest.player.viewport.nextFrame")}</span>
                    <SkipForward className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                {/* Cụm Bộ Chọn Tốc Độ Phát */}
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("aiTest.player.viewport.speed")}
                  </span>
                  {[0.25, 0.5, 1, 2].map((rate) => {
                    const isSelectedRate = playbackRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={`rounded-xl px-2.5 py-1.5 font-mono text-xs font-extrabold transition-all cursor-pointer ${isSelectedRate
                            ? "bg-primary text-primary-foreground shadow-[3px_3px_8px_rgba(0,0,0,0.18)]"
                            : "bg-background text-muted-foreground shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.75)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.45)] hover:text-foreground border border-white/40 dark:border-white/[0.05]"
                          }`}
                      >
                        {rate}x
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Person Track Timeline Bars */}
            {personTracks.length > 0 && (
              <div className="space-y-3 rounded-[22px] bg-background/80 p-4 shadow-[inset_5px_5px_10px_rgba(0,0,0,0.11),inset_-5px_-5px_10px_rgba(255,255,255,0.7)] dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tracking-tight text-foreground">
                      {t("aiTest.player.tracks.title")}
                    </span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary">
                      {personTracks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary/60" />
                      {t("aiTest.player.tracks.legendAppear")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      {t("aiTest.player.tracks.legendViolation")}
                    </span>
                  </div>
                </div>

                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {personTracks.map((track) => (
                    <div key={track.trackId} className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => seekToTime(track.firstTimeSec)}
                        className="w-24 shrink-0 truncate rounded-xl bg-background px-2.5 py-1.5 text-left font-mono text-[11px] font-bold text-foreground shadow-[4px_4px_8px_rgba(0,0,0,0.09),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] hover:text-primary active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.14)] border border-white/40 dark:border-white/[0.05] transition-all cursor-pointer"
                      >
                        {t("aiTest.common.trackNumber", { id: track.trackId })}
                      </button>

                      <div className="relative h-6 flex-1 overflow-hidden rounded-xl bg-background p-0.5 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.12),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6)]">
                        {track.ranges.map((r, idx) => {
                          const leftPct =
                            (Math.max(0, r.start - 1) / Math.max(1, maxFrame)) * 100;
                          const widthPct = Math.max(
                            1.5,
                            ((r.end - r.start + 1) / Math.max(1, maxFrame)) * 100
                          );
                          return (
                            <button
                              key={`span-${idx}`}
                              type="button"
                              onClick={() =>
                                seekToTime(
                                  Math.max(0, r.start - 1) / (fps > 0 ? fps : 25)
                                )
                              }
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute top-1.5 bottom-1.5 rounded-md bg-primary/45 hover:bg-primary/75 transition-colors cursor-pointer"
                              title={t("aiTest.player.tracks.spanTitle", {
                                trackId: track.trackId,
                                start: r.start,
                                end: r.end,
                              })}
                            />
                          );
                        })}
                        {track.violationRanges.map((vr, idx) => {
                          const leftPct =
                            (Math.max(0, vr.start - 1) / Math.max(1, maxFrame)) * 100;
                          const widthPct = Math.max(
                            1.5,
                            ((vr.end - vr.start + 1) / Math.max(1, maxFrame)) * 100
                          );
                          return (
                            <button
                              key={`vspan-${idx}`}
                              type="button"
                              onClick={() =>
                                seekToTime(
                                  Math.max(0, vr.start - 1) / (fps > 0 ? fps : 25)
                                )
                              }
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute top-1 bottom-1 rounded-md bg-accent hover:brightness-110 shadow-sm transition-all cursor-pointer"
                              title={t("aiTest.player.tracks.violationSpanTitle", {
                                types: track.violationTypes.join(", "),
                                start: vr.start,
                                end: vr.end,
                              })}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================================
      KHỐI 2: SYNCHRONIZED FRAME INSPECTOR (TACTILE TELEMETRY CONSOLE)
     ===================================================================== */}
        <section
          aria-label={t("aiTest.player.inspector.ariaLabel")}
          className="relative overflow-hidden rounded-[28px] bg-background p-5 sm:p-6 shadow-[14px_14px_28px_rgba(0,0,0,0.12),-14px_-14px_28px_rgba(255,255,255,0.75),inset_1px_1px_2px_rgba(255,255,255,0.6)] dark:shadow-[14px_14px_28px_rgba(0,0,0,0.55),-10px_-10px_24px_rgba(255,255,255,0.04),inset_1px_1px_1px_rgba(255,255,255,0.07)] border border-white/40 dark:border-white/[0.06] transition-all duration-300"
        >
          {/* Viền phản chiếu ánh sáng đỉnh khối */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="relative space-y-5">
            {/* Khay Chuyển Tab Cơ Học Khoét Sâu (Recessed Inspector Tab Switcher) */}
            <div
              role="tablist"
              aria-label={t("aiTest.player.inspector.ariaLabel")}
              className="grid grid-cols-1 gap-2 rounded-2xl bg-background/80 p-2 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)] border border-black/[0.04] dark:border-white/[0.03] sm:grid-cols-3"
            >
              {inspectorOptions.map((opt) => {
                const isSelected = inspectorTab === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setInspectorTab(opt.value)}
                    className={`relative flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 cursor-pointer ${isSelected
                        ? "bg-background text-primary shadow-[5px_5px_10px_rgba(0,0,0,0.1),-5px_-5px_10px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45)] border border-white/50 dark:border-white/[0.06]"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                    {opt.badge !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.2 font-mono text-[10px] font-extrabold ${isSelected
                            ? "bg-primary/15 text-primary"
                            : "bg-accent/15 text-accent"
                          }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute bottom-0 left-1/2 h-[2.5px] w-10 -translate-x-1/2 rounded-t-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* =================================================================
          TAB 1: ASSOCIATIONS & PPE STATUS
         ================================================================= */}
            {inspectorTab === "associations" && (
              <div className="space-y-4">
                {!currentFrameEntry ? (
                  <div className="rounded-2xl bg-background/80 px-4 py-8 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                    {t("aiTest.player.inspector.noFrameLog")}
                  </div>
                ) : (
                  <>
                    {/* Thanh Tóm Tắt Frame Đúc Nổi */}
                    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-background/80 px-3.5 py-2.5 text-xs shadow-[inset_3px_3px_6px_rgba(0,0,0,0.09),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5)]">
                      <span className="rounded-lg bg-primary/15 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-primary">
                        {t("aiTest.player.inspector.loggedFrame", { frame: currentFrameEntry.frame_idx })}
                      </span>
                      <span className="font-semibold text-foreground">
                        {t("aiTest.player.inspector.personsLabel")}{" "}
                        <strong className="font-mono text-primary">
                          {currentFrameEntry.persons?.length ?? 0}
                        </strong>
                      </span>
                      <span className="text-foreground/20">•</span>
                      <span className="font-semibold text-foreground">
                        {t("aiTest.player.inspector.associationsLabel")}{" "}
                        <strong className="font-mono text-accent">
                          {currentFrameEntry.associations?.length ?? 0}
                        </strong>
                      </span>
                      {typeof currentFrameEntry.inference_ms === "number" && (
                        <>
                          <span className="text-foreground/20">•</span>
                          <span className="font-mono text-[11px] font-bold text-muted-foreground">
                            {currentFrameEntry.inference_ms.toFixed(1)} ms
                          </span>
                        </>
                      )}
                    </div>

                    {(currentFrameEntry.associations?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                        {currentFrameEntry.associations!.map((assoc, idx) => {
                          const parsed = extractAssociationPpeStatus(assoc);
                          const isAllClear = parsed.missing.length === 0;

                          return (
                            <div
                              key={`${parsed.trackId}-${idx}`}
                              className="relative space-y-3 overflow-hidden rounded-2xl bg-background p-4 shadow-[6px_6px_12px_rgba(0,0,0,0.09),-6px_-6px_12px_rgba(255,255,255,0.75),inset_1px_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.45)] border border-white/40 dark:border-white/[0.05]"
                            >
                              <span
                                className={`absolute inset-y-2.5 left-1 w-1 rounded-full ${isAllClear ? "bg-primary" : "bg-accent"
                                  }`}
                              />

                              <div className="flex items-center justify-between pl-2">
                                <span className="inline-flex items-center gap-2 text-sm font-extrabold text-foreground">
                                  <ShieldCheck
                                    className={`size-4 ${isAllClear ? "text-primary" : "text-accent"
                                      }`}
                                  />
                                  {t("aiTest.player.inspector.personTrack", { id: parsed.trackId })}
                                </span>

                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${isAllClear
                                      ? "bg-primary/15 text-primary"
                                      : "bg-accent/15 text-accent"
                                    }`}
                                >
                                  {isAllClear
                                    ? t("aiTest.player.inspector.ppeComplete")
                                    : t("aiTest.player.inspector.ppeMissing", { count: parsed.missing.length })}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2 pl-2">
                                <span
                                  className={`rounded-xl px-2.5 py-1 font-mono text-[11px] font-bold ${parsed.helmetOk
                                      ? "bg-primary/10 text-primary"
                                      : "bg-accent/15 text-accent"
                                    }`}
                                >
                                  {t("aiTest.player.inspector.helmetStatus", {
                                    status: parsed.helmetOk ? t("aiTest.common.yes") : t("aiTest.common.no"),
                                  })}
                                  {typeof parsed.helmetConf === "number"
                                    ? ` (${(parsed.helmetConf * 100).toFixed(0)}%)`
                                    : ""}
                                </span>

                                <span
                                  className={`rounded-xl px-2.5 py-1 font-mono text-[11px] font-bold ${parsed.vestOk
                                      ? "bg-primary/10 text-primary"
                                      : "bg-accent/15 text-accent"
                                    }`}
                                >
                                  {t("aiTest.player.inspector.vestStatus", {
                                    status: parsed.vestOk ? t("aiTest.common.yes") : t("aiTest.common.no"),
                                  })}
                                  {typeof parsed.vestConf === "number"
                                    ? ` (${(parsed.vestConf * 100).toFixed(0)}%)`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (currentFrameEntry.persons?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {currentFrameEntry.persons!.map((p, idx) => (
                          <div
                            key={`${p.track_id}-${idx}`}
                            className="flex items-center justify-between rounded-2xl bg-background px-3.5 py-2.5 text-xs shadow-[5px_5px_10px_rgba(0,0,0,0.08),-5px_-5px_10px_rgba(255,255,255,0.75)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45)] border border-white/40 dark:border-white/[0.05]"
                          >
                            <span className="font-mono font-extrabold text-foreground">
                              {t("aiTest.common.trackNumber", { id: p.track_id })}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {p.has_helmet !== undefined && (
                                <span
                                  className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${p.has_helmet
                                      ? "bg-primary/15 text-primary"
                                      : "bg-accent/15 text-accent"
                                    }`}
                                >
                                  {t("aiTest.player.inspector.helmetShort", {
                                    status: p.has_helmet ? t("aiTest.common.ok") : t("aiTest.common.missing"),
                                  })}
                                </span>
                              )}
                              {p.has_vest !== undefined && (
                                <span
                                  className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold ${p.has_vest
                                      ? "bg-primary/15 text-primary"
                                      : "bg-accent/15 text-accent"
                                    }`}
                                >
                                  {t("aiTest.player.inspector.vestShort", {
                                    status: p.has_vest ? t("aiTest.common.ok") : t("aiTest.common.missing"),
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-background/80 px-4 py-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                        {t("aiTest.player.inspector.noPersonsInFrame", { frame: currentFrameEntry.frame_idx })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* =================================================================
          TAB 2: VIOLATIONS (CURRENT FRAME & FULL JOB TIMELINE)
         ================================================================= */}
            {inspectorTab === "violations" && (
              <div className="space-y-5">
                {/* Vi phạm tại Frame hiện tại */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {t("aiTest.player.inspector.currentFrameViolations")}
                    </h4>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-accent">
                      {currentFrameEntry?.violations?.length ?? 0}
                    </span>
                  </div>

                  {(currentFrameEntry?.violations?.length ?? 0) === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-background/80 px-4 py-3 text-xs font-bold text-primary shadow-[inset_4px_4px_8px_rgba(0,0,0,0.09),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>{t("aiTest.player.inspector.noActiveViolationsInFrame")}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentFrameEntry!.violations!.map((v, idx) => (
                        <div
                          key={`${v.track_id}-${v.type}-${idx}`}
                          className="relative flex items-center justify-between overflow-hidden rounded-2xl bg-background px-4 py-2.5 text-xs shadow-[5px_5px_10px_rgba(0,0,0,0.09),-5px_-5px_10px_rgba(255,255,255,0.75)] dark:shadow-[5px_5px_10px_rgba(0,0,0,0.45)] border border-accent/25"
                        >
                          <span className="absolute inset-y-1.5 left-1 w-1 rounded-full bg-accent" />
                          <div className="flex items-center gap-2.5 pl-2">
                            <span className="rounded-lg bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-accent">
                              {formatViolationLabel(v.type, locale)}
                            </span>
                            <span className="font-bold text-foreground">
                              {t("aiTest.common.trackNumber", { id: v.track_id })}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-accent">
                            {t("aiTest.player.inspector.sustainLabel")}{" "}
                            {(v.sustained_sec ?? v.duration_sec ?? 0).toFixed(1)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Toàn bộ chuỗi vi phạm trong Job */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {t("aiTest.player.inspector.allJobViolations")}
                    </h4>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                      {jobViolations.length}
                    </span>
                  </div>

                  {jobViolations.length === 0 ? (
                    <div className="rounded-2xl bg-background/80 px-4 py-6 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                      {t("aiTest.player.inspector.noViolationsInJob")}
                    </div>
                  ) : (
                    <div className="max-h-56 space-y-2.5 overflow-y-auto rounded-2xl bg-background/80 p-2.5 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.11),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.55)]">
                      {jobViolations.map((ev) => {
                        const isCritical = ev.type.toLowerCase() === "no_helmet";
                        return (
                          <button
                            key={ev.key}
                            type="button"
                            onClick={() => seekToTime(ev.startTimeSec)}
                            className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-background px-3.5 py-2.5 text-left text-xs shadow-[4px_4px_8px_rgba(0,0,0,0.08),-4px_-4px_8px_rgba(255,255,255,0.75)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.45)] hover:translate-x-0.5 border border-white/40 dark:border-white/[0.05] transition-all cursor-pointer"
                          >
                            <span
                              className={`absolute inset-y-1.5 left-1 w-1 rounded-full ${isCritical ? "bg-accent" : "bg-primary"
                                }`}
                            />
                            <div className="flex flex-wrap items-center gap-2 pl-2">
                              <span
                                className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${isCritical
                                    ? "bg-accent/15 text-accent"
                                    : "bg-primary/15 text-primary"
                                  }`}
                              >
                                {formatViolationLabel(ev.type, locale)}
                              </span>
                              <span className="font-bold text-foreground">
                                {t("aiTest.common.trackNumber", { id: ev.trackId })}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                Frame {ev.startFrame} → {ev.endFrame}
                              </span>
                            </div>

                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-extrabold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {t("aiTest.player.inspector.seekToTime", {
                                time: formatTimeSec(ev.startTimeSec),
                              })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================
          TAB 3: EVIDENCES (BEFORE / AFTER GALLERY)
         ================================================================= */}
            {inspectorTab === "evidences" && (
              <div>
                {jobEvidences.length === 0 ? (
                  <div className="rounded-2xl bg-background/80 px-4 py-8 text-center text-xs font-medium text-muted-foreground shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
                    {t("aiTest.player.inspector.noEvidencesInJob")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 rounded-2xl bg-background/80 p-3 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] md:grid-cols-2">
                    {jobEvidences.map((item, idx) => (
                      <EvidencePairCard
                        key={item.id}
                        item={item}
                        onInspect={() => onInspectEvidence(jobEvidences, idx)}
                        onSeekToTime={seekToTime}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

