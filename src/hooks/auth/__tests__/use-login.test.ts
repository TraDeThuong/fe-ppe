import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { ApiError } from "@/lib/axios";
import { ErrorCode } from "@/types";
import { useLogin, useGoogleLogin, useLogout } from "../use-login";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  eventBusCalls,
  createMockUser,
  mockSessionStorage,
} from "./test-helpers";
import type {
  LoginPayload,
  LoginSuccessResponse,
  Login2FARequiredResponse,
  LogoutPayload,
  MeDto,
} from "@/types";

describe("useLogin", () => {
  const originalLogin = authService.login;
  const originalGetMe = authService.getMe;

  beforeEach(() => {
    resetTestEnvironment();
    authService.login = originalLogin;
    authService.getMe = originalGetMe;
  });

  it("handles standard login flow (2FA disabled) successfully", async () => {
    const successData: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "access-token-123",
      refreshToken: "refresh-token-123",
      user: {
        id: "u-1",
        email: "test@example.com",
        fullName: "Test User",
        role: "ADMIN",
        roleId: "r-1",
        permissions: ["AUTH_READ"],
      },
    };

    const meData = createMockUser({ email: "test@example.com" });

    authService.login = async (payload: LoginPayload) => {
      assert.equal(payload.email, "test@example.com");
      return successData;
    };
    authService.getMe = async () => meData;

    const contextState: { user: MeDto | null } = { user: null };
    let customSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useLogin({
          onSuccess: async (data) => {
            customSuccessCalled = true;
            assert.equal(data.requires2FA, false);
          },
        }),
      {
        authContext: {
          setUser: (u) => {
            contextState.user = u;
          },
        },
      },
    );

    await result.current.mutateAsync({
      email: "test@example.com",
      password: "password123",
      rememberMe: true,
    });

    // Check tokenStore
    assert.equal(tokenStore.getAccessToken(), "access-token-123");
    assert.equal(tokenStore.getRefreshToken(), "refresh-token-123");

    // Check AuthContext user set
    assert.equal(contextState.user?.email, "test@example.com");

    // Check toast
    assert.ok(toastCalls.success.includes("Đăng nhập thành công!"));

    // Check custom onSuccess callback
    assert.equal(customSuccessCalled, true);
  });

  it("falls back to data.user when getMe fails during standard login", async () => {
    const successData: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "access-token-456",
      refreshToken: "refresh-token-456",
      user: {
        id: "u-fallback",
        email: "fallback@example.com",
        fullName: "Fallback User",
        role: "USER",
        roleId: "r-user",
        permissions: [],
      },
    };

    authService.login = async () => successData;
    authService.getMe = async () => {
      throw new Error("getMe failed");
    };

    const contextState: { user: MeDto | null } = { user: null };

    const { result } = renderAuthHook(() => useLogin(), {
      authContext: {
        setUser: (u) => {
          contextState.user = u;
        },
      },
    });

    await result.current.mutateAsync({
      email: "fallback@example.com",
      password: "pass",
    });

    assert.equal(contextState.user?.email, "fallback@example.com");
    assert.equal(contextState.user?.fullName, "Fallback User");
    assert.equal(contextState.user?.isActive, true);
    assert.equal(contextState.user?.twoFactorEnabled, false);
  });

  it("handles 2FA required login flow", async () => {
    const twoFAData: Login2FARequiredResponse = {
      requires2FA: true,
      tempToken: "temp-2fa-token-abc",
    };

    authService.login = async () => twoFAData;

    let customSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useLogin({
        onSuccess: async (data) => {
          customSuccessCalled = true;
          assert.equal(data.requires2FA, true);
        },
      }),
    );

    await result.current.mutateAsync({
      email: "pending2fa@example.com",
      password: "pass",
      rememberMe: true,
    });

    // 2FA flow: tokens NOT set yet
    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(tokenStore.getRefreshToken(), null);

    // Stored in sessionStorage
    assert.equal(mockSessionStorage.getItem("ppe_pending_remember_me"), "true");
    assert.equal(
      mockSessionStorage.getItem("ppe_pending_email"),
      "pending2fa@example.com",
    );

    assert.equal(customSuccessCalled, true);
  });

  it("handles login error and triggers onError callback with toast", async () => {
    const apiError = new ApiError(
      401,
      ErrorCode.INVALID_CREDENTIALS,
      "Sai tài khoản hoặc mật khẩu",
    );

    authService.login = async () => {
      throw apiError;
    };

    let customErrorCalled = false;

    const { result } = renderAuthHook(() =>
      useLogin({
        onError: async (err) => {
          customErrorCalled = true;
          assert.equal(err, apiError);
        },
      }),
    );

    await assert.rejects(
      async () => {
        await result.current.mutateAsync({
          email: "wrong@example.com",
          password: "wrong",
        });
      },
      (err) => err === apiError,
    );

    assert.equal(customErrorCalled, true);
    assert.ok(toastCalls.error.includes("Sai tài khoản hoặc mật khẩu"));
  });

  it("suppresses toast on error when suppressToast: true is set", async () => {
    const apiError = new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "Lỗi ẩn");
    authService.login = async () => {
      throw apiError;
    };

    const { result } = renderAuthHook(() =>
      useLogin({
        suppressToast: true,
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ email: "a@b.com", password: "p" });
    });

    assert.equal(toastCalls.error.length, 0);
  });
});

describe("useGoogleLogin", () => {
  const originalGoogleLogin = authService.googleLogin;
  const originalGetMe = authService.getMe;

  beforeEach(() => {
    resetTestEnvironment();
    authService.googleLogin = originalGoogleLogin;
    authService.getMe = originalGetMe;
  });

  it("handles google login success (2FA disabled)", async () => {
    mockSessionStorage.setItem("ppe_pending_remember_me", "true");

    const successData: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "google-access-123",
      refreshToken: "google-refresh-123",
      user: {
        id: "u-google",
        email: "google@example.com",
        fullName: "Google User",
        role: "USER",
        roleId: "r-user",
        permissions: [],
      },
    };

    authService.googleLogin = async () => successData;
    authService.getMe = async () => createMockUser({ email: "google@example.com" });

    const contextState: { user: MeDto | null } = { user: null };
    const { result } = renderAuthHook(() => useGoogleLogin(), {
      authContext: {
        setUser: (u) => {
          contextState.user = u;
        },
      },
    });

    await result.current.mutateAsync({ code: "google-auth-code", redirectUri: "http://localhost:3000" });

    assert.equal(tokenStore.getAccessToken(), "google-access-123");
    assert.equal(tokenStore.getRefreshToken(), "google-refresh-123");
    assert.equal(contextState.user?.email, "google@example.com");
    assert.equal(mockSessionStorage.getItem("ppe_pending_remember_me"), null);
    assert.ok(toastCalls.success.includes("Đăng nhập Google thành công!"));
  });

  it("falls back to data.user when getMe fails during google login", async () => {
    const successData: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "google-access-fallback",
      refreshToken: "google-refresh-fallback",
      user: {
        id: "u-google-fallback",
        email: "google-fallback@example.com",
        fullName: "Fallback Google User",
        role: "USER",
        roleId: "r-user",
        permissions: [],
      },
    };

    authService.googleLogin = async () => successData;
    authService.getMe = async () => {
      throw new Error("getMe failed");
    };

    const fallbackState: { user: MeDto | null } = { user: null };
    const { result } = renderAuthHook(() => useGoogleLogin(), {
      authContext: {
        setUser: (u) => {
          fallbackState.user = u;
        },
      },
    });

    await result.current.mutateAsync({ idToken: "sample-token" });

    assert.equal(fallbackState.user?.email, "google-fallback@example.com");
    assert.equal(fallbackState.user?.fullName, "Fallback Google User");
  });

  it("handles google login with 2FA required", async () => {
    const twoFAData: Login2FARequiredResponse = {
      requires2FA: true,
      tempToken: "google-2fa-token",
    };

    authService.googleLogin = async () => twoFAData;

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useGoogleLogin({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ idToken: "sample-id-token" });

    assert.equal(onSuccessCalled, true);
    assert.equal(tokenStore.getAccessToken(), null);
  });

  it("handles google login error and invokes onError", async () => {
    const error = new ApiError(400, "BAD_REQUEST", "Google Auth Error");
    authService.googleLogin = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useGoogleLogin({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ idToken: "invalid" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Google Auth Error"));
  });
});

describe("useLogout", () => {
  const originalLogout = authService.logout;

  beforeEach(() => {
    resetTestEnvironment();
    authService.logout = originalLogout;
  });

  it("cleans up client state and calls authService.logout with implicit token from tokenStore", async () => {
    tokenStore.setTokens("current-access", "current-refresh");

    authService.logout = async (payload?: LogoutPayload) => {
      assert.equal(payload?.refreshToken, "current-refresh");
      return { message: "Đăng xuất thành công!" };
    };

    let userInContext: MeDto | null = createMockUser();
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useLogout({
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

    await result.current.mutateAsync();

    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(tokenStore.getRefreshToken(), null);
    assert.equal(userInContext, null);
    assert.ok(eventBusCalls.emitted.includes("auth:session-expired"));
    assert.ok(toastCalls.success.includes("Đăng xuất thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("accepts explicit refreshToken in logout payload", async () => {
    let capturedRefreshToken: string | undefined;
    authService.logout = async (payload?: LogoutPayload) => {
      capturedRefreshToken = payload?.refreshToken;
      return { message: "" };
    };

    const { result } = renderAuthHook(() => useLogout());

    await result.current.mutateAsync({ refreshToken: "explicit-token-xyz" });

    assert.equal(capturedRefreshToken, "explicit-token-xyz");
    assert.ok(toastCalls.success.includes("Đăng xuất thành công!"));
  });

  it("cleans up client state even when authService.logout fails with error", async () => {
    tokenStore.setTokens("expired-access", "expired-refresh");

    const error = new ApiError(401, ErrorCode.UNAUTHORIZED, "Phiên đã hết hạn");
    authService.logout = async () => {
      throw error;
    };

    let userInContext: MeDto | null = createMockUser();
    let onErrorCalled = false;

    const { result } = renderAuthHook(
      () =>
        useLogout({
          onError: async () => {
            onErrorCalled = true;
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

    await assert.rejects(async () => {
      await result.current.mutateAsync();
    });

    // Despite backend error, memory must be purged
    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(userInContext, null);
    assert.ok(eventBusCalls.emitted.includes("auth:session-expired"));
    assert.equal(onErrorCalled, true);
  });
});
