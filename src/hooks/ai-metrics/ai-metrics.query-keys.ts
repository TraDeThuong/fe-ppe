import type { AiPerformanceFilter } from "@/types";

export const aiMetricsKeys = {
  all: ["ai-metrics"] as const,
  performance: (filter?: AiPerformanceFilter) =>
    [...aiMetricsKeys.all, "performance", filter] as const,
  models: () => [...aiMetricsKeys.all, "models"] as const,
  model: (id: string) => [...aiMetricsKeys.models(), id] as const,
  activeVersion: () => [...aiMetricsKeys.all, "active-version"] as const,
  version: (versionId: string) => [...aiMetricsKeys.all, "version", versionId] as const,
};
