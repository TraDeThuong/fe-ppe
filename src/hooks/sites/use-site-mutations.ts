"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { CreateSitePayload, UpdateSitePayload } from "@/types";

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSitePayload) => siteService.createSite(payload),
    onSuccess: (newSite) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      toast.success(`Đã thêm công trường "${newSite.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo công trường.";
      toast.error(msg);
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSitePayload }) =>
      siteService.updateSite(id, payload),
    onSuccess: (updatedSite, { id }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.setQueryData(siteKeys.detail(id), updatedSite);
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) });
      toast.success(`Đã cập nhật công trường "${updatedSite.name}" thành công.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật công trường.";
      toast.error(msg);
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      siteService.deleteSite(id),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      toast.success(
        name ? `Đã xóa công trường "${name}" thành công.` : "Đã xóa công trường thành công.",
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa công trường.";
      toast.error(msg);
    },
  });
}
