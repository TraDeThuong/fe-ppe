import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/axios";
import { ErrorCode } from "@/types";
import {
  useSocialAccounts,
  useGoogleUrl,
  useLinkSocial,
  useUnlinkSocial,
} from "../use-social";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
} from "./test-helpers";
import type { SocialAccount, GoogleUrlResponse, LinkSocialResponse } from "@/types";

describe("useSocialAccounts", () => {
  const originalGetSocial = authService.getSocialAccounts;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getSocialAccounts = originalGetSocial;
  });

  it("fetches linked social accounts", async () => {
    const mockAccounts: SocialAccount[] = [
      {
        id: "soc-1",
        provider: "GOOGLE",
        providerUserId: "google-12345",
        email: "googleuser@gmail.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    authService.getSocialAccounts = async () => mockAccounts;

    const { result } = renderAuthHook(() =>
      useSocialAccounts({ enabled: false }),
    );

    const res = await result.current.refetch();
    assert.equal(res.data?.length, 1);
    assert.equal(res.data?.[0].provider, "GOOGLE");
    assert.equal(res.data?.[0].email, "googleuser@gmail.com");
  });
});

describe("useGoogleUrl", () => {
  const originalGetGoogleUrl = authService.getGoogleUrl;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getGoogleUrl = originalGetGoogleUrl;
  });

  it("has enabled = false by default and fetches url upon refetch", async () => {
    const mockResponse: GoogleUrlResponse = {
      url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=123",
    };

    authService.getGoogleUrl = async (params) => {
      assert.equal(params?.redirectUri, "http://localhost:3000/callback");
      return mockResponse;
    };

    const { result } = renderAuthHook(() =>
      useGoogleUrl({ redirectUri: "http://localhost:3000/callback" }),
    );

    assert.equal(result.current.fetchStatus, "idle");

    const res = await result.current.refetch();
    assert.equal(res.data?.url, mockResponse.url);
  });
});

describe("useLinkSocial", () => {
  const originalLink = authService.linkSocial;

  beforeEach(() => {
    resetTestEnvironment();
    authService.linkSocial = originalLink;
  });

  it("links social account and invalidates social queries", async () => {
    const mockResponse: LinkSocialResponse = {
      provider: "GOOGLE",
      email: "linked@gmail.com",
    };

    authService.linkSocial = async (payload) => {
      assert.equal(payload.provider, "GOOGLE");
      return mockResponse;
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useLinkSocial({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    const res = await result.current.mutateAsync({
      provider: "GOOGLE",
      idToken: "sample-token",
    });

    assert.deepEqual(res, mockResponse);
    assert.ok(
      toastCalls.success.includes("Liên kết tài khoản mạng xã hội thành công!"),
    );
    assert.equal(onSuccessCalled, true);
  });

  it("handles 409 DUPLICATE_ENTRY error with specific message", async () => {
    const duplicateError = new ApiError(
      409,
      ErrorCode.DUPLICATE_ENTRY,
      "Tài khoản đã tồn tại",
    );
    authService.linkSocial = async () => {
      throw duplicateError;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useLinkSocial({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ provider: "GOOGLE", idToken: "token" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(
      toastCalls.error.includes(
        "Tài khoản này đã được liên kết với một người dùng khác.",
      ),
    );
  });

  it("suppresses 409 error toast when suppressToast is true", async () => {
    const duplicateError = new ApiError(409, ErrorCode.DUPLICATE_ENTRY, "Duplicate");
    authService.linkSocial = async () => {
      throw duplicateError;
    };

    const { result } = renderAuthHook(() =>
      useLinkSocial({ suppressToast: true }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ provider: "GOOGLE", idToken: "token" });
    });

    assert.equal(toastCalls.error.length, 0);
  });

  it("handles general error with handleMutationError", async () => {
    const error = new ApiError(400, "BAD_REQUEST", "Token Google không hợp lệ");
    authService.linkSocial = async () => {
      throw error;
    };

    const { result } = renderAuthHook(() => useLinkSocial());

    await assert.rejects(async () => {
      await result.current.mutateAsync({ provider: "GOOGLE", idToken: "bad" });
    });

    assert.ok(toastCalls.error.includes("Token Google không hợp lệ"));
  });
});

describe("useUnlinkSocial", () => {
  const originalUnlink = authService.unlinkSocial;

  beforeEach(() => {
    resetTestEnvironment();
    authService.unlinkSocial = originalUnlink;
  });

  it("unlinks social account and invalidates cache", async () => {
    authService.unlinkSocial = async (provider) => {
      assert.equal(provider, "GOOGLE");
      return { message: "Hủy liên kết thành công!" };
    };

    let onSuccessCalled = false;
    const { result } = renderAuthHook(() =>
      useUnlinkSocial({
        onSuccess: async () => {
          onSuccessCalled = true;
        },
      }),
    );

    await result.current.mutateAsync("GOOGLE");

    assert.ok(toastCalls.success.includes("Hủy liên kết thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when unlink returns empty message", async () => {
    authService.unlinkSocial = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useUnlinkSocial());
    await result.current.mutateAsync("GOOGLE");

    assert.ok(toastCalls.success.includes("Hủy liên kết tài khoản thành công!"));
  });

  it("handles unlink anti-lockout error (400) properly", async () => {
    const error = new ApiError(
      400,
      "ANTI_LOCKOUT",
      "Không thể hủy phương thức đăng nhập duy nhất",
    );
    authService.unlinkSocial = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useUnlinkSocial({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync("GOOGLE");
    });

    assert.equal(onErrorCalled, true);
    assert.ok(
      toastCalls.error.includes("Không thể hủy phương thức đăng nhập duy nhất"),
    );
  });
});
