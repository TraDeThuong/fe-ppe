"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cameraKeys.statusCountsRoot() });
      if (result.success) {
        toast.success(
          pickLocaleText(
            `Ping thành công: độ trễ ${result.latencyMs ?? 0} ms`,
            `Ping succeeded: latency ${result.latencyMs ?? 0} ms`,
          ),
        );
      } else {
        toast.error(
          pickLocaleText(
            `Ping thất bại: ${result.errorMessage || "Không phản hồi"}`,
            `Ping failed: ${result.errorMessage || "No response"}`,
          ),
        );
      }
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể thực hiện kiểm tra ping.",
              "Unable to perform ping check.",
            );
      toast.error(msg);
    },
  });
}
