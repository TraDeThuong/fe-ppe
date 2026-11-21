"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { isNotificationRead } from "@/lib/notification-inbox";
import {
  formatExactNotificationTime,
  formatRelativeNotificationTime,
  parseNotificationDisplay,
} from "@/lib/notification-display";
import {
  getChannelDisplay,
  KIND_META,
  SEVERITY_META,
} from "./notification-meta-badges";
import type { NotificationItemDto } from "@/types";

export interface NotificationItemProps {
  notification: NotificationItemDto;
  selected?: boolean;
  onSelect?: (notification: NotificationItemDto) => void;
  onMarkAsRead?: (id: string) => void;
  isMarkingRead?: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
}

export function NotificationItem({
  notification,
  selected = false,
  onSelect,
  onMarkAsRead,
  isMarkingRead = false,
  onDelete,
  isDeleting = false,
  className = "",
}: NotificationItemProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [imgError, setImgError] = useState(false);

  const isUnread = !isNotificationRead(notification);
  const severity = notification.severity || "NORMAL";
  const sevConfig = SEVERITY_META[severity] || SEVERITY_META.NORMAL;
  const SeverityIcon = sevConfig.icon;

  const parsed = parseNotificationDisplay(notification, isVietnamese);
  const kindConfig = KIND_META[parsed.kind];
  const KindIcon = kindConfig.icon;
  const channelInfo = getChannelDisplay(notification.channel);

  const timestamp = notification.sentAt || notification.createdAt;
  const timeString = formatRelativeNotificationTime(timestamp, isVietnamese);
  const exactTimeString = formatExactNotificationTime(timestamp, locale);

  const isInteractive = Boolean(onSelect);

  const cardSurfaceClass = selected
    ? "border-primary/45 bg-primary/[0.04] shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
    : isUnread
      ? "border-primary/25 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] hover:border-primary/40"
      : "border-border/30 bg-background/90 opacity-90 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] hover:opacity-100 hover:border-border/50";

  return (
    <article
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? selected : undefined}
      onClick={isInteractive ? () => onSelect?.(notification) : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(notification);
              }
            }
          : undefined
      }
      className={[
        "group relative flex overflow-hidden rounded-2xl border px-3 py-2.5 transition-all duration-200 sm:px-3.5 sm:py-2.5",
        isInteractive ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30" : "",
        cardSurfaceClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Left Severity Accent Bar */}
      <span
        aria-hidden="true"
        className={`mr-2.5 w-1 shrink-0 rounded-full transition-opacity ${sevConfig.accentBarClass} ${
          isUnread || selected ? "opacity-100" : "opacity-45 group-hover:opacity-80"
        }`}
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Top Row: Category Medallion + Badges + Time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {/* Kind Medallion */}
            <span
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-lg border shadow-[1px_1px_3px_var(--shadow-dark)] ${kindConfig.medallionClass}`}
              aria-hidden="true"
            >
              <KindIcon className="size-3" />
            </span>

            {/* Unread Beacon */}
            {isUnread && (
              <span
                title={isVietnamese ? "Chưa đọc" : "Unread"}
                className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
              />
            )}

            {/* Category Tag */}
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${kindConfig.pillClass}`}
            >
              {isVietnamese ? kindConfig.vi : kindConfig.en}
            </span>

            {/* Severity Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${sevConfig.badgeClass}`}
            >
              <SeverityIcon className="size-2.5" />
              <span>{t(sevConfig.labelKey)}</span>
            </span>

            {/* Channel Tag */}
            <span className="rounded-md border border-border/40 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {channelInfo.label}
            </span>
          </div>

          {/* Timestamp */}
          {timeString && (
            <time
              dateTime={timestamp ? new Date(timestamp).toISOString() : undefined}
              title={exactTimeString}
              className="flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium text-muted-foreground"
            >
              <Clock className="size-3" />
              <span>{timeString}</span>
            </time>
          )}
        </div>

        {/* Title + Preview Body + Optional Thumbnail */}
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3
              className={`line-clamp-1 text-[13px] font-bold tracking-tight transition-colors group-hover:text-primary ${
                isUnread || selected ? "text-foreground" : "text-foreground/85"
              }`}
            >
              {parsed.cleanTitle}
            </h3>

            <p className="line-clamp-1 text-[11.5px] leading-snug text-muted-foreground">
              {parsed.cleanBody}
            </p>
          </div>

          {notification.evidenceUrl && !imgError && (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={notification.evidenceUrl}
                alt={isVietnamese ? "Bằng chứng vi phạm" : "Violation evidence"}
                onError={() => setImgError(true)}
                className="size-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Bottom Context Chips + Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {parsed.violationLabel && (
              <span className="inline-flex items-center gap-1 rounded-md border border-danger/20 bg-danger/5 px-2 py-0.5 text-[10px] font-semibold text-danger">
                <ShieldAlert className="size-2.5 shrink-0" />
                <span className="truncate">{parsed.violationLabel}</span>
              </span>
            )}

            {parsed.siteName && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-[1px_1px_2px_var(--shadow-dark)]">
                <MapPin className="size-2.5 shrink-0 text-primary" />
                <span className="max-w-[140px] truncate">{parsed.siteName}</span>
              </span>
            )}

            {parsed.cameraCode && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-[1px_1px_2px_var(--shadow-dark)]">
                <Camera className="size-2.5 shrink-0 text-primary" />
                <span>{parsed.cameraCode}</span>
              </span>
            )}

            {parsed.groupCount > 1 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Layers className="size-2.5 shrink-0" />
                <span>
                  {isVietnamese
                    ? `Nhóm ${parsed.groupCount} sự cố`
                    : `${parsed.groupCount} incidents`}
                </span>
              </span>
            )}
          </div>

          <div
            className="ml-auto flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Standalone mode link (khi không dùng Master-Detail panel) */}
            {!isInteractive && parsed.incidentHref && (
              <Link
                href={parsed.incidentHref}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/15 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
              >
                <span>
                  {parsed.isGroupLink
                    ? isVietnamese
                      ? "Mở nhóm xử lý"
                      : "Open incident group"
                    : t("notifications.actions.viewIncident")}
                </span>
                <ExternalLink className="size-3" />
              </Link>
            )}

            {!isInteractive && notification.actionUrl && !parsed.incidentHref && (
              <Link
                href={notification.actionUrl}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/15 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
              >
                <span>{isVietnamese ? "Chi tiết" : "Details"}</span>
                <ExternalLink className="size-3" />
              </Link>
            )}

            {isUnread && onMarkAsRead && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification.id)}
                disabled={isMarkingRead}
                title={t("notifications.actions.markRead")}
                aria-label={t("notifications.actions.markRead")}
                className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/40 hover:text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:opacity-40"
              >
                <Check className="size-3 text-emerald-500" />
                <span className={isInteractive ? "hidden sm:inline" : ""}>
                  {isVietnamese ? "Đã đọc" : "Read"}
                </span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(notification.id)}
                disabled={isDeleting}
                title={t("notifications.actions.delete")}
                aria-label={t("notifications.actions.delete")}
                className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background text-muted-foreground transition-all hover:border-destructive/30 hover:text-destructive shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
