"use client";

import { useNotificationTotal } from "./use-notifications";
import type { InboxQueryOptions } from "./use-notification-inbox";

export type UseUnreadCountOptions = InboxQueryOptions<number>;
export function useUnreadCount(options?: UseUnreadCountOptions) {
  return useNotificationTotal({ isRead: false }, options);
}
