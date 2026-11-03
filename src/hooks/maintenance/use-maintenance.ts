"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceService } from "@/services";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import type {
  EnableMaintenancePayload,
  MaintenanceConfig,
  PublicMaintenanceStatus,
  UpdateMaintenancePayload,
} from "@/types";
import { maintenanceQueryKeys } from "./maintenance.query-keys";

/**
 * Hook truy vấn trạng thái bảo trì công khai.
 * Tự động đồng bộ khi nhận event "system:maintenance-active" từ axios interceptor hoặc SSE.
 */
export function useMaintenanceStatus(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const queryClient = useQueryClient();

  const query = useQuery<PublicMaintenanceStatus>({
    queryKey: maintenanceQueryKeys.publicStatus(),
    queryFn: () => maintenanceService.getPublicStatus(),
    refetchInterval: options?.refetchInterval ?? 30000,
    staleTime: 10000,
    enabled: options?.enabled ?? true,
  });

  useEffect(() => {
    const handleActive = () => {
      void queryClient.invalidateQueries({
        queryKey: maintenanceQueryKeys.all,
      });
    };

    const unsubscribe = eventBus.on("system:maintenance-active", handleActive);
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook lấy toàn bộ cấu hình chi tiết cho trang Quản trị Admin.
 */
export function useMaintenanceConfig(options?: { enabled?: boolean }) {
  return useQuery<MaintenanceConfig>({
    queryKey: maintenanceQueryKeys.config(),
    queryFn: () => maintenanceService.getConfig(),
    staleTime: 5000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook quản trị các mutation Bật, Tắt và Cập nhật cấu hình bảo trì.
 */
export function useMaintenanceMutations() {
  const queryClient = useQueryClient();
  const { t } = useLocale();

  const enableMutation = useMutation({
    mutationFn: (payload?: EnableMaintenancePayload) =>
      maintenanceService.enableMaintenance(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
      toast.success(t("maintenance.toast.enableSuccess"));
    },
    onError: (err: any) => {
      toast.error(err?.message || t("maintenance.toast.enableFailed"));
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => maintenanceService.disableMaintenance(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
      toast.success(t("maintenance.toast.disableSuccess"));
    },
    onError: (err: any) => {
      toast.error(err?.message || t("maintenance.toast.disableFailed"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateMaintenancePayload) =>
      maintenanceService.updateConfig(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceQueryKeys.all });
      toast.success(t("maintenance.toast.updateSuccess"));
    },
    onError: (err: any) => {
      toast.error(err?.message || t("maintenance.toast.updateFailed"));
    },
  });

  return {
    enableMaintenance: enableMutation.mutateAsync,
    isEnabling: enableMutation.isPending,

    disableMaintenance: disableMutation.mutateAsync,
    isDisabling: disableMutation.isPending,

    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
