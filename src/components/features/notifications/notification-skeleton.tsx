"use client";

export function NotificationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3.5" aria-busy="true" aria-label="Đang tải thông báo...">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl border border-border/20 bg-background p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] sm:p-5"
        >
          {/* Top Bar Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-muted/40 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-muted/30 animate-pulse" />
              <div className="h-4 w-14 rounded-md bg-muted/20 animate-pulse" />
            </div>
            <div className="h-3.5 w-16 rounded bg-muted/30 animate-pulse" />
          </div>

          {/* Title & Description Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded-md bg-muted/40 animate-pulse" />
            <div className="h-3 w-full rounded-md bg-muted/20 animate-pulse" />
            <div className="h-3 w-5/6 rounded-md bg-muted/20 animate-pulse" />
          </div>

          {/* Bottom Bar Skeleton */}
          <div className="flex items-center justify-between border-t border-border/20 pt-3">
            <div className="h-7 w-28 rounded-xl bg-muted/30 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 rounded-lg bg-muted/20 animate-pulse" />
              <div className="size-6 rounded-lg bg-muted/20 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
