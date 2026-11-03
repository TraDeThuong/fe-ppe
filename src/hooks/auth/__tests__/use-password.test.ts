import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { ApiError } from "@/lib/axios";
import { useForgotPassword, useResetPassword, useChangePassword } from "../use-password";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  eventBusCalls,
  createMockUser,
} from "./test-helpers";
import type { MeDto } from "@/types";

describe("useForgotPassword", () => {
  const originalForgot = authService.forgotPassword;

  beforeEach(() => {
    resetTestEnvironment();
    authService.forgotPassword = originalForgot;
  });

  it("calls authService.forgotPassword and shows anti-enumeration toast", async () => {
    let capturedEmail = "";
    authService.forgotPassword = async (payload) => {
      capturedEmail = payload.email;
      return { message: "Đã gửi email khôi phục." };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useForgotPassword({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ email: "forgot@example.com" });

    assert.equal(capturedEmail, "forgot@example.com");
    assert.ok(toastCalls.success.includes("Đã gửi email khôi phục."));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to anti-enumeration message when backend returns empty string", async () => {
    authService.forgotPassword = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useForgotPassword());
    await result.current.mutateAsync({ email: "forgot2@example.com" });

    assert.ok(
      toastCalls.success.includes(
        "Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
      ),
    );
  });

  it("handles forgot password error and invokes onError", async () => {
    const error = new ApiError(400, "BAD_REQUEST", "Yêu cầu không hợp lệ");
    authService.forgotPassword = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useForgotPassword({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ email: "invalid" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Yêu cầu không hợp lệ"));
  });
});

describe("useResetPassword", () => {
  const originalReset = authService.resetPassword;

  beforeEach(() => {
    resetTestEnvironment();
    authService.resetPassword = originalReset;
  });

  it("clears memory and resets auth user upon password reset success", async () => {
    tokenStore.setTokens("old-access", "old-refresh");
    authService.resetPassword = async () => ({
      message: "Đặt lại mật khẩu thành công!",
    });

    let userInContext: MeDto | null = createMockUser();
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useResetPassword({
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

    await result.current.mutateAsync({
      token: "reset-token-xyz",
      newPassword: "NewSecurePassword123!",
    });

    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(tokenStore.getRefreshToken(), null);
    assert.equal(userInContext, null);
    assert.ok(toastCalls.success.includes("Đặt lại mật khẩu thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when resetPassword returns empty message", async () => {
    authService.resetPassword = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useResetPassword());
    await result.current.mutateAsync({ token: "t", newPassword: "p" });

    assert.ok(
      toastCalls.success.includes(
        "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
      ),
    );
  });

  it("handles reset password error and triggers onError", async () => {
    const error = new ApiError(400, "EXPIRED_TOKEN", "Token đặt lại mật khẩu đã hết hạn");
    authService.resetPassword = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useResetPassword({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ token: "expired", newPassword: "p" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Token đặt lại mật khẩu đã hết hạn"));
  });
});

describe("useChangePassword", () => {
  const originalChange = authService.changePassword;

  beforeEach(() => {
    resetTestEnvironment();
    authService.changePassword = originalChange;
  });

  it("clears memory and emits session-expired on change password success", async () => {
    tokenStore.setTokens("active-access", "active-refresh");
    authService.changePassword = async () => ({
      message: "Đổi mật khẩu thành công!",
    });

    let userInContext: MeDto | null = createMockUser();
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useChangePassword({
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

    await result.current.mutateAsync({
      oldPassword: "OldPassword123!",
      newPassword: "NewPassword123!",
    });

    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(userInContext, null);
    assert.ok(eventBusCalls.emitted.includes("auth:session-expired"));
    assert.ok(toastCalls.success.includes("Đổi mật khẩu thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when changePassword returns empty message", async () => {
    authService.changePassword = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useChangePassword());
    await result.current.mutateAsync({
      oldPassword: "old",
      newPassword: "new",
    });

    assert.ok(
      toastCalls.success.includes(
        "Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.",
      ),
    );
  });

  it("handles change password error and triggers onError", async () => {
    const error = new ApiError(400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng");
    authService.changePassword = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useChangePassword({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({
        oldPassword: "wrong",
        newPassword: "new",
      });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mật khẩu hiện tại không đúng"));
  });
});
