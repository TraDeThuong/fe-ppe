"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Inbox,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StatsCard, type StatsCardVariant } from "@/components/ui/stats-cards";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationItemDto } from "@/types";
import {
  NotificationStatsDetailPanel,
  type NotificationStatKey,
} from "./notification-stats-detail-panel";

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

  /** Key của thẻ stat đang được mở rộng xem chi tiết */
  selectedStat?: NotificationStatKey | null;
  /** Callback khi người dùng bấm vào thẻ stat để mở/đóng panel chi tiết */
  onSelectStat?: (stat: NotificationStatKey | null) => void;

  /** Callbacks tương tác từ panel chi tiết */
  onOpenBroadcast?: () => void;
  onOpenPreferences?: () => void;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
}

export function NotificationKpiSummary({
  notifications = [],
  totalCount,
  unreadCount: propUnreadCount,
  stats: externalStats,
  variant = "soft-extruded",
  loading = false,
  className = "",
  selectedStat: propSelectedStat,
  onSelectStat,
  onOpenBroadcast,
  onOpenPreferences,
  onMarkAllAsRead,
  onMarkAsRead,
}: NotificationKpiSummaryProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [internalSelectedStat, setInternalSelectedStat] = useState<NotificationStatKey | null>(null);
  const activeStat = propSelectedStat !== undefined ? propSelectedStat : internalSelectedStat;

  const handleToggle = (key: NotificationStatKey) => {
    const next = activeStat === key ? null : key;
    if (onSelectStat) {
      onSelectStat(next);
    } else {
      setInternalSelectedStat(next);
    }
  };

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
        item.severity === "HIGH" ||
        item.title?.toLowerCase().includes("ppe") ||
        item.title?.toLowerCase().includes("bảo hộ")
      ) {
        ppeAlerts++;
      }
    }

    const total = totalCount ?? notifications.length;
    const finalUnread = propUnreadCount ?? unread;

    return {
      total,
      unread: finalUnread,
      ppeAlerts,
      resolved: Math.max(0, total - finalUnread),
    };
  }, [externalStats, notifications, totalCount, propUnreadCount]);

  const readRate = useMemo(() => {
    if (!computedStats.total || computedStats.total <= 0) return 100;
    const rate = Math.round(
      ((computedStats.total - computedStats.unread) / computedStats.total) * 100,
    );
    return Math.max(0, Math.min(100, rate));
  }, [computedStats.total, computedStats.unread]);

  // Hiệu ứng chìm sâu Neumorphic (sunken) khi card được chọn giống hệt trang role:
  // - Chìm xuống dưới (translate-y-1.5)
  // - Đổ bóng âm sâu 2 lớp (deep inset shadow)
  // - Tuyệt đối KHÔNG có màu viền hay ring thô bao quanh
  const sunkenClass =
    "!translate-y-1.5 !shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)] dark:!shadow-[inset_6px_6px_16px_rgba(0,0,0,0.7),inset_-4px_-4px_10px_rgba(255,255,255,0.03)] hover:!translate-y-1.5 hover:!shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light),inset_2px_2px_4px_rgba(0,0,0,0.18)]";

  return (
    <section
      aria-label={
        isVietnamese
          ? "Thống kê trung tâm thông báo"
          : "Notification center statistics"
      }
      className={`space-y-4 ${className}`}
    >
      {/* Bento Grid 4 Stats Cards - 2x2 trên Mobile, 4 cột trên Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {/* 1. Tổng số thông báo */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.total")}
          value={computedStats.total}
          icon={Bell}
          tone="primary"
          showGlow={false}
          description={
            isVietnamese
              ? "Tổng số bản tin nhận được"
              : "Total notifications received"
          }
          loading={loading}
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("total")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "total" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "total" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem chi tiết" : "View detail"} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 2. Tin chưa đọc */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.unread")}
          value={computedStats.unread}
          icon={Inbox}
          accentColor={computedStats.unread > 0 ? "var(--warning)" : undefined}
          showGlow={false}
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
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("unread")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "unread" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "unread" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem chi tiết" : "View detail"} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 3. Cảnh báo vi phạm PPE */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.ppeAlerts")}
          value={computedStats.ppeAlerts}
          icon={ShieldAlert}
          accentColor={computedStats.ppeAlerts > 0 ? "var(--danger)" : undefined}
          showGlow={false}
          description={
            isVietnamese
              ? "Cảnh báo mức cao & khẩn cấp"
              : "High & critical priority alerts"
          }
          loading={loading}
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("ppeAlerts")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "ppeAlerts" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "ppeAlerts" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem chi tiết" : "View detail"} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />

        {/* 4. Tỷ lệ đã đọc / xử lý */}
        <StatsCard
          variant={variant}
          title={t("notifications.stats.resolved")}
          value={`${readRate}%`}
          icon={CheckCircle2}
          tone="primary"
          showGlow={false}
          progress={readRate}
          progressLabel={`${readRate}%`}
          description={
            isVietnamese
              ? `${readRate}% thông báo đã đọc`
              : `${readRate}% notifications read`
          }
          loading={loading}
          depth="medium"
          border="subtle"
          onClick={() => handleToggle("resolved")}
          className={`transition-all duration-200 cursor-pointer ${
            activeStat === "resolved" ? sunkenClass : "hover:border-primary/30"
          }`}
          footer={
            <span className="flex items-center text-[10px] font-semibold transition-colors gap-0.5">
              {activeStat === "resolved" ? (
                <span className="flex items-center text-primary font-bold gap-0.5">
                  {isVietnamese ? "Thu gọn" : "Collapse"} <ChevronUp className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex items-center text-muted-foreground hover:text-foreground gap-0.5">
                  {isVietnamese ? "Xem chi tiết" : "View detail"} <ChevronDown className="h-3 w-3" />
                </span>
              )}
            </span>
          }
        />
      </div>

      {/* Khung nội dung chi tiết hiển thị ra ngay dưới stats khi click vào */}
      {activeStat && (
        <NotificationStatsDetailPanel
          activeStat={activeStat}
          notifications={notifications}
          unreadCount={computedStats.unread}
          totalCount={computedStats.total}
          onClose={() => handleToggle(activeStat)}
          onMarkAllAsRead={onMarkAllAsRead}
          onMarkAsRead={onMarkAsRead}
          onOpenBroadcast={onOpenBroadcast}
          onOpenPreferences={onOpenPreferences}
        />
      )}
    </section>
  );
}
