"use client";

import { useMemo } from "react";
import { Bell, Inbox, ShieldAlert, CheckCircle2 } from "lucide-react";
import { StatsCard, type StatsCardVariant } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto } from "@/types";

export interface NotificationKpiStatsData {
  total: number;
  unread: number;
  ppeAlerts: number;
  resolved: number;
}

export interface NotificationKpiSummaryProps {
  /** Danh sách thông báo hiện tại (nếu dùng để tự động tính toán) */
  notifications?: NotificationItemDto[];
  /** Tổng số lượng từ pagination meta */
  totalCount?: number;
  /** Số lượng tin chưa đọc từ hook useUnreadCount */
  unreadCount?: number;
  /** Hoặc truyền trực tiếp đối tượng stats đã tính toán */
  stats?: NotificationKpiStatsData;
  /** Biến thể thiết kế: classic | soft-extruded | deep-elevation (mặc định: soft-extruded) */
  variant?: "classic" | "soft-extruded" | "deep-elevation";
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  className?: string;
}

export function NotificationKpiSummary({
  notifications = [],
  totalCount,
  unreadCount: propUnreadCount,
  stats: externalStats,
  variant = "soft-extruded",
  loading = false,
  className = "",
}: NotificationKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const computedStats = useMemo<NotificationKpiStatsData>(() => {
    if (externalStats) return externalStats;

    let unread = 0;
    let ppeAlerts = 0;
    let resolved = 0;

    for (const item of notifications) {
      if (item.isRead === false || item.status === "PENDING" || item.status === "SENT") {
        unread++;
      } else {
        resolved++;
      }

      if (
        item.type === "PPE_VIOLATION" ||
        item.severity === "CRITICAL" ||
        item.severity === "HIGH"
      ) {
        ppeAlerts++;
      }
    }

    return {
      total: totalCount ?? notifications.length,
      unread: propUnreadCount ?? unread,
      ppeAlerts,
      resolved: (totalCount ?? notifications.length) - (propUnreadCount ?? unread),
    };
  }, [externalStats, notifications, totalCount, propUnreadCount]);

  const readRate = useMemo(() => {
    if (!computedStats.total || computedStats.total <= 0) return 100;
    const rate = Math.round(
      ((computedStats.total - computedStats.unread) / computedStats.total) * 100,
    );
    return Math.max(0, Math.min(100, rate));
  }, [computedStats.total, computedStats.unread]);

  return (
    <section
      aria-label={
        isVietnamese
          ? "Thống kê trung tâm thông báo"
          : "Notification center statistics"
      }
      className={`grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {/* 1. Tổng số thông báo */}
      <StatsCard
        variant={variant}
        title={t("notifications.stats.total")}
        value={computedStats.total}
        icon={Bell}
        tone="primary"
        description={
          isVietnamese
            ? "Tổng số bản tin nhận được"
            : "Total notifications received"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 2. Tin chưa đọc */}
      <StatsCard
        variant={variant}
        title={t("notifications.stats.unread")}
        value={computedStats.unread}
        icon={Inbox}
        accentColor={computedStats.unread > 0 ? "var(--warning)" : undefined}
        description={
          computedStats.unread > 0
            ? isVietnamese
              ? "Cần xem và xử lý kịp thời"
              : "Requires your attention"
            : isVietnamese
              ? "Hộp thư đã được đọc hết"
              : "All caught up"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 3. Cảnh báo vi phạm PPE */}
      <StatsCard
        variant={variant}
        title={t("notifications.stats.ppeAlerts")}
        value={computedStats.ppeAlerts}
        icon={ShieldAlert}
        accentColor={computedStats.ppeAlerts > 0 ? "var(--danger)" : undefined}
        description={
          isVietnamese
            ? "Cảnh báo mức cao & khẩn cấp"
            : "High & critical priority alerts"
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />

      {/* 4. Tỷ lệ đã đọc / xử lý */}
      <StatsCard
        variant={variant}
        title={t("notifications.stats.resolved")}
        value={`${readRate}%`}
        icon={CheckCircle2}
        tone="primary"
        progress={readRate}
        progressLabel={`${readRate}%`}
        description={
          isVietnamese
            ? `${readRate}% thông báo đã đọc`
            : `${readRate}% notifications read`
        }
        loading={loading}
        hover
        depth="medium"
        border="subtle"
      />
    </section>
  );
}
