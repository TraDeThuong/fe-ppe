"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { ApiError } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth.service";
import {
  ErrorCode,
  type GoogleAuthUrlParams,
  type GoogleUrlResponse,
  type LinkSocialPayload,
  type LinkSocialResponse,
  type SocialAccount,
} from "@/types";
import { authKeys } from "./auth.query-keys";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

export interface UseSocialAccountsOptions
  extends Omit<
    UseQueryOptions<SocialAccount[], ApiError, SocialAccount[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách tài khoản mạng xã hội đang liên kết (GET /auth/social).
 *
 * ĐẶC ĐIỂM:
 * - staleTime: 60 giây.
 * - Dùng cho trang Cài đặt bảo mật (Settings > Security > Social).
 */
export function useSocialAccounts(options?: UseSocialAccountsOptions) {
  return useQuery({
    queryKey: authKeys.social(),
    queryFn: () => authService.getSocialAccounts(),
    staleTime: 60 * 1000,
    ...options,
  });
}

export interface UseGoogleUrlOptions
  extends Omit<
    UseQueryOptions<GoogleUrlResponse, ApiError, GoogleUrlResponse, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy URL đăng nhập Google OAuth2 (GET /auth/google/url).
 *
 * ĐẶC ĐIỂM:
 * - Mặc định `enabled: false` để gọi theo nhu cầu hoặc gọi qua refetch khi click nút.
 */
export function useGoogleUrl(
  params?: GoogleAuthUrlParams,
  options?: UseGoogleUrlOptions,
) {
  return useQuery({
    queryKey: authKeys.googleUrl(params),
    queryFn: () => authService.getGoogleUrl(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? false,
    ...options,
  });
}

/**
 * Hook liên kết thêm tài khoản mạng xã hội (POST /auth/social/link).
 *
 * ĐẶC ĐIỂM:
 * - Bắt lỗi 409 DUPLICATE_ENTRY khi tài khoản mạng xã hội đã thuộc về một người dùng khác.
 * - Invalidate cache danh sách mạng xã hội sau khi liên kết thành công.
 */
export function useLinkSocial(
  options?: MutationHookOptions<LinkSocialResponse, LinkSocialPayload>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: LinkSocialPayload) => authService.linkSocial(payload),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: authKeys.social() });
      toast.success("Liên kết tài khoản mạng xã hội thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === ErrorCode.DUPLICATE_ENTRY)
      ) {
        if (!options?.suppressToast) {
          toast.error("Tài khoản này đã được liên kết với một người dùng khác.");
        }
      } else {
        handleMutationError(error, options?.suppressToast);
      }
      await onError?.(...args);
    },
  });
}

/**
 * Hook hủy liên kết tài khoản mạng xã hội (DELETE /auth/social/:provider).
 *
 * ĐẶC ĐIỂM:
 * - Bắt lỗi 400 cơ chế Anti-Lockout (không cho phép hủy phương thức đăng nhập duy nhất).
 * - Invalidate cache danh sách mạng xã hội sau khi hủy liên kết thành công.
 */
export function useUnlinkSocial(
  options?: MutationHookOptions<{ message: string }, "GOOGLE" | "ZALO">,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (provider: "GOOGLE" | "ZALO") => authService.unlinkSocial(provider),
    onSuccess: async (...args) => {
      const [data] = args;
      await queryClient.invalidateQueries({ queryKey: authKeys.social() });
      toast.success(data.message || "Hủy liên kết tài khoản thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
