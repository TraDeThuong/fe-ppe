"use client";

import { Skeleton } from "@/components/ui/skeleton";

export interface PageSkeletonProps {
  /**
   * Tùy biến kiểu hiển thị skeleton:
   * - "table": Header + 4 KPI cards + Filter bar + Data rows (Incidents, Cameras, Sites, Users, Audit Logs, v.v.)
   * - "dashboard": Header + 4 KPI cards + Grid 2 cột biểu đồ / widgets
   * - "simple": Header + Content card đơn
   */
  variant?: "table" | "dashboard" | "simple";
  className?: string;
}

export function PageSkeleton({
  variant = "table",
  className = "",
}: PageSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải trang…"
      className={`space-y-6 animate-in fade-in duration-200 ${className}`}
    >
      {/* 1. Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Neumorphic icon socket placeholder */}
          <Skeleton
            rounded="xl"
            className="h-11 w-11 shrink-0 border border-white/40 dark:border-white/5"
          />
          <div className="space-y-2">
            <Skeleton className="h-6 w-36 sm:w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-52 sm:w-72 rounded-md" />
          </div>
        </div>

        {/* Action buttons placeholder */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. KPI / Metrics Ribbon Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/50 bg-background p-4
              shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]
              dark:border-white/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3. Main Body Skeleton */}
      {variant === "dashboard" ? (
        /* Dashboard 2-column layout */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            className="lg:col-span-2 rounded-2xl border border-white/50 bg-background p-5 sm:p-6
              shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
              dark:border-white/5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--shadow-dark)]/10 pb-3">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>

          <div
            className="rounded-2xl border border-white/50 bg-background p-5 sm:p-6
              shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
              dark:border-white/5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--shadow-dark)]/10 pb-3">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : variant === "simple" ? (
        /* Simple panel */
        <div
          className="rounded-2xl border border-white/50 bg-background p-6
            shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
            dark:border-white/5 space-y-4"
        >
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        /* Table / List layout (default) */
        <div
          className="rounded-2xl border border-white/50 bg-background p-5 sm:p-6
            shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]
            dark:border-white/5 space-y-4"
        >
          {/* Filter Toolbar Placeholder */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--shadow-dark)]/10 pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Skeleton className="h-9 w-44 sm:w-60 rounded-xl" />
              <Skeleton className="h-9 w-24 sm:w-28 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>

          {/* Table Rows Placeholder */}
          <div className="space-y-3 pt-1">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 py-3 border-b border-[var(--shadow-dark)]/5 last:border-0"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1 max-w-md">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28 rounded-md shrink-0 hidden md:block" />
                <Skeleton className="h-8 w-16 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
