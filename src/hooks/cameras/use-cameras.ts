"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
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
    staleTime: 30 * 1000,
    ...options,
  });
}
