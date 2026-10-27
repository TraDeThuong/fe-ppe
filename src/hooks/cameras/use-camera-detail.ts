"use client";

import { useQuery } from "@tanstack/react-query";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type { CameraItem, CameraStreamItem } from "@/types";

export function useCameraDetail(id: string, enabled = true) {
  return useQuery<CameraItem>({
    queryKey: cameraKeys.detail(id),
    queryFn: () => cameraService.getCameraById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCameraStreams(id: string, enabled = true) {
  return useQuery<CameraStreamItem[]>({
    queryKey: cameraKeys.streams(id),
    queryFn: () => cameraService.getCameraStreams(id),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}
