"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { useCan } from "@/hooks/use-can";
import { aiTestService } from "@/services/ai-test.service";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type {
  CameraSafetyConfigItem,
  EffectiveSafetyConfigResponse,
  InvalidateSafetyRuleCachePayload,
  SiteSafetyConfigItem,
  SystemDefaultSafetyConfigResponse,
  UpdateCameraSafetyConfigPayload,
  UpdateSiteSafetyConfigPayload,
} from "@/types";

export function useSiteSafetyConfig(siteId: string, enabled = true) {
  return useQuery<SiteSafetyConfigItem>({
    queryKey: siteKeys.safetyConfig(siteId),
    queryFn: () => siteService.getSafetyConfig(siteId),
    enabled: Boolean(siteId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdateSiteSafetyConfig() {
  const queryClient = useQueryClient();
  const canSyncCameras = useCan()("PPE_CAMERA_MANAGE");

  return useMutation({
    mutationFn: ({
      siteId,
      payload,
    }: {
      siteId: string;
      payload: UpdateSiteSafetyConfigPayload;
    }) => siteService.updateSafetyConfig(siteId, payload),
    onSuccess: (updatedConfig, { siteId }) => {
      queryClient.setQueryData(siteKeys.safetyConfig(siteId), updatedConfig);
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "effective-safety-config"] });
      if (canSyncCameras) {
        void aiTestService.triggerLiveSync().catch(() => undefined);
      }
      toast.success(
        pickLocaleText(
          "Tiêu chuẩn trang bị bảo hộ PPE của công trường đã được cập nhật.",
          "Site PPE safety standards updated.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể cập nhật cấu hình an toàn.",
              "Unable to update safety configuration.",
            );
      toast.error(msg);
    },
  });
}

export function useSystemDefaultSafetyConfig(enabled = true) {
  return useQuery<SystemDefaultSafetyConfigResponse>({
    queryKey: siteKeys.systemDefaultSafetyConfig(),
    queryFn: () => siteService.getSystemDefaultSafetyConfig(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEffectiveSafetyConfig(
  params: { siteId?: string; cameraId?: string },
  enabled = true,
) {
  return useQuery<EffectiveSafetyConfigResponse>({
    queryKey: siteKeys.effectiveSafetyConfig(params),
    queryFn: () => siteService.getEffectiveSafetyConfig(params),
    enabled: Boolean(params.siteId || params.cameraId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCameraSafetyConfig(cameraId: string, enabled = true) {
  return useQuery<CameraSafetyConfigItem>({
    queryKey: siteKeys.cameraSafetyConfig(cameraId),
    queryFn: () => siteService.getCameraSafetyConfig(cameraId),
    enabled: Boolean(cameraId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useUpdateCameraSafetyConfig() {
  const queryClient = useQueryClient();
  const canSyncCameras = useCan()("PPE_CAMERA_MANAGE");

  return useMutation({
    mutationFn: ({
      cameraId,
      payload,
    }: {
      cameraId: string;
      payload: UpdateCameraSafetyConfigPayload;
    }) => siteService.updateCameraSafetyConfig(cameraId, payload),
    onSuccess: (updated, { cameraId }) => {
      queryClient.setQueryData(siteKeys.cameraSafetyConfig(cameraId), updated);
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "effective-safety-config"] });
      if (canSyncCameras) {
        void aiTestService.triggerLiveSync().catch(() => undefined);
      }
      toast.success(
        pickLocaleText(
          "Đã lưu cấu hình quy tắc an toàn riêng cho camera.",
          "Camera-specific safety rule overrides saved.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể cập nhật cấu hình an toàn camera.",
              "Unable to update camera safety configuration.",
            );
      toast.error(msg);
    },
  });
}

export function useDeleteCameraSafetyConfig() {
  const queryClient = useQueryClient();
  const canSyncCameras = useCan()("PPE_CAMERA_MANAGE");

  return useMutation({
    mutationFn: (cameraId: string) => siteService.deleteCameraSafetyConfig(cameraId),
    onSuccess: (_, cameraId) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.cameraSafetyConfig(cameraId) });
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "effective-safety-config"] });
      if (canSyncCameras) {
        void aiTestService.triggerLiveSync().catch(() => undefined);
      }
      toast.success(
        pickLocaleText(
          "Đã khôi phục camera về cấu hình kế thừa từ công trường.",
          "Camera restored to inherited site safety configuration.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể xóa cấu hình ghi đè của camera.",
              "Unable to clear camera safety overrides.",
            );
      toast.error(msg);
    },
  });
}

export function useInvalidateSafetyRuleCache() {
  const queryClient = useQueryClient();
  const canSyncCameras = useCan()("PPE_CAMERA_MANAGE");

  return useMutation({
    mutationFn: (payload: InvalidateSafetyRuleCachePayload) =>
      siteService.invalidateSafetyRuleCache(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "effective-safety-config"] });
      if (canSyncCameras) {
        void aiTestService.triggerLiveSync().catch(() => undefined);
      }
      toast.success(
        pickLocaleText(
          "Đã làm mới bộ nhớ đệm quy tắc an toàn AI.",
          "AI safety rule cache invalidated.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể làm mới bộ nhớ đệm cấu hình.",
              "Unable to refresh configuration cache.",
            );
      toast.error(msg);
    },
  });
}
