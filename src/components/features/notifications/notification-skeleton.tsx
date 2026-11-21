"use client";

import { useLocale } from "@/providers/locale-provider";

export function NotificationSkeleton({ count = 3 }: { count?: number }) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <div
      className="space-y-2.5"
      aria-busy="true"
      aria-label={isVietnamese ? "Đang tải thông báo..." : "Loading notifications..."}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-2xl border border-border/20 bg-background p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
        >
          <div className="w-1 shrink-0 rounded-full bg-muted/40 animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-6 rounded-lg bg-muted/35 animate-pulse" />
                <div className="h-4 w-20 rounded-full bg-muted/30 animate-pulse" />
                <div className="h-4 w-16 rounded-full bg-muted/25 animate-pulse" />
              </div>
              <div className="h-3.5 w-16 rounded bg-muted/30 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="h-4 w-3/4 rounded-md bg-muted/40 animate-pulse" />
              <div className="h-3 w-full rounded-md bg-muted/20 animate-pulse" />
              <div className="h-3 w-4/5 rounded-md bg-muted/20 animate-pulse" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-24 rounded-md bg-muted/25 animate-pulse" />
                <div className="h-4 w-16 rounded-md bg-muted/20 animate-pulse" />
              </div>
              <div className="h-6 w-16 rounded-lg bg-muted/25 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
