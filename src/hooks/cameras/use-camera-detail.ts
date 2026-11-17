"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type {
  CameraItem,
  CameraStreamItem,
  CreateCameraStreamPayload,
  UpdateCameraStreamPayload,
} from "@/types";

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

export function useCameraStreamMutations(cameraId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: cameraKeys.streams(cameraId) });
    void queryClient.invalidateQueries({ queryKey: cameraKeys.detail(cameraId) });
  };

  const createStream = useMutation({
    mutationFn: (payload: CreateCameraStreamPayload) =>
      cameraService.createCameraStream(cameraId, payload),
    onSuccess: () => {
      invalidate();
      toast.success(
        pickLocaleText("Đã thêm luồng stream mới.", "Camera stream added."),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add stream");
    },
  });

  const updateStream = useMutation({
    mutationFn: ({
      streamId,
      payload,
    }: {
      streamId: string;
      payload: UpdateCameraStreamPayload;
    }) => cameraService.updateCameraStream(streamId, payload),
    onSuccess: () => {
      invalidate();
      toast.success(
        pickLocaleText("Đã cập nhật luồng stream.", "Camera stream updated."),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update stream");
    },
  });

  const deleteStream = useMutation({
    mutationFn: (streamId: string) => cameraService.deleteCameraStream(streamId),
    onSuccess: () => {
      invalidate();
      toast.success(
        pickLocaleText("Đã xóa luồng stream.", "Camera stream deleted."),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete stream");
    },
  });

  return {
    createStream,
    updateStream,
    deleteStream,
  };
}
