"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { systemQueryKeys } from "@/hooks/system/system.query-keys";
import { ApiError } from "@/lib/axios";
import { SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import { integrationService } from "@/services";
import {
  ErrorCode,
  type CreateApiKeyPayload,
  type CreateWebhookPayload,
  type ListDeliveriesQuery,
  type ToggleApiKeyPayload,
  type TriggerDemoJobPayload,
  type UpdateWebhookPayload,
} from "@/types";
import { integrationQueryKeys } from "./integration.query-keys";

export function useApiKeys(enabled = true) {
  return useQuery({
    queryKey: integrationQueryKeys.apiKeys(),
    queryFn: () => integrationService.listApiKeys(),
    enabled,
    staleTime: 30_000,
  });
}

export function useWebhooks(enabled = true) {
  return useQuery({
    queryKey: integrationQueryKeys.webhooks(),
    queryFn: () => integrationService.listWebhooks(),
    enabled,
    staleTime: 30_000,
  });
}

export function useWebhookDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: integrationQueryKeys.webhookDetail(id || ""),
    queryFn: () => integrationService.getWebhookById(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useWebhookDeliveries(
  webhookId: string | null,
  params?: ListDeliveriesQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: integrationQueryKeys.deliveries(webhookId || "", params),
    queryFn: () => integrationService.listDeliveries(webhookId as string, params),
    enabled: Boolean(webhookId) && enabled,
    staleTime: 10_000,
  });
}

export function useIntegrationMutations() {
  const queryClient = useQueryClient();

  const createApiKey = useMutation({
    mutationFn: (payload: CreateApiKeyPayload) =>
      integrationService.createApiKey(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.apiKeys() });
    },
  });

  const toggleApiKey = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ToggleApiKeyPayload }) =>
      integrationService.toggleApiKey(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.apiKeys() });
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: (id: string) => integrationService.deleteApiKey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.apiKeys() });
    },
  });

  const createWebhook = useMutation({
    mutationFn: (payload: CreateWebhookPayload) =>
      integrationService.createWebhook(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.webhooks() });
    },
  });

  const updateWebhook = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebhookPayload }) =>
      integrationService.updateWebhook(id, payload),
    onSuccess: (_res, { id }) => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.webhooks() });
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.webhookDetail(id) });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: (id: string) => integrationService.deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.webhooks() });
    },
  });

  const syncWebhooksDisabledOnError = (err: unknown) => {
    if (err instanceof ApiError && err.code === ErrorCode.FEATURE_DISABLED) {
      queryClient.setQueryData<Record<string, unknown>>(
        authKeys.config(),
        (prev) => ({
          ...(prev ?? {}),
          [SYSTEM_CONFIG_KEYS.webhooksEnabled]: false,
        }),
      );
      // Không invalidate authKeys.config(): khi GET /system/public chưa trả
      // feature.webhooks.enabled (user thiếu SYSTEM_CONFIG_READ), refetch sẽ ghi đè
      // mất giá trị `false` vừa học được từ BE và banner OFF biến mất.
      void queryClient.invalidateQueries({
        queryKey: systemQueryKeys.featureFlags(),
      });
    }
  };

  const testPingWebhook = useMutation({
    mutationFn: (id: string) => integrationService.testPingWebhook(id),
    onSuccess: (_res, id) => {
      void queryClient.invalidateQueries({
        queryKey: [...integrationQueryKeys.all, "deliveries", id],
      });
    },
    onError: syncWebhooksDisabledOnError,
  });

  const retryDelivery = useMutation({
    mutationFn: ({ deliveryId }: { deliveryId: string; webhookId?: string }) =>
      integrationService.retryDelivery(deliveryId),
    onSuccess: (_res, { webhookId }) => {
      if (webhookId) {
        void queryClient.invalidateQueries({
          queryKey: [...integrationQueryKeys.all, "deliveries", webhookId],
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all });
      }
    },
    onError: syncWebhooksDisabledOnError,
  });

  const triggerDemoJob = useMutation({
    mutationFn: ({
      apiKey,
      payload,
    }: {
      apiKey: string;
      payload: TriggerDemoJobPayload;
    }) => integrationService.triggerDemoJob(apiKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all });
    },
  });

  return {
    createApiKey,
    toggleApiKey,
    deleteApiKey,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testPingWebhook,
    retryDelivery,
    triggerDemoJob,
  };
}

