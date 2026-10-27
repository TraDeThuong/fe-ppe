"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { SiteSafetyConfigItem, UpdateSiteSafetyConfigPayload } from "@/types";

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
      toast.success("Tiêu chuẩn trang bị bảo hộ PPE của công trường đã được cập nhật.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật cấu hình an toàn.";
      toast.error(msg);
    },
  });
}
