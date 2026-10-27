"use client";

import { useMemo } from "react";
import { Inbox, SlidersHorizontal, FileText, Mail } from "lucide-react";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";

export type NotificationTabKey = "inbox" | "preferences" | "templates" | "emailLogs";

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
  const { user } = useAuth();

  const permissions = user?.permissions || [];
  const role = user?.role || "";

  // Phân quyền hiển thị các Tab Quản trị
  const canViewTemplates =
    permissions.includes("NOTIFICATION_TEMPLATE_READ") ||
    role === "ADMIN" ||
    role === "SAFETY_MANAGER";

  const canViewEmailLogs =
    permissions.includes("NOTIFICATION_READ") &&
    (role === "ADMIN" || role === "SAFETY_MANAGER");

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
