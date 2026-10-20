"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { authService } from "@/services/auth.service";
import type {
  GoogleLoginPayload,
  LoginPayload,
  LoginResponse,
  LogoutPayload,
  MeDto,
} from "@/types";
import { authKeys } from "./auth.query-keys";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook xử lý đăng nhập bằng email & mật khẩu (POST /auth/login).
 *
 * ĐẶC ĐIỂM:
 * 1. Trả về Discriminated Union (LoginResponse):
 *    - `requires2FA: true`: trả kèm `tempToken`, trang chuyển sang bước nhập OTP /2fa.
 *    - `requires2FA: false | undefined`: lưu ngay token vào memory qua `tokenStore.setTokens`.
 * 2. Tự động đồng bộ MeDto vào AuthContext và invalidate cache config.
 * 3. Bắt lỗi mật khẩu sai (401), tài khoản bị khóa (423), chưa kích hoạt (403).
 */
export function useLogin(
  options?: MutationHookOptions<LoginResponse, LoginPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      if (data.requires2FA) {
        // Luồng 2FA: chưa lưu token chính thức, trang giữ tempToken để gọi verify2FA
        await onSuccess?.(...args);
        return;
      }

      // Lưu AccessToken & RefreshToken vào memory ngay lập tức
      tokenStore.setTokens(data.accessToken, data.refreshToken);

      try {
        const me = await queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: () => authService.getMe(),
        });
        auth?.setUser(me);
      } catch {
        auth?.setUser({
          ...data.user,
          avatarUrl: null,
          phoneNumber: null,
          isActive: true,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        } as MeDto);
      }

      await queryClient.invalidateQueries({ queryKey: authKeys.config() });
      toast.success("Đăng nhập thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook đăng nhập bằng tài khoản Google OAuth2 (POST /auth/google).
 *
 * ĐẶC ĐIỂM:
 * - Hỗ trợ cả 2 dạng payload: `{ idToken }` hoặc `{ code, redirectUri }`.
 * - Tương tự useLogin: phân nhánh discriminated union nếu tài khoản bật 2FA.
 */
export function useGoogleLogin(
  options?: MutationHookOptions<LoginResponse, GoogleLoginPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: GoogleLoginPayload) => authService.googleLogin(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      if (data.requires2FA) {
        await onSuccess?.(...args);
        return;
      }

      tokenStore.setTokens(data.accessToken, data.refreshToken);

      try {
        const me = await queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: () => authService.getMe(),
        });
        auth?.setUser(me);
      } catch {
        auth?.setUser({
          ...data.user,
          avatarUrl: null,
          phoneNumber: null,
          isActive: true,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        } as MeDto);
      }

      await queryClient.invalidateQueries({ queryKey: authKeys.config() });
      toast.success("Đăng nhập Google thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook đăng xuất tài khoản hiện tại (POST /auth/logout).
 *
 * ĐẶC ĐIỂM:
 * - Hủy session trên server, xóa cookies httpOnly qua backend và gateway.
 * - Xóa sạch memory tokenStore, xóa toàn bộ server cache (queryClient.clear).
 * - Phát sự kiện "auth:session-expired" để đồng bộ mọi listener.
 * - Đảm bảo dọn sạch client state kể cả khi API server trả lỗi.
 */
export function useLogout(
  options?: MutationHookOptions<{ message: string }, LogoutPayload | void>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: async (payload) => {
      const refreshToken = payload?.refreshToken ?? tokenStore.getRefreshToken() ?? undefined;
      return authService.logout({ refreshToken });
    },
    onSuccess: async (...args) => {
      const [data] = args;
      tokenStore.clear();
      queryClient.clear();
      auth?.setUser(null);
      eventBus.emit("auth:session-expired");
      toast.success(data.message || "Đăng xuất thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      // Dù API thất bại do phiên đã hết hạn trước đó, client vẫn phải dọn sạch
      tokenStore.clear();
      queryClient.clear();
      auth?.setUser(null);
      eventBus.emit("auth:session-expired");
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
