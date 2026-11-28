"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Mail,
  MessageCircle,
  MessageSquare,
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
    badgeClass: "border-danger/30 bg-danger/10 text-danger",
    accentBarClass: "bg-danger",
    icon: AlertTriangle,
    labelKey: "notifications.severity.CRITICAL",
  },
  HIGH: {
    badgeClass: "border-warning/30 bg-warning/10 text-warning",
    accentBarClass: "bg-warning",
    icon: AlertCircle,
    labelKey: "notifications.severity.HIGH",
  },
  NORMAL: {
    badgeClass: "border-primary/25 bg-primary/10 text-primary",
    accentBarClass: "bg-primary",
    icon: Info,
    labelKey: "notifications.severity.NORMAL",
  },
  MEDIUM: {
    badgeClass: "border-primary/25 bg-primary/10 text-primary",
    accentBarClass: "bg-primary",
    icon: Info,
    labelKey: "notifications.severity.MEDIUM",
  },
  LOW: {
    badgeClass: "border-border/50 bg-muted/40 text-muted-foreground",
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
    pillClass: "border-warning/30 bg-warning/10 text-warning",
    medallionClass: "border-warning/25 bg-warning/10 text-warning",
  },
  RESOLVED: {
    vi: "Đã khắc phục",
    en: "Resolved Report",
    icon: CheckCircle2,
    pillClass: "border-success/25 bg-success/10 text-success",
    medallionClass: "border-success/25 bg-success/10 text-success",
  },
  COMMENT: {
    vi: "Bình luận hiện trường",
    en: "Field Comment",
    icon: MessageSquare,
    pillClass: "border-primary/20 bg-primary/[0.08] text-foreground",
    medallionClass: "border-primary/20 bg-primary/10 text-primary",
  },
  BROADCAST: {
    vi: "Toàn hệ thống",
    en: "System Broadcast",
    icon: Radio,
    pillClass: "border-accent/40 bg-accent/15 text-foreground",
    medallionClass: "border-primary/20 bg-primary/10 text-primary",
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
    case "ZALO_BOT":
      return { label: "Zalo Bot", icon: MessageCircle };
    // WEB là bí danh cũ của IN_APP ở BE (cùng hộp thư web) → hiển thị chung một nhãn
    case "WEB":
    case "IN_APP":
    default:
      return { label: "In-App", icon: Bell };
  }
}
