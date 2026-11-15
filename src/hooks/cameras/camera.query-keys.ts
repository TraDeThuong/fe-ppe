import type { CameraQueryParams } from "@/types";

export const cameraKeys = {
  all: ["cameras"] as const,
  lists: () => [...cameraKeys.all, "list"] as const,
  list: (params?: CameraQueryParams) => [...cameraKeys.lists(), params] as const,
  statusCountsRoot: () => [...cameraKeys.all, "status-counts"] as const,
  statusCounts: (siteId?: string | null) =>
    [...cameraKeys.all, "status-counts", siteId ?? "all"] as const,
  details: () => [...cameraKeys.all, "detail"] as const,
  detail: (id: string) => [...cameraKeys.details(), id] as const,
  configs: () => [...cameraKeys.all, "config"] as const,
  config: (id: string) => [...cameraKeys.configs(), id] as const,
  streams: (id: string) => [...cameraKeys.all, "streams", id] as const,
  healthLogs: (id: string) => [...cameraKeys.all, "health-logs", id] as const,
};
