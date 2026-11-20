"use client";

import { useCallback } from "react";
import { notificationInboxPage, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import type { ListNotificationsQuery, NotificationListResponse } from "@/types";
import { useNotificationInbox, type InboxQueryOptions } from "./use-notification-inbox";

export type UseNotificationsOptions = InboxQueryOptions<NotificationListResponse>;

export function useNotifications(params?: ListNotificationsQuery, options?: UseNotificationsOptions) {
  const select = useCallback((snapshot: NotificationInboxSnapshot) => notificationInboxPage(snapshot, params), [params]);
  return useNotificationInbox(select, options);
}
