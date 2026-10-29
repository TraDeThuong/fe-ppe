"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { CreateRestrictedAreaPayload, RestrictedAreaItem } from "@/types";

export function useRestrictedAreas(siteId: string, enabled = true) {
  return useQuery<RestrictedAreaItem[]>({
    queryKey: siteKeys.restrictedAreas(siteId),
    queryFn: () => siteService.getRestrictedAreas(siteId),
    enabled: Boolean(siteId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateRestrictedArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      siteId,
      payload,
    }: {
      siteId: string;
      payload: CreateRestrictedAreaPayload;
    }) => siteService.createRestrictedArea(siteId, payload),
    onSuccess: (newArea, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.restrictedAreas(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      toast.success(`Đã thêm vùng cấm "${newArea.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo vùng cấm.";
      toast.error(msg);
    },
  });
}

export function useDeleteRestrictedArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      siteId,
      areaId,
      name,
    }: {
      siteId: string;
      areaId: string;
      name?: string;
    }) => siteService.deleteRestrictedArea(siteId, areaId),
    onSuccess: (_, { siteId, name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.restrictedAreas(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      toast.success(
        name ? `Đã xóa vùng cấm "${name}" thành công.` : "Đã xóa vùng cấm thành công.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa vùng cấm.";
      toast.error(msg);
    },
  });
}
