"use client";

import { useContext } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { notificationService } from "@/services/notification.service";
import { collectNotificationInbox, normalizeNotificationInbox, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import type { ApiError } from "@/lib/axios";
import { notificationKeys } from "./notification.query-keys";

export type InboxQueryOptions<T> = Omit<UseQueryOptions<NotificationInboxSnapshot, ApiError, T, readonly unknown[]>,
  "queryKey" | "queryFn" | "select" | "placeholderData" | "enabled"> & { enabled?: boolean };

export function useNotificationInbox<T>(select: (snapshot: NotificationInboxSnapshot) => T, options?: InboxQueryOptions<T>) {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  return useQuery({
    ...options,
    queryKey: notificationKeys.inbox(userId || "anonymous"),
    queryFn: async ({ signal }) => {
      if (!userId || auth?.status !== "authenticated") throw new Error("Vui lòng đăng nhập để đọc hộp thư.");
      const raw = await collectNotificationInbox((page, limit, range) => notificationService.getNotifications({ page, limit, ...range }, { signal, strictPagination: true }), signal);
      return normalizeNotificationInbox(raw, userId!);
    },
    select,
    staleTime: options?.staleTime ?? 30_000,
    retry: options?.retry ?? 1,
    enabled: !!userId && auth?.status === "authenticated" && options?.enabled !== false,
  });
}
