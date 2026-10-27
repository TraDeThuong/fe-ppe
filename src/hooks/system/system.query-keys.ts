import type { SystemConfigQueryParams } from "@/types";

export const systemQueryKeys = {
  all: ["system"] as const,
  configs: (params?: SystemConfigQueryParams) =>
    [...systemQueryKeys.all, "configs", params ?? {}] as const,
  configByKey: (key: string) =>
    [...systemQueryKeys.all, "config", key] as const,
  publicConfigs: () =>
    [...systemQueryKeys.all, "public-configs"] as const,
  featureFlags: () =>
    [...systemQueryKeys.all, "feature-flags"] as const,
  health: () =>
    [...systemQueryKeys.all, "health"] as const,
};
