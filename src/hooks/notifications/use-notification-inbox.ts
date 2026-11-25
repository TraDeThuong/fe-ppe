"use client";

import { useCallback, useContext } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { notificationService } from "@/services/notification.service";
import { collectNotificationInbox, normalizeNotificationInbox, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import type { ApiError } from "@/lib/axios";
import { defaultNotificationArchive, selectArchiveItems } from "@/lib/notification-archive";
import { notificationKeys } from "./notification.query-keys";
import { useNotificationArchiveState } from "./use-notification-archive";

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
  const archive = useNotificationArchiveState(enabled && Boolean(visibility));
  const archiveState = visibility ? archive.data ?? defaultNotificationArchive : undefined;
  const selectVisible = useCallback((snapshot: NotificationInboxSnapshot) => {
    if (!visibility || !archiveState) return select(snapshot);
    const items = selectArchiveItems(snapshot, archiveState, visibility);
    return select(items === snapshot.items ? snapshot : { ...snapshot, items });
  }, [select, visibility, archiveState]);

  const query = useQuery({
    ...queryOptions,
    queryKey: notificationKeys.inbox(userId || "anonymous"),
    queryFn: async ({ signal }) => {
      if (!userId || auth?.status !== "authenticated") throw new Error("Vui lòng đăng nhập để đọc hộp thư.");
      const raw = await collectNotificationInbox((page, limit, range) => notificationService.getNotifications({ page, limit, ...range }, { signal, strictPagination: true }), signal);
      return normalizeNotificationInbox(raw, userId!);
    },
    select: selectVisible,
    staleTime: queryOptions.staleTime ?? 30_000,
    retry: queryOptions.retry ?? 1,
    enabled,
  });
  if (visibility && enabled && archive.isLoading) return { ...query, data: undefined, isLoading: true };
  return query;
}
