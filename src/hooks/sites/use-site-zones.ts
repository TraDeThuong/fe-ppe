"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type {
  CreateZonePayload,
  UpdateZonePayload,
  ZoneItem,
  ZoneQueryParams,
} from "@/types";

export function useSiteZones(siteId: string, enabled = true) {
  return useQuery<ZoneItem[]>({
    queryKey: siteKeys.zones(siteId),
    queryFn: () => siteService.getSiteZones(siteId),
    enabled: Boolean(siteId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useAllZones(params?: ZoneQueryParams, enabled = true) {
  return useQuery<ZoneItem[]>({
    queryKey: siteKeys.allZones(params),
    queryFn: () => siteService.getAllZones(params),
    enabled,
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
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "all-zones"] });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      toast.success(`Đã thêm phân khu "${newZone.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo phân khu.";
      toast.error(msg);
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      zoneId,
      payload,
    }: {
      siteId: string;
      zoneId: string;
      payload: UpdateZonePayload;
    }) => siteService.updateZone(zoneId, payload),
    onSuccess: (updatedZone, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.zones(siteId) });
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "all-zones"] });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      toast.success(`Đã cập nhật phân khu "${updatedZone.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật phân khu.";
      toast.error(msg);
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      siteId,
      zoneId,
      force,
    }: {
      siteId: string;
      zoneId: string;
      name?: string;
      force?: boolean;
    }) => siteService.deleteZone(siteId, zoneId, force),
    onSuccess: (_, { siteId, name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.zones(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.restrictedAreas(siteId) });
      queryClient.invalidateQueries({ queryKey: [...siteKeys.all, "all-zones"] });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(siteId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
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
