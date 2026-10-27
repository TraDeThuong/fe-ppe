"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type { CameraConfigItem, UpdateCameraConfigPayload } from "@/types";

export function useCameraConfig(cameraId: string, enabled = true) {
  return useQuery<CameraConfigItem>({
    queryKey: cameraKeys.config(cameraId),
    queryFn: () => cameraService.getCameraConfig(cameraId),
    enabled: Boolean(cameraId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdateCameraConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cameraId,
      payload,
    }: {
      cameraId: string;
      payload: UpdateCameraConfigPayload;
    }) => cameraService.updateCameraConfig(cameraId, payload),
    onSuccess: (updatedConfig, { cameraId }) => {
      queryClient.setQueryData(cameraKeys.config(cameraId), updatedConfig);
      queryClient.invalidateQueries({ queryKey: cameraKeys.detail(cameraId) });
      toast.success("Cấu hình AI ROI camera đã được lưu thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật cấu hình camera.";
      toast.error(msg);
    },
  });
}
