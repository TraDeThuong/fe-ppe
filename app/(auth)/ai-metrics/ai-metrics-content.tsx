"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Cpu, Eye, FlaskConical, Layers, Plus, RefreshCw, Zap } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
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

export default function AiMetricsContent() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const canManageModels = useCan()("PPE_MODEL_MANAGE");

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
    modelId: selectedModelId || undefined,
    cameraId: selectedCameraId || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  };

  // Queries
  const { data: camerasData } = useCameras({ limit: 100 });
  const cameras = camerasData?.items ?? [];

  const {
    data: performance,
    isLoading: isPerfLoading,
    refetch: refetchPerf,
    isRefetching: isPerfRefetching,
  } = useAiPerformance(filter);

  const {
    data: activeVersion,
    isLoading: isActiveLoading,
    refetch: refetchActive,
  } = useActiveModelVersion();

  const {
    data: models = [],
    isLoading: isModelsLoading,
    refetch: refetchModels,
  } = useAiModels();

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
  const [isRecordTelemetryOpen, setIsRecordTelemetryOpen] = useState(false);
  const [detailModelId, setDetailModelId] = useState<string | null>(null);
  const [guideKey, setGuideKey] = useState<AiCardGuideKey | null>(null);

  const handleOpenDeploy = (_modelId: string, version: AiModelVersionDto) => {
    setSelectedCandidate(version);
    setIsDeployOpen(true);
  };

  const handleRefreshAll = () => {
    refetchPerf();
    refetchActive();
    refetchModels();
  };

  const isRefetching = isPerfRefetching;

  const activeModel = activeVersion
    ? models.find((m) => m.id === activeVersion.modelId)
    : undefined;
  const activeModelName = activeVersion
    ? activeModel?.name ||
      (typeof activeVersion.metrics?.modelName === "string"
        ? activeVersion.metrics.modelName
        : undefined) ||
      performance?.modelName ||
      undefined
    : undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Cpu}
        title={t("aiMetrics.title")}
        description={t("aiMetrics.description")}
        badge={activeModelName ? `${activeModelName} Engine` : undefined}
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
                  onClick={() => setIsCreateVersionOpen(true)}
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
            {selectedModelId && (
              <Button
                variant="outline"
                onClick={() => setDetailModelId(selectedModelId)}
                className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Chi tiết Model" : "Model Info"}</span>
              </Button>
            )}
            <Link href="/ai-metrics/test">
              <Button
                variant="primary"
                className="gap-2 text-xs sm:text-sm h-8 sm:h-9 font-bold shadow-nm-sm hover:shadow-nm transition"
              >
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>
                  {isVietnamese ? "Kiểm Thử Mô Hình (Test Video)" : "Test Model (Video Sandbox)"}
                </span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={handleRefreshAll}
              disabled={isRefetching}
              className="gap-2 text-xs sm:text-sm h-8 sm:h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefetching ? "animate-spin" : ""}`} />
              <span>{t("common.refresh")}</span>
            </Button>
          </div>
        }
      />

      {/* Active Serving Model Banner */}
      <ActiveModelBanner
        activeVersion={activeVersion}
        modelName={activeModelName}
        loading={isActiveLoading}
        onOpenGuide={() => setGuideKey("active-model")}
      />

      {/* Bento Console KPI Summary với hiệu ứng sunken và Panel giải thích chi tiết */}
      <AiMetricsKpiSummary
        performance={performance}
        loading={isPerfLoading}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
        onOpenStatGuide={(stat) => setGuideKey(stat)}
      />

      {/* Filter Toolbar */}
      <AiMetricsToolbar
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={(nextModelId) => {
          setSelectedModelId(nextModelId);
          setSelectedClass(null);
        }}
        cameras={cameras}
        selectedCameraId={selectedCameraId}
        onCameraChange={setSelectedCameraId}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={handleRefreshAll}
        loading={isRefetching}
      />

      {/* 2-Column: Per-Class Breakdown (Left) & Confusion Matrix Heatmap (Right) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
        <div id="per-class-breakdown" className="scroll-mt-20 h-full">
          <PerClassMetricsCard
            metrics={performance?.perClassMetrics}
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
          avgFps={performance?.averageFps}
          loading={isPerfLoading}
          onOpenGuide={() => setGuideKey("latency-chart")}
        />
      </div>

      {/* Model Governance & Registered Versions Table */}
      <div id="model-governance" className="scroll-mt-20">
        <ModelGovernanceTable
          models={models}
          onDeploy={handleOpenDeploy}
          onRefresh={refetchModels}
          onOpenGuide={() => setGuideKey("governance")}
          canDeploy={canManageModels}
          loading={isModelsLoading}
        />
      </div>

      {/* Deploy Hot-Swap Confirmation Dialog */}
      <DeployModelDialog
        open={isDeployOpen}
        onOpenChange={setIsDeployOpen}
        activeVersion={activeVersion}
        candidateVersion={selectedCandidate}
        loading={deployMutation.isPending}
        onConfirm={async (modelId, versionId) => {
          await deployMutation.mutateAsync({ modelId, versionId });
        }}
      />

      <CreateAiModelModal
        open={isCreateModelOpen}
        onOpenChange={setIsCreateModelOpen}
        loading={createModelMutation.isPending}
        onSubmit={(dto) => createModelMutation.mutateAsync(dto)}
      />

      <CreateModelVersionModal
        open={isCreateVersionOpen}
        onOpenChange={setIsCreateVersionOpen}
        models={models}
        loading={createVersionMutation.isPending}
        onSubmit={(modelId, dto) =>
          createVersionMutation.mutateAsync({ modelId, dto })
        }
      />

      <RecordAiBenchmarkModal
        open={isRecordTelemetryOpen}
        onOpenChange={setIsRecordTelemetryOpen}
        models={models}
        loading={recordTelemetryMutation.isPending}
        onSubmit={(dto) => recordTelemetryMutation.mutateAsync(dto)}
      />

      <ModelDetailModal
        modelId={detailModelId}
        onClose={() => setDetailModelId(null)}
      />

      <AiMetricsGuideModal
        openKey={guideKey}
        onClose={() => setGuideKey(null)}
        performance={performance}
        activeVersion={activeVersion}
        activeModelName={activeModelName}
      />
    </div>
  );
}
