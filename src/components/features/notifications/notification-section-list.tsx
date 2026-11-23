"use client";

import { useState } from "react";
import {
  Camera,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type {
  NotificationPersonCluster,
  NotificationSectionGroup,
} from "@/lib/notification-grouping-engine";
import { NotificationEmptyState } from "./notification-empty-state";
import { NotificationItem } from "./notification-item";
import { NotificationPersonClusterCard } from "./notification-person-cluster-card";
import { NotificationSkeleton } from "./notification-skeleton";
import type { NotificationItemDto } from "@/types";

export interface NotificationSectionListProps {
  sections: NotificationSectionGroup[];
  totalRawItems: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  selectedId?: string | null;
  onSelect?: (
    notification: NotificationItemDto,
    cluster?: NotificationPersonCluster,
  ) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkManyAsRead?: (ids: string[]) => void;
  isMarkingManyRead?: boolean;
  markingReadId?: string | null;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function NotificationSectionList({
  sections,
  totalRawItems,
  isLoading = false,
  error,
  onRetry,
  selectedId,
  onSelect,
  onMarkAsRead,
  onMarkManyAsRead,
  isMarkingManyRead = false,
  markingReadId,
  onDelete,
  deletingId,
  onResetFilters,
  hasActiveFilters = false,
  className = "",
}: NotificationSectionListProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (error && sections.length === 0) {
    return (
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
    );
  }

  if (isLoading) {
    return <NotificationSkeleton count={4} />;
  }

  if (sections.length === 0) {
    return (
      <NotificationEmptyState
        onResetFilters={hasActiveFilters ? onResetFilters : undefined}
      />
    );
  }

  const totalUnread = sections.reduce((sum, sec) => sum + sec.unreadCount, 0);
  const sectionKind = sections[0]?.kind ?? "hour";

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/30 bg-background/80 px-3 py-2 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="size-3.5 text-primary" />
          <span>
            {isVietnamese ? (
              <>
                <span className="font-bold text-foreground">{sections.length}</span>{" "}
                {sectionKind === "hour" ? "khung giờ" : "camera / nhóm"} ·{" "}
                <span className="font-bold text-foreground">{totalRawItems}</span> thông báo
              </>
            ) : (
              <>
                <span className="font-bold text-foreground">{sections.length}</span>{" "}
                {sectionKind === "hour" ? "time buckets" : "cameras"} ·{" "}
                <span className="font-bold text-foreground">{totalRawItems}</span> alerts
              </>
            )}
          </span>
        </div>

        {totalUnread > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span>
              {totalUnread} {isVietnamese ? "chưa đọc" : "unread"}
            </span>
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isCollapsed = Boolean(collapsedMap[section.key]);
          const SectionIcon = section.kind === "hour" ? Clock : Camera;

          return (
            <section
              key={section.key}
              data-testid="notification-section-group"
              className="overflow-hidden rounded-2xl border border-border/35 bg-background/60 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between gap-2 border-b border-border/25 bg-background/95 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={!isCollapsed}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                    <SectionIcon className="size-3" />
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h3 className="truncate font-mono text-xs font-extrabold text-foreground">
                      {section.title}
                    </h3>
                    <span className="rounded-full border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                      {section.totalNotifications}
                    </span>
                    {section.unreadCount > 0 && (
                      <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {section.unreadCount} {isVietnamese ? "mới" : "new"}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  {section.unreadNotificationIds.length > 0 && onMarkManyAsRead && (
                    <button
                      type="button"
                      disabled={isMarkingManyRead}
                      onClick={() => onMarkManyAsRead(section.unreadNotificationIds)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-background px-1.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      <CheckCheck className="size-3" />
                      <span>
                        {isVietnamese
                          ? `Đọc (${section.unreadCount})`
                          : `Read (${section.unreadCount})`}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    aria-label={isCollapsed ? "Mở rộng" : "Thu gọn"}
                    className="flex size-6 items-center justify-center rounded-lg border border-border/35 bg-background text-muted-foreground hover:text-primary"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronUp className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Section Body */}
              {!isCollapsed && (
                <div className="flex flex-col gap-2 p-2.5">
                  {section.clusters.map((cluster) =>
                    cluster.count > 1 ? (
                      <NotificationPersonClusterCard
                        key={cluster.key}
                        cluster={cluster}
                        selectedId={selectedId}
                        onSelect={(notif, cl) => onSelect?.(notif, cl)}
                        onMarkAsRead={onMarkAsRead}
                        onMarkManyAsRead={onMarkManyAsRead}
                        isMarkingManyRead={isMarkingManyRead}
                        markingReadId={markingReadId}
                      />
                    ) : (
                      <NotificationItem
                        key={cluster.primary.id}
                        notification={cluster.primary}
                        selected={selectedId === cluster.primary.id}
                        onSelect={(notif) => onSelect?.(notif, cluster)}
                        onMarkAsRead={onMarkAsRead}
                        isMarkingRead={markingReadId === cluster.primary.id}
                        onDelete={onDelete}
                        isDeleting={deletingId === cluster.primary.id}
                      />
                    ),
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
