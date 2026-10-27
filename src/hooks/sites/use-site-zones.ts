"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { CreateZonePayload, ZoneItem } from "@/types";

export function useSiteZones(siteId: string, enabled = true) {
  return useQuery<ZoneItem[]>({
    queryKey: siteKeys.zones(siteId),
    queryFn: () => siteService.getSiteZones(siteId),
    enabled: Boolean(siteId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, payload }: { siteId: string; payload: CreateZonePayload }) =>
      siteService.createZone(siteId, payload),
    onSuccess: (newZone, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.zones(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      toast.success(`Đã thêm phân khu "${newZone.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo phân khu.";
      toast.error(msg);
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ siteId, zoneId, name }: { siteId: string; zoneId: string; name?: string }) =>
      siteService.deleteZone(siteId, zoneId),
    onSuccess: (_, { siteId, name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.zones(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      toast.success(
        name ? `Đã xóa phân khu "${name}" thành công.` : "Đã xóa phân khu thành công.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa phân khu.";
      toast.error(msg);
    },
  });
}
