"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cpu, RefreshCw, Zap } from "lucide-react";
import { PageHeader } from "@/components/features/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import {
  AiMetricsKpiSummary,
  ActiveModelBanner,
  AiMetricsToolbar,
  PerClassMetricsCard,
  ConfusionMatrixHeatmap,
  LatencyChartCard,
  ModelGovernanceTable,
  DeployModelDialog,
  type AiMetricStatKey,
} from "@/components/features/ai-metrics";
import {
  useAiPerformance,
  useActiveModelVersion,
  useAiModels,
  useDeployModelVersion,
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
  const { t } = useLocale();
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

  // Filters
  const [selectedModelId, setSelectedModelId] = useState("");
  const [period, setPeriod] = useState("7d");

  const filter: AiPerformanceFilter = {
    modelId: selectedModelId || undefined,
  };

  // Queries
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

  // Deploy Mutation
  const deployMutation = useDeployModelVersion();

  // Dialog State
  const [selectedCandidate, setSelectedCandidate] = useState<AiModelVersionDto | null>(null);
  const [isDeployOpen, setIsDeployOpen] = useState(false);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Cpu}
        title={t("aiMetrics.title")}
        description={t("aiMetrics.description")}
        badge="YOLOv8 Engine"
        badgeIcon={Zap}
        actions={
          <Button
            variant="ghost"
            onClick={handleRefreshAll}
            disabled={isRefetching}
            className="gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>{t("common.refresh")}</span>
          </Button>
        }
      />

      {/* Active Serving Model Banner */}
      <ActiveModelBanner activeVersion={activeVersion} loading={isActiveLoading} />

      {/* Bento Console KPI Summary với hiệu ứng sunken và Panel giải thích chi tiết */}
      <AiMetricsKpiSummary
        performance={performance}
        loading={isPerfLoading}
        selectedStat={selectedStat}
        onSelectStat={handleSelectStat}
      />

      {/* Filter Toolbar */}
      <AiMetricsToolbar
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={setSelectedModelId}
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={handleRefreshAll}
        loading={isRefetching}
      />

      {/* 2-Column: Per-Class Breakdown (Left) & Confusion Matrix Heatmap (Right) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div id="per-class-breakdown" className="scroll-mt-20">
          <PerClassMetricsCard
            metrics={performance?.perClassMetrics}
            loading={isPerfLoading}
          />
        </div>

        <div id="confusion-matrix" className="scroll-mt-20">
          <ConfusionMatrixHeatmap
            confusionMatrix={performance?.confusionMatrix}
            loading={isPerfLoading}
          />
        </div>
      </div>

      {/* Inference Latency & FPS Stability Chart */}
      <div id="latency-timeline" className="scroll-mt-20">
        <LatencyChartCard
          latencyHistory={performance?.latencyHistory}
          avgLatencyMs={performance?.averageLatencyMs}
          avgFps={performance?.averageFps}
        />
      </div>

      {/* Model Governance & Registered Versions Table */}
      <div id="model-governance" className="scroll-mt-20">
        <ModelGovernanceTable
          models={models}
          onDeploy={handleOpenDeploy}
          canDeploy={true}
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
    </div>
  );
}
