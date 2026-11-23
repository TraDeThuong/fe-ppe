"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AiTestHeader,
  EvidenceGalleryPanel,
  EvidenceLightboxModal,
  LiveStreamPanel,
  OfflinePlayerPanel,
} from "@/components/features/ai-test";
import {
  aiTestService,
  isAiEndpointNotFoundError,
} from "@/services/ai-test.service";
import { useLocale } from "@/providers/locale-provider";
import type {
  AiTestViewTab,
  EvidenceItem,
  JobSummary,
  ModelInfo,
} from "@/types/ai-test.types";

export default function AiModelTestContent() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<AiTestViewTab>("live");

  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [liveRefreshNonce, setLiveRefreshNonce] = useState<number>(0);
  const [offlineJobsSupported, setOfflineJobsSupported] = useState<boolean>(true);
  const [maxSessions, setMaxSessions] = useState<number | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);

  const [activeLiveCameraId, setActiveLiveCameraId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [liveEvidences, setLiveEvidences] = useState<EvidenceItem[]>([]);
  const [jobEvidences, setJobEvidences] = useState<EvidenceItem[]>([]);

  const [seekRequest, setSeekRequest] = useState<{
    timeSec: number;
    nonce: number;
  } | null>(null);

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    items: EvidenceItem[];
    index: number;
  }>({
    open: false,
    items: [],
    index: 0,
  });

  const refreshMetadata = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [modelsRes, jobsRes, runtimeRes] = await Promise.allSettled([
        aiTestService.getModels(),
        aiTestService.listJobs(),
        aiTestService.getLiveRuntimeConfig(),
      ]);

      if (modelsRes.status === "rejected") {
        setBackendOnline(false);
        setBackendError(
          modelsRes.reason instanceof Error
            ? modelsRes.reason.message
            : t("aiTest.errors.connectFailed"),
        );
        return;
      }

      setModels(modelsRes.value);
      setBackendOnline(true);
      setBackendError(null);

      if (runtimeRes.status === "fulfilled") {
        setMaxSessions(runtimeRes.value.max_sessions);
      }

      if (jobsRes.status === "fulfilled") {
        setJobs(jobsRes.value);
        setOfflineJobsSupported(true);
      } else {
        setJobs([]);
        setOfflineJobsSupported(!isAiEndpointNotFoundError(jobsRes.reason));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshMetadata();
  }, [refreshMetadata]);

  const refreshJobsOnly = useCallback(async () => {
    try {
      const fetchedJobs = await aiTestService.listJobs();
      setJobs(fetchedJobs);
      setBackendOnline(true);
      setBackendError(null);
    } catch {
      // Keep previous list if transient
    }
  }, []);

  const combinedEvidences = useMemo<EvidenceItem[]>(
    () => [...liveEvidences, ...jobEvidences],
    [liveEvidences, jobEvidences],
  );

  const handleOpenLightbox = useCallback((items: EvidenceItem[], index: number) => {
    setLightbox({
      open: true,
      items,
      index: Math.max(0, Math.min(index, items.length - 1)),
    });
  }, []);

  const handleSeekToJobTime = useCallback((timeSec: number) => {
    setActiveTab("player");
    setSeekRequest({ timeSec, nonce: Date.now() });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-10">
      <AiTestHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendOnline={backendOnline}
        backendError={backendError}
        models={models}
        activeLiveCameraId={activeLiveCameraId}
        activeJobId={activeJobId}
        galleryCount={combinedEvidences.length}
        isRefreshing={isRefreshing}
        onRefreshAll={() => {
          setLiveRefreshNonce((prev) => prev + 1);
          void refreshMetadata();
        }}
      />

      <section className={activeTab === "live" ? "block" : "hidden"}>
        <LiveStreamPanel
          models={models}
          maxSessions={maxSessions}
          offlineUploadSupported={offlineJobsSupported}
          activeCameraId={activeLiveCameraId}
          refreshNonce={liveRefreshNonce}
          onActiveCameraChange={setActiveLiveCameraId}
          onLiveEvidencesChange={setLiveEvidences}
          onInspectEvidence={handleOpenLightbox}
          onOpenGallery={() => setActiveTab("gallery")}
        />
      </section>

      <section className={activeTab === "player" ? "block" : "hidden"}>
        <OfflinePlayerPanel
          models={models}
          jobs={jobs}
          offlineJobsSupported={offlineJobsSupported}
          onRefreshJobs={refreshJobsOnly}
          activeJobId={activeJobId}
          onActiveJobChange={setActiveJobId}
          onJobEvidencesChange={setJobEvidences}
          onInspectEvidence={handleOpenLightbox}
          externalSeekTimeSec={seekRequest}
        />
      </section>

      <section className={activeTab === "gallery" ? "block" : "hidden"}>
        <EvidenceGalleryPanel
          items={combinedEvidences}
          onInspectEvidence={handleOpenLightbox}
          onSeekToJobTime={handleSeekToJobTime}
        />
      </section>

      <EvidenceLightboxModal
        open={lightbox.open}
        items={lightbox.items}
        activeIndex={lightbox.index}
        onClose={() => setLightbox((prev) => ({ ...prev, open: false }))}
        onChangeIndex={(nextIndex) =>
          setLightbox((prev) => ({ ...prev, index: nextIndex }))
        }
        onSeekToJobTime={handleSeekToJobTime}
      />
    </div>
  );
}
