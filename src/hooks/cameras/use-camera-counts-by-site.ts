"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { cameraService } from "@/services/camera.service";
import type { CameraSiteCountItem } from "@/types";
import { cameraKeys } from "./camera.query-keys";

export type UseCameraCountsBySiteOptions = Omit<
  UseQueryOptions<CameraSiteCountItem[], Error>,
  "queryKey" | "queryFn"
>;

/**
 * Lấy số lượng camera gộp theo từng công trường thông qua 1 request GET /api/v1/cameras/counts-by-site.
 */
export function useCameraCountsBySite(
  siteIds?: string[],
  options?: UseCameraCountsBySiteOptions,
) {
  const normalizedSiteIds = useMemo(
    () =>
      Array.isArray(siteIds)
        ? [...new Set(siteIds.map((id) => id.trim()).filter(Boolean))].sort()
        : [],
    [siteIds],
  );

  return useQuery<CameraSiteCountItem[], Error>({
    queryKey: cameraKeys.countsBySite(normalizedSiteIds),
    queryFn: ({ signal }) =>
      cameraService.getCountsBySite(
        normalizedSiteIds.length > 0 ? normalizedSiteIds : undefined,
        { signal, suppressToast: true },
      ),
    staleTime: 30 * 1000,
    retry: false,
    ...options,
    enabled: (options?.enabled ?? true) && normalizedSiteIds.length > 0,
  });
}
