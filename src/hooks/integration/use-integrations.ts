"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationService } from "@/services";
import type {
  CreateApiKeyPayload,
  CreateWebhookPayload,
  ListDeliveriesQuery,
  ToggleApiKeyPayload,
  TriggerDemoJobPayload,
  UpdateWebhookPayload,
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

  const testPingWebhook = useMutation({
    mutationFn: (id: string) => integrationService.testPingWebhook(id),
    onSuccess: (_res, id) => {
      void queryClient.invalidateQueries({
        queryKey: [...integrationQueryKeys.all, "deliveries", id],
      });
    },
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

