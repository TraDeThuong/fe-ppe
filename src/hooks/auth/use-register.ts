"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth.service";
import type {
  RegisterPayload,
  ResendVerificationPayload,
  VerifyEmailPayload,
} from "@/types";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook đăng ký tài khoản mới (POST /auth/register).
 *
 * ĐẶC ĐIỂM:
 * - Anti-enumeration: Dù email đã tồn tại hay chưa, backend và hook luôn phản hồi thông báo
 *   thành công tương tự nhau để bảo vệ tính bảo mật danh tính người dùng.
 */
export function useRegister(
  options?: MutationHookOptions<{ message: string }, RegisterPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      toast.success(
        data.message || "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
      );
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
 * Hook xác thực email kích hoạt tài khoản (GET /auth/verify-email?token=...).
 *
 * ĐẶC ĐIỂM:
 * - Đọc token kích hoạt từ URL parameters trên trang /verify-email.
 */
export function useVerifyEmail(
  options?: MutationHookOptions<{ message: string }, VerifyEmailPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: VerifyEmailPayload) => authService.verifyEmail(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      toast.success(data.message || "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.");
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
 * Hook gửi lại email xác thực kích hoạt tài khoản (POST /auth/resend-verification).
 *
 * ĐẶC ĐIỂM:
 * - Xử lý giới hạn tốc độ 429 TOO_MANY_REQUESTS với thời gian cooldown 60 giây.
 */
export function useResendVerification(
  options?: MutationHookOptions<{ message: string }, ResendVerificationPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: ResendVerificationPayload) => authService.resendVerification(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      toast.success(data.message || "Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

