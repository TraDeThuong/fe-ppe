"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";

export interface CameraStatusCountsResult {
  total: number;
  online: number;
  offline: number;
}

export type UseCameraStatusCountsOptions = Omit<
  UseQueryOptions<CameraStatusCountsResult, Error>,
  "queryKey" | "queryFn"
>;

async function fetchCameraStatusCounts(
  siteId?: string | null,
  signal?: AbortSignal,
): Promise<CameraStatusCountsResult> {
  try {
    return await cameraService.getStatusCounts(siteId || undefined);
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : undefined;
    if (status === 401 || status === 403) {
      throw error;
    }

    // Fallback khi backend /cameras/status-counts chưa khả dụng hoặc trả 422
    const [allPage, onlinePage] = await Promise.all([
      cameraService.getCameras(
        {
          siteId: siteId || undefined,
          page: 1,
          limit: 1,
        },
        { signal },
      ),
      cameraService.getCameras(
        {
          siteId: siteId || undefined,
          status: "ONLINE",
          page: 1,
          limit: 1,
        },
        { signal },
      ),
    ]);
    const total = allPage.meta?.total ?? allPage.items.length;
    const online = onlinePage.meta?.total ?? onlinePage.items.length;
    const offline = Math.max(0, total - online);
    return {
      total,
      online,
      offline,
    };
  }
}

/**
 * Lấy bộ đếm trạng thái camera (total, online, offline) theo công trường.
 */
export function useCameraStatusCounts(
  siteId?: string | null,
  options?: UseCameraStatusCountsOptions,
) {
  return useQuery<CameraStatusCountsResult, Error>({
    queryKey: cameraKeys.statusCounts(siteId),
    queryFn: ({ signal }) => fetchCameraStatusCounts(siteId, signal),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    retry: false,
    ...options,
  });
}
