import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { ApiError } from "@/lib/axios";
import { useRequestDeactivate, useConfirmDeactivate } from "../use-deactivate";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  eventBusCalls,
  createMockUser,
} from "./test-helpers";
import type { MeDto } from "@/types";

describe("useRequestDeactivate", () => {
  const originalRequest = authService.requestDeactivate;

  beforeEach(() => {
    resetTestEnvironment();
    authService.requestDeactivate = originalRequest;
  });

  it("sends deactivate request and shows success toast", async () => {
    let capturedPassword = "";
    authService.requestDeactivate = async (payload) => {
      capturedPassword = payload.password;
      return { message: "Vui lòng xác nhận qua email." };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useRequestDeactivate({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync({
      password: "MyPassword123!",
      reason: "No longer needed",
    });

    assert.equal(capturedPassword, "MyPassword123!");
    assert.ok(toastCalls.success.includes("Vui lòng xác nhận qua email."));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when requestDeactivate returns empty message", async () => {
    authService.requestDeactivate = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useRequestDeactivate());
    await result.current.mutateAsync({ password: "pass" });

    assert.ok(
      toastCalls.success.includes(
        "Yêu cầu vô hiệu hóa tài khoản đã được ghi nhận. Vui lòng kiểm tra email để xác nhận trong vòng 15 phút.",
      ),
    );
  });

  it("handles request deactivate error and triggers onError", async () => {
    const error = new ApiError(401, "INVALID_PASSWORD", "Mật khẩu không đúng");
    authService.requestDeactivate = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useRequestDeactivate({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ password: "wrong" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mật khẩu không đúng"));
  });
});

describe("useConfirmDeactivate", () => {
  const originalConfirm = authService.confirmDeactivate;

  beforeEach(() => {
    resetTestEnvironment();
    authService.confirmDeactivate = originalConfirm;
  });

  it("confirms deactivation, purges client memory state and emits session-expired", async () => {
    tokenStore.setTokens("deactivate-access", "deactivate-refresh");
    authService.confirmDeactivate = async () => ({
      message: "Tài khoản đã vô hiệu hóa.",
    });

    let userInContext: MeDto | null = createMockUser();
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useConfirmDeactivate({
          onSuccess: async () => {
            onSuccessCalled = true;
          },
        }),
      {
        authContext: {
          user: userInContext,
          setUser: (u) => {
            userInContext = u as MeDto | null;
          },
        },
      },
    );

    await result.current.mutateAsync({ token: "deactivate-token-123" });

    assert.equal(tokenStore.getAccessToken(), null);
    assert.equal(userInContext, null);
    assert.ok(eventBusCalls.emitted.includes("auth:session-expired"));
    assert.ok(toastCalls.success.includes("Tài khoản đã vô hiệu hóa."));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when confirmDeactivate message is empty", async () => {
    authService.confirmDeactivate = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useConfirmDeactivate());
    await result.current.mutateAsync({ token: "t" });

    assert.ok(
      toastCalls.success.includes(
        "Tài khoản của bạn đã được vô hiệu hóa thành công.",
      ),
    );
  });

  it("handles confirm deactivate error and triggers onError", async () => {
    const error = new ApiError(400, "INVALID_TOKEN", "Mã xác nhận hết hạn");
    authService.confirmDeactivate = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useConfirmDeactivate({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ token: "expired" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Mã xác nhận hết hạn"));
  });
});
