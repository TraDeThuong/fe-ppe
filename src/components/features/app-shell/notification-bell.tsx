"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificationIncidentTarget } from "@/lib/incident-group";
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useCan } from "@/hooks/use-can";
import { useEntityLookup } from "@/hooks/use-entity-lookup";
import { classifyIncidentAlert } from "@/lib/incident-workflow";
import {
  buildIncidentToastPayload,
  type IncidentAlertPayload,
} from "@/lib/incident-toast-payload";
import { stripEmojis } from "@/lib/strip-emojis";
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
  const { user } = useAuth();
  const can = useCan();
  const canReadNotifications = can("NOTIFICATION_READ");

  const [open, setOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { lastAlert } = useRealtime();
  const { enabled: soundEnabled, toggleSound, playAlert } = useNotificationSound();
  const { getCameraCode, getSiteName } = useEntityLookup({
    enabled: canReadNotifications,
  });

  // Lưu tham chiếu mới nhất cho lookup & locale để effect SSE không đổ chuông lặp khi catalog refresh
  const lookupRef = useRef({ getCameraCode, getSiteName, isVietnamese });
  lookupRef.current = { getCameraCode, getSiteName, isVietnamese };

  const { data: unreadCount = 0 } = useUnreadCount({
    enabled: canReadNotifications,
  });
  const { data: notificationData, isLoading } = useNotifications(
    { limit: 5 },
    { enabled: open && canReadNotifications },
  );

  const markAllMutation = useMarkAllAsRead();
  const markAsReadMutation = useMarkAsRead();

  const notifications = notificationData?.data || [];

  // Lắng nghe sự kiện Realtime SSE: lọc theo vai trò (Manager nhận cảnh báo AI & báo cáo xong; Officer nhận tín hiệu [ĐIỀU PHỐI])
  useEffect(() => {
    if (!lastAlert) return;

    const classified = classifyIncidentAlert(
      lastAlert.data,
      lastAlert.type,
      user?.role,
    );
    if (!classified.shouldTriggerBellAndToast) {
      return;
    }

    // Phát âm thanh tương ứng
    playAlert(classified.toastSeverity);

    // Kích hoạt hiệu ứng rung lắc biểu tượng chuông
    setIsRinging(true);
    const timer = setTimeout(() => setIsRinging(false), 1600);

    // Hiển thị toast thông báo chung của toàn hệ thống (WoodenToast biến thể sự cố phân màu vi phạm)
    const alertData =
      typeof lastAlert.data === "object" && lastAlert.data !== null
        ? (lastAlert.data as IncidentAlertPayload)
        : null;

    if (alertData && (lastAlert.type === "notification:ppe_violation" || alertData.incidentId)) {
      const {
        getCameraCode: resolveCam,
        getSiteName: resolveSite,
        isVietnamese: vi,
      } = lookupRef.current;

      const built = buildIncidentToastPayload({
        alertData,
        kind: classified.kind,
        severity: classified.toastSeverity,
        isVietnamese: vi,
        resolveCameraCode: resolveCam,
        resolveSiteName: resolveSite,
        onOpenHref: (href) => router.push(href),
        onCompareHref: (href) => router.push(href),
      });

      toast.incident(built.input, {
        id: built.toastKey,
        burstKey: built.burstKey,
      });
    }

    return () => clearTimeout(timer);
  }, [lastAlert, playAlert, router, user?.role]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!canReadNotifications) {
    return null;
  }

  const handleItemClick = (item: NotificationItemDto) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    setOpen(false);
    const target = notificationIncidentTarget(item);
    if (target.group && target.href) {
      router.push(target.href);
    } else if (item.actionUrl) {
      router.push(item.actionUrl);
    } else if (item.incidentId) {
      router.push(target.href!);
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
        className={`relative flex size-9 sm:size-10 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] ${
          isRinging ? "animate-bounce text-primary ring-2 ring-primary/40" : ""
        }`}
      >
        <Bell className={`size-4 sm:size-4.5 ${isRinging ? "animate-[wiggle_0.4s_ease-in-out_infinite]" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[64px] z-50 flex max-h-[min(30rem,calc(100dvh-5.5rem))] flex-col rounded-2xl border border-border/50 bg-background p-3 shadow-[8px_8px_20px_var(--shadow-dark),-8px_-8px_20px_var(--shadow-light)] animate-in fade-in slide-in-from-top-2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2.5 sm:max-h-none sm:w-96">
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
                        {stripEmojis(item.title)}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                        {formatRelativeTimeShort(item.createdAt, isVietnamese)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {stripEmojis(notificationIncidentTarget(item).content)}
                    </p>
                    {item.incidentId && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <span>{notificationIncidentTarget(item).group ? (isVietnamese ? "Mở nhóm xử lý" : "Open incident group") : (isVietnamese ? "Mở hồ sơ sự cố" : "Open incident")}</span>
                        <ExternalLink className="size-2.5" />
                      </div>
                    )}
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
