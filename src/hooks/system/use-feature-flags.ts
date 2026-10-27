"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { systemService } from "@/services";
import type { SystemConfigItem, ToggleFeatureFlagPayload } from "@/types";
import { systemQueryKeys } from "./system.query-keys";

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: systemQueryKeys.featureFlags(),
    queryFn: async () => {
      const res = await systemService.getConfigs({ category: "FEATURE_FLAG", limit: 50 });
      return res.items;
    },
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
    onError: (_err, _vars, context) => {
      if (context?.previousFlags) {
        queryClient.setQueryData(systemQueryKeys.featureFlags(), context.previousFlags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
    },
  });

  return {
    ...query,
    toggleFlag: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
