"use client";

import { useContext } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { notificationService } from "@/services/notification.service";
import { normalizeNotificationInbox, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import type { ApiError } from "@/lib/axios";
import type { ListNotificationsQuery, NotificationListResponse } from "@/types";
import { notificationKeys } from "./notification.query-keys";

export type NotificationInboxPage = NotificationInboxSnapshot & Pick<NotificationListResponse, "meta">;

export type InboxQueryOptions<T> = Omit<UseQueryOptions<NotificationInboxPage, ApiError, T, readonly unknown[]>,
  "queryKey" | "queryFn" | "select" | "placeholderData" | "enabled"> & {
    enabled?: boolean;
  };

export function useNotificationInbox<T>(
  params: ListNotificationsQuery | undefined,
  select: (snapshot: NotificationInboxPage) => T,
  options?: InboxQueryOptions<T>,
) {
  const auth = useContext(AuthContext);
  const userId = auth?.status === "authenticated" ? auth.user?.id : undefined;
  const filters = { page: 1, limit: 20, archived: false, ...params };
  const accountKey = userId ?? "anonymous";

  return useQuery({
    ...options,
    queryKey: [...notificationKeys.inbox(accountKey, filters.archived), filters],
    queryFn: async ({ signal }) => {
      if (!userId) throw new Error("Vui lòng đăng nhập để đọc hộp thư.");
      const { data, meta } = await notificationService.getNotifications(filters, { signal, strictPagination: true });
      return { ...normalizeNotificationInbox(data, userId), meta };
    },
    select,
    staleTime: options?.staleTime ?? 30_000,
    retry: options?.retry ?? 1,
    enabled: Boolean(userId) && options?.enabled !== false,
  });
}
