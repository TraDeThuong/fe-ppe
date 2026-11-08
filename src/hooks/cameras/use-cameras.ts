"use client";

import { collectCatalog } from "@/lib/table-utils";
import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type { CameraItem, CameraQueryParams, PaginationMeta } from "@/types";

export interface UseCamerasResult {
  items: CameraItem[];
  meta?: PaginationMeta;
}

export function useCameras(
  params?: CameraQueryParams,
  options?: Omit<UseQueryOptions<UseCamerasResult, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: cameraKeys.list(params),
    queryFn: () => cameraService.getCameras(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    ...options,
  });
}

/** Complete catalog for aggregate KPI panels; the operational table still pages on the server. */
export function useCamerasCatalog() {
  return useQuery({ queryKey: cameraKeys.list({ page: 0, limit: 100 }), queryFn: () => collectCatalog((page, limit) => cameraService.getCameras({ page, limit })), staleTime: 60_000 });
}
