"use client";

import { isNotificationRead, type NotificationInboxSnapshot } from "@/lib/notification-inbox";
import { useNotificationInbox, type InboxQueryOptions } from "./use-notification-inbox";

export type UseUnreadCountOptions = InboxQueryOptions<number>;
const unread = (snapshot: NotificationInboxSnapshot) => snapshot.items.filter((item) => !isNotificationRead(item)).length;

export function useUnreadCount(options?: UseUnreadCountOptions) {
  return useNotificationInbox(unread, options);
}
