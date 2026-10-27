"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { cameraService } from "@/services/camera.service";
import { cameraKeys } from "./camera.query-keys";
import type { CreateCameraPayload, UpdateCameraPayload } from "@/types";

export function useCreateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCameraPayload) => cameraService.createCamera(payload),
    onSuccess: (newCamera) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      toast.success(`Đã thêm camera "${newCamera.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo camera.";
      toast.error(msg);
    },
  });
}

export function useUpdateCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCameraPayload }) =>
      cameraService.updateCamera(id, payload),
    onSuccess: (updatedCamera, { id }) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      queryClient.setQueryData(cameraKeys.detail(id), updatedCamera);
      toast.success(`Đã cập nhật camera "${updatedCamera.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật camera.";
      toast.error(msg);
    },
  });
}

export function useDeleteCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      cameraService.deleteCamera(id),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      toast.success(
        name ? `Đã xóa camera "${name}" thành công.` : "Đã xóa camera thành công.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa camera.";
      toast.error(msg);
    },
  });
}
