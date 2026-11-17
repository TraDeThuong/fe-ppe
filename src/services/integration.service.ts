import axios from "axios";
import { env } from "@/config/env";
import { apiClient } from "@/lib/axios";
import type {
  ApiKeyItemDto,
  CreateApiKeyPayload,
  CreateApiKeyResponseDto,
  CreateWebhookPayload,
  CreateWebhookResponseDto,
  ListDeliveriesQuery,
  PaginationMeta,
  ToggleApiKeyPayload,
  TriggerDemoJobPayload,
  TriggerDemoJobResponseDto,
  UpdateWebhookPayload,
  WebhookActionResultDto,
  WebhookDeliveryDto,
  WebhookEndpointDto,
} from "@/types";

function unwrapData<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res && !("status" in res && "headers" in res)) {
    return ((res as { data?: T }).data ?? res) as T;
  }
  return res as T;
}

function unwrapArray<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === "object") {
    const obj = res as { data?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

function unwrapPaginated<T>(res: unknown): { items: T[]; meta?: PaginationMeta } {
  if (!res) return { items: [] };
  if (Array.isArray(res)) return { items: res as T[] };
  const raw = res as { data?: unknown; items?: unknown; meta?: PaginationMeta };
  const items = Array.isArray(raw.data)
    ? (raw.data as T[])
    : Array.isArray(raw.items)
      ? (raw.items as T[])
      : [];
  return { items, meta: raw.meta };
}

export const integrationService = {
  // ── API Keys ───────────────────────────────────────────────────────────────
  async listApiKeys(): Promise<ApiKeyItemDto[]> {
    const res = await apiClient.get<unknown>("/integration/api-keys");
    return unwrapArray<ApiKeyItemDto>(res);
  },

  async createApiKey(payload: CreateApiKeyPayload): Promise<CreateApiKeyResponseDto> {
    const res = await apiClient.post<unknown>("/integration/api-keys", payload);
    return unwrapData<CreateApiKeyResponseDto>(res);
  },

  async toggleApiKey(id: string, payload: ToggleApiKeyPayload): Promise<{ message: string }> {
    const res = await apiClient.patch<unknown>(`/integration/api-keys/${id}/toggle`, payload);
    const data = res as { message?: string } | undefined;
    return { message: data?.message || "Updated API key status" };
  },

  async deleteApiKey(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown>(`/integration/api-keys/${id}`);
    const data = res as { message?: string } | undefined;
    return { message: data?.message || "Deleted API key" };
  },

  // ── Webhooks & Deliveries ──────────────────────────────────────────────────
  async listWebhooks(): Promise<WebhookEndpointDto[]> {
    const res = await apiClient.get<unknown>("/integration/webhooks");
    return unwrapArray<WebhookEndpointDto>(res);
  },

  async getWebhookById(id: string): Promise<WebhookEndpointDto> {
    const res = await apiClient.get<unknown>(`/integration/webhooks/${id}`);
    return unwrapData<WebhookEndpointDto>(res);
  },

  async createWebhook(payload: CreateWebhookPayload): Promise<CreateWebhookResponseDto> {
    const res = await apiClient.post<unknown>("/integration/webhooks", payload);
    return unwrapData<CreateWebhookResponseDto>(res);
  },

  async updateWebhook(id: string, payload: UpdateWebhookPayload): Promise<{ message: string }> {
    const res = await apiClient.put<unknown>(`/integration/webhooks/${id}`, payload);
    const data = res as { message?: string } | undefined;
    return { message: data?.message || "Updated webhook" };
  },

  async deleteWebhook(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown>(`/integration/webhooks/${id}`);
    const data = res as { message?: string } | undefined;
    return { message: data?.message || "Deleted webhook" };
  },

  async testPingWebhook(id: string): Promise<WebhookActionResultDto> {
    const res = await apiClient.post<unknown>(`/integration/webhooks/${id}/test`);
    return unwrapData<WebhookActionResultDto>(res);
  },

  async listDeliveries(
    webhookId: string,
    params?: ListDeliveriesQuery,
  ): Promise<{ items: WebhookDeliveryDto[]; meta?: PaginationMeta }> {
    const cleanParams = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.event?.trim() ? { event: params.event.trim() } : {}),
    };
    const res = await apiClient.get<unknown>(`/integration/webhooks/${webhookId}/deliveries`, {
      params: cleanParams,
    });
    return unwrapPaginated<WebhookDeliveryDto>(res);
  },

  async retryDelivery(deliveryId: string): Promise<WebhookActionResultDto> {
    const res = await apiClient.post<unknown>(
      `/integration/webhooks/deliveries/${deliveryId}/retry`,
    );
    return unwrapData<WebhookActionResultDto>(res);
  },

  // ── Demo Job Callback Trigger (dùng X-API-Key riêng) ────────────────────────
  async triggerDemoJob(
    apiKey: string,
    payload: TriggerDemoJobPayload,
  ): Promise<TriggerDemoJobResponseDto> {
    const res = await axios.post<{
      success?: boolean;
      message?: string;
      data?: TriggerDemoJobResponseDto;
    }>(`${env.apiBaseUrl}/integration/jobs/trigger`, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey.trim(),
      },
      timeout: 15000,
    });
    return (res.data?.data ?? res.data) as TriggerDemoJobResponseDto;
  },
};

