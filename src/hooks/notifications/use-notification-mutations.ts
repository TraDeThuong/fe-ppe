"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { systemQueryKeys } from "@/hooks/system/system.query-keys";
import { ApiError } from "@/lib/axios";
import { applyNotificationInboxAction } from "@/lib/notification-inbox-actions";
import type { NotificationInboxSnapshot } from "@/lib/notification-inbox";
import {
  handleMutationError,
  type MutationHookOptions,
} from "@/hooks/auth/auth-hook-utils";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";
import {
  ErrorCode,
  type BroadcastNotificationPayload,
  type SendNotificationPayload,
} from "@/types";

function useInboxAction(action: "read" | "read-many" | "read-all" | "delete") {
  const client = useQueryClient();
  const userId = useContext(AuthContext)?.user?.id || "";
  return async (arg?: string | string[]) => {
    const rows = new Map<string, NotificationInboxSnapshot["items"][number]>();
    const pages = client.getQueriesData<NotificationInboxSnapshot>({ queryKey: notificationKeys.inbox(userId) });
    for (const [, snapshot] of pages) {
      for (const row of snapshot?.items ?? []) {
        const previous = rows.get(row.id);
        if (!previous || (row.mergedIds?.length ?? 0) > (previous.mergedIds?.length ?? 0)) {
          rows.set(row.id, row);
        }
      }
    }
    await applyNotificationInboxAction(
      {
        snapshot: { items: [...rows.values()], rawTotal: rows.size },
        userId,
        action,
        id: typeof arg === "string" ? arg : undefined,
        ids: Array.isArray(arg) ? arg : undefined,
      },
      notificationService,
    );
    return { message: "OK" };
  };
}

/**
 * Hook đánh dấu 1 thông báo là đã đọc (PATCH /api/v1/notifications/:id/read).
 */
export function useMarkAsRead(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const apply = useInboxAction("read");
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => apply(id),
    onSuccess: async (...args) => {
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
 * Hook đánh dấu nhiều thông báo (cả cụm người/đa vi phạm hoặc cả khung giờ/camera) là đã đọc trong 1 thao tác.
 */
export function useMarkManyAsRead(
  options?: MutationHookOptions<{ message: string }, string[]>,
) {
  const queryClient = useQueryClient();
  const apply = useInboxAction("read-many");
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (ids: string[]) => apply(ids),
    onSuccess: async (...args) => {
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
  const apply = useInboxAction("read-all");
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: () => apply(),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.emailLogs() }),
      ]);
      toast.success(
        pickLocaleText(
          "Đã đánh dấu tất cả thông báo là đã đọc.",
          "All notifications marked as read.",
        ),
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
 * Hook xóa 1 thông báo khỏi hộp thư (DELETE /api/v1/notifications/:id).
 */
export function useDeleteNotification(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const apply = useInboxAction("delete");
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => apply(id),
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      toast.success(
        pickLocaleText("Đã xóa thông báo.", "Notification deleted."),
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
      toast.success(
        pickLocaleText(
          "Đã phát thông báo toàn hệ thống thành công.",
          "System-wide broadcast notification sent.",
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.emailLogs() }),
      ]);
      toast.success(
        pickLocaleText(
          "Đã gửi thông báo thành công.",
          "Notification sent successfully.",
        ),
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      if (error instanceof ApiError && error.code === ErrorCode.FEATURE_DISABLED) {
        void queryClient.invalidateQueries({ queryKey: authKeys.config() });
        void queryClient.invalidateQueries({ queryKey: systemQueryKeys.featureFlags() });
        handleMutationError(error, false);
      } else {
        handleMutationError(error, options?.suppressToast);
      }
      await onError?.(...args);
    },
  });
}
