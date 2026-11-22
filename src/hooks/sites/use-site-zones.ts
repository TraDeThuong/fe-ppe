"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.all });
      toast.success(
        pickLocaleText(
          `Đã thêm phân khu "${newZone.name}" thành công.`,
          `Zone "${newZone.name}" added successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể tạo phân khu.", "Unable to create zone.");
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
      toast.success(
        pickLocaleText(
          `Đã cập nhật phân khu "${updatedZone.name}" thành công.`,
          `Zone "${updatedZone.name}" updated successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể cập nhật phân khu.", "Unable to update zone.");
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
      queryClient.invalidateQueries({ queryKey: cameraKeys.all });
      toast.success(
        name
          ? pickLocaleText(
              `Đã xóa phân khu "${name}" thành công.`,
              `Zone "${name}" deleted successfully.`,
            )
          : pickLocaleText("Đã xóa phân khu thành công.", "Zone deleted successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể xóa phân khu.", "Unable to delete zone.");
      toast.error(msg);
    },
  });
}
