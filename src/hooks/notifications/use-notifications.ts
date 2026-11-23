"use client";

import { useCallback } from "react";
import {
  filterNotificationInbox,
  notificationInboxPage,
  type NotificationInboxSnapshot,
} from "@/lib/notification-inbox";
import type { ListNotificationsQuery, NotificationItemDto, NotificationListResponse } from "@/types";
import { useNotificationInbox, type InboxQueryOptions } from "./use-notification-inbox";

export type UseNotificationsOptions = InboxQueryOptions<NotificationListResponse>;

const selectInboxItems = (snapshot: NotificationInboxSnapshot): NotificationItemDto[] => snapshot.items;

export function useNotifications(params?: ListNotificationsQuery, options?: UseNotificationsOptions) {
  const select = useCallback((snapshot: NotificationInboxSnapshot) => notificationInboxPage(snapshot, params), [params]);
  return useNotificationInbox(select, options);
}

/** Toàn bộ thông báo đã lọc (chưa cắt trang) để gom nhóm theo người / khung giờ / camera phía FE. */
export function useFilteredNotifications(
  params?: ListNotificationsQuery,
  options?: InboxQueryOptions<NotificationItemDto[]>,
) {
  const select = useCallback(
    (snapshot: NotificationInboxSnapshot) => filterNotificationInbox(snapshot, params),
    [params],
  );
  return useNotificationInbox(select, options);
}

/** Toàn bộ danh sách thông báo đã chuẩn hóa trong inbox (dùng cho thống kê KPI, độc lập với filter/pagination). */
export function useAllNotifications(options?: InboxQueryOptions<NotificationItemDto[]>) {
  return useNotificationInbox(selectInboxItems, options);
}
