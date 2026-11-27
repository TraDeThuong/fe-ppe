"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { systemService } from "@/services";
import type { SystemConfigItem, ToggleFeatureFlagPayload } from "@/types";
import { systemQueryKeys } from "./system.query-keys";

export function useFeatureFlags(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: systemQueryKeys.featureFlags(),
    queryFn: async () => {
      const res = await systemService.getConfigs({ category: "FEATURE_FLAG", limit: 50 });
      return res?.items ?? [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: ToggleFeatureFlagPayload }) =>
      systemService.toggleFeatureFlag(key, payload),
    onMutate: async ({ key, payload }) => {
      await queryClient.cancelQueries({ queryKey: systemQueryKeys.featureFlags() });
      const previousFlags = queryClient.getQueryData<SystemConfigItem[]>(
        systemQueryKeys.featureFlags(),
      );

      if (previousFlags) {
        queryClient.setQueryData<SystemConfigItem[]>(
          systemQueryKeys.featureFlags(),
          previousFlags.map((item) =>
            item.key === key
              ? { ...item, value: payload.enabled, updatedAt: new Date().toISOString() }
              : item,
          ),
        );
      }

      return { previousFlags };
    },
    onSuccess: (updatedItem, { key }) => {
      if (!updatedItem) return;
      queryClient.setQueryData<SystemConfigItem[]>(
        systemQueryKeys.featureFlags(),
        (current) =>
          current?.map((item) => (item.key === key ? { ...item, ...updatedItem } : item)),
      );
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFlags) {
        queryClient.setQueryData(systemQueryKeys.featureFlags(), context.previousFlags);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
      void queryClient.invalidateQueries({ queryKey: [...systemQueryKeys.all, "configs"] });
      void queryClient.invalidateQueries({ queryKey: systemQueryKeys.publicConfigs() });
      void queryClient.invalidateQueries({ queryKey: authKeys.config() });
    },
  });

  return {
    ...query,
    toggleFlag: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
