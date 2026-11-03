import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/axios";
import { useUpdateProfile, useAvatarUpload } from "../use-profile";
import {
  renderAuthHook,
  resetTestEnvironment,
  toastCalls,
  createMockUser,
} from "./test-helpers";
import type {
  AvatarConfirmResponse,
  AvatarUploadUrlResponse,
  MeDto,
  UpdateProfilePayload,
} from "@/types";

describe("useUpdateProfile", () => {
  const originalUpdate = authService.updateProfile;

  beforeEach(() => {
    resetTestEnvironment();
    authService.updateProfile = originalUpdate;
  });

  it("updates user profile, syncs AuthContext and shows toast", async () => {
    authService.updateProfile = async (payload: UpdateProfilePayload) => {
      assert.equal(payload.fullName, "Trần Văn Mới");
      return { message: "Cập nhật hồ sơ thành công!" };
    };

    let userInContext: MeDto | null = createMockUser({
      fullName: "Cũ",
      phoneNumber: "0900000000",
    });
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useUpdateProfile({
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
      fullName: "Trần Văn Mới",
      phoneNumber: "0911223344",
    });

    assert.equal(userInContext?.fullName, "Trần Văn Mới");
    assert.equal(userInContext?.phoneNumber, "0911223344");
    assert.ok(toastCalls.success.includes("Cập nhật hồ sơ thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("falls back to default message when updateProfile message is empty", async () => {
    authService.updateProfile = async () => ({ message: "" });

    const { result } = renderAuthHook(() => useUpdateProfile());
    await result.current.mutateAsync({ fullName: "New" });

    assert.ok(toastCalls.success.includes("Cập nhật hồ sơ thành công!"));
  });

  it("handles update profile error and invokes onError", async () => {
    const error = new ApiError(400, "BAD_REQUEST", "Số điện thoại sai định dạng");
    authService.updateProfile = async () => {
      throw error;
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useUpdateProfile({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    await assert.rejects(async () => {
      await result.current.mutateAsync({ phoneNumber: "invalid" });
    });

    assert.equal(onErrorCalled, true);
    assert.ok(toastCalls.error.includes("Số điện thoại sai định dạng"));
  });
});

describe("useAvatarUpload", () => {
  const originalGetUrl = authService.getAvatarUploadUrl;
  const originalUpload = authService.uploadAvatarToPresignedUrl;
  const originalConfirm = authService.confirmAvatar;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getAvatarUploadUrl = originalGetUrl;
    authService.uploadAvatarToPresignedUrl = originalUpload;
    authService.confirmAvatar = originalConfirm;
  });

  it("completes 3-step avatar upload pipeline with Blob and detected MIME type", async () => {
    const getUrlResponse: AvatarUploadUrlResponse = {
      uploadUrl: "https://r2.ppe.local/upload/signed-avatar-url",
      publicUrl: "https://cdn.ppe.local/avatars/u-123.png",
      key: "avatars/u-123.png",
      expiresIn: 3600,
    };

    const confirmResponse: AvatarConfirmResponse = {
      avatarUrl: "https://cdn.ppe.local/avatars/u-123.png",
    };

    let step1Called = false;
    let step2Called = false;
    let step3Called = false;

    authService.getAvatarUploadUrl = async (payload) => {
      step1Called = true;
      assert.equal(payload.contentType, "image/png");
      return getUrlResponse;
    };

    authService.uploadAvatarToPresignedUrl = async (url, file, contentType) => {
      step2Called = true;
      assert.equal(url, getUrlResponse.uploadUrl);
      assert.equal(contentType, "image/png");
    };

    authService.confirmAvatar = async (payload) => {
      step3Called = true;
      assert.equal(payload.key, getUrlResponse.key);
      return confirmResponse;
    };

    let userInContext: MeDto | null = createMockUser({ avatarUrl: null });
    let onSuccessCalled = false;

    const { result } = renderAuthHook(
      () =>
        useAvatarUpload({
          onSuccess: async (data) => {
            onSuccessCalled = true;
            assert.equal(data.avatarUrl, confirmResponse.avatarUrl);
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

    const fakeBlob = new Blob(["fake png content"], { type: "image/png" });

    const res = await result.current.mutateAsync(fakeBlob as unknown as File);

    assert.equal(step1Called, true);
    assert.equal(step2Called, true);
    assert.equal(step3Called, true);
    assert.equal(res.avatarUrl, confirmResponse.avatarUrl);
    assert.equal(userInContext?.avatarUrl, confirmResponse.avatarUrl);
    assert.ok(toastCalls.success.includes("Cập nhật ảnh đại diện thành công!"));
    assert.equal(onSuccessCalled, true);
  });

  it("handles AvatarUploadInput with explicit contentType", async () => {
    authService.getAvatarUploadUrl = async (payload) => {
      assert.equal(payload.contentType, "image/webp");
      return {
        uploadUrl: "url",
        publicUrl: "public",
        key: "k",
        expiresIn: 3600,
      };
    };
    authService.uploadAvatarToPresignedUrl = async () => {};
    authService.confirmAvatar = async () => ({
      avatarUrl: "https://cdn.ppe.local/webp",
    });

    const fakeBlob = new Blob(["content"]);

    const { result } = renderAuthHook(() => useAvatarUpload());
    await result.current.mutateAsync({
      file: fakeBlob,
      contentType: "image/webp",
    });

    assert.ok(toastCalls.success.includes("Cập nhật ảnh đại diện thành công!"));
  });

  it("falls back to image/jpeg when MIME type is not allowed", async () => {
    let usedContentType = "";
    authService.getAvatarUploadUrl = async (payload) => {
      usedContentType = payload.contentType;
      return {
        uploadUrl: "url",
        publicUrl: "public",
        key: "k",
        expiresIn: 3600,
      };
    };
    authService.uploadAvatarToPresignedUrl = async () => {};
    authService.confirmAvatar = async () => ({
      avatarUrl: "https://cdn.ppe.local/fallback",
    });

    const fakeBlob = new Blob(["content"], { type: "text/plain" });

    const { result } = renderAuthHook(() => useAvatarUpload());
    await result.current.mutateAsync(fakeBlob as unknown as File);

    assert.equal(usedContentType, "image/jpeg");
  });

  it("handles avatar upload error in pipeline and triggers onError", async () => {
    authService.getAvatarUploadUrl = async () => {
      throw new ApiError(500, "UPLOAD_URL_FAILED", "Không thể lấy link tải lên");
    };

    let onErrorCalled = false;
    const { result } = renderAuthHook(() =>
      useAvatarUpload({
        onError: async () => {
          onErrorCalled = true;
        },
      }),
    );

    const fakeBlob = new Blob(["content"]);
    await assert.rejects(async () => {
      await result.current.mutateAsync(fakeBlob as unknown as File);
    });

    assert.equal(onErrorCalled, true);
  });
});
