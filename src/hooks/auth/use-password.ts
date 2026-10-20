"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { authService } from "@/services/auth.service";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from "@/types";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook yêu cầu gửi link đặt lại mật khẩu qua email (POST /auth/forgot-password).
 *
 * ĐẶC ĐIỂM:
 * - Anti-enumeration: Luôn hiển thị thông báo thành công dù email có tồn tại hay không.
 */
export function useForgotPassword(
  options?: MutationHookOptions<{ message: string }, ForgotPasswordPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: ForgotPasswordPayload) => authService.forgotPassword(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      toast.success(
        data.message ||
          "Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
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
 * Hook đặt lại mật khẩu mới bằng token từ email (POST /auth/reset-password).
 *
 * ĐẶC ĐIỂM:
 * - Backend tự động thu hồi toàn bộ phiên làm việc của tài khoản.
 * - Hook dọn dẹp sạch sẽ bộ nhớ client cache và tokenStore.
 */
export function useResetPassword(
  options?: MutationHookOptions<{ message: string }, ResetPasswordPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: ResetPasswordPayload) => authService.resetPassword(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      tokenStore.clear();
      queryClient.clear();
      auth?.setUser(null);
      toast.success(
        data.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
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
 * Hook đổi mật khẩu người dùng đang đăng nhập (PUT /auth/password).
 *
 * ĐẶC ĐIỂM:
 * - Backend áp dụng chính sách bảo mật: thu hồi TOÀN BỘ phiên đăng nhập hiện tại trên mọi thiết bị.
 * - Xóa sạch cache, token và chuyển trạng thái về chưa đăng nhập để ép user đăng nhập lại.
 */
export function useChangePassword(
  options?: MutationHookOptions<{ message: string }, ChangePasswordPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      tokenStore.clear();
      queryClient.clear();
      auth?.setUser(null);
      eventBus.emit("auth:session-expired");
      toast.success(
        data.message || "Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.",
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
