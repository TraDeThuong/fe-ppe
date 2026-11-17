"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
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
      toast.success(
        pickLocaleText(
          `Đã thêm công trường "${newSite.name}" thành công.`,
          `Site "${newSite.name}" added successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể tạo công trường.", "Unable to create site.");
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
      toast.success(
        pickLocaleText(
          `Đã cập nhật công trường "${updatedSite.name}" thành công.`,
          `Site "${updatedSite.name}" updated successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể cập nhật công trường.", "Unable to update site.");
      toast.error(msg);
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, force = true }: { id: string; name?: string; force?: boolean }) =>
      siteService.deleteSite(id, force),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      toast.success(
        name
          ? pickLocaleText(
              `Đã xóa công trường "${name}" thành công.`,
              `Site "${name}" deleted successfully.`,
            )
          : pickLocaleText("Đã xóa công trường thành công.", "Site deleted successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể xóa công trường.", "Unable to delete site.");
      toast.error(msg);
    },
  });
}

export function useArchiveSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; name?: string }) =>
      siteService.archiveSite(id),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      toast.success(
        name
          ? pickLocaleText(
              `Đã lưu trữ công trường "${name}" thành công.`,
              `Site "${name}" archived successfully.`,
            )
          : pickLocaleText("Đã lưu trữ công trường thành công.", "Site archived successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể lưu trữ công trường.", "Unable to archive site.");
      toast.error(msg);
    },
  });
}
