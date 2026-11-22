"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { cameraService } from "@/services/camera.service";
import { siteKeys } from "@/hooks/sites/site.query-keys";
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: siteKeys.effectiveSafetyConfigs(),
      });
      toast.success(
        pickLocaleText(
          "Cấu hình AI ROI camera đã được lưu thành công.",
          "Camera AI ROI configuration saved successfully.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể cập nhật cấu hình camera.",
              "Unable to update camera configuration.",
            );
      toast.error(msg);
    },
  });
}

export function useResetCameraConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => cameraService.resetCameraConfig(cameraId),
    onSuccess: (res, cameraId) => {
      queryClient.setQueryData(cameraKeys.config(cameraId), res);
      void queryClient.invalidateQueries({ queryKey: cameraKeys.config(cameraId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.detail(cameraId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: siteKeys.effectiveSafetyConfigs(),
      });
      toast.success(
        pickLocaleText(
          "Đã khôi phục cấu hình camera về mặc định.",
          "Camera configuration reset to defaults.",
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Unable to reset camera config.",
      );
    },
  });
}

export function useClearCameraConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cameraId: string) => cameraService.clearCameraConfig(cameraId),
    onSuccess: (_res, cameraId) => {
      void queryClient.invalidateQueries({ queryKey: cameraKeys.config(cameraId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.detail(cameraId) });
      void queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: siteKeys.effectiveSafetyConfigs(),
      });
      toast.success(
        pickLocaleText(
          "Đã xóa cấu hình DB riêng của camera.",
          "Cleared custom camera configuration.",
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Unable to clear camera config.",
      );
    },
  });
}
