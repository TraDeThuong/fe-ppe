import type { PaginationMeta } from "./rbac.types";

export type SystemConfigCategory =
  | "GENERAL"
  | "FEATURE_FLAG"
  | "INTEGRATION"
  | "SECURITY";

export interface SystemConfigItem {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: SystemConfigCategory | string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemConfigPayload {
  key: string;
  value: unknown;
  description?: string;
  category?: SystemConfigCategory | string;
  isPublic?: boolean;
}

export interface UpdateSystemConfigPayload {
  value?: unknown;
  description?: string;
  category?: SystemConfigCategory | string;
  isPublic?: boolean;
}

export interface ToggleFeatureFlagPayload {
  enabled: boolean;
  description?: string;
}

export interface SystemConfigQueryParams {
  category?: string;
  isPublic?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SystemConfigsListResponse {
  success: boolean;
  data: SystemConfigItem[];
  meta: PaginationMeta;
}

export interface SystemConfigDetailResponse {
  success: boolean;
  data: SystemConfigItem;
}

export interface PublicConfigsResponse {
  success: boolean;
  data: Record<string, unknown>;
}

export type ServiceHealthStatus = "HEALTHY" | "DEGRADED" | "DOWN";

export interface ServiceHealthItem {
  name: string;
  serviceCode: string;
  port: number;
  endpoint: string;
  status: ServiceHealthStatus;
  latencyMs: number;
  uptime?: string;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  overallStatus: ServiceHealthStatus;
  healthyCount: number;
  totalServices: number;
  averageLatencyMs: number;
  services: ServiceHealthItem[];
  checkedAt: string;
}
