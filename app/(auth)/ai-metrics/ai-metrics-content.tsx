"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Cpu, Eye, Layers, Plus, Zap } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/refresh-action";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAiSandbox } from "@/config/navigation";
import { resolveAiPerformance } from "@/lib/ai-performance";
import { useCan } from "@/hooks/use-can";
import {
  AiMetricsKpiSummary,
  ActiveModelBanner,
  AiMetricsToolbar,
  PerClassMetricsCard,
  ConfusionMatrixHeatmap,
  LatencyChartCard,
  ModelGovernanceTable,
  DeployModelDialog,
  CreateAiModelModal,
  CreateModelVersionModal,
  RecordAiBenchmarkModal,
  ModelDetailModal,
  AiMetricsGuideModal,
  type AiCardGuideKey,
  type AiMetricStatKey,
} from "@/components/features/ai-metrics";
import {
  useAiPerformance,
  useActiveModelVersion,
  useAiModels,
  useCameras,
  useCreateAiModel,
  useCreateAiModelVersion,
  useDeployModelVersion,
  useRecordAiPerformance,
} from "@/hooks";
import type { AiModelVersionDto, AiPerformanceFilter } from "@/types";

const STAT_TO_URL: Record<AiMetricStatKey, string> = {
  map50: "map50",
  latency: "latency",
  fps: "fps",
  samples: "samples",
};

const URL_TO_STAT: Record<string, AiMetricStatKey> = {
  map50: "map50",
  map: "map50",
  latency: "latency",
  fps: "fps",
  samples: "samples",
  inferences: "samples",
};

export type AiMetricsPageTab = "performance" | "governance";

export default function AiMetricsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state synchronization for active tab ("performance" | "governance")
  const tabParam = searchParams.get("tab");
  const activeTab: AiMetricsPageTab =
    tabParam === "governance" ? "governance" : "performance";

  const handleTabChange = (nextTab: AiMetricsPageTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "governance") {
      params.set("tab", "governance");
    } else {
      params.delete("tab");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // URL state synchronization for stats (giống trang Roles)
  const statParam = searchParams.get("stat");
  const selectedStat = statParam && URL_TO_STAT[statParam] ? URL_TO_STAT[statParam] : null;

  const handleSelectStat = (stat: AiMetricStatKey | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stat) {
      params.set("stat", STAT_TO_URL[stat]);
    } else {
      params.delete("stat");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const { status, user } = useAuth();
  const can = useCan();
  const authenticated = status === "authenticated";
  const canReadMetrics = authenticated && can("PPE_AI_METRICS_READ");
  const canReadModels = canReadMetrics && can("PPE_MODEL_READ");
  const canReadCameras = canReadMetrics && can("PPE_CAMERA_READ");
  const canManageModels = canReadMetrics && can("PPE_MODEL_MANAGE");
  const canTestModel = authenticated && canAccessAiSandbox(user?.permissions, user?.role);

  // Filters
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    if (period === "all") {
      return { startDate: undefined, endDate: undefined };
    }
    const end = new Date();
    const start = new Date(end);
    if (period === "24h") {
      start.setDate(end.getDate() - 1);
    } else if (period === "30d") {
      start.setDate(end.getDate() - 30);
    } else {
      start.setDate(end.getDate() - 7);
    }
    // Dùng múi giờ Việt Nam để khớp với statDate trên Backend (tránh lệch 1 ngày trước 07:00 sáng theo UTC)
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    return { startDate: fmt(start), endDate: fmt(end) };
  }, [period]);

  const filter: AiPerformanceFilter = {
    modelId: canReadModels ? selectedModelId || undefined : undefined,
    cameraId: canReadCameras ? selectedCameraId || undefined : undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  };

  // Queries
  const camerasQuery = useCameras({ limit: 100 }, { enabled: canReadCameras });
  const cameras = canReadCameras ? (camerasQuery.data?.items ?? []) : [];

  const {
    data: performanceResponse,
    isLoading: isPerfLoading,
    isError: isPerfError,
    refetch: refetchPerf,
    isRefetching: isPerfRefetching,
  } = useAiPerformance(filter, canReadMetrics);

  const {
    data: activeVersionData,
    isError: isActiveError,
    isLoading: isActiveLoading,
    isFetching: isActiveFetching,
    refetch: refetchActive,
  } = useActiveModelVersion({ enabled: canReadModels });

  const {
    data: modelsData,
    isError: isModelsError,
    isLoading: isModelsLoading,
    isFetching: isModelsFetching,
    refetch: refetchModels,
  } = useAiModels({ enabled: canReadModels });

  const models = useMemo(
    () => canReadModels ? (modelsData ?? []) : [],
    [canReadModels, modelsData],
  );
  const activeVersion = canReadModels ? activeVersionData : undefined;
  const modelId = filter.modelId;
  const performance = useMemo(
    () => canReadMetrics
      ? resolveAiPerformance(performanceResponse, { modelId }, models, activeVersion)
      : null,
    [canReadMetrics, performanceResponse, modelId, models, activeVersion],
  );

  // Mutations
  const deployMutation = useDeployModelVersion();
  const createModelMutation = useCreateAiModel();
  const createVersionMutation = useCreateAiModelVersion();
  const recordTelemetryMutation = useRecordAiPerformance();

  // Dialog State
  const [selectedCandidate, setSelectedCandidate] = useState<AiModelVersionDto | null>(null);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [versionModalModelId, setVersionModalModelId] = useState<string | undefined>(undefined);
  const [isRecordTelemetryOpen, setIsRecordTelemetryOpen] = useState(false);
  const [detailModelId, setDetailModelId] = useState<string | null>(null);
  const [guideKey, setGuideKey] = useState<AiCardGuideKey | null>(null);

  const handleOpenDeploy = (_modelId: string, version: AiModelVersionDto) => {
    setSelectedCandidate(version);
    setIsDeployOpen(true);
  };

  const handleRefreshAll = () => Promise.all([
    ...(canReadMetrics ? [refetchPerf()] : []),
    ...(canReadCameras ? [camerasQuery.refetch()] : []),
    ...(canReadModels ? [refetchActive(), refetchModels()] : []),
  ]);

  const isRefetching =
    (canReadMetrics && isPerfRefetching) ||
    (canReadCameras && camerasQuery.isFetching) ||
    (canReadModels && (isActiveFetching || isModelsFetching));

  const activeModel = activeVersion
    ? models.find((m) => m.id === activeVersion.modelId)
    : undefined;
  const activeModelName = activeVersion
    ? activeModel?.name ||
      (typeof activeVersion.metrics?.modelName === "string"
        ? activeVersion.metrics.modelName
        : undefined) ||
      activeVersion.modelName ||
      activeVersion.model?.name ||
      undefined
    : undefined;

  const allVersionsCount = useMemo(
    () => models.reduce((sum, m) => sum + (m.versions?.length ?? 0), 0),
    [models],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Cpu}
        title={t("aiMetrics.title")}
        description={t("aiMetrics.description")}
        badge={activeModelName}
        badgeIcon={Zap}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageModels && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModelOpen(true)}
                  className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Đăng ký Model" : "New Model"}</span>
                </Button>
                <Button
                  variant="outline"
                  disabled={models.length === 0}
                  onClick={() => {
                    setVersionModalModelId(selectedModelId || undefined);
                    setIsCreateVersionOpen(true);
                  }}
                  className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Thêm Version" : "New Version"}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsRecordTelemetryOpen(true)}
                  className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span>{isVietnamese ? "Ghi Telemetry" : "Record Benchmark"}</span>
                </Button>
              </>
            )}
            {filter.modelId && (
              <Button
                variant="outline"
                onClick={() => setDetailModelId(filter.modelId ?? null)}
                className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Chi tiết Model" : "Model Info"}</span>
              </Button>
            )}

            <RefreshButton
              variant="ghost"
              onRefresh={handleRefreshAll}
              isRefreshing={isRefetching}
              hasError={
                (canReadMetrics && isPerfError) ||
                (canReadCameras && camerasQuery.isError) ||
                (canReadModels && (isActiveError || isModelsError))
              }
              iconClassName="h-3.5 w-3.5 sm:h-4 sm:w-4"
              className="gap-2 text-xs sm:text-sm h-8 sm:h-9"
            />
          </div>
        }
      />

      {isPerfError && canReadMetrics && (
        <p role="alert" className="rounded-xl border border-border/60 bg-surface p-3 text-sm text-foreground">
          {t("aiMetrics.performanceError")}
        </p>
      )}

      {/* Registry version banner */}
      <ActiveModelBanner
        activeVersion={activeVersion}
        modelName={activeModelName}
        loading={canReadModels && isActiveLoading}
        canReadModels={canReadModels}
        canTestModel={canTestModel}
        error={canReadModels && isActiveError}
        onOpenGuide={() => setGuideKey("active-model")}
      />

      {/* 2-Tab Navigation: Hiệu năng & Chỉ số AI | Quản trị Phiên bản Model */}
      <div
        role="tablist"
        aria-label={t("aiMetrics.title")}
        className="overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2 border-b border-border/40 pb-2.5 -mx-3 px-3 sm:mx-0 sm:px-0 dark:border-black/50"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "performance"}
          onClick={() => handleTabChange("performance")}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
            activeTab === "performance"
              ? "bg-surface-elevated text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] dark:bg-card dark:text-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]"
              : "text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground dark:hover:bg-card/50"
          }`}
        >
          <Activity
            className={`h-4 w-4 shrink-0 ${
              activeTab === "performance" ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span>{t("aiMetrics.tabs.performance")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "governance"}
          onClick={() => handleTabChange("governance")}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
            activeTab === "governance"
              ? "bg-surface-elevated text-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] dark:bg-card dark:text-primary dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7)]"
              : "text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground dark:hover:bg-card/50"
          }`}
        >
          <Layers
            className={`h-4 w-4 shrink-0 ${
              activeTab === "governance" ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span>{t("aiMetrics.tabs.governance")}</span>
          {canReadModels && (
            <span
              className={`ml-0.5 rounded-full px-2 py-0.2 text-[10px] sm:text-xs font-mono font-bold ${
                activeTab === "governance"
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted-foreground dark:bg-muted"
              }`}
            >
              {allVersionsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "performance" ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Bento Console KPI Summary với hiệu ứng sunken và Panel giải thích chi tiết */}
          <AiMetricsKpiSummary
            performance={performance}
            loading={isPerfLoading}
            selectedStat={selectedStat}
            onSelectStat={handleSelectStat}
            onNavigateToGovernance={() => handleTabChange("governance")}
          />

          {/* Filter Toolbar */}
          <AiMetricsToolbar
            models={models}
            selectedModelId={filter.modelId ?? ""}
            canReadModels={canReadModels}
            onModelChange={(nextModelId) => {
              setSelectedModelId(nextModelId);
              setSelectedClass(null);
            }}
            cameras={cameras}
            selectedCameraId={filter.cameraId ?? ""}
            canReadCameras={canReadCameras}
            onCameraChange={setSelectedCameraId}
            period={period}
            onPeriodChange={setPeriod}
          />

          {/* 2-Column: Per-Class Breakdown (Left) & Confusion Matrix Heatmap (Right) */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
            <div id="per-class-breakdown" className="scroll-mt-20 h-full">
              <PerClassMetricsCard
                metrics={performance?.perClassMetrics}
                canTestModel={canTestModel}
                loading={isPerfLoading}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                onOpenGuide={() => setGuideKey("per-class")}
              />
            </div>

            <div id="confusion-matrix" className="scroll-mt-20 h-full">
              <ConfusionMatrixHeatmap
                confusionMatrix={performance?.confusionMatrix}
                loading={isPerfLoading}
                selectedClass={selectedClass}
                onSelectClass={setSelectedClass}
                onOpenGuide={() => setGuideKey("confusion-matrix")}
              />
            </div>
          </div>

          {/* Inference Latency & FPS Stability Chart */}
          <div id="latency-timeline" className="scroll-mt-20">
            <LatencyChartCard
              latencyHistory={performance?.latencyHistory}
              avgLatencyMs={performance?.averageLatencyMs}
              p95LatencyMs={performance?.p95LatencyMs}
              e2eAlertLatencyMs={performance?.e2eAlertLatencyMs}
              avgFps={performance?.averageFps}
              loading={isPerfLoading}
              onOpenGuide={() => setGuideKey("latency-chart")}
            />
          </div>
        </div>
      ) : (
        /* Model Governance & Registered Versions Table */
        <div id="model-governance" className="scroll-mt-20">
          <ModelGovernanceTable
            models={models}
            onDeploy={handleOpenDeploy}
            onAddVersion={(modelId) => {
              setVersionModalModelId(modelId);
              setIsCreateVersionOpen(true);
            }}
            onRefresh={canReadModels ? refetchModels : undefined}
            canReadModels={canReadModels}
            error={canReadModels && isModelsError}
            onOpenGuide={() => setGuideKey("governance")}
            canDeploy={canManageModels}
            loading={canReadModels && isModelsLoading}
            fetching={canReadModels && isModelsFetching}
          />
        </div>
      )}

      {/* Registry update confirmation */}
      <DeployModelDialog
        open={canManageModels && canReadModels && isDeployOpen}
        onOpenChange={setIsDeployOpen}
        activeVersion={activeVersion}
        candidateVersion={selectedCandidate}
        loading={deployMutation.isPending}
        onConfirm={async (modelId, versionId) => {
          await deployMutation.mutateAsync({ modelId, versionId });
        }}
      />

      <CreateAiModelModal
        open={canManageModels && isCreateModelOpen}
        models={models}
        onOpenChange={setIsCreateModelOpen}
        loading={createModelMutation.isPending}
        onSubmit={(dto) => createModelMutation.mutateAsync(dto)}
      />

      <CreateModelVersionModal
        open={canManageModels && canReadModels && isCreateVersionOpen}
        onOpenChange={(open) => {
          setIsCreateVersionOpen(open);
          if (!open) setVersionModalModelId(undefined);
        }}
        models={models}
        defaultModelId={versionModalModelId}
        loading={createVersionMutation.isPending}
        onSubmit={(modelId, dto) =>
          createVersionMutation.mutateAsync({ modelId, dto })
        }
      />

      <RecordAiBenchmarkModal
        open={canManageModels && isRecordTelemetryOpen}
        cameras={cameras}
        loadingCameras={canReadCameras && camerasQuery.isLoading}
        onOpenChange={setIsRecordTelemetryOpen}
        models={models}
        loading={recordTelemetryMutation.isPending}
        onSubmit={(dto) => recordTelemetryMutation.mutateAsync(dto)}
      />

      <ModelDetailModal
        modelId={canReadModels ? detailModelId : null}
        onClose={() => setDetailModelId(null)}
      />

      <AiMetricsGuideModal
        openKey={guideKey}
        onClose={() => setGuideKey(null)}
        activeVersion={activeVersion}
        activeModelName={activeModelName}
      />
    </div>
  );
}
