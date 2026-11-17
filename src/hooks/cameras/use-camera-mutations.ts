"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toSafeLiveCameraId } from "@/components/features/cameras/camera-live-helpers";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { aiTestService } from "@/services/ai-test.service";
import { cameraService } from "@/services/camera.service";
import type { LiveSessionInfo } from "@/types/ai-test.types";
import type { CameraItem, CreateCameraPayload, UpdateCameraPayload } from "@/types";
import { cameraKeys } from "./camera.query-keys";
import { liveEngineKeys } from "./use-camera-live-sessions";

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
    mutationFn: async ({
      id,
      code,
    }: {
      id: string;
      name?: string;
      code?: string;
    }) => {
      let resolvedCode = code;
      if (!resolvedCode) {
        const detailCam = queryClient.getQueryData<CameraItem>(
          cameraKeys.detail(id),
        );
        if (detailCam?.code) {
          resolvedCode = detailCam.code;
        } else {
          const listQueries = queryClient.getQueriesData<{
            items?: CameraItem[];
          }>({ queryKey: cameraKeys.lists() });
          for (const [, data] of listQueries) {
            const found = data?.items?.find((c) => c.id === id);
            if (found?.code) {
              resolvedCode = found.code;
              break;
            }
          }
        }
      }

      await cameraService.deleteCamera(id);

      // Best-effort stop any active AI Live session belonging to this camera
      const liveTargets = new Set<string>();
      if (resolvedCode) {
        liveTargets.add(toSafeLiveCameraId({ id, code: resolvedCode }));
      }
      const cachedSessionsData = queryClient.getQueryData<{
        sessions?: LiveSessionInfo[];
      }>(liveEngineKeys.sessions());
      for (const s of cachedSessionsData?.sessions ?? []) {
        if (
          s.camera_uuid === id ||
          s.camera_id === id ||
          (resolvedCode &&
            (s.camera_id === resolvedCode ||
              s.camera_id === toSafeLiveCameraId({ id, code: resolvedCode })))
        ) {
          liveTargets.add(s.camera_id);
        }
      }

      if (liveTargets.size > 0) {
        await Promise.allSettled(
          Array.from(liveTargets).map((liveId) =>
            aiTestService.stopLiveStream(liveId),
          ),
        );
      }
    },
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: cameraKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cameraKeys.statusCountsRoot() });
      queryClient.invalidateQueries({ queryKey: liveEngineKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: liveEngineKeys.runtimeConfig() });
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
