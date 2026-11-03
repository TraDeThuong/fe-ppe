import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { ApiError } from "@/lib/axios";
import {
  useSessions,
  useRevokeSession,
  useRevokeOtherSessions,
} from "../use-sessions";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  eventBusCalls,
  createMockUser,
} from "./test-helpers";
import type { MeDto, SessionDto } from "@/types";

describe("useSessions", () => {
  const originalGetSessions = authService.getSessions;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getSessions = originalGetSessions;
  });

  it("fetches active sessions list via authService.getSessions", async () => {
    const mockSessions: SessionDto[] = [
      {
        id: "sess-1",
        deviceName: "Chrome on macOS",
        ipAddress: "127.0.0.1",
        createdAt: "2026-01-01T00:00:00.000Z",
        isCurrent: true,
      },
      {
        id: "sess-2",
        deviceName: "Safari on iOS",
        ipAddress: "192.168.1.10",
        createdAt: "2026-01-02T00:00:00.000Z",
        isCurrent: false,
      },
    ];

    authService.getSessions = async () => mockSessions;

    const { result } = renderAuthHook(() => useSessions({ enabled: false }));

    const res = await result.current.refetch();
    assert.equal(res.data?.length, 2);
    assert.equal(res.data?.[0].id, "sess-1");
    assert.equal(res.data?.[0].isCurrent, true);
  });
});

describe("useRevokeSession", () => {
  const originalRevoke = authService.revokeSession;

  beforeEach(() => {
    resetTestEnvironment();
    authService.revokeSession = originalRevoke;
  });

  it("revokes another session (isCurrent = false) and invalidates sessions cache", async () => {
    let capturedId = "";
    authService.revokeSession = async (id) => {
      capturedId = id;
      return { message: "Thu hồi thành công!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useRevokeSession({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ id: "sess-other", isCurrent: false });

    assert.equal(capturedId, "sess-other");
    assert.ok(toastCalls.success.includes("Thu hồi thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("revokes session when called with plain string id (isCurrent = false by default)", async () => {
    let capturedId = "";
    authService.revokeSession = async (id) => {
      capturedId = id;
      return { message: "" };
    };

    const { result } = renderAuthHook(() => useRevokeSession());
    await result.current.mutateAsync("sess-plain-id");

    assert.equal(capturedId, "sess-plain-id");
    assert.ok(
      toastCalls.success.includes("Thu hồi phiên đăng nhập thành công!"),
    );
  });

  it("revokes current session (isCurrent = true) and triggers full logout cleanup", async () => {
    tokenStore.setTokens("curr-access", "curr-refresh");
    authService.revokeSession = async () => ({ message: "Revoked" });

    let userInContext: MeDto | null = createMockUser();
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useRevokeSession({
          onSuccess: async () => {
            onSuccessCalled = true;
          },
        }),
      {
        authContext: {
          user: userInContext,
          setUser: (u) => {
            userInContext = u;
          },
        },
      },
    );

    await result.current.mutateAsync({ id: "sess-current", isCurrent: true });

    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(userInContext, null);
    assert.ok(eventBusCalls.emitted.includes("auth:session-expired"));
    assert.ok(
      toastCalls.success.includes("Phiên đăng nhập hiện tại đã được thu hồi."),
    );
    assert.equal(onSuccessCalled, true);
  });

  it("handles revokeSession error and triggers onError", async () => {
    const error = new ApiError(404, "NOT_FOUND", "Phiên không tồn tại");
    authService.revokeSession = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useRevokeSession({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync("non-existent");
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Phiên không tồn tại"));
  });
});

describe("useRevokeOtherSessions", () => {
  const originalRevokeOther = authService.revokeOtherSessions;

  beforeEach(() => {
    resetTestEnvironment();
    authService.revokeOtherSessions = originalRevokeOther;
  });

  it("revokes all other sessions and shows success toast", async () => {
    let capturedPayload: { refreshToken?: string } | undefined;
    authService.revokeOtherSessions = async (payload) => {
      capturedPayload = payload;
      return { message: "Đã thu hồi tất cả các phiên đăng nhập khác!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useRevokeOtherSessions({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ refreshToken: "refresh-active" });

    assert.equal(capturedPayload?.refreshToken, "refresh-active");
    assert.ok(
      toastCalls.success.includes(
        "Đã thu hồi tất cả các phiên đăng nhập khác!",
      ),
    );
    assert.equal(onSuccessCalled, true);
  });

  it("handles void input and empty message fallback for revokeOtherSessions", async () => {
    authService.revokeOtherSessions = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useRevokeOtherSessions());
    await result.current.mutateAsync();

    assert.ok(
      toastCalls.success.includes(
        "Đã thu hồi tất cả các phiên đăng nhập khác!",
      ),
    );
  });

  it("handles revokeOtherSessions error and triggers onError", async () => {
    const error = new ApiError(500, "INTERNAL_ERROR", "Lỗi server");
    authService.revokeOtherSessions = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useRevokeOtherSessions({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync();
    });

    assert.equal(onErrorCalled, true);
  });
});
