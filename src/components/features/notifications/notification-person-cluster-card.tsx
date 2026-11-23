"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { isNotificationRead } from "@/lib/notification-inbox";
import {
  formatExactNotificationTime,
  formatRelativeNotificationTime,
  formatViolationTypeLabel,
  parseNotificationDisplay,
} from "@/lib/notification-display";
import type { NotificationPersonCluster } from "@/lib/notification-grouping-engine";
import { SEVERITY_META } from "./notification-meta-badges";
import type { NotificationItemDto } from "@/types";

export interface NotificationPersonClusterCardProps {
  cluster: NotificationPersonCluster;
  selectedId?: string | null;
  onSelect?: (notification: NotificationItemDto, cluster: NotificationPersonCluster) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkManyAsRead?: (ids: string[]) => void;
  isMarkingManyRead?: boolean;
  markingReadId?: string | null;
  className?: string;
}

function formatClockShort(
  dateString: string | Date | null | undefined,
  locale: string,
): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function NotificationPersonClusterCard({
  cluster,
  selectedId,
  onSelect,
  onMarkAsRead,
  onMarkManyAsRead,
  isMarkingManyRead = false,
  markingReadId,
  className = "",
}: NotificationPersonClusterCardProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [expanded, setExpanded] = useState(false);

  const primary = cluster.primary;
  const isUnread = cluster.unreadCount > 0;
  const isAnyMemberSelected = cluster.items.some((m) => m.id === selectedId);
  const sevConfig = SEVERITY_META[cluster.highestSeverity] || SEVERITY_META.HIGH;
  const SeverityIcon = sevConfig.icon;

  const unreadIds = cluster.items
    .filter((m) => !isNotificationRead(m))
    .map((m) => m.id);

  const relativeTime = formatRelativeNotificationTime(cluster.latestAt, isVietnamese);
  const exactTime = formatExactNotificationTime(cluster.latestAt, locale);

  const violationBadges = cluster.violationCodes.map((code) => ({
    code,
    label: formatViolationTypeLabel(code, isVietnamese),
  }));

  const synthesizedTitle = cluster.isMultiViolation
    ? isVietnamese
      ? `Đa vi phạm PPE (${violationBadges.length} lỗi)${cluster.siteName ? ` tại ${cluster.siteName}` : ""}`
      : `Multiple PPE Violations (${violationBadges.length})${cluster.siteName ? ` at ${cluster.siteName}` : ""}`
    : parseNotificationDisplay(primary, isVietnamese).cleanTitle;

  const surfaceClass = isAnyMemberSelected
    ? "border-primary/50 bg-primary/[0.04] shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]"
    : isUnread
      ? "border-primary/30 bg-background shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] hover:border-primary/45"
      : "border-border/35 bg-background/90 opacity-90 shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)] hover:opacity-100";

  return (
    <article
      data-testid="notification-person-cluster"
      data-multi-violation={cluster.isMultiViolation ? "true" : "false"}
      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${surfaceClass} ${className}`}
    >
      {/* Main clickable card area */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isAnyMemberSelected}
        onClick={() => onSelect?.(primary, cluster)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(primary, cluster);
          }
        }}
        className="group relative flex cursor-pointer px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
      >
        {/* Left severity accent bar */}
        <span
          aria-hidden="true"
          className={`mr-2.5 w-1 shrink-0 rounded-full ${sevConfig.accentBarClass} ${
            isUnread || isAnyMemberSelected ? "opacity-100" : "opacity-50"
          }`}
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Row 1: Unread dot + Cluster badge + Severity + Relative time */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {isUnread && (
                <span
                  title={isVietnamese ? "Có thông báo chưa đọc" : "Has unread alerts"}
                  className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
                />
              )}

              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
                  cluster.isMultiViolation
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                <Layers className="size-2.5" />
                <span>
                  {cluster.isMultiViolation
                    ? isVietnamese
                      ? `Đa vi phạm · ${cluster.count}`
                      : `Multi · ${cluster.count}`
                    : isVietnamese
                      ? `Cùng người · ${cluster.count}`
                      : `Same person · ${cluster.count}`}
                </span>
              </span>

              <span
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${sevConfig.badgeClass}`}
              >
                <SeverityIcon className="size-2.5" />
                <span>{t(sevConfig.labelKey)}</span>
              </span>
            </div>

            {relativeTime && (
              <time
                dateTime={new Date(cluster.latestAt).toISOString()}
                title={exactTime}
                className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-muted-foreground"
              >
                <Clock className="size-2.5 opacity-75" />
                <span>{relativeTime}</span>
              </time>
            )}
          </div>

          {/* Row 2: Compact Violation Tags (or single clean title if non-violation cluster) */}
          {violationBadges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {violationBadges.map((vb) => (
                <span
                  key={vb.code}
                  className="inline-flex items-center gap-1 rounded-md border border-danger/20 bg-danger/8 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger"
                >
                  <ShieldAlert className="size-2.5 shrink-0" />
                  <span>{vb.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <h3 className="line-clamp-1 text-[12.5px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {synthesizedTitle}
            </h3>
          )}

          {/* Row 3: Slim inline context (Track ID · Camera · Site) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
            {cluster.trackId !== null && (
              <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-primary">
                <UserCheck className="size-2.5" />
                <span>#{cluster.trackId}</span>
              </span>
            )}

            {cluster.cameraCode && (
              <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold text-foreground/80">
                <Camera className="size-2.5 text-primary/80" />
                <span>{cluster.cameraCode}</span>
              </span>
            )}

            {cluster.siteName && (
              <span className="inline-flex min-w-0 max-w-[130px] items-center gap-0.5">
                <MapPin className="size-2.5 shrink-0 text-primary/80" />
                <span className="truncate">{cluster.siteName}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact Footer Strip */}
      <div className="flex items-center justify-between gap-2 border-t border-border/20 bg-primary/[0.02] px-3 py-1 text-[10.5px]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:underline"
        >
          <span>
            {expanded
              ? isVietnamese
                ? "Thu gọn"
                : "Hide"
              : isVietnamese
                ? `${cluster.count} bản ghi`
                : `${cluster.count} records`}
          </span>
          {expanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>

        {unreadIds.length > 0 && onMarkManyAsRead && (
          <button
            type="button"
            disabled={isMarkingManyRead}
            onClick={() => onMarkManyAsRead(unreadIds)}
            className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <CheckCheck className="size-2.5" />
            <span>
              {isVietnamese
                ? `Đọc (${unreadIds.length})`
                : `Read (${unreadIds.length})`}
            </span>
          </button>
        )}
      </div>

      {/* Expanded member list: every original notification & incident remains 1-click accessible */}
      {expanded && (
        <div className="divide-y divide-border/20 border-t border-border/25 bg-background/75">
          {cluster.items.map((member) => {
            const memberUnread = !isNotificationRead(member);
            const memberSelected = selectedId === member.id;
            const parsed = parseNotificationDisplay(member, isVietnamese);
            const ts = member.sentAt || member.createdAt;
            return (
              <div
                key={member.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(member, cluster)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(member, cluster);
                  }
                }}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-xs transition-colors ${
                  memberSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted/20"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      memberUnread ? "bg-primary" : "bg-muted-foreground/35"
                    }`}
                  />
                  <span className="truncate font-semibold text-foreground">
                    {parsed.violationLabel || parsed.cleanTitle}
                  </span>
                  <span
                    title={formatExactNotificationTime(ts, locale)}
                    className="shrink-0 font-mono text-[10.5px] text-muted-foreground"
                  >
                    {formatClockShort(ts, locale)}
                  </span>
                </div>

                <div
                  className="flex shrink-0 items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {parsed.incidentHref && (
                    <Link
                      href={parsed.incidentHref}
                      className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-background px-2 py-0.5 text-[10.5px] font-semibold text-primary hover:bg-primary/10"
                    >
                      <span>{isVietnamese ? "Hồ sơ" : "Open"}</span>
                      <ExternalLink className="size-2.5" />
                    </Link>
                  )}
                  {memberUnread && onMarkAsRead && (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(member.id)}
                      disabled={markingReadId === member.id}
                      title={isVietnamese ? "Đánh dấu đã đọc" : "Mark as read"}
                      className="inline-flex items-center rounded-md border border-border/40 bg-background px-1.5 py-0.5 text-[10px] hover:text-primary disabled:opacity-40"
                    >
                      <Check className="size-2.5 text-success" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
