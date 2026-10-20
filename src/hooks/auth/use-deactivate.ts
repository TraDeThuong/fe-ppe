"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { eventBus } from "@/lib/event-bus";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { authService } from "@/services/auth.service";
import type {
  DeactivateConfirmPayload,
  DeactivateRequestPayload,
} from "@/types";
import { handleMutationError, type MutationHookOptions } from "./auth-hook-utils";

/**
 * Hook gửi yêu cầu vô hiệu hóa tài khoản (POST /auth/deactivate/request).
 *
 * ĐẶC ĐIỂM:
 * - Yêu cầu nhập mật khẩu xác nhận và lý do tùy chọn.
 * - Backend gửi email xác nhận có hiệu lực trong 15 phút.
 */
export function useRequestDeactivate(
  options?: MutationHookOptions<{ message: string }, DeactivateRequestPayload>,
) {
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: DeactivateRequestPayload) =>
      authService.requestDeactivate(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      toast.success(
        data.message ||
          "Yêu cầu vô hiệu hóa tài khoản đã được ghi nhận. Vui lòng kiểm tra email để xác nhận trong vòng 15 phút.",
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
 * Hook xác nhận vô hiệu hóa tài khoản qua token email (POST /auth/deactivate/confirm).
 *
 * ĐẶC ĐIỂM:
 * - Backend xóa cookie httpOnly và thu hồi toàn bộ session.
 * - Client dọn dẹp sạch tokenStore, query cache và AuthContext.
 */
export function useConfirmDeactivate(
  options?: MutationHookOptions<{ message: string }, DeactivateConfirmPayload>,
) {
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: DeactivateConfirmPayload) =>
      authService.confirmDeactivate(payload),
    onSuccess: async (...args) => {
      const [data] = args;
      tokenStore.clear();
      queryClient.clear();
      auth?.setUser(null);
      eventBus.emit("auth:session-expired");
      toast.success(
        data.message || "Tài khoản của bạn đã được vô hiệu hóa thành công.",
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
