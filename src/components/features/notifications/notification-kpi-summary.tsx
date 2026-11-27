"use client";

import { useMemo } from "react";
import {
  Bell,
  Inbox,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-cards";
import { parseNotificationDisplay } from "@/lib/notification-display";
import { isNotificationRead } from "@/lib/notification-inbox";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto } from "@/types";

export type NotificationStatKey = "total" | "unread" | "ppeAlerts" | "resolved";

export interface NotificationKpiStatsData {
  total: number;
  unread: number;
  ppeAlerts: number;
  resolved: number;
}

export interface NotificationKpiSummaryProps {
  /** Danh sách thông báo hiện tại (dùng để tính toán đồng nhất trên toàn trang) */
  notifications?: NotificationItemDto[];
  /** Tổng số lượng thông báo */
  totalCount?: number;
  /** Số lượng tin chưa đọc */
  unreadCount?: number;
  /** Hoặc truyền trực tiếp đối tượng stats đã tính toán */
  stats?: NotificationKpiStatsData;
  /** Số liệu gốc chưa gom (tùy chọn) */
  rawStats?: {
    total: number;
    unread: number;
    ppeAlerts: number;
  };
  /** Biến thể thiết kế: classic | soft-extruded | deep-elevation (mặc định: soft-extruded) */
  variant?: "classic" | "soft-extruded" | "deep-elevation";
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  unavailable?: boolean;
  className?: string;
}

function isPpeViolationItem(item: NotificationItemDto, isVietnamese: boolean): boolean {
  const parsed = parseNotificationDisplay(item, isVietnamese);
  if (parsed.kind === "PPE_ALERT") return true;
  if (parsed.kind === "COMMENT") return false;
  return (
    item.type === "PPE_VIOLATION" ||
    item.severity === "CRITICAL" ||
    item.severity === "HIGH" ||
    Boolean(item.title?.toLowerCase().includes("ppe")) ||
    Boolean(item.title?.toLowerCase().includes("bảo hộ"))
  );
}

export function NotificationKpiSummary({
  notifications = [],
  totalCount,
  unreadCount: propUnreadCount,
  stats: externalStats,
  rawStats,
  variant = "soft-extruded",
  loading = false,
  unavailable = false,
  className = "",
}: NotificationKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const computedStats = useMemo<NotificationKpiStatsData>(() => {
    if (externalStats) {
      const safeTotal = Math.max(0, externalStats.total);
      const safeUnread = Math.max(0, Math.min(safeTotal, externalStats.unread));
      return {
        total: safeTotal,
        unread: safeUnread,
        ppeAlerts: Math.max(0, Math.min(safeTotal, externalStats.ppeAlerts)),
        resolved: Math.max(0, safeTotal - safeUnread),
      };
    }

    let unread = 0;
    let ppeAlerts = 0;

    for (const item of notifications) {
      if (!isNotificationRead(item)) {
        unread += 1;
      }
      if (isPpeViolationItem(item, isVietnamese)) {
        ppeAlerts += 1;
      }
    }

    const rawTotal = totalCount ?? notifications.length;
    const total = Math.max(notifications.length, rawTotal, 0);
    const finalUnread = Math.max(
      0,
      Math.min(total, propUnreadCount !== undefined ? propUnreadCount : unread),
    );

    return {
      total,
      unread: finalUnread,
      ppeAlerts: Math.min(total, ppeAlerts),
      resolved: Math.max(0, total - finalUnread),
    };
  }, [externalStats, notifications, totalCount, propUnreadCount, isVietnamese]);

  const { readRate, unreadRate, ppeRate } = useMemo(() => {
    if (!computedStats.total || computedStats.total <= 0) {
      return { readRate: 100, unreadRate: 0, ppeRate: 0 };
    }
    const resolvedPct = Math.max(
      0,
      Math.min(100, Math.round((computedStats.resolved / computedStats.total) * 100)),
    );
    const unreadPct = Math.max(0, Math.min(100, 100 - resolvedPct));
    const ppePct = Math.max(
      0,
      Math.min(100, Math.round((computedStats.ppeAlerts / computedStats.total) * 100)),
    );
    return {
      readRate: resolvedPct,
      unreadRate: unreadPct,
      ppeRate: ppePct,
    };
  }, [computedStats.total, computedStats.resolved, computedStats.ppeAlerts]);

  return (
    <section
      aria-label={
        isVietnamese
          ? "Thống kê trung tâm thông báo"
          : "Notification center statistics"
      }
      className={className}
    >
      {/* Bento Grid 4 Stats Cards đồng đều chiều cao & cấu trúc - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số thông báo */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.total")}
          value={unavailable ? "—" : computedStats.total}
          icon={Bell}
          tone="primary"
          showGlow={false}
          description={
            unavailable
              ? isVietnamese
                ? "Chưa tải được dữ liệu"
                : "Data unavailable"
              : rawStats && rawStats.total > computedStats.total
                ? isVietnamese
                  ? `Gom từ ${rawStats.total} thông báo gốc`
                  : `Grouped from ${rawStats.total} raw alerts`
                : isVietnamese
                  ? "Tổng số bản tin trong kỳ"
                  : "Total notifications in period"
          }
          loading={loading}
          depth="medium"
          border="subtle"
          className="h-full"
          footer={
            <span className="font-mono text-[10px] font-bold tabular-nums text-primary">
              {unavailable
                ? "—"
                : isVietnamese
                  ? `${computedStats.resolved} đã đọc`
                  : `${computedStats.resolved} read`}
            </span>
          }
        />

        {/* 2. Tin chưa đọc */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.unread")}
          value={unavailable ? "—" : computedStats.unread}
          icon={Inbox}
          tone={!unavailable && computedStats.unread > 0 ? "warning" : "primary"}
          showGlow={false}
          description={
            unavailable
              ? isVietnamese
                ? "Chưa tải được dữ liệu"
                : "Data unavailable"
              : computedStats.unread > 0
                ? rawStats && rawStats.unread > computedStats.unread
                  ? isVietnamese
                    ? `${rawStats.unread} bản tin gốc chưa đọc`
                    : `${rawStats.unread} raw alerts unread`
                  : isVietnamese
                    ? "Cần xem và xử lý kịp thời"
                    : "Requires your attention"
                : isVietnamese
                  ? "Hộp thư đã được đọc hết"
                  : "All caught up"
          }
          loading={loading}
          depth="medium"
          border="subtle"
          className="h-full"
          footer={
            <span
              className={`font-mono text-[10px] font-bold tabular-nums ${
                !unavailable && computedStats.unread > 0
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}
            >
              {unavailable ? "—" : `${unreadRate}%`}
            </span>
          }
        />

        {/* 3. Cảnh báo vi phạm PPE */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.ppeAlerts")}
          value={unavailable ? "—" : computedStats.ppeAlerts}
          icon={ShieldAlert}
          tone={!unavailable && computedStats.ppeAlerts > 0 ? "danger" : "primary"}
          showGlow={false}
          description={
            unavailable
              ? isVietnamese
                ? "Chưa tải được dữ liệu"
                : "Data unavailable"
              : rawStats && rawStats.ppeAlerts > computedStats.ppeAlerts
                ? isVietnamese
                  ? `Gom từ ${rawStats.ppeAlerts} cảnh báo gốc`
                  : `Grouped from ${rawStats.ppeAlerts} raw PPE alerts`
                : isVietnamese
                  ? "Cảnh báo an toàn & vi phạm PPE"
                  : "Safety & PPE violation alerts"
          }
          loading={loading}
          depth="medium"
          border="subtle"
          className="h-full"
          footer={
            <span
              className={`font-mono text-[10px] font-bold tabular-nums ${
                !unavailable && computedStats.ppeAlerts > 0
                  ? "text-danger"
                  : "text-muted-foreground"
              }`}
            >
              {unavailable ? "—" : `${ppeRate}%`}
            </span>
          }
        />

        {/* 4. Tỷ lệ đã đọc / xử lý */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.resolved")}
          value={unavailable ? "—" : `${readRate}%`}
          icon={CheckCircle2}
          tone={!unavailable && readRate === 100 ? "success" : "primary"}
          showGlow={false}
          description={
            unavailable
              ? isVietnamese
                ? "Chưa tải được dữ liệu"
                : "Data unavailable"
              : isVietnamese
                ? `Đã đọc ${computedStats.resolved}/${computedStats.total} thông báo`
                : `Read ${computedStats.resolved}/${computedStats.total} notifications`
          }
          loading={loading}
          depth="medium"
          border="subtle"
          className="h-full"
          footer={
            <span className="font-mono text-[10px] font-bold tabular-nums text-primary">
              {unavailable
                ? "—"
                : `${computedStats.resolved}/${computedStats.total}`}
            </span>
          }
        />
      </div>
    </section>
  );
}
