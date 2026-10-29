"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useRealtime } from "@/contexts/RealtimeContext";
import {
  useUnreadCount,
  useNotifications,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotificationSound,
} from "@/hooks/notifications";
import type { NotificationItemDto, NotificationSeverity } from "@/types";

function formatRelativeTimeShort(
  dateString: string | Date | null | undefined,
  isVietnamese: boolean,
): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return isVietnamese ? "Vừa xong" : "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
    month: "numeric",
    day: "numeric",
  });
}

function getSeverityDot(severity?: NotificationSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]";
    case "HIGH":
      return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
    case "NORMAL":
      return "bg-sky-500";
    case "LOW":
    default:
      return "bg-slate-400";
  }
}

export function NotificationBell() {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { lastAlert } = useRealtime();
  const { enabled: soundEnabled, toggleSound, playAlert } = useNotificationSound();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationData, isLoading } = useNotifications(
    { limit: 5 },
    { enabled: open },
  );

  const markAllMutation = useMarkAllAsRead();
  const markAsReadMutation = useMarkAsRead();

  const notifications = notificationData?.data || [];

  // Lắng nghe sự kiện Realtime SSE để phát chuông âm thanh cảnh báo & rung chuông
  useEffect(() => {
    if (!lastAlert) return;

    let alertSeverity: NotificationSeverity = "NORMAL";
    if (lastAlert.type === "notification:ppe_violation") {
      alertSeverity = "CRITICAL";
    } else if (lastAlert.data && typeof lastAlert.data === "object" && "severity" in lastAlert.data) {
      alertSeverity = (lastAlert.data as { severity: NotificationSeverity }).severity || "HIGH";
    }

    // Phát âm thanh tương ứng
    playAlert(alertSeverity);

    // Kích hoạt hiệu ứng rung lắc biểu tượng chuông
    setIsRinging(true);
    const timer = setTimeout(() => setIsRinging(false), 1600);
    return () => clearTimeout(timer);
  }, [lastAlert, playAlert]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleItemClick = (item: NotificationItemDto) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    setOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("header.notifications.title")}
        aria-expanded={open}
        className={`relative flex size-10 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] ${
          isRinging ? "animate-bounce text-primary ring-2 ring-primary/40" : ""
        }`}
      >
        <Bell className={`size-4.5 ${isRinging ? "animate-[wiggle_0.4s_ease-in-out_infinite]" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-3 top-[66px] z-50 flex max-h-[min(30rem,calc(100dvh-5.5rem))] w-[min(384px,calc(100vw-24px))] flex-col rounded-2xl border border-border/50 bg-background p-3 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] animate-in fade-in slide-in-from-top-2 sm:absolute sm:right-0 sm:top-full sm:mt-2.5 sm:max-h-none sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("header.notifications.title")}
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                  {unreadCount} {isVietnamese ? "mới" : "new"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Nút bật/tắt nhanh âm thanh */}
              <button
                type="button"
                onClick={toggleSound}
                title={
                  soundEnabled
                    ? isVietnamese
                      ? "Âm thanh cảnh báo: Đang bật (Bấm để tắt)"
                      : "Alert Sound: ON (Click to mute)"
                    : isVietnamese
                      ? "Âm thanh cảnh báo: Đang tắt (Bấm để bật)"
                      : "Alert Sound: MUTED (Click to enable)"
                }
                className={`flex size-7 items-center justify-center rounded-lg border transition-all ${
                  soundEnabled
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
                    : "border-border/40 bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="size-3.5" />
                ) : (
                  <VolumeX className="size-3.5" />
                )}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="size-3.5" />
                  <span>{isVietnamese ? "Đọc tất cả" : "Mark all read"}</span>
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="my-2 max-h-[min(20rem,calc(100dvh-13rem))] flex-1 overflow-y-auto divide-y divide-border/20">
            {isLoading ? (
              <div className="space-y-2.5 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-start gap-2.5">
                    <div className="size-2 rounded-full bg-muted mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                {t("header.notifications.empty")}
              </p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={[
                    "group flex cursor-pointer items-start gap-2.5 p-2.5 rounded-xl transition-all",
                    item.isRead
                      ? "hover:bg-muted/15 opacity-80"
                      : "bg-primary/5 hover:bg-primary/10 font-medium",
                  ].join(" ")}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${getSeverityDot(item.severity)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                        {formatRelativeTimeShort(item.createdAt, isVietnamese)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/30 pt-2 px-1 flex items-center gap-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block flex-1 rounded-xl border border-border/40 bg-background py-2 text-center text-xs font-bold text-primary shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-all hover:shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
            >
              {t("header.notifications.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
