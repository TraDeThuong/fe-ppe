"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import { systemService } from "@/services";
import { aiTestService } from "@/services/ai-test.service";
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
    onSuccess: (_res, { key, payload }) => {
      queryClient.invalidateQueries({ queryKey: systemQueryKeys.all });
      // Best-effort hot-sync giới hạn luồng AI nếu admin vừa đổi ai.live_max_sessions
      if (key === SYSTEM_CONFIG_KEYS.aiLiveMaxSessions) {
        const parsed = Number(payload.value);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 256) {
          void aiTestService
            .updateLiveRuntimeConfig({
              max_sessions: Math.round(parsed),
              trigger_sync: true,
            })
            .catch(() => {});
        }
      }
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
