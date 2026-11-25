"use client";

import { useContext, useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import {
  applyArchiveAction,
  changeArchiveSettings,
  notificationArchiveChannel,
  NotificationArchiveInboxUnavailable,
  transactNotificationArchive,
} from "@/lib/notification-archive";
import type { NotificationInboxSnapshot } from "@/lib/notification-inbox";
import { notificationKeys } from "./notification.query-keys";

export function useNotificationArchiveAccount() {
  const auth = useContext(AuthContext);
  const can = useCan();
  return auth?.status === "authenticated" && can("NOTIFICATION_READ") ? auth.user?.id : undefined;
}

export function useNotificationArchiveState(enabled = true) {
  const userId = useNotificationArchiveAccount();
  return useQuery({
    queryKey: notificationKeys.archive(userId ?? "anonymous"),
    queryFn: async () => (await transactNotificationArchive(userId!)).state,
    enabled: Boolean(userId) && enabled,
    staleTime: Infinity,
    retry: false,
    meta: { suppressErrorToast: true },
  });
}

async function updateArchive(
  client: QueryClient,
  userId: string,
  update: NonNullable<Parameters<typeof transactNotificationArchive>[1]>,
) {
  const result = await transactNotificationArchive(userId, update);
  if (!result.changed) return result.count;

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(notificationArchiveChannel);
      try { channel.postMessage(userId); } finally { channel.close(); }
    } catch { /* The foreground check reloads storage if cross-tab messaging is unavailable. */ }
  }
  await client.invalidateQueries({ queryKey: notificationKeys.archive(userId), exact: true });
  return result.count;
}

export function runNotificationArchiveAction(
  client: QueryClient,
  userId: string,
  action: Parameters<typeof applyArchiveAction>[2],
  isCurrentAccount: () => boolean,
) {
  return updateArchive(client, userId, (state) => {
    const inbox = client.getQueryState<NotificationInboxSnapshot>(notificationKeys.inbox(userId));
    if (!isCurrentAccount() || !inbox?.data || inbox.status !== "success" || inbox.fetchStatus !== "idle") {
      throw new NotificationArchiveInboxUnavailable();
    }
    return applyArchiveAction(state, inbox.data, action, Date.now());
  });
}

export function useNotificationArchiveActions() {
  const client = useQueryClient();
  const userId = useNotificationArchiveAccount();
  const currentAccount = useRef(userId);
  useEffect(() => {
    currentAccount.current = userId;
    return () => { currentAccount.current = undefined; };
  }, [userId]);

  return {
    saveSettings: async (enabled: boolean, days: number) => {
      if (!userId) throw new NotificationArchiveInboxUnavailable();
      return updateArchive(client, userId, (state) => {
        if (currentAccount.current !== userId) throw new NotificationArchiveInboxUnavailable();
        return { state: changeArchiveSettings(state, enabled, days), count: 0 };
      });
    },
    move: async (action: Parameters<typeof applyArchiveAction>[2]) => {
      if (!userId) throw new NotificationArchiveInboxUnavailable();
      return runNotificationArchiveAction(client, userId, action, () =>
        currentAccount.current === userId && (action.type !== "auto" || document.visibilityState === "visible"),
      );
    },
  };
}
