import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/axios";
import { ErrorCode } from "@/types";
import { useRegister, useVerifyEmail, useResendVerification } from "../use-register";
import { renderAuthHook, resetTestEnvironment, toastCalls } from "./test-helpers";
import type { RegisterPayload, ResendVerificationPayload, VerifyEmailPayload } from "@/types";

describe("useRegister", () => {
  const originalRegister = authService.register;

  beforeEach(() => {
    resetTestEnvironment();
    authService.register = originalRegister;
  });

  it("calls authService.register and shows success toast", async () => {
    let capturedPayload: RegisterPayload | null = null;
    authService.register = async (payload) => {
      capturedPayload = payload;
      return { message: "Đăng ký thành công!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useRegister({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    const payload: RegisterPayload = {
      email: "newuser@example.com",
      password: "StrongPassword123!",
      fullName: "New User",
    };

    await result.current.mutateAsync(payload);

    assert.deepEqual(capturedPayload, payload);
    assert.ok(toastCalls.success.includes("Đăng ký thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("handles fallback success message when backend message is empty", async () => {
    authService.register = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useRegister());
    await result.current.mutateAsync({
      email: "empty@example.com",
      password: "pass",
      fullName: "Empty",
    });

    assert.ok(
      toastCalls.success.includes(
        "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
      ),
    );
  });

  it("handles registration error with toast and invokes onError", async () => {
    const error = new ApiError(409, ErrorCode.DUPLICATE_ENTRY, "Email đã tồn tại");
    authService.register = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useRegister({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({
        email: "exists@example.com",
        password: "pass",
        fullName: "Exists",
      });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Email đã tồn tại"));
  });
});

describe("useVerifyEmail", () => {
  const originalVerifyEmail = authService.verifyEmail;

  beforeEach(() => {
    resetTestEnvironment();
    authService.verifyEmail = originalVerifyEmail;
  });

  it("calls authService.verifyEmail and shows success toast", async () => {
    const captured: { payload: VerifyEmailPayload | null } = { payload: null };
    authService.verifyEmail = async (payload) => {
      captured.payload = payload;
      return { message: "Xác thực email thành công!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useVerifyEmail({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ token: "verify-token-123" });

    assert.equal(captured.payload?.token, "verify-token-123");
    assert.ok(toastCalls.success.includes("Xác thực email thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("handles empty message fallback for email verification", async () => {
    authService.verifyEmail = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useVerifyEmail());
    await result.current.mutateAsync({ token: "token" });

    assert.ok(
      toastCalls.success.includes(
        "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.",
      ),
    );
  });

  it("handles verify email error and invokes onError", async () => {
    const error = new ApiError(400, "INVALID_TOKEN", "Mã xác thực đã hết hạn");
    authService.verifyEmail = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useVerifyEmail({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ token: "expired" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã xác thực đã hết hạn"));
  });
});

describe("useResendVerification", () => {
  const originalResend = authService.resendVerification;

  beforeEach(() => {
    resetTestEnvironment();
    authService.resendVerification = originalResend;
  });

  it("calls authService.resendVerification and shows success toast", async () => {
    const captured: { payload: ResendVerificationPayload | null } = { payload: null };
    authService.resendVerification = async (payload) => {
      captured.payload = payload;
      return { message: "Đã gửi lại email!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useResendVerification({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({ email: "resend@example.com" });

    assert.equal(captured.payload?.email, "resend@example.com");
    assert.ok(toastCalls.success.includes("Đã gửi lại email!"));
    assert.equal(onSuccessCalled, true);
  });

  it("handles empty message fallback for resend verification", async () => {
    authService.resendVerification = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useResendVerification());
    await result.current.mutateAsync({ email: "resend2@example.com" });

    assert.ok(
      toastCalls.success.includes(
        "Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.",
      ),
    );
  });

  it("handles resend verification error and invokes onError", async () => {
    const error = new ApiError(429, ErrorCode.RATE_LIMIT_EXCEEDED, "Quá nhiều yêu cầu");
    authService.resendVerification = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useResendVerification({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ email: "ratelimit@example.com" });
    });

    assert.equal(onErrorCalled, true);
  });
});
