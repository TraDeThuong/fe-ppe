"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  Check,
  Trash2,
  ExternalLink,
  Camera,
  MapPin,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto, NotificationSeverity } from "@/types";

export interface NotificationItemProps {
  notification: NotificationItemDto;
  onMarkAsRead?: (id: string) => void;
  isMarkingRead?: boolean;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
}

/** Helper định dạng thời gian tương đối */
function formatRelativeTime(
  dateString: string | Date | null | undefined,
  isVietnamese: boolean,
): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return isVietnamese ? "Vừa xong" : "Just now";
  if (diffMin < 60)
    return isVietnamese ? `${diffMin} phút trước` : `${diffMin}m ago`;
  if (diffHour < 24)
    return isVietnamese ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  if (diffDay === 1) return isVietnamese ? "Hôm qua" : "Yesterday";
  if (diffDay < 7)
    return isVietnamese ? `${diffDay} ngày trước` : `${diffDay}d ago`;

  return date.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEVERITY_CONFIG: Record<
  NotificationSeverity,
  {
    badgeClass: string;
    borderClass: string;
    icon: typeof AlertTriangle;
    labelKey: string;
  }
> = {
  CRITICAL: {
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
    borderClass: "border-red-500/30",
    icon: AlertTriangle,
    labelKey: "notifications.severity.CRITICAL",
  },
  HIGH: {
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
    borderClass: "border-amber-500/30",
    icon: AlertCircle,
    labelKey: "notifications.severity.HIGH",
  },
  NORMAL: {
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
    borderClass: "border-blue-500/25",
    icon: Info,
    labelKey: "notifications.severity.NORMAL",
  },
  MEDIUM: {
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
    borderClass: "border-blue-500/25",
    icon: Info,
    labelKey: "notifications.severity.MEDIUM",
  },
  LOW: {
    badgeClass: "bg-muted/50 text-muted-foreground border-border/40",
    borderClass: "border-border/30",
    icon: Bell,
    labelKey: "notifications.severity.LOW",
  },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  isMarkingRead = false,
  onDelete,
  isDeleting = false,
  className = "",
}: NotificationItemProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [imgError, setImgError] = useState(false);

  const isUnread =
    notification.isRead === false ||
    notification.status === "PENDING" ||
    notification.status === "SENT";

  const severity = notification.severity || "NORMAL";
  const sevConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.NORMAL;
  const SeverityIcon = sevConfig.icon;

  const timeString = formatRelativeTime(
    notification.sentAt || notification.createdAt,
    isVietnamese,
  );

  const meta = notification.metadata || {};
  const siteName = meta.siteName || meta.siteId;
  const cameraCode = meta.cameraCode || meta.cameraId;
  const violationType = meta.violationType;

  return (
    <article
      className={[
        "group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 sm:p-5",
        "bg-background text-foreground",
        isUnread
          ? "border-primary/30 shadow-[5px_5px_14px_var(--shadow-dark),-5px_-5px_14px_var(--shadow-light)]"
          : "border-border/30 opacity-90 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] hover:opacity-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top Bar: Severity Badge + Unread Beacon + Time + Channel */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Unread beacon */}
          {isUnread && (
            <span
              title="Chưa đọc"
              className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
            />
          )}

          {/* Severity Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${sevConfig.badgeClass}`}
          >
            <SeverityIcon className="size-3" />
            <span>{t(sevConfig.labelKey)}</span>
          </span>

          {/* Channel Tag */}
          <span className="rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {notification.channel}
          </span>
        </div>

        {/* Timestamp */}
        {timeString && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <Clock className="size-3" />
            <span>{timeString}</span>
          </div>
        )}
      </div>

      {/* Main Content Area: Title, Description, Image */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3
            className={`text-sm sm:text-base font-bold tracking-tight ${
              isUnread ? "text-foreground" : "text-foreground/80"
            }`}
          >
            {notification.title}
          </h3>

          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {notification.content}
          </p>

          {/* Metadata chips (Location, Camera, Violation) */}
          {(siteName || cameraCode || violationType) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {violationType && (
                <span className="inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  <ShieldAlert className="size-3" />
                  <span>{String(violationType)}</span>
                </span>
              )}

              {siteName && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-0.5 text-[10px] text-muted-foreground shadow-[1px_1px_3px_var(--shadow-dark)]">
                  <MapPin className="size-3 text-primary" />
                  <span>{String(siteName)}</span>
                </span>
              )}

              {cameraCode && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground shadow-[1px_1px_3px_var(--shadow-dark)]">
                  <Camera className="size-3 text-primary" />
                  <span>{String(cameraCode)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Evidence Snapshot Thumbnail (if available) */}
        {notification.evidenceUrl && !imgError && (
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background shadow-[inset_1px_1px_3px_var(--shadow-dark)] sm:w-28 sm:h-20 w-full h-36">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={notification.evidenceUrl}
              alt="Bằng chứng vi phạm"
              onError={() => setImgError(true)}
              className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        )}
      </div>

      {/* Footer Actions: Link to Incident, Mark Read, Delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3">
        <div className="flex items-center gap-2">
          {notification.incidentId && (
            <Link
              href={`/incidents?id=${encodeURIComponent(notification.incidentId)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_3px_var(--shadow-dark)]"
            >
              <span>{t("notifications.actions.viewIncident")}</span>
              <ExternalLink className="size-3" />
            </Link>
          )}

          {notification.actionUrl && !notification.incidentId && (
            <Link
              href={notification.actionUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]"
            >
              <span>Chi tiết</span>
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Nút đánh dấu đã đọc */}
          {isUnread && onMarkAsRead && (
            <button
              type="button"
              onClick={() => onMarkAsRead(notification.id)}
              disabled={isMarkingRead}
              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:text-primary shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:opacity-40"
            >
              <Check className="size-3 text-emerald-500" />
              <span>{t("notifications.actions.markRead")}</span>
            </button>
          )}

          {/* Nút xóa thông báo */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(notification.id)}
              disabled={isDeleting}
              title={t("notifications.actions.delete")}
              aria-label={t("notifications.actions.delete")}
              className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background text-muted-foreground transition-all hover:text-destructive hover:border-destructive/30 shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] active:shadow-[inset_1px_1px_3px_var(--shadow-dark)] disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
