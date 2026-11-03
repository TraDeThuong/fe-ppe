import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { ApiError } from "@/lib/axios";
import {
  useSetup2FA,
  useEnable2FA,
  useVerify2FA,
  useDisable2FA,
  useRegenerateBackupCodes,
} from "../use-2fa";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  createMockUser,
  mockSessionStorage,
} from "./test-helpers";
import type {
  Enable2FAResponse,
  LoginSuccessResponse,
  MeDto,
  TwoFactorSetupResponse,
} from "@/types";

describe("useSetup2FA", () => {
  const originalSetup = authService.setup2FA;

  beforeEach(() => {
    resetTestEnvironment();
    authService.setup2FA = originalSetup;
  });

  it("calls authService.setup2FA and returns secret and otpauthUrl", async () => {
    const mockSetupResponse: TwoFactorSetupResponse = {
      secret: "JBSWY3DPEHPK3PXP",
      otpauthUrl: "otpauth://totp/PPE:test@example.com?secret=JBSWY3DPEHPK3PXP",
    };

    authService.setup2FA = async () => mockSetupResponse;

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useSetup2FA({
        onSuccess: async (data) => {
          onSuccessCalled = true;
          assert.equal(data.secret, "JBSWY3DPEHPK3PXP");
        },
      }),
    );

    const res = await result.current.mutateAsync();
    assert.deepEqual(res, mockSetupResponse);
    assert.equal(onSuccessCalled, true);
  });

  it("handles setup2FA error and triggers onError", async () => {
    const error = new ApiError(400, "BAD_REQUEST", "2FA setup failed");
    authService.setup2FA = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useSetup2FA({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync();
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("2FA setup failed"));
  });
});

describe("useEnable2FA", () => {
  const originalEnable = authService.enable2FA;

  beforeEach(() => {
    resetTestEnvironment();
    authService.enable2FA = originalEnable;
  });

  it("enables 2FA, updates user context, invalidates me query and shows toast", async () => {
    const mockResponse: Enable2FAResponse = {
      backupCodes: [
        "11112222",
        "33334444",
        "55556666",
        "77778888",
        "99990000",
        "12345678",
        "87654321",
        "98765432",
      ],
    };

    authService.enable2FA = async () => mockResponse;

    let userInContext: MeDto | null = createMockUser({ twoFactorEnabled: false });
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useEnable2FA({
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

    const res = await result.current.mutateAsync({ code: "123456" });

    assert.equal(res.backupCodes.length, 8);
    assert.equal(userInContext?.twoFactorEnabled, true);
    assert.ok(
      toastCalls.success.includes("Bật xác thực hai yếu tố (2FA) thành công!"),
    );
    assert.equal(onSuccessCalled, true);
  });

  it("handles enable2FA error and invokes onError", async () => {
    const error = new ApiError(400, "INVALID_CODE", "Mã xác thực không hợp lệ");
    authService.enable2FA = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useEnable2FA({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ code: "000000" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã xác thực không hợp lệ"));
  });
});

describe("useVerify2FA", () => {
  const originalVerify = authService.verify2FA;
  const originalGetMe = authService.getMe;

  beforeEach(() => {
    resetTestEnvironment();
    authService.verify2FA = originalVerify;
    authService.getMe = originalGetMe;
  });

  it("verifies 2FA code, persists session, stores tokens and fetches me", async () => {
    mockSessionStorage.setItem("ppe_pending_remember_me", "true");
    mockSessionStorage.setItem("ppe_pending_email", "remember@example.com");

    const mockResponse: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "verified-access-token",
      refreshToken: "verified-refresh-token",
      user: {
        id: "u-verified",
        email: "remember@example.com",
        fullName: "Verified User",
        role: "ADMIN",
        roleId: "r-admin",
        permissions: [],
      },
    };

    authService.verify2FA = async (payload) => {
      assert.equal(payload.tempToken, "temp-token-xyz");
      assert.equal(payload.code, "123456");
      return mockResponse;
    };

    authService.getMe = async () =>
      createMockUser({
        email: "remember@example.com",
        twoFactorEnabled: true,
      });

    const contextState: { user: MeDto | null } = { user: null };
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useVerify2FA({
          onSuccess: async () => {
            onSuccessCalled = true;
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
      tempToken: "temp-token-xyz",
      code: "123456",
    });

    // Check tokenStore
    assert.equal(tokenStore.getAccessToken(), "verified-access-token");
    assert.equal(tokenStore.getRefreshToken(), "verified-refresh-token");

    // Check sessionStorage cleared
    assert.equal(mockSessionStorage.getItem("ppe_pending_remember_me"), null);
    assert.equal(mockSessionStorage.getItem("ppe_pending_email"), null);

    // Check AuthContext user set
    assert.equal(contextState.user?.email, "remember@example.com");
    assert.equal(contextState.user?.twoFactorEnabled, true);

    // Check toast
    assert.ok(toastCalls.success.includes("Xác thực hai yếu tố thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to data.user when getMe throws during 2FA verification", async () => {
    const mockResponse: LoginSuccessResponse = {
      requires2FA: false,
      accessToken: "verified-access",
      refreshToken: "verified-refresh",
      user: {
        id: "u-verified-2",
        email: "fallback2fa@example.com",
        fullName: "Verified Fallback",
        role: "USER",
        roleId: "r-user",
        permissions: [],
      },
    };

    authService.verify2FA = async () => mockResponse;
    authService.getMe = async () => {
      throw new Error("getMe failed");
    };

    const contextState: { user: MeDto | null } = { user: null };

    const { result } = renderAuthHook(() => useVerify2FA(), {
      authContext: {
        setUser: (u) => {
          contextState.user = u;
        },
      },
    });

    await result.current.mutateAsync({
      tempToken: "temp-token",
      code: "123456",
    });

    assert.equal(contextState.user?.email, "fallback2fa@example.com");
    assert.equal(contextState.user?.twoFactorEnabled, true);
  });

  it("handles verify 2FA error and triggers onError", async () => {
    const error = new ApiError(400, "INVALID_OTP", "Mã OTP không đúng");
    authService.verify2FA = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useVerify2FA({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ tempToken: "t", code: "000000" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã OTP không đúng"));
  });
});

describe("useDisable2FA", () => {
  const originalDisable = authService.disable2FA;

  beforeEach(() => {
    resetTestEnvironment();
    authService.disable2FA = originalDisable;
  });

  it("disables 2FA, updates user context to false and shows success toast", async () => {
    authService.disable2FA = async () => ({
      message: "Đã tắt 2FA thành công!",
    });

    let userInContext: MeDto | null = createMockUser({ twoFactorEnabled: true });
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useDisable2FA({
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

    await result.current.mutateAsync({ code: "123456", password: "pass" });

    assert.equal(userInContext?.twoFactorEnabled, false);
    assert.ok(toastCalls.success.includes("Đã tắt 2FA thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when disable2FA returns empty message", async () => {
    authService.disable2FA = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useDisable2FA());
    await result.current.mutateAsync({ code: "123456" });

    assert.ok(
      toastCalls.success.includes("Đã tắt xác thực hai yếu tố thành công!"),
    );
  });

  it("handles disable2FA error and invokes onError", async () => {
    const error = new ApiError(400, "INVALID_CODE", "Mã không đúng");
    authService.disable2FA = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useDisable2FA({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ code: "wrong" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã không đúng"));
  });
});

describe("useRegenerateBackupCodes", () => {
  const originalRegenerate = authService.regenerateBackupCodes;

  beforeEach(() => {
    resetTestEnvironment();
    authService.regenerateBackupCodes = originalRegenerate;
  });

  it("regenerates backup codes and shows success toast", async () => {
    const mockResponse: Enable2FAResponse = {
      backupCodes: ["code1", "code2", "code3", "code4", "code5", "code6", "code7", "code8"],
    };

    authService.regenerateBackupCodes = async () => mockResponse;

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useRegenerateBackupCodes({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    const res = await result.current.mutateAsync({ code: "123456" });

    assert.equal(res.backupCodes.length, 8);
    assert.ok(toastCalls.success.includes("Tạo lại mã dự phòng mới thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("handles regenerate backup codes error and triggers onError", async () => {
    const error = new ApiError(400, "INVALID_CODE", "Mã OTP không hợp lệ");
    authService.regenerateBackupCodes = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useRegenerateBackupCodes({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ code: "wrong" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã OTP không hợp lệ"));
  });
});
