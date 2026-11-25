"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import {
  useNotificationArchiveAccount,
  useNotificationArchiveActions,
  useNotificationArchiveState,
} from "@/hooks/notifications/use-notification-archive";
import { useNotificationInbox } from "@/hooks/notifications/use-notification-inbox";
import { isArchiveCheckDue, notificationArchiveChannel, NotificationArchiveStorageError } from "@/lib/notification-archive";
import type { NotificationInboxSnapshot } from "@/lib/notification-inbox";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";

const selectCompleteInbox = (snapshot: NotificationInboxSnapshot) => snapshot;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const INBOX_FRESHNESS_MS = 30_000;

export function NotificationArchiveRuntime() {
  const userId = useNotificationArchiveAccount();
  const client = useQueryClient();
  const { t } = useLocale();
  const { data: settings } = useNotificationArchiveState();
  const { move } = useNotificationArchiveActions();
  const inbox = useNotificationInbox(selectCompleteInbox, { enabled: settings?.enabled === true });
  const running = useRef<string | undefined>(undefined);

  const check = useEffectEvent(async (retryInbox = false) => {
    if (!userId || !settings || document.visibilityState !== "visible" ||
      !isArchiveCheckDue(settings, Date.now()) || running.current === userId || inbox.isFetching ||
      (!inbox.isSuccess && !retryInbox)) return;

    running.current = userId;
    try {
      if (!inbox.isSuccess || Date.now() - inbox.dataUpdatedAt >= INBOX_FRESHNESS_MS) {
        await inbox.refetch({ cancelRefetch: false, throwOnError: true });
      }
      if (document.visibilityState === "visible") await move({ type: "auto" });
    } catch (error) {
      if (error instanceof NotificationArchiveStorageError) {
        toast.error(t("notifications.archive.storageError"), { id: "notification-archive-storage" });
      }
    } finally {
      if (running.current === userId) running.current = undefined;
    }
  });

  useEffect(() => {
    void check();
  }, [userId, settings?.enabled, settings?.retentionDays, settings?.lastRunAt, settings?.checkRequested,
    inbox.status, inbox.fetchStatus, inbox.dataUpdatedAt]);

  useEffect(() => {
    if (!userId) return;
    const reload = () => client.invalidateQueries({ queryKey: notificationKeys.archive(userId), exact: true });
    const onForeground = () => {
      if (document.visibilityState !== "visible") return;
      void reload().then(() => check(true));
    };
    let channel: BroadcastChannel | undefined;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(notificationArchiveChannel);
        channel.onmessage = (event) => { if (event.data === userId) void reload(); };
      }
    } catch { /* Use account storage on the next foreground check. */ }

    window.addEventListener("focus", onForeground);
    document.addEventListener("visibilitychange", onForeground);
    const interval = window.setInterval(() => { void check(true); }, CHECK_INTERVAL_MS);
    return () => {
      channel?.close();
      clearInterval(interval);
      window.removeEventListener("focus", onForeground);
      document.removeEventListener("visibilitychange", onForeground);
    };
  }, [client, userId]);

  return null;
}
