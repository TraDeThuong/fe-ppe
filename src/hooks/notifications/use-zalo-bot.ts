"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  handleMutationError,
  type MutationHookOptions,
} from "@/hooks/auth/auth-hook-utils";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import type { ApiError } from "@/lib/axios";
import type {
  SendZaloTestPayload,
  ZaloAdminBotInfoDto,
  ZaloAdminWebhookResultDto,
  ZaloBotStatusDto,
  ZaloLinkTokenDto,
  ZaloTestResultDto,
  ZaloUnlinkResultDto,
} from "@/types";

type ZaloStatusQueryOptions = Omit<
  UseQueryOptions<ZaloBotStatusDto, ApiError, ZaloBotStatusDto, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

/**
 * Trạng thái Zalo Bot của người dùng hiện tại (Bot đã cấu hình chưa, đã liên kết hội thoại nào).
 * Được làm mới tự động qua SSE notification:zalo_linked / notification:zalo_unlinked (RealtimeProvider).
 */
export function useZaloStatus(options?: ZaloStatusQueryOptions) {
  return useQuery({
    queryKey: notificationKeys.zaloStatus(),
    queryFn: () => notificationService.getZaloStatus(),
    staleTime: 60 * 1000,
    ...options,
  });
}

/** Tạo mã liên kết /link PPE-XXXXXXXXXXXX (dùng 1 lần, hết hạn sau 10 phút) */
export function useCreateZaloLinkToken(
  options?: MutationHookOptions<ZaloLinkTokenDto, void>,
) {
  const { onError, suppressToast, ...restOptions } = options ?? {};
  return useMutation({
    ...restOptions,
    mutationFn: () => notificationService.createZaloLinkToken(),
    onError: async (...args) => {
      handleMutationError(args[0], suppressToast);
      await onError?.(...args);
    },
  });
}

/** Hủy liên kết Zalo Bot — BE tự tắt preference ZALO_BOT nên làm mới cả status lẫn preferences */
export function useUnlinkZalo(
  options?: MutationHookOptions<ZaloUnlinkResultDto, void>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, suppressToast, ...restOptions } = options ?? {};
  return useMutation({
    ...restOptions,
    mutationFn: () => notificationService.unlinkZalo(),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.zaloStatus() }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() }),
      ]);
      toast.success(
        pickLocaleText("Đã hủy liên kết Zalo Bot.", "Zalo Bot has been unlinked."),
        { id: "zalo-bot-unlinked" },
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      handleMutationError(args[0], suppressToast);
      await onError?.(...args);
    },
  });
}

/** Gửi tin nhắn thử tới hội thoại Zalo đã liên kết (rate-limited, 429 do interceptor toast toàn cục) */
export function useSendZaloTest(
  options?: MutationHookOptions<ZaloTestResultDto, SendZaloTestPayload | undefined>,
) {
  const { onSuccess, onError, suppressToast, ...restOptions } = options ?? {};
  return useMutation({
    ...restOptions,
    mutationFn: (payload?: SendZaloTestPayload) =>
      notificationService.sendZaloTest(payload),
    onSuccess: async (...args) => {
      toast.success(
        pickLocaleText(
          "Đã gửi tin nhắn thử tới Zalo. Kiểm tra hội thoại đã liên kết.",
          "Test message sent to Zalo. Check your linked conversation.",
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      handleMutationError(args[0], suppressToast);
      await onError?.(...args);
    },
  });
}

// ----------------------------------------------------------------------------
// Quản trị (NOTIFICATION_TEMPLATE_MANAGE)
// ----------------------------------------------------------------------------

export function useZaloAdminInfo(options?: { enabled?: boolean }) {
  return useQuery<ZaloAdminBotInfoDto, ApiError>({
    queryKey: notificationKeys.zaloAdminInfo(),
    queryFn: () => notificationService.getZaloAdminInfo(),
    staleTime: 60 * 1000,
    retry: false,
    ...options,
  });
}

export function useSetZaloAdminWebhook(
  options?: MutationHookOptions<ZaloAdminWebhookResultDto, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, suppressToast, ...restOptions } = options ?? {};
  return useMutation({
    ...restOptions,
    mutationFn: (url: string) => notificationService.setZaloAdminWebhook(url),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.zaloAdminInfo() });
      toast.success(
        pickLocaleText("Đã cập nhật Webhook Zalo Bot.", "Zalo Bot webhook updated."),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      handleMutationError(args[0], suppressToast);
      await onError?.(...args);
    },
  });
}

export function useDeleteZaloAdminWebhook(
  options?: MutationHookOptions<{ deleted: boolean }, void>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, suppressToast, ...restOptions } = options ?? {};
  return useMutation({
    ...restOptions,
    mutationFn: () => notificationService.deleteZaloAdminWebhook(),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.zaloAdminInfo() });
      toast.success(
        pickLocaleText("Đã gỡ Webhook Zalo Bot.", "Zalo Bot webhook removed."),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      handleMutationError(args[0], suppressToast);
      await onError?.(...args);
    },
  });
}
