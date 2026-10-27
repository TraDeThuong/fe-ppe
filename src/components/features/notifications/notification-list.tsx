"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { NotificationItem } from "./notification-item";
import { NotificationSkeleton } from "./notification-skeleton";
import { NotificationEmptyState } from "./notification-empty-state";
import type { NotificationItemDto } from "@/types";

export interface NotificationListProps {
  items: NotificationItemDto[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onMarkAsRead?: (id: string) => void;
  markingReadId?: string | null;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function NotificationList({
  items,
  total = 0,
  page = 1,
  limit = 20,
  totalPages = 1,
  isLoading = false,
  onPageChange,
  onMarkAsRead,
  markingReadId,
  onDelete,
  deletingId,
  onResetFilters,
  className = "",
}: NotificationListProps) {
  if (isLoading) {
    return <NotificationSkeleton count={4} />;
  }

  if (!items || items.length === 0) {
    return <NotificationEmptyState onResetFilters={onResetFilters} />;
  }

  const startIdx = Math.max(1, (page - 1) * limit + 1);
  const endIdx = Math.min(total, page * limit);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Notifications Cards Container */}
      <div className="flex flex-col gap-3">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            isMarkingRead={markingReadId === notification.id}
            onDelete={onDelete}
            isDeleting={deletingId === notification.id}
          />
        ))}
      </div>

      {/* Neumorphic Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/30 bg-background p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] sm:flex-row sm:p-4">
          <p className="text-xs text-muted-foreground font-medium">
            Hiển thị <span className="font-bold text-foreground">{startIdx}</span> -{" "}
            <span className="font-bold text-foreground">{endIdx}</span> trên{" "}
            <span className="font-bold text-foreground">{total}</span> thông báo
          </p>

          <div className="flex items-center gap-1.5">
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex size-8 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <div key={p} className="flex items-center gap-1.5">
                    {showEllipsis && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onPageChange(p)}
                      className={`flex size-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        p === page
                          ? "border border-primary/40 bg-background text-primary shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
                          : "border border-border/30 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] hover:text-primary active:shadow-[inset_1px_1px_3px_var(--shadow-dark)]"
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                );
              })}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex size-8 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40"
              aria-label="Trang tiếp theo"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
