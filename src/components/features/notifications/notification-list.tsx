"use client";

import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { isNotificationRead } from "@/lib/notification-inbox";
import { NotificationItem } from "./notification-item";
import { NotificationSkeleton } from "./notification-skeleton";
import { NotificationEmptyState } from "./notification-empty-state";
import type { NotificationItemDto } from "@/types";

export interface NotificationListProps {
  items: NotificationItemDto[];
  total?: number;
  page?: number;
  limit?: number;
  limitOptions?: number[];
  totalPages?: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  selectedId?: string | null;
  onSelect?: (notification: NotificationItemDto) => void;
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
  limitOptions = [5, 10, 20, 50],
  totalPages = 1,
  isLoading = false,
  error,
  onRetry,
  onPageChange,
  onLimitChange,
  selectedId,
  onSelect,
  onMarkAsRead,
  markingReadId,
  onDelete,
  deletingId,
  onResetFilters,
  hasActiveFilters = false,
  className = "",
}: NotificationListProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const errorNotice = error ? (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-danger/30 bg-surface p-4 text-sm"
    >
      <p>
        {isVietnamese
          ? "Không tải được đầy đủ hộp thư."
          : "Unable to load the complete inbox."}{" "}
        {error.message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-primary underline"
        >
          {isVietnamese ? "Thử lại" : "Retry"}
        </button>
      )}
    </div>
  ) : null;

  if (error && !items?.length) return errorNotice;

  if (isLoading) {
    return <NotificationSkeleton count={4} />;
  }

  if (!items || items.length === 0) {
    return (
      <NotificationEmptyState
        onResetFilters={hasActiveFilters ? onResetFilters : undefined}
      />
    );
  }

  const startIdx = Math.max(1, (page - 1) * limit + 1);
  const endIdx = Math.min(total || items.length, page * limit);
  const unreadInPage = items.filter((item) => !isNotificationRead(item)).length;
  const showPagination = Boolean((totalPages > 1 && onPageChange) || onLimitChange);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {errorNotice}

      {/* Compact List Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/30 bg-background/80 px-3 py-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="size-3.5 text-primary" />
          <span>
            {isVietnamese ? (
              <>
                Đang xem{" "}
                <span className="font-bold text-foreground">
                  {startIdx}–{endIdx}
                </span>{" "}
                / <span className="font-bold text-foreground">{total}</span>{" "}
                thông báo
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-bold text-foreground">
                  {startIdx}–{endIdx}
                </span>{" "}
                of <span className="font-bold text-foreground">{total}</span>
              </>
            )}
          </span>
        </div>

        {unreadInPage > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span>
              {unreadInPage}{" "}
              {isVietnamese ? "chưa đọc trong trang" : "unread on page"}
            </span>
          </span>
        )}
      </div>

      {/* Notifications Cards Container */}
      <div className="flex flex-col gap-2">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            selected={selectedId === notification.id}
            onSelect={onSelect}
            onMarkAsRead={onMarkAsRead}
            isMarkingRead={markingReadId === notification.id}
            onDelete={onDelete}
            isDeleting={deletingId === notification.id}
          />
        ))}
      </div>

      {/* Neumorphic Pagination Footer */}
      {showPagination && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border/30 bg-background p-2.5 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] sm:px-3.5 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              {isVietnamese ? (
                <>
                  Trang <span className="font-bold text-foreground">{page}</span> /{" "}
                  <span className="font-bold text-foreground">{Math.max(1, totalPages)}</span>
                </>
              ) : (
                <>
                  Page <span className="font-bold text-foreground">{page}</span> of{" "}
                  <span className="font-bold text-foreground">{Math.max(1, totalPages)}</span>
                </>
              )}
            </p>

            {onLimitChange && (
              <div
                role="group"
                aria-label={isVietnamese ? "Số thông báo mỗi trang" : "Items per page"}
                className="inline-flex items-center gap-1 rounded-xl border border-border/30 bg-background/80 p-1 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
              >
                <span className="px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Hiển thị:" : "Show:"}
                </span>
                {limitOptions.map((opt) => {
                  const active = opt === limit;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onLimitChange(opt)}
                      aria-pressed={active}
                      className={`min-w-[26px] cursor-pointer rounded-lg px-1.5 py-0.5 font-mono text-[11px] font-bold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex size-8 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40"
                aria-label={isVietnamese ? "Trang trước" : "Previous page"}
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <div key={p} className="flex items-center gap-1.5">
                      {showEllipsis && (
                        <span className="px-1 text-xs text-muted-foreground">
                          ...
                        </span>
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

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex size-8 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:pointer-events-none disabled:opacity-40"
                aria-label={isVietnamese ? "Trang tiếp theo" : "Next page"}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
