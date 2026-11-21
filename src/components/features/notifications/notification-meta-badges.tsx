"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Mail,
  Radio,
  Send,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import type { NotificationDisplayKind } from "@/lib/notification-display";
import type { NotificationChannel, NotificationSeverity } from "@/types";

export const SEVERITY_META: Record<
  NotificationSeverity,
  {
    badgeClass: string;
    accentBarClass: string;
    icon: typeof AlertTriangle;
    labelKey: string;
  }
> = {
  CRITICAL: {
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    accentBarClass: "bg-rose-500",
    icon: AlertTriangle,
    labelKey: "notifications.severity.CRITICAL",
  },
  HIGH: {
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accentBarClass: "bg-amber-500",
    icon: AlertCircle,
    labelKey: "notifications.severity.HIGH",
  },
  NORMAL: {
    badgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    accentBarClass: "bg-sky-500",
    icon: Info,
    labelKey: "notifications.severity.NORMAL",
  },
  MEDIUM: {
    badgeClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    accentBarClass: "bg-sky-500",
    icon: Info,
    labelKey: "notifications.severity.MEDIUM",
  },
  LOW: {
    badgeClass:
      "border-border/50 bg-muted/40 text-muted-foreground",
    accentBarClass: "bg-muted-foreground/40",
    icon: Bell,
    labelKey: "notifications.severity.LOW",
  },
};

export const KIND_META: Record<
  NotificationDisplayKind,
  {
    vi: string;
    en: string;
    icon: typeof ShieldAlert;
    pillClass: string;
    medallionClass: string;
  }
> = {
  PPE_ALERT: {
    vi: "Cảnh báo PPE",
    en: "PPE Alert",
    icon: ShieldAlert,
    pillClass: "border-primary/25 bg-primary/10 text-primary",
    medallionClass: "border-primary/20 bg-primary/10 text-primary",
  },
  DISPATCH: {
    vi: "Điều phối xử lý",
    en: "Dispatch",
    icon: Send,
    pillClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    medallionClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  RESOLVED: {
    vi: "Đã khắc phục",
    en: "Resolved Report",
    icon: CheckCircle2,
    pillClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    medallionClass:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  BROADCAST: {
    vi: "Toàn hệ thống",
    en: "System Broadcast",
    icon: Radio,
    pillClass:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    medallionClass:
      "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  SYSTEM: {
    vi: "Hệ thống",
    en: "System",
    icon: Bell,
    pillClass: "border-border/50 bg-background/80 text-muted-foreground",
    medallionClass: "border-border/40 bg-background text-muted-foreground",
  },
};

export function getChannelDisplay(channel: NotificationChannel | string) {
  switch (channel) {
    case "EMAIL":
      return { label: "Email", icon: Mail };
    case "WEBHOOK":
      return { label: "Webhook", icon: Webhook };
    case "ZALO_ZNS":
      return { label: "Zalo ZNS", icon: Send };
    case "WEB":
      return { label: "Web", icon: Bell };
    case "IN_APP":
    default:
      return { label: "In-App", icon: Bell };
  }
}
