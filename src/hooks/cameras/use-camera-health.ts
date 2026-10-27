"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type { CameraHealthLogItem, PingCameraResult } from "@/types";

export function useCameraHealthLogs(cameraId: string, enabled = true) {
  return useQuery<CameraHealthLogItem[]>({
    queryKey: cameraKeys.healthLogs(cameraId),
    queryFn: () => cameraService.getHealthLogs(cameraId),
    enabled: Boolean(cameraId) && enabled,
    staleTime: 15 * 1000,
  });
}

export function usePingCamera() {
  const queryClient = useQueryClient();

  return useMutation<PingCameraResult, Error, string>({
    mutationFn: (cameraId: string) => cameraService.pingCamera(cameraId),
    onSuccess: (result, cameraId) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.healthLogs(cameraId) });
      queryClient.invalidateQueries({ queryKey: cameraKeys.detail(cameraId) });
      if (result.success) {
        toast.success(`Ping thành công: độ trễ ${result.latencyMs ?? 0} ms`);
      } else {
        toast.error(`Ping thất bại: ${result.errorMessage || "Không phản hồi"}`);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể thực hiện kiểm tra ping.";
      toast.error(msg);
    },
  });
}
