"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.statusCountsRoot() });
      toast.success(
        pickLocaleText(
          `Đã thêm camera "${newCamera.name}" thành công.`,
          `Camera "${newCamera.name}" added successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể tạo camera.", "Unable to create camera.");
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.statusCountsRoot() });
      queryClient.setQueryData(cameraKeys.detail(id), updatedCamera);
      toast.success(
        pickLocaleText(
          `Đã cập nhật camera "${updatedCamera.name}" thành công.`,
          `Camera "${updatedCamera.name}" updated successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể cập nhật camera.", "Unable to update camera.");
      toast.error(msg);
    },
  });
}

export function useDeleteCamera() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name?: string }) =>
      cameraService.deleteCamera(id),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cameraKeys.statusCountsRoot() });
      toast.success(
        name
          ? pickLocaleText(
              `Đã xóa camera "${name}" thành công.`,
              `Camera "${name}" deleted successfully.`,
            )
          : pickLocaleText("Đã xóa camera thành công.", "Camera deleted successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể xóa camera.", "Unable to delete camera.");
      toast.error(msg);
    },
  });
}
