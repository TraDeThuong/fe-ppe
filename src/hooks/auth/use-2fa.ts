"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { setLoginPersistence } from "@/lib/session-manager";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { authService } from "@/services/auth.service";
import type {
  Disable2FAPayload,
  Enable2FAPayload,
  Enable2FAResponse,
  LoginSuccessResponse,
  MeDto,
  RegenerateBackupCodesPayload,
  TwoFactorSetupResponse,
  Verify2FAPayload,
} from "@/types";
import { authKeys } from "./auth.query-keys";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook khởi tạo cấu hình 2FA (POST /auth/2fa/setup).
 *
 * ĐẶC ĐIỂM:
 * - Trả về `secret` và `otpauthUrl` để giao diện render mã QR cho ứng dụng Authenticator (Google Authenticator, Authy).
 */
export function useSetup2FA(
  options?: MutationHookOptions<TwoFactorSetupResponse, void>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: () => authService.setup2FA(),
    onSuccess: async (...args) => {
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
 * Hook kích hoạt 2FA sau khi quét mã QR (POST /auth/2fa/enable).
 *
 * ĐẶC ĐIỂM:
 * - Trả về 8 mã dự phòng (backupCodes) hiển thị 1 lần duy nhất trong modal.
 * - Invalidate cache "me" và cập nhật cờ `twoFactorEnabled: true` trong AuthContext.
 */
export function useEnable2FA(
  options?: MutationHookOptions<Enable2FAResponse, Enable2FAPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: Enable2FAPayload) => authService.enable2FA(payload),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      if (auth?.user) {
        auth.setUser({
          ...auth.user,
          twoFactorEnabled: true,
        });
      }

      toast.success("Bật xác thực hai yếu tố (2FA) thành công!");
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
 * Hook xác thực mã OTP bước 2 sau khi đăng nhập (POST /auth/2fa/verify).
 *
 * ĐẶC ĐIỂM:
 * - Dùng tempToken từ luồng login thường hoặc Google login để xác nhận mã TOTP hoặc backup code.
 * - Khi thành công: lưu cặp token vào `tokenStore`, cập nhật `AuthContext` và chuyển sang trạng thái đã đăng nhập.
 */
export function useVerify2FA(
  options?: MutationHookOptions<LoginSuccessResponse, Verify2FAPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: Verify2FAPayload) => authService.verify2FA(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      const pendingRememberMe =
        typeof window !== "undefined" &&
        sessionStorage.getItem("ppe_pending_remember_me") === "true";
      const pendingEmail =
        typeof window !== "undefined"
          ? sessionStorage.getItem("ppe_pending_email")
          : null;
      setLoginPersistence(pendingRememberMe, pendingEmail ?? undefined);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("ppe_pending_remember_me");
        sessionStorage.removeItem("ppe_pending_email");
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
          twoFactorEnabled: true,
          createdAt: new Date().toISOString(),
        } as MeDto);
      }

      await queryClient.invalidateQueries({ queryKey: authKeys.config() });
      toast.success("Xác thực hai yếu tố thành công!");
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
 * Hook tắt tính năng xác thực hai yếu tố (POST /auth/2fa/disable).
 *
 * ĐẶC ĐIỂM:
 * - Yêu cầu mã TOTP và mật khẩu hiện tại (đối với user có đặt mật khẩu).
 * - Cập nhật cờ `twoFactorEnabled: false` trong cache và AuthContext.
 */
export function useDisable2FA(
  options?: MutationHookOptions<{ message: string }, Disable2FAPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: Disable2FAPayload) => authService.disable2FA(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      if (auth?.user) {
        auth.setUser({
          ...auth.user,
          twoFactorEnabled: false,
        });
      }

      toast.success(data.message || "Đã tắt xác thực hai yếu tố thành công!");
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
 * Hook tái tạo 8 mã dự phòng mới (POST /auth/2fa/backup-codes/regenerate).
 *
 * ĐẶC ĐIỂM:
 * - Trả về bộ 8 mã dự phòng mới cho modal hiển thị, đồng thời vô hiệu hóa tất cả các mã cũ.
 */
export function useRegenerateBackupCodes(
  options?: MutationHookOptions<Enable2FAResponse, RegenerateBackupCodesPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: RegenerateBackupCodesPayload) =>
      authService.regenerateBackupCodes(payload),
    onSuccess: async (...args) => {
      toast.success("Tạo lại mã dự phòng mới thành công!");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
