"use client";

import { useContext } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { notificationService } from "@/services/notification.service";
import { normalizeNotificationInbox, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import type { ApiError } from "@/lib/axios";
import { notificationKeys } from "./notification.query-keys";

export type InboxQueryOptions<T> = Omit<UseQueryOptions<NotificationInboxSnapshot, ApiError, T, readonly unknown[]>,
  "queryKey" | "queryFn" | "select" | "placeholderData" | "enabled"> & {
    enabled?: boolean;
    visibility?: "active" | "archived";
  };

export function useNotificationInbox<T>(select: (snapshot: NotificationInboxSnapshot) => T, options?: InboxQueryOptions<T>) {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const { visibility, ...queryOptions } = options ?? {};
  const enabled = !!userId && auth?.status === "authenticated" && queryOptions.enabled !== false;
  const isArchivedView = visibility === "archived";

  return useQuery({
    ...queryOptions,
    queryKey: isArchivedView
      ? notificationKeys.archive(userId || "anonymous")
      : notificationKeys.inbox(userId || "anonymous"),
    queryFn: async ({ signal }) => {
      if (!userId || auth?.status !== "authenticated") throw new Error("Vui lòng đăng nhập để đọc hộp thư.");
      const response = await notificationService.getNotifications(
        {
          page: 1,
          limit: 100,
          ...(isArchivedView ? { archived: true } : {}),
        },
        { signal },
      );
      return normalizeNotificationInbox(response.data, userId!);
    },
    select,
    staleTime: queryOptions.staleTime ?? 30_000,
    retry: queryOptions.retry ?? 1,
    enabled,
  });
}
