"use client";

import { useState } from "react";
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
} from "@/components/features/ai-metrics";
import {
  useAiPerformance,
  useActiveModelVersion,
  useAiModels,
  useDeployModelVersion,
} from "@/hooks";
import type { AiModelVersionDto, AiPerformanceFilter } from "@/types";

export default function AiMetricsContent() {
  const { t } = useLocale();

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

  const isLoading = isPerfLoading || isActiveLoading || isModelsLoading;
  const isRefetching = isPerfRefetching;

  return (
    <div className="space-y-6">
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
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>{t("common.refresh")}</span>
          </Button>
        }
      />

      {/* Active Serving Model Banner */}
      <ActiveModelBanner activeVersion={activeVersion} loading={isActiveLoading} />

      {/* Bento Console KPI Summary */}
      <AiMetricsKpiSummary performance={performance} loading={isPerfLoading} />

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerClassMetricsCard
          metrics={performance?.perClassMetrics}
          loading={isPerfLoading}
        />

        <ConfusionMatrixHeatmap
          confusionMatrix={performance?.confusionMatrix}
          loading={isPerfLoading}
        />
      </div>

      {/* Inference Latency & FPS Stability Chart */}
      <LatencyChartCard
        latencyHistory={performance?.latencyHistory}
        avgLatencyMs={performance?.averageLatencyMs}
        avgFps={performance?.averageFps}
      />

      {/* Model Governance & Registered Versions Table */}
      <ModelGovernanceTable
        models={models}
        onDeploy={handleOpenDeploy}
        canDeploy={true}
        loading={isModelsLoading}
      />

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
