export const integrationQueryKeys = {
  all: ["integrations"] as const,
  apiKeys: () => [...integrationQueryKeys.all, "api-keys"] as const,
  webhooks: () => [...integrationQueryKeys.all, "webhooks"] as const,
  webhookDetail: (id: string) =>
    [...integrationQueryKeys.all, "webhook", id] as const,
  deliveries: (webhookId: string, params?: unknown) =>
    [...integrationQueryKeys.all, "deliveries", webhookId, params] as const,
};

