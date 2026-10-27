"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { systemService } from "@/services";
import type { CreateSystemConfigPayload, UpdateSystemConfigPayload } from "@/types";
import { systemQueryKeys } from "./system.query-keys";

export function useSystemMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateSystemConfigPayload) => systemService.createConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: UpdateSystemConfigPayload }) =>
      systemService.updateConfig(key, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => systemService.deleteConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
    },
  });

  return {
    createConfig: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteConfig: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
