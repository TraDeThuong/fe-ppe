import { apiClient } from "@/lib/axios";
import type {
  CreateSystemConfigPayload,
  PublicConfigsResponse,
  ServiceHealthItem,
  SystemConfigDetailResponse,
  SystemConfigItem,
  SystemConfigQueryParams,
  SystemConfigsListResponse,
  SystemHealthReport,
  ToggleFeatureFlagPayload,
  UpdateSystemConfigPayload,
} from "@/types";

/**
 * Service Quản trị Cấu hình & Hạ tầng Hệ thống (System Service).
 * Tương tác với /api/v1/system trên identity-service và health endpoints cụm microservices.
 */
export const systemService = {
  /**
   * GET /api/v1/system/public
   * Lấy danh sách cấu hình và cờ tính năng công khai.
   */
  async getPublicConfigs(): Promise<Record<string, unknown>> {
    const res = await apiClient.get<unknown>("/system/public");
    if (res && typeof res === "object") {
      if ("data" in res && typeof (res as { data?: unknown }).data === "object" && !Array.isArray((res as { data?: unknown }).data)) {
        return (res as { data: Record<string, unknown> }).data;
      }
      return (res as unknown) as Record<string, unknown>;
    }
    return {};
  },

  /**
   * GET /api/v1/system/configs
   * Lấy danh sách biến cấu hình có phân trang, lọc theo category, tìm kiếm.
   */
  async getConfigs(
    params?: SystemConfigQueryParams,
  ): Promise<{ items: SystemConfigItem[]; meta?: SystemConfigsListResponse["meta"] }> {
    const res = await apiClient.get<unknown>("/system/configs", {
      params,
    });

    let items: SystemConfigItem[] = [];
    let meta: SystemConfigsListResponse["meta"] | undefined;

    if (res && typeof res === "object") {
      if ("data" in res && Array.isArray((res as { data?: unknown }).data)) {
        items = (res as { data: SystemConfigItem[]; meta?: SystemConfigsListResponse["meta"] }).data;
        meta = (res as { meta?: SystemConfigsListResponse["meta"] }).meta;
      } else if (Array.isArray(res)) {
        items = res as SystemConfigItem[];
      }
    } else if (Array.isArray(res)) {
      items = res as SystemConfigItem[];
    }

    return {
      items,
      meta,
    };
  },

  /**
   * GET /api/v1/system/configs/:key
   * Lấy chi tiết 1 biến cấu hình theo key.
   */
  async getConfigByKey(key: string): Promise<SystemConfigItem> {
    const res = await apiClient.get<unknown>(
      `/system/configs/${encodeURIComponent(key)}`,
    );
    if (res && typeof res === "object" && "data" in res && !Array.isArray((res as { data?: unknown }).data)) {
      return (res as { data: SystemConfigItem }).data;
    }
    return (res as unknown) as SystemConfigItem;
  },

  /**
   * POST /api/v1/system/configs
   * Tạo mới một biến cấu hình hệ thống.
   */
  async createConfig(payload: CreateSystemConfigPayload): Promise<SystemConfigItem> {
    const res = await apiClient.post<unknown>(
      "/system/configs",
      payload,
    );
    if (res && typeof res === "object" && "data" in res && !Array.isArray((res as { data?: unknown }).data)) {
      return (res as { data: SystemConfigItem }).data;
    }
    return (res as unknown) as SystemConfigItem;
  },

  /**
   * PUT /api/v1/system/configs/:key
   * Cập nhật giá trị hoặc mô tả của biến cấu hình.
   */
  async updateConfig(
    key: string,
    payload: UpdateSystemConfigPayload,
  ): Promise<SystemConfigItem> {
    const res = await apiClient.put<unknown>(
      `/system/configs/${encodeURIComponent(key)}`,
      payload,
    );
    if (res && typeof res === "object" && "data" in res && !Array.isArray((res as { data?: unknown }).data)) {
      return (res as { data: SystemConfigItem }).data;
    }
    return (res as unknown) as SystemConfigItem;
  },

  /**
   * PATCH /api/v1/system/features/:key/toggle
   * Bật hoặc tắt tức thời một Feature Flag.
   */
  async toggleFeatureFlag(
    key: string,
    payload: ToggleFeatureFlagPayload,
  ): Promise<SystemConfigItem> {
    const res = await apiClient.patch<unknown>(
      `/system/features/${encodeURIComponent(key)}/toggle`,
      payload,
    );
    if (res && typeof res === "object" && "data" in res && !Array.isArray((res as { data?: unknown }).data)) {
      return (res as { data: SystemConfigItem }).data;
    }
    return (res as unknown) as SystemConfigItem;
  },

  /**
   * DELETE /api/v1/system/configs/:key
   * Xóa một biến cấu hình hệ thống.
   */
  async deleteConfig(key: string): Promise<void> {
    await apiClient.delete(`/system/configs/${encodeURIComponent(key)}`);
  },

  /**
   * Kiểm tra nhịp tim và độ trễ toàn cụm 8 Microservices & 4 thành phần Hạ tầng.
   * Sử dụng số liệu uptime và readiness thực tế từ backend, loại bỏ dữ liệu giả lập.
   */
  async checkServicesHealth(): Promise<SystemHealthReport> {
    interface HealthTarget {
      name: string;
      code: string;
      port: number;
      path: string;
      type: "SERVICE" | "INFRASTRUCTURE";
      isDirectUrl?: boolean;
      isDbProbe?: boolean;
    }

    const serviceTargets: HealthTarget[] = [
      { name: "Identity & Core Auth", code: "identity-service", port: 9999, path: "/health", type: "SERVICE" },
      { name: "Camera & RTSP Streams", code: "camera-service", port: 8892, path: "/cameras/health", type: "SERVICE" },
      { name: "Sites & Spatial Layout", code: "site-service", port: 8891, path: "/sites/health", type: "SERVICE" },
      { name: "Incidents & Evidence Hub", code: "incident-service", port: 8893, path: "/incidents/health", type: "SERVICE" },
      { name: "Media & Snapshot Storage", code: "media-service", port: 8890, path: "/files/health", type: "SERVICE" },
      { name: "Reporting & Safety Analytics", code: "reporting-service", port: 8894, path: "/reports/health", type: "SERVICE" },
      { name: "Notification & Realtime Hub", code: "notification-service", port: 8889, path: "/notifications/health", type: "SERVICE" },
      { name: "AI YOLO Inference Engine", code: "ai-service", port: 8000, path: "http://localhost:8000/health", type: "SERVICE", isDirectUrl: true },
    ];

    const infraTargets: HealthTarget[] = [
      { name: "PostgreSQL Database", code: "postgres-db", port: 5432, path: "/health/readiness", type: "INFRASTRUCTURE", isDbProbe: true },
      { name: "Apache Kafka EventBus", code: "kafka-broker", port: 9092, path: "/incidents/health", type: "INFRASTRUCTURE" },
      { name: "MinIO S3 Object Storage", code: "minio-storage", port: 9000, path: "http://localhost:9000/minio/health/live", type: "INFRASTRUCTURE", isDirectUrl: true },
      { name: "Traefik Reverse Proxy", code: "traefik-gateway", port: 80, path: "http://localhost:8080/ping", type: "INFRASTRUCTURE", isDirectUrl: true },
    ];

    const allTargets: HealthTarget[] = [...serviceTargets, ...infraTargets];

    const formatUptimeStr = (seconds?: number): string => {
      if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0) return "--";
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m ${Math.floor(seconds % 60)}s`;
    };

    const results = await Promise.allSettled(
      allTargets.map(async (tgt) => {
        const start = performance.now();
        try {
          let resData: Record<string, unknown> | undefined;
          let isHealthy = false;
          let probeLatency = 0;

          if (tgt.isDirectUrl) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(tgt.path, { signal: controller.signal });
            clearTimeout(timer);
            probeLatency = Math.round(performance.now() - start);
            isHealthy = response.ok;
            if (response.ok) {
              try {
                resData = await response.json();
              } catch {
                resData = { status: "ok" };
              }
            }
          } else {
            const res = await apiClient.get(tgt.path, { timeout: 3000 });
            probeLatency = Math.round(performance.now() - start);
            isHealthy = res.status >= 200 && res.status < 300;
            resData = res.data as Record<string, unknown>;
          }

          let uptimeStr = "--";
          if (resData && typeof resData.uptime === "number") {
            uptimeStr = formatUptimeStr(resData.uptime);
          } else if (resData && typeof (resData.metrics as any)?.uptimeSeconds === "number") {
            uptimeStr = formatUptimeStr((resData.metrics as any).uptimeSeconds);
          }

          if (tgt.isDbProbe && resData?.checks) {
            const dbCheck = (resData.checks as any).database;
            if (dbCheck && dbCheck.status !== "healthy") {
              isHealthy = false;
            }
            if (dbCheck && typeof dbCheck.latencyMs === "number") {
              probeLatency = dbCheck.latencyMs;
            }
          }

          const latencyMs = Math.max(probeLatency, 1);

          return {
            name: tgt.name,
            serviceCode: tgt.code,
            port: tgt.port,
            endpoint: tgt.path,
            type: tgt.type,
            status: isHealthy
              ? latencyMs < 250
                ? "HEALTHY"
                : "DEGRADED"
              : "DOWN",
            latencyMs,
            uptime: uptimeStr,
            lastChecked: new Date().toISOString(),
          } as ServiceHealthItem;
        } catch {
          const latencyMs = Math.round(performance.now() - start);
          return {
            name: tgt.name,
            serviceCode: tgt.code,
            port: tgt.port,
            endpoint: tgt.path,
            type: tgt.type,
            status: "DOWN",
            latencyMs: Math.min(latencyMs, 3000),
            uptime: "--",
            lastChecked: new Date().toISOString(),
          } as ServiceHealthItem;
        }
      }),
    );

    const services: ServiceHealthItem[] = results.map((r, idx) => {
      if (r.status === "fulfilled") return r.value;
      const tgt = allTargets[idx];
      return {
        name: tgt.name,
        serviceCode: tgt.code,
        port: tgt.port,
        endpoint: tgt.path,
        type: tgt.type,
        status: "DOWN",
        latencyMs: 3000,
        uptime: "--",
        lastChecked: new Date().toISOString(),
      };
    });

    const healthyCount = services.filter((s) => s.status === "HEALTHY").length;
    const totalLatency = services.reduce((acc, s) => acc + s.latencyMs, 0);
    const averageLatencyMs = Math.round(totalLatency / (services.length || 1));

    let overallStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";
    if (healthyCount < services.length / 2) {
      overallStatus = "DOWN";
    } else if (healthyCount < services.length) {
      overallStatus = "DEGRADED";
    }

    return {
      overallStatus,
      healthyCount,
      totalServices: services.length,
      averageLatencyMs,
      services,
      checkedAt: new Date().toISOString(),
    };
  },
};
