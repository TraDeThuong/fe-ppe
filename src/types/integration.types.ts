import type { PaginationMeta } from "./rbac.types";

/**
 * Contract API Keys, Webhooks & Developer Integrations theo smart-ppe-identity-service.
 * Nguồn đối chiếu:
 * - smart-ppe-identity-service/src/common/constants/integration.constant.ts
 * - smart-ppe-identity-service/src/modules/integration/integration.dto.ts
 * - smart-ppe-identity-service/src/modules/integration/integration.validation.ts
 */

export const WEBHOOK_EVENTS = {
  ALL: "*",
  PPE_INCIDENT_CREATED: "ppe.incident.created",
  PPE_INCIDENT_ASSIGNED: "ppe.incident.assigned",
  PPE_INCIDENT_RESOLVED: "ppe.incident.resolved",
  USER_UPDATED: "user.updated",
  SYSTEM_PING: "system.ping",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
} as const;

export type WebhookEventName =
  (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const SUPPORTED_WEBHOOK_EVENTS: readonly WebhookEventName[] = [
  WEBHOOK_EVENTS.ALL,
  WEBHOOK_EVENTS.PPE_INCIDENT_CREATED,
  WEBHOOK_EVENTS.PPE_INCIDENT_ASSIGNED,
  WEBHOOK_EVENTS.PPE_INCIDENT_RESOLVED,
  WEBHOOK_EVENTS.USER_UPDATED,
  WEBHOOK_EVENTS.SYSTEM_PING,
  WEBHOOK_EVENTS.JOB_COMPLETED,
  WEBHOOK_EVENTS.JOB_FAILED,
];

export interface ApiKeyItemDto {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  permissions?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponseDto {
  id: string;
  name: string;
  key: string; // Plaintext key trả về duy nhất 1 lần
  prefix: string;
  permissions: string[];
  expiresAt?: string | null;
  createdAt: string;
}

export interface ToggleApiKeyPayload {
  isActive: boolean;
}

export interface WebhookEndpointDto {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  secretMasked: string;
}

export interface CreateWebhookPayload {
  url: string;
  secret?: string;
  events?: string[];
  description?: string;
}

export interface CreateWebhookResponseDto extends WebhookEndpointDto {
  secret: string; // Plaintext secret trả về duy nhất 1 lần
}

export interface UpdateWebhookPayload {
  url?: string;
  events?: string[];
  isActive?: boolean;
  description?: string;
  secret?: string;
}

export type WebhookDeliveryStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface WebhookDeliveryDto {
  id: string;
  webhookEndpointId: string;
  event: string;
  payload: unknown;
  signature: string;
  status: WebhookDeliveryStatus | string;
  statusCode?: number | null;
  responseBody?: string | null;
  attempts: number;
  lastError?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface ListDeliveriesQuery {
  page?: number;
  limit?: number;
  status?: WebhookDeliveryStatus | "";
  event?: string;
}

export interface WebhookDeliveriesResponse {
  items: WebhookDeliveryDto[];
  meta?: PaginationMeta;
}

export interface WebhookActionResultDto {
  deliveryId: string;
  message: string;
}

export interface TriggerDemoJobPayload {
  taskName: string;
  data: Record<string, string | number | boolean | null>;
  simulateError?: boolean;
}

export interface TriggerDemoJobResponseDto {
  jobId: string;
  taskName: string;
  status: "COMPLETED" | "FAILED" | string;
  webhooksNotified: number;
}

