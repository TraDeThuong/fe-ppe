"use client";

import { useMemo } from "react";
import { Inbox, SlidersHorizontal, FileText, Mail } from "lucide-react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useCan } from "@/hooks/use-can";
import { useLocale } from "@/providers/locale-provider";

export type NotificationTabKey = "inbox" | "preferences" | "templates" | "emailLogs";

export function useNotificationTabAccess() {
  const can = useCan();
  const canViewTemplates =
    can("NOTIFICATION_TEMPLATE_READ") || can("NOTIFICATION_TEMPLATE_MANAGE");
  const canViewEmailLogs = can("NOTIFICATION_TEMPLATE_MANAGE");
  const canManageTemplates = can("NOTIFICATION_TEMPLATE_MANAGE");
  const canBroadcast = can("NOTIFICATION_CREATE");

  const allowedTabs: NotificationTabKey[] = ["inbox", "preferences"];
  if (canViewTemplates) allowedTabs.push("templates");
  if (canViewEmailLogs) allowedTabs.push("emailLogs");

  return {
    canViewTemplates,
    canViewEmailLogs,
    canManageTemplates,
    canBroadcast,
    allowedTabs,
  };
}

export interface NotificationTabsProps {
  activeTab: NotificationTabKey;
  onTabChange: (tab: NotificationTabKey) => void;
  unreadCount?: number;
  className?: string;
}

export function NotificationTabs({
  activeTab,
  onTabChange,
  unreadCount = 0,
  className = "",
}: NotificationTabsProps) {
  const { t } = useLocale();
  const { canViewTemplates, canViewEmailLogs } = useNotificationTabAccess();

  const tabOptions = useMemo<SegmentedControlOption<NotificationTabKey>[]>(() => {
    const options: SegmentedControlOption<NotificationTabKey>[] = [
      {
        value: "inbox",
        label:
          unreadCount > 0
            ? `${t("notifications.tabs.inbox")} (${unreadCount > 99 ? "99+" : unreadCount})`
            : t("notifications.tabs.inbox"),
        icon: <Inbox className="size-4" />,
      },
      {
        value: "preferences",
        label: t("notifications.tabs.preferences"),
        icon: <SlidersHorizontal className="size-4" />,
      },
    ];

    if (canViewTemplates) {
      options.push({
        value: "templates",
        label: t("notifications.tabs.templates"),
        icon: <FileText className="size-4" />,
      });
    }

    if (canViewEmailLogs) {
      options.push({
        value: "emailLogs",
        label: t("notifications.tabs.emailLogs"),
        icon: <Mail className="size-4" />,
      });
    }

    return options;
  }, [t, unreadCount, canViewTemplates, canViewEmailLogs]);

  return (
    <div className={`w-full ${className}`}>
      <SegmentedControl<NotificationTabKey>
        options={tabOptions}
        value={activeTab}
        onValueChange={onTabChange}
        aria-label={t("notifications.tabs.inbox")}
        size="md"
        fullWidth
      />
    </div>
  );
}
