"use client";

import type { ListNotificationsQuery, NotificationListResponse } from "@/types";
import { useNotificationInbox, type InboxQueryOptions, type NotificationInboxPage } from "./use-notification-inbox";

export type UseNotificationsOptions = InboxQueryOptions<NotificationListResponse>;

const selectPage = ({ items, meta }: NotificationInboxPage): NotificationListResponse => ({ data: items, meta });
const selectTotal = ({ meta }: NotificationInboxPage) => meta.total;

export function useNotifications(params?: ListNotificationsQuery, options?: UseNotificationsOptions) {
  return useNotificationInbox(params, selectPage, options);
}

export function useNotificationTotal(
  filters?: Omit<ListNotificationsQuery, "page" | "limit">,
  options?: InboxQueryOptions<number>,
) {
  return useNotificationInbox({ ...filters, page: 1, limit: 1 }, selectTotal, options);
}
