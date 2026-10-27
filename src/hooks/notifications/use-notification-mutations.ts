"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  handleMutationError,
  type MutationHookOptions,
} from "@/hooks/auth/auth-hook-utils";
import { toast } from "@/lib/toast";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import type {
  BroadcastNotificationPayload,
  SendNotificationPayload,
} from "@/types";

/**
 * Hook đánh dấu 1 thông báo là đã đọc (PATCH /api/v1/notifications/:id/read).
 */
export function useMarkAsRead(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: async (...args) => {
      // Giảm ngay unreadCount trên cache để UI phản hồi tức thì
      queryClient.setQueryData<number>(
        notificationKeys.unreadCount(),
        (old) => (typeof old === "number" && old > 0 ? old - 1 : 0),
      );
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
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
 * Hook đánh dấu tất cả thông báo là đã đọc (PATCH /api/v1/notifications/read-all).
 */
export function useMarkAllAsRead(
  options?: MutationHookOptions<{ message: string }, void>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: async (...args) => {
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
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
 * Hook xóa 1 thông báo khỏi hộp thư (DELETE /api/v1/notifications/:id).
 */
export function useDeleteNotification(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      toast.success("Đã xóa thông báo.");
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
 * Hook phát thông báo khẩn cấp toàn hệ thống (POST /api/v1/notifications/broadcast).
 */
export function useBroadcastNotification(
  options?: MutationHookOptions<
    { message: string },
    BroadcastNotificationPayload
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: BroadcastNotificationPayload) =>
      notificationService.broadcastNotification(payload),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      toast.success("Đã phát thông báo toàn hệ thống thành công.");
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
 * Hook gửi thông báo tới nhóm người dùng chỉ định (POST /api/v1/notifications/send).
 */
export function useSendNotification(
  options?: MutationHookOptions<
    { message: string },
    SendNotificationPayload
  >,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: SendNotificationPayload) =>
      notificationService.sendNotification(payload),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      toast.success("Đã gửi thông báo thành công.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
