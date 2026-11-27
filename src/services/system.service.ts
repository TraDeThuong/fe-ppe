import { apiClient } from "@/lib/axios";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { tokenStore } from "@/lib/token";
import { env } from "@/config/env";
import type {
  CreateSystemConfigPayload,
  PublicConfigsResponse,
  ServiceHealthItem,
  ServiceProbeFailureKind,
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
      displayEndpoint?: string;
      type: "SERVICE" | "INFRASTRUCTURE";
      probeTarget?: "ai" | "traefik" | "minio";
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
      {
        name: "AI YOLO Inference Engine",
        code: "ai-service",
        port: 8000,
        path: "/api/system/health-probe?target=ai",
        displayEndpoint: "/health (:8000)",
        type: "SERVICE",
        probeTarget: "ai",
      },
    ];

    const infraTargets: HealthTarget[] = [
      { name: "PostgreSQL Database", code: "postgres-db", port: 5432, path: "/health/readiness", type: "INFRASTRUCTURE", isDbProbe: true },
      {
        name: "MinIO S3 Object Storage",
        code: "minio-storage",
        port: 9000,
        path: "/api/system/health-probe?target=minio",
        displayEndpoint: "/minio/health/live (:9000)",
        type: "INFRASTRUCTURE",
        probeTarget: "minio",
      },
      {
        name: "Traefik Reverse Proxy",
        code: "traefik-gateway",
        port: 80,
        path: "/api/system/health-probe?target=traefik",
        displayEndpoint: "/ping (:8080) · gateway (:80)",
        type: "INFRASTRUCTURE",
        probeTarget: "traefik",
      },
    ];

    const allTargets: HealthTarget[] = [...serviceTargets, ...infraTargets];
    const HEALTHY_THRESHOLD_MS = 250;
    const probeRequestOptions = { timeout: 3000, suppressToast: true };

    const formatUptimeStr = (seconds?: number): string => {
      if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0) return "--";
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m ${Math.floor(seconds % 60)}s`;
    };

    const classifyProbeError = (
      error: unknown,
      isServerProbe?: boolean,
    ): { failureKind: ServiceProbeFailureKind; reason: string } => {
      if (error && typeof error === "object") {
        const err = error as {
          name?: string;
          code?: string;
          status?: number;
          message?: string;
        };
        if (err.name === "AbortError" || err.code === "ECONNABORTED") {
          return {
            failureKind: "TIMEOUT",
            reason: isServerProbe ? "Timeout (> 2s)" : "Timeout (> 3s)",
          };
        }
        if (typeof err.status === "number" && err.status > 0) {
          return {
            failureKind: "HTTP_ERROR",
            reason: `HTTP ${err.status}${err.message ? ` · ${err.message}` : ""}`,
          };
        }
        if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
          return {
            failureKind: "CONNECTION_REFUSED",
            reason: err.message || "Network unreachable",
          };
        }
        if (err.message) {
          return {
            failureKind: isServerProbe ? "UNKNOWN" : "CORS_OR_NETWORK",
            reason: err.message,
          };
        }
      }
      return {
        failureKind: "CONNECTION_REFUSED",
        reason: "Connection failed",
      };
    };

    const results = await Promise.allSettled(
      allTargets.map(async (tgt) => {
        const start = performance.now();
        try {
          let resData: Record<string, unknown> | undefined;
          let isHealthy = false;
          let probeLatency = 0;
          let failureReason: string | undefined;
          let failureKind: ServiceProbeFailureKind | undefined;
          let verifiedVia: "ai-models-api" | undefined;

          if (tgt.probeTarget) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2500);
            try {
              const accessToken = tokenStore.getAccessToken();
              const response = await fetch(tgt.path, {
                cache: "no-store",
                credentials: "same-origin",
                ...(accessToken
                  ? { headers: { Authorization: `Bearer ${accessToken}` } }
                  : {}),
                signal: controller.signal,
              });
              probeLatency = Math.round(performance.now() - start);
              if (!response.ok) {
                failureKind = "HTTP_ERROR";
                failureReason = `HTTP ${response.status}`;
              } else {
                try {
                  const parsed = (await response.json()) as Record<string, unknown>;
                  if (typeof parsed.ok === "boolean") {
                    isHealthy = parsed.ok;
                    if (typeof parsed.latencyMs === "number") {
                      probeLatency = parsed.latencyMs;
                    }
                    if (!parsed.ok) {
                      failureKind =
                        (parsed.failureKind as ServiceProbeFailureKind) ||
                        "CONNECTION_REFUSED";
                      failureReason =
                        typeof parsed.reason === "string"
                          ? parsed.reason
                          : "Target unreachable";
                    } else {
                      if (tgt.probeTarget === "ai" && parsed.verifiedVia === "ai-models-api") {
                        verifiedVia = "ai-models-api";
                      }
                      resData =
                        typeof parsed.uptime === "number"
                          ? { uptime: parsed.uptime }
                          : { status: "ok" };
                    }
                  } else {
                    isHealthy = true;
                    resData = parsed;
                  }
                } catch {
                  isHealthy = true;
                  resData = { status: "ok" };
                }
              }
            } finally {
              clearTimeout(timer);
            }
          } else {
            // apiClient interceptor đã unwrap response.data thành JSON body (không còn .status HTTP).
            // Nếu promise resolve không ném ApiError nghĩa là HTTP 2xx thành công.
            const res = await apiClient.get<never, unknown>(tgt.path, {
              ...probeRequestOptions,
            });
            probeLatency = Math.round(performance.now() - start);
            resData =
              res && typeof res === "object"
                ? (res as Record<string, unknown>)
                : undefined;
            const rawStatus =
              typeof resData?.status === "string"
                ? resData.status.toLowerCase()
                : undefined;
            const isPayloadError =
              rawStatus === "down" ||
              rawStatus === "error" ||
              rawStatus === "unhealthy";
            isHealthy = !isPayloadError;
            if (isPayloadError) {
              failureKind = "PAYLOAD_UNHEALTHY";
              failureReason = `Service status: ${rawStatus}`;
            }
          }

          let uptimeStr = "--";
          if (resData && typeof resData.uptime === "number") {
            uptimeStr = formatUptimeStr(resData.uptime);
          } else if (
            resData &&
            typeof (resData.metrics as { uptimeSeconds?: unknown } | undefined)
              ?.uptimeSeconds === "number"
          ) {
            uptimeStr = formatUptimeStr(
              (resData.metrics as { uptimeSeconds: number }).uptimeSeconds,
            );
          }

          if (tgt.isDbProbe && resData?.checks) {
            const dbCheck = (
              resData.checks as {
                database?: { status?: string; latencyMs?: number };
              }
            ).database;
            if (
              dbCheck &&
              dbCheck.status &&
              dbCheck.status !== "healthy" &&
              dbCheck.status !== "ok"
            ) {
              isHealthy = false;
              failureKind = "PAYLOAD_UNHEALTHY";
              failureReason = `Database status: ${dbCheck.status}`;
            }
            if (dbCheck && typeof dbCheck.latencyMs === "number") {
              probeLatency = dbCheck.latencyMs;
            }
          }

          const latencyMs = Math.max(probeLatency, 1);
          const status: ServiceHealthItem["status"] = isHealthy
            ? latencyMs < HEALTHY_THRESHOLD_MS
              ? "HEALTHY"
              : "DEGRADED"
            : "DOWN";

          if (status === "DEGRADED" && !failureReason) {
            failureReason = `High latency (${latencyMs}ms >= ${HEALTHY_THRESHOLD_MS}ms)`;
          }

          return {
            name: tgt.name,
            serviceCode: tgt.code,
            port: tgt.port,
            endpoint: verifiedVia === "ai-models-api" ? "/api/models (:8000)" : tgt.displayEndpoint ?? tgt.path,
            type: tgt.type,
            status,
            latencyMs,
            uptime: uptimeStr,
            lastChecked: new Date().toISOString(),
            details: {
              thresholdMs: HEALTHY_THRESHOLD_MS,
              ...(typeof resData?.version === "string" && resData.version.trim()
                ? { version: resData.version.trim() }
                : {}),
              ...(status === "DOWN" ? { probeDurationMs: latencyMs } : {}),
              ...(failureKind ? { failureKind } : {}),
              ...(failureReason ? { reason: failureReason } : {}),
              ...(verifiedVia ? {
                verifiedVia,
                note: pickLocaleText(
                  "AI Engine phản hồi API danh sách mô hình; phiên bản này không có /health. Trạng thái suy luận chưa được kiểm tra.",
                  "AI Engine responds to the models API; this version has no /health. Inference readiness has not been verified.",
                ),
              } : {}),
            },
          } as ServiceHealthItem;
        } catch (error) {
          const latencyMs = Math.min(
            Math.max(Math.round(performance.now() - start), 1),
            3000,
          );
          const classified = classifyProbeError(error, Boolean(tgt.probeTarget));
          return {
            name: tgt.name,
            serviceCode: tgt.code,
            port: tgt.port,
            endpoint: tgt.displayEndpoint ?? tgt.path,
            type: tgt.type,
            status: "DOWN",
            latencyMs,
            uptime: "--",
            lastChecked: new Date().toISOString(),
            details: {
              thresholdMs: HEALTHY_THRESHOLD_MS,
              probeDurationMs: latencyMs,
              failureKind: classified.failureKind,
              reason: classified.reason,
            },
          } as ServiceHealthItem;
        }
      }),
    );

    const statusPriority: Record<ServiceHealthItem["status"], number> = {
      DOWN: 0,
      DEGRADED: 1,
      HEALTHY: 2,
    };

    const rawServices: ServiceHealthItem[] = results.map((r, idx) => {
      if (r.status === "fulfilled") return r.value;
      const tgt = allTargets[idx];
      return {
        name: tgt.name,
        serviceCode: tgt.code,
        port: tgt.port,
        endpoint: tgt.displayEndpoint ?? tgt.path,
        type: tgt.type,
        status: "DOWN" as const,
        latencyMs: 3000,
        uptime: "--",
        lastChecked: new Date().toISOString(),
        details: {
          thresholdMs: HEALTHY_THRESHOLD_MS,
          probeDurationMs: 3000,
          failureKind: "UNKNOWN",
          reason: "Probe rejected",
        },
      };
    });

    // Nếu cổng admin :8080/ping không mở hoặc chặn nhưng các service đi qua Traefik (:80) vẫn phản hồi 2xx,
    // Traefik Reverse Proxy vẫn đang phục vụ lưu lượng bình thường.
    const traefikIdx = rawServices.findIndex(
      (s) => s.serviceCode === "traefik-gateway",
    );
    const usesGateway = !env.apiBaseUrl.includes(":9999");
    if (
      traefikIdx >= 0 &&
      rawServices[traefikIdx].status === "DOWN" &&
      usesGateway
    ) {
      const gatewayServices = rawServices.filter(
        (s) =>
          s.type === "SERVICE" &&
          s.serviceCode !== "ai-service" &&
          s.status !== "DOWN",
      );
      if (gatewayServices.length > 0) {
        const minGatewayLatency = Math.min(
          ...gatewayServices.map((s) => s.latencyMs),
        );
        rawServices[traefikIdx] = {
          ...rawServices[traefikIdx],
          status:
            minGatewayLatency < HEALTHY_THRESHOLD_MS ? "HEALTHY" : "DEGRADED",
          latencyMs: minGatewayLatency,
          details: {
            thresholdMs: HEALTHY_THRESHOLD_MS,
            verifiedVia: "active-gateway-traffic",
            note: pickLocaleText(
              "Gateway (:80) đang chuyển tiếp bình thường; cổng ping nội bộ (:8080) không phản hồi.",
              "Gateway (:80) is forwarding traffic normally; internal ping port (:8080) is unreachable.",
            ),
          },
        };
      }
    }

    const services = [...rawServices].sort(
      (a, b) => statusPriority[a.status] - statusPriority[b.status],
    );

    const healthyCount = services.filter((s) => s.status === "HEALTHY").length;
    const downCount = services.filter((s) => s.status === "DOWN").length;
    const totalLatency = services.reduce((acc, s) => acc + s.latencyMs, 0);
    const averageLatencyMs = Math.round(totalLatency / (services.length || 1));

    let overallStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";
    if (downCount > 0 && healthyCount < services.length / 2) {
      overallStatus = "DOWN";
    } else if (downCount > 0 || healthyCount < services.length) {
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
