"use client";

import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";
import { NotificationBell } from "./notification-bell";
import { SiteSelector } from "./site-selector";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const { isConnected } = useRealtime();
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-(--shadow-dark) bg-background px-4 md:px-6">
      <SiteSelector />
      <div className="flex-1" />

      {/* Trạng thái realtime */}
      <span
        title={t(isConnected ? "header.realtime.on" : "header.realtime.off")}
        className={`h-2.5 w-2.5 rounded-full ${
          isConnected ? "bg-emerald-500" : "bg-red-500"
        }`}
      />

      <NotificationBell />

      <ThemeToggle />

      <button
        type="button"
        onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:shadow-nm-sm"
      >
        {locale === "vi-VN" ? "EN" : "VI"}
      </button>

      <UserMenu />
    </header>
  );
}
