"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth.service";
import type {
  AvatarConfirmResponse,
  AvatarUploadUrlPayload,
  UpdateProfilePayload,
} from "@/types";
import { authKeys } from "./auth.query-keys";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook cập nhật thông tin hồ sơ người dùng (PUT /auth/profile).
 *
 * ĐẶC ĐIỂM:
 * - Cập nhật fullName, avatarUrl, phoneNumber.
 * - Invalidate cache me và đồng bộ tức thì vào AuthContext.
 */
export function useUpdateProfile(
  options?: MutationHookOptions<{ message: string }, UpdateProfilePayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: UpdateProfilePayload) => authService.updateProfile(payload),
    onSuccess: async (...args) => {
      const [data, variables] = args;
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      if (auth?.user) {
        auth.setUser({
          ...auth.user,
          fullName: variables.fullName !== undefined ? variables.fullName : auth.user.fullName,
          avatarUrl: variables.avatarUrl !== undefined ? variables.avatarUrl : auth.user.avatarUrl,
          phoneNumber:
            variables.phoneNumber !== undefined ? variables.phoneNumber : auth.user.phoneNumber,
        });
      }

      toast.success(data.message || "Cập nhật hồ sơ thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface AvatarUploadInput {
  file: File | Blob;
  contentType?: AvatarUploadUrlPayload["contentType"];
}

const ALLOWED_MIME_TYPES: readonly AvatarUploadUrlPayload["contentType"][] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function resolveContentType(
  file: File | Blob,
  explicitType?: AvatarUploadUrlPayload["contentType"],
): AvatarUploadUrlPayload["contentType"] {
  if (explicitType && ALLOWED_MIME_TYPES.includes(explicitType)) {
    return explicitType;
  }
  const fileType = file.type as AvatarUploadUrlPayload["contentType"];
  if (ALLOWED_MIME_TYPES.includes(fileType)) {
    return fileType;
  }
  return "image/jpeg";
}

/**
 * Hook tải lên và cập nhật ảnh đại diện (Quy trình 3 bước khép kín trong 1 mutation):
 * 1. POST /auth/avatar/upload-url: Xin presigned URL và storage key từ Cloudflare R2.
 * 2. PUT [uploadUrl]: Upload trực tiếp binary ảnh lên Cloudflare R2 (dùng axios thuần, không auth header).
 * 3. POST /auth/avatar/confirm: Báo cho backend xác nhận lưu avatarUrl mới vào DB.
 *
 * ĐẶC ĐIỂM:
 * - Tự động nhận diện định dạng ảnh JPEG, PNG, WEBP, GIF.
 * - Invalidate cache "me" và cập nhật `avatarUrl` trong AuthContext ngay lập tức.
 */
export function useAvatarUpload(
  options?: MutationHookOptions<AvatarConfirmResponse, File | AvatarUploadInput>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async (variables) => {
      const file = variables instanceof Blob ? variables : variables.file;
      const explicitType = variables instanceof Blob ? undefined : variables.contentType;
      const contentType = resolveContentType(file, explicitType);

      // Bước 1: Xin presigned URL
      const { uploadUrl, key } = await authService.getAvatarUploadUrl({ contentType });

      // Bước 2: Upload trực tiếp file lên presigned URL (Cloudflare R2)
      await authService.uploadAvatarToPresignedUrl(uploadUrl, file, contentType);

      // Bước 3: Xác nhận với backend
      return authService.confirmAvatar({ key });
    },
    onSuccess: async (...args) => {
      const [data] = args;
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      if (auth?.user) {
        auth.setUser({
          ...auth.user,
          avatarUrl: data.avatarUrl,
        });
      }

      toast.success("Cập nhật ảnh đại diện thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
