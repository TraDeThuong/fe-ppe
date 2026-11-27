"use client";

import { useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/use-can";
import { NotificationArchiveInboxUnavailable } from "@/lib/notification-archive";
import { notificationService } from "@/services/notification.service";
import { notificationKeys } from "./notification.query-keys";

export function useNotificationArchiveAccount() {
  const auth = useContext(AuthContext);
  const can = useCan();
  return auth?.status === "authenticated" && can("NOTIFICATION_READ") ? auth.user?.id : undefined;
}

type ServerArchiveAction =
  | { type: "manual"; ids?: ReadonlySet<string> }
  | { type: "restore"; id: string };

export function useNotificationArchiveActions() {
  const client = useQueryClient();
  const userId = useNotificationArchiveAccount();

  const invalidateAll = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: notificationKeys.lists() }),
      client.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
    ]);
  };

  return {
    move: async (action: ServerArchiveAction): Promise<number> => {
      if (!userId) throw new NotificationArchiveInboxUnavailable();
      if (action.type === "restore") {
        await notificationService.unarchiveNotification(action.id);
        await invalidateAll();
        return 1;
      }
      const res = await notificationService.archiveAllRead();
      await invalidateAll();
      return res.archivedCount || action.ids?.size || 0;
    },
  };
}
