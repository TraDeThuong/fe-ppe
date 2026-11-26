"use client";

import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { EvidenceLightboxModal } from "@/components/features/ai-test/evidence-lightbox-modal";
import { EditCameraModal } from "@/components/features/cameras";
import { RestrictedAreaDrawer } from "@/components/features/sites/restricted-area-drawer";
import { Loader } from "@/components/ui/loader";
import { CameraDeviceDiagnosticsTab } from "./camera-device-diagnostics-tab";
import { CameraIncidentsListCard } from "./camera-incidents-list-card";
import { CameraLiveControlDeck } from "./camera-live-control-deck";
import { CameraLiveTelemetry } from "./camera-live-telemetry";
import { CameraLiveViewport } from "./camera-live-viewport";
import { CameraStudioHeader } from "./camera-studio-header";
import { useCameraStudioController } from "./use-camera-studio-controller";

export interface CameraIntelligenceContentProps {
  cameraId: string;
}

export function CameraIntelligenceContent({
  cameraId,
}: CameraIntelligenceContentProps) {
  const {
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
    isSavingDb,
    isResettingRules,
    isRefreshing,
    isUpdatingCamera,
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
    handleStartDefaultStream,
    handleStopStreamClick,
    handleSaveToDbClick,
    handleResetToSiteRules,
    handleSaveCameraPolygon,
    handleOpenLightbox,
    handleEditCamera,
    handleJumpToOverrideTab,
    handleJumpToDiagnosticsTab,
    handleApplyOverrideClick,
    handleUploadOverrideClick,
    handleClearOverride,
  } = useCameraStudioController(cameraId);

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
            {isVietnamese
              ? "Không tìm thấy thiết bị Camera"
              : "Camera device not found"}
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
            <span>
              {isVietnamese
                ? "Quay lại danh sách Camera"
                : "Back to Camera Fleet"}
            </span>
          </Link>
        </div>
      </div>
    );
  }

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
        liveStatus={effectiveStats?.status}
        models={models}
        activeModelName={activeModelName}
        incidentsCount={totalIncidentsCount}
        isRefreshing={isRefreshing}
        canManage={canManage}
        onRefreshAll={handleRefreshAll}
        onOpenPing={handleJumpToDiagnosticsTab}
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
          confidenceThreshold={confidenceThreshold}
          onConfidenceThresholdChange={setConfidenceThreshold}
          cooldownSec={cooldownSec}
          onCooldownSecChange={setCooldownSec}
          activeAiConfig={stats?.active_config}
          enableNoHelmet={enableNoHelmet}
          onEnableNoHelmetChange={setEnableNoHelmet}
          enableNoVest={enableNoVest}
          onEnableNoVestChange={setEnableNoVest}
          enableRestrictedArea={enableRestrictedArea}
          onEnableRestrictedAreaChange={setEnableRestrictedArea}
          enableSceneCut={enableSceneCut}
          onEnableSceneCutChange={setEnableSceneCut}
          isStarting={isStarting}
          isStopping={isStopping}
          isSavingDb={isSavingDb}
          canManageCamera={canManage}
          canManageSafety={canManageSafety}
          canPlotRoi={canPlotRoi}
          onStartStream={handleStartDefaultStream}
          onStopStream={handleStopStreamClick}
          onSaveToDb={handleSaveToDbClick}
          onOpenDeviceTab={canManage ? handleJumpToOverrideTab : undefined}
          roiPointsCount={cameraRoiPointsCount}
          onOpenRestrictedAreaModal={
            canPlotRoi ? () => setRestrictedModalOpen(true) : undefined
          }
          safetySource={effectiveSafety?.source}
          onResetToSiteRules={handleResetToSiteRules}
          isResettingRules={isResettingRules}
        />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <CameraLiveViewport
            liveCameraId={liveCameraId}
            cameraName={camera.name}
            cameraStreamUrl={overrideSource.trim() || camera.streamUrl}
            sourceErrorReason={sourceNote}
            stats={effectiveStats}
            streamNonce={streamNonce}
            isStarting={isStarting}
            canStart={Boolean(effectiveSource)}
            canManageCamera={canManage}
            onStartStream={handleStartDefaultStream}
            onReloadStream={() => setStreamNonce(Date.now())}
            onOpenDeviceTab={canManage ? handleJumpToOverrideTab : undefined}
          />

          <CameraLiveTelemetry
            stats={effectiveStats}
            galleryCount={totalIncidentsCount}
            onOpenGallery={() => setActiveTab("incidents")}
          />
        </div>
      </section>

      {/* Tab 02: Unified Incidents & Before/After Evidence Workspace */}
      <section className={activeTab === "incidents" ? "block" : "hidden"}>
        <CameraIncidentsListCard
          camera={camera}
          isTabActive={isIncidentsTabReady}
          liveEvidences={liveEvidences}
          onInspectEvidence={handleOpenLightbox}
        />
      </section>

      {/* Tab 03: Dedicated Device Profile, Network Diagnostics & Hardware Config */}
      <section className={activeTab === "device" ? "block" : "hidden"}>
        <CameraDeviceDiagnosticsTab
          camera={camera}
          config={cameraConfig}
          effectiveSafety={effectiveSafety}
          isTabActive={isDeviceTabReady}
          liveVideos={liveVideos}
          overrideSource={overrideSource}
          productionMode={productionMode}
          isUploading={isUploading}
          isStarting={isStarting}
          overrideHighlightTick={overrideHighlightTick}
          diagnosticsHighlightTick={diagnosticsHighlightTick}
          onApplyOverrideStream={handleApplyOverrideClick}
          onUploadOverrideStream={handleUploadOverrideClick}
          onClearOverride={handleClearOverride}
          onOpenRestrictedAreaModal={
            canPlotRoi ? () => setRestrictedModalOpen(true) : undefined
          }
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

      {/* Edit Modal */}
      <EditCameraModal
        open={editOpen}
        onOpenChange={setEditOpen}
        camera={camera}
        onSubmit={handleEditCamera}
        loading={isUpdatingCamera}
      />

      {/* Camera-specific Restricted Area (ROI) Plotting Modal */}
      {canPlotRoi && (
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
      )}
    </div>
  );
}
