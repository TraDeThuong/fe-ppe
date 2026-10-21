"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

/**
 * M1: UI placeholder — chưa gọi API notification (M3).
 * Badge unread: tạm ẩn cho tới khi có useUnreadCount (M3).
 */
export function NotificationBell() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("header.notifications.title")}
        aria-expanded={open}
        className="relative rounded-full p-2 text-foreground transition-shadow hover:shadow-nm-sm"
      >
        <Bell className="h-5 w-5" />
        {/* TODO M3: badge số chưa đọc — dùng useUnreadCount + SSE */}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl bg-card p-2 shadow-nm">
          <p className="px-3 py-2 text-sm font-semibold text-foreground">
            {t("header.notifications.title")}
          </p>
          {/* TODO M3: danh sách 10 thông báo gần nhất + nút đọc tất cả */}
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("header.notifications.empty")}
          </p>
          <div className="border-t border-(--shadow-dark) p-1">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-center text-sm text-primary transition-shadow hover:shadow-nm-sm"
            >
              {t("header.notifications.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
