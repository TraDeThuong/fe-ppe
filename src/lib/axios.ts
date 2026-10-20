import "client-only";

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/config/env";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { ErrorCode, type ApiErrorBody } from "@/types/common";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors?: ApiErrorBody["errors"];
  readonly retryAfter?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    errors?: ApiErrorBody["errors"],
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

/** AuthContext lắng nghe sự kiện này để reset trạng thái và đưa user về /login */
export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Các endpoint đăng nhập không được trigger refresh khi 401 */
const REFRESH_EXEMPT_PATHS = ["/auth/login", "/auth/refresh", "/auth/2fa/verify", "/auth/google"];

// ── Refresh single-flight ──────────────────────────────────────────────
// Backend có refresh token rotation: mỗi lần refresh, token cũ bị xóa khỏi DB.
// 2 request refresh song song → 1 cái bị TOKEN_INVALID (reuse) → backend revoke
// TOÀN BỘ session. Vì vậy mọi request 401 phải chờ CHUNG 1 promise này.

let refreshPromise: Promise<boolean> | null = null;

/** Instance trần (không interceptor) để gọi refresh/purge — tránh đệ quy vô hạn và toast thừa */
const refreshClient = axios.create({ baseURL: env.apiBaseUrl, withCredentials: true, timeout: 15000 });

/**
 * Xóa cookie httpOnly (accessToken/refreshToken) khi session hết hạn thật sự.
 * BE không tự clear cookie khi refresh bị từ chối — nếu để cookie cũ, proxy
 * (lớp 1) thấy cookie và bounce /login → / → /login mỗi lần tải trang.
 * Gọi bằng client trần để không kích hoạt refresh loop và không toast.
 */
export function purgeSessionCookies(): Promise<void> {
  return refreshClient.post("/auth/logout", {}).then(
    () => undefined,
    () => undefined,
  );
}

async function doRefresh(): Promise<boolean> {
  try {
    const { data: body } = await refreshClient.post<{
      success: boolean;
      data?: { accessToken: string; refreshToken: string };
    }>("/auth/refresh", {
      // Ưu tiên token mới nhất trong memory; sau reload memory trống
      // thì server tự lấy refresh token từ cookie (route middleware bơm body)
      refreshToken: tokenStore.getRefreshToken() ?? undefined,
    });
    const tokens = body.data;
    if (!tokens?.accessToken || !tokens?.refreshToken) return false;
    tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
    return true;
  } catch (error) {
    // Mất mạng chỉ là lỗi tạm thời — giữ session, request gốc sẽ toast "mất kết nối".
    // Chỉ xóa phiên khi backend thực sự từ chối refresh token (401/4xx).
    const isNetworkError = axios.isAxiosError(error) && !error.response;
    if (!isNetworkError) {
      tokenStore.clear();
      eventBus.emit(AUTH_SESSION_EXPIRED_EVENT);
    }
    return false;
  }
}

function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Helper ─────────────────────────────────────────────────────────────

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : undefined;
  }
  return undefined;
}

/** Chỉ toast lỗi kỹ thuật/toàn cục ở interceptor; lỗi nghiệp vụ để mutation tự toast */
function shouldGlobalToast(status: number, code: string): boolean {
  if (status === 0) return true; // mất kết nối
  if (status >= 500) return true;
  if (status === 429 && code === ErrorCode.RATE_LIMIT_EXCEEDED) return true;
  return false;
}

// ── Factory ────────────────────────────────────────────────────────────
// Mỗi backend microservice = 1 client với baseURL riêng, dùng CHUNG interceptor
// (auth header + refresh single-flight + chuẩn hóa lỗi).

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL, withCredentials: true, timeout: 15000 });

  client.interceptors.request.use((config) => {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const body = response.data;
      if (body && typeof body === "object" && "success" in body) {
        if (body.success) {
          // Endpoint trả { data } → unwrap; trả { message } → trả nguyên body
          return body.data !== undefined ? body.data : body;
        }
        throw new ApiError(
          response.status,
          body.code ?? ErrorCode.BAD_REQUEST,
          body.message ?? "Yêu cầu thất bại.",
          body.errors,
        );
      }
      return body;
    },
    async (error: AxiosError<ApiErrorBody>) => {
      const config = error.config as RetryableConfig | undefined;
      const status = error.response?.status ?? 0;
      const body = error.response?.data;
      const code = body?.code ?? (status === 0 ? "NETWORK_ERROR" : "UNKNOWN_ERROR");
      const message =
        body?.message ??
        (status === 0
          ? "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."
          : "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.");

      const apiError = new ApiError(
        status,
        code,
        message,
        body?.errors,
        parseRetryAfter(error.response?.headers?.["retry-after"]),
      );

      const shouldRefresh =
        status === 401 &&
        code === ErrorCode.TOKEN_EXPIRED &&
        config !== undefined &&
        !config._retry &&
        !REFRESH_EXEMPT_PATHS.some((path) => config.url?.startsWith(path));

      if (shouldRefresh) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          config._retry = true;
          const newToken = tokenStore.getAccessToken();
          if (newToken) {
            config.headers.set("Authorization", `Bearer ${newToken}`);
          }
          return client.request(config);
        }
      }

      if (shouldGlobalToast(status, code)) {
        toast.error(message, { id: "api-global-error" });
      }

      return Promise.reject(apiError);
    },
  );

  return client;
}

/** Client mặc định — đi qua Traefik gateway, dùng cho identity-service hiện tại */
export const apiClient = createApiClient(env.apiBaseUrl);
