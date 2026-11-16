import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  apiClient,
  ApiError,
  AUTH_SESSION_EXPIRED_EVENT,
  extractBearerToken,
  refreshClient,
} from "@/lib/axios";
import { eventBus } from "@/lib/event-bus";
import { tokenStore } from "@/lib/token";

const originalApiAdapter = apiClient.defaults.adapter;
const originalRefreshAdapter = refreshClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalApiAdapter;
  refreshClient.defaults.adapter = originalRefreshAdapter;
  tokenStore.clear();
});

function create401Error(config: InternalAxiosRequestConfig, code = "TOKEN_EXPIRED") {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config,
    data: { success: false, code, message: "Token expired" },
  });
}

describe("Axios stale in-flight 401 refresh race-condition protection", () => {
  it("executes POST /auth/refresh once across 6 staggered requests with expired AccessToken_V1", async () => {
    tokenStore.setTokens("AccessToken_V1", "RefreshToken_V1");

    let refreshCalls = 0;
    let sessionExpiredEmitted = 0;
    const unsubscribe = eventBus.on(AUTH_SESSION_EXPIRED_EVENT, () => {
      sessionExpiredEmitted += 1;
    });

    let resolveRefreshDone!: () => void;
    const refreshDone = new Promise<void>((resolve) => {
      resolveRefreshDone = resolve;
    });

    refreshClient.defaults.adapter = async (config) => {
      refreshCalls += 1;
      if (refreshCalls > 1) {
        // Mô phỏng Token Reuse Detection: refresh lần 2 bằng token cũ bị từ chối 401
        throw create401Error(config, "TOKEN_INVALID");
      }
      setTimeout(() => resolveRefreshDone(), 0);
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          success: true,
          data: {
            accessToken: "AccessToken_V2",
            refreshToken: "RefreshToken_V2",
          },
        },
      };
    };

    const retriedTokens: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      const token = extractBearerToken(config.headers);
      const id = Number(config.url?.split("/").pop());

      // Req 3..6 cố ý phản hồi 401 muộn hơn SAU khi refreshPromise đã hoàn tất & reset về null
      if (token === "AccessToken_V1" && id >= 3) {
        await refreshDone;
        await new Promise((resolve) => setTimeout(resolve, 15));
        throw create401Error(config);
      }

      if (token === "AccessToken_V1") {
        throw create401Error(config);
      }

      if (token === "AccessToken_V2") {
        retriedTokens.push(token);
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: { id } },
        };
      }

      throw create401Error(config);
    };

    try {
      const results = await Promise.all(
        [1, 2, 3, 4, 5, 6].map((id) =>
          apiClient.get<{ id: number }>(`/items/${id}`),
        ),
      );

      assert.equal(refreshCalls, 1);
      assert.equal(sessionExpiredEmitted, 0);
      assert.equal(retriedTokens.length, 6);
      assert.deepEqual(
        results.map((r) => (r as unknown as { id: number }).id),
        [1, 2, 3, 4, 5, 6],
      );
    } finally {
      unsubscribe();
    }
  });

  it("handles 6 staggered cookie-only requests after page reload without calling refresh twice", async () => {
    // Sau F5 reload, tokenStore ban đầu trống (sentToken === "")
    tokenStore.clear();

    let refreshCalls = 0;
    let resolveRefreshDone!: () => void;
    const refreshDone = new Promise<void>((resolve) => {
      resolveRefreshDone = resolve;
    });

    refreshClient.defaults.adapter = async (config) => {
      refreshCalls += 1;
      setTimeout(() => resolveRefreshDone(), 0);
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          success: true,
          data: {
            accessToken: "AccessToken_V2",
            refreshToken: "RefreshToken_V2",
          },
        },
      };
    };

    apiClient.defaults.adapter = async (config) => {
      const token = extractBearerToken(config.headers);
      const id = Number(config.url?.split("/").pop());

      if (!token && id >= 3) {
        await refreshDone;
        await new Promise((resolve) => setTimeout(resolve, 15));
        throw create401Error(config);
      }

      if (!token) {
        throw create401Error(config);
      }

      if (token === "AccessToken_V2") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: { id } },
        };
      }

      throw create401Error(config);
    };

    const results = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((id) =>
        apiClient.get<{ id: number }>(`/cookie-items/${id}`),
      ),
    );

    assert.equal(refreshCalls, 1);
    assert.deepEqual(
      results.map((r) => (r as unknown as { id: number }).id),
      [1, 2, 3, 4, 5, 6],
    );
  });

  it("stops retrying if a request already retried with the refreshed token still fails 401", async () => {
    tokenStore.setTokens("AccessToken_V1", "RefreshToken_V1");
    let refreshCalls = 0;
    let requestCalls = 0;

    refreshClient.defaults.adapter = async (config) => {
      refreshCalls += 1;
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          success: true,
          data: {
            accessToken: "AccessToken_V2",
            refreshToken: "RefreshToken_V2",
          },
        },
      };
    };

    apiClient.defaults.adapter = async (config) => {
      requestCalls += 1;
      throw create401Error(config);
    };

    await assert.rejects(
      apiClient.get("/still-unauthorized"),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );

    assert.equal(refreshCalls, 1);
    assert.equal(requestCalls, 2);
  });
});

