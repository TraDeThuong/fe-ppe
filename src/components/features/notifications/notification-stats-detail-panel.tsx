"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  HardHat,
  Inbox,
  Mail,
  Radio,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useNotificationSound } from "@/hooks/notifications/use-notification-sound";
import type { NotificationItemDto, NotificationSeverity, NotificationChannel } from "@/types";

export type NotificationStatKey = "total" | "unread" | "ppeAlerts" | "resolved";

export interface NotificationStatsDetailPanelProps {
  activeStat: NotificationStatKey;
  notifications: NotificationItemDto[];
  unreadCount: number;
  totalCount: number;
  onClose: () => void;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onOpenBroadcast?: () => void;
  onOpenPreferences?: () => void;
  onSelectSeverityFilter?: (severity: NotificationSeverity | undefined) => void;
}

function formatDate(dateInput?: string | Date | null, loc: string = "vi-VN"): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString(loc, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getSeverityBadge(severity?: NotificationSeverity, isVietnamese: boolean = true) {
  switch (severity) {
    case "CRITICAL":
      return (
        <Badge variant="danger" size="sm" shape="pill" className="text-[10px] font-bold">
          {isVietnamese ? "Khẩn cấp" : "Critical"}
        </Badge>
      );
    case "HIGH":
      return (
        <Badge variant="warning" size="sm" shape="pill" className="text-[10px] font-bold">
          {isVietnamese ? "Mức cao" : "High"}
        </Badge>
      );
    case "NORMAL":
      return (
        <Badge variant="primary" size="sm" shape="pill" className="text-[10px]">
          {isVietnamese ? "Bình thường" : "Normal"}
        </Badge>
      );
    case "LOW":
    default:
      return (
        <Badge variant="secondary" size="sm" shape="pill" className="text-[10px]">
          {isVietnamese ? "Mức thấp" : "Low"}
        </Badge>
      );
  }
}

export function NotificationStatsDetailPanel({
  activeStat,
  notifications,
  unreadCount,
  totalCount,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead,
  onOpenBroadcast,
  onOpenPreferences,
  onSelectSeverityFilter,
}: NotificationStatsDetailPanelProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const { isConnected } = useRealtime();
  const { enabled: soundEnabled, toggleSound, playAlert } = useNotificationSound();

  // Danh sách các thông báo chưa đọc
  const unreadItems = useMemo(
    () => notifications.filter((item) => item.isRead === false || item.status === "PENDING" || item.status === "SENT"),
    [notifications],
  );

  // Danh sách các cảnh báo vi phạm PPE
  const ppeAlertItems = useMemo(
    () =>
      notifications.filter(
        (item) =>
          item.type === "PPE_VIOLATION" ||
          item.severity === "CRITICAL" ||
          item.severity === "HIGH" ||
          item.title?.toLowerCase().includes("ppe") ||
          item.title?.toLowerCase().includes("bảo hộ"),
      ),
    [notifications],
  );

  // Phân bổ theo mức độ nghiêm trọng
  const severityBreakdown = useMemo(() => {
    let critical = 0;
    let high = 0;
    let normal = 0;
    let low = 0;
    for (const item of notifications) {
      if (item.severity === "CRITICAL") critical++;
      else if (item.severity === "HIGH") high++;
      else if (item.severity === "NORMAL") normal++;
      else low++;
    }
    return { critical, high, normal, low };
  }, [notifications]);

  // Phân bổ theo kênh
  const channelBreakdown = useMemo(() => {
    let inApp = 0;
    let email = 0;
    let webhook = 0;
    let zalo = 0;
    for (const item of notifications) {
      if (item.channel === "IN_APP" || item.channel === "WEB") inApp++;
      else if (item.channel === "EMAIL") email++;
      else if (item.channel === "WEBHOOK") webhook++;
      else if (item.channel === "ZALO_ZNS") zalo++;
      else inApp++;
    }
    return { inApp, email, webhook, zalo };
  }, [notifications]);

  const readRate = useMemo(() => {
    if (!totalCount || totalCount <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((totalCount - unreadCount) / totalCount) * 100)));
  }, [totalCount, unreadCount]);

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-surface/95 p-3 sm:p-4.5 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition-all duration-300 dark:border-white/10 dark:bg-card/95 animate-in fade-in slide-in-from-top-2">
      {/* Specular Rim Top Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      {/* Header Toolbar */}
      <div className="mb-2.5 sm:mb-3.5 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)]">
            {activeStat === "total" && <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            {activeStat === "unread" && <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />}
            {activeStat === "ppeAlerts" && <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />}
            {activeStat === "resolved" && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {activeStat === "total" && (isVietnamese ? "Tổng quan Hộp thư & Kênh phát" : "Total Notifications Overview")}
                {activeStat === "unread" && (isVietnamese ? "Hàng đợi Thông báo Chưa xử lý" : "Unread Notifications Queue")}
                {activeStat === "ppeAlerts" && (isVietnamese ? "Cảnh báo Vi phạm An toàn PPE" : "PPE Safety Violations Feed")}
                {activeStat === "resolved" && (isVietnamese ? "Hiệu suất Phản hồi & Tình trạng Kênh" : "Response Health & Channel Performance")}
              </h3>

              <Badge variant="outline" size="sm" className="font-mono text-[10px] sm:text-[11px] text-foreground px-1.5 py-0">
                {activeStat === "total" && `${totalCount}`}
                {activeStat === "unread" && `${unreadCount}`}
                {activeStat === "ppeAlerts" && `${ppeAlertItems.length}`}
                {activeStat === "resolved" && `${readRate}%`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {activeStat === "total" &&
                (isVietnamese
                  ? "Phân bổ số lượng theo từng kênh truyền phát và mức độ nghiêm trọng"
                  : "Distribution across delivery channels and priority levels")}
              {activeStat === "unread" &&
                (isVietnamese
                  ? "Các cảnh báo cần người vận hành tiếp nhận và xử lý kịp thời"
                  : "Items requiring operator inspection and resolution")}
              {activeStat === "ppeAlerts" &&
                (isVietnamese
                  ? "Cảnh báo vi phạm bảo hộ lao động phát hiện từ camera giám sát AI"
                  : "Safety non-compliance detected by real-time YOLO AI streams")}
              {activeStat === "resolved" &&
                (isVietnamese
                  ? "Đo lường tỷ lệ đọc tin, kết nối SSE thời gian thực và âm thanh cảnh báo"
                  : "Delivery rate, realtime SSE heartbeat and sound alert status")}
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeStat === "unread" && unreadCount > 0 && onMarkAllAsRead && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <CheckCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Đọc tất cả" : "Mark all read"}</span>
            </Button>
          )}

          {activeStat === "ppeAlerts" && (
            <Link href="/incidents">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
              >
                <HardHat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{isVietnamese ? "Quản lý Sự cố" : "Incidents Center"}</span>
              </Button>
            </Link>
          )}

          {activeStat === "total" && onOpenBroadcast && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenBroadcast}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "+ Phát thông báo" : "+ Broadcast"}</span>
            </Button>
          )}

          {activeStat === "resolved" && onOpenPreferences && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPreferences}
              className="h-7 sm:h-8 gap-1 text-[11px] sm:text-xs text-primary hover:text-primary px-2 sm:px-3"
            >
              <SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Tùy chọn nhận tin" : "Preferences"}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label={isVietnamese ? "Đóng bảng chi tiết" : "Close detail panel"}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG SỐ THÔNG BÁO ──────────────────────────────────── */}
      {activeStat === "total" && (
        <div className="space-y-3">
          {/* Bento mini: Phân bổ kênh & Mức độ */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                <span>In-App Web</span>
                <span className="font-mono text-primary font-bold">{channelBreakdown.inApp}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${totalCount > 0 ? (channelBreakdown.inApp / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                <span>Email SMTP</span>
                <span className="font-mono text-amber-500 font-bold">{channelBreakdown.email}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalCount > 0 ? (channelBreakdown.email / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                <span>{isVietnamese ? "Khẩn cấp" : "Critical"}</span>
                <span className="font-mono text-rose-500 font-bold">{severityBreakdown.critical}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalCount > 0 ? (severityBreakdown.critical / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                <span>{isVietnamese ? "Mức cao" : "High"}</span>
                <span className="font-mono text-amber-500 font-bold">{severityBreakdown.high}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${totalCount > 0 ? (severityBreakdown.high / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Danh sách thông báo tóm lược gần nhất */}
          <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
            {notifications.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-2 sm:p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate max-w-[220px] sm:max-w-md">
                        {item.title}
                      </span>
                      {getSeverityBadge(item.severity, isVietnamese)}
                      <span className="font-mono text-[9px] text-muted-foreground px-1 py-0.2 rounded bg-muted/40">
                        {item.channel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.content}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                    {formatDate(item.createdAt, locale)}
                  </span>
                  {item.actionUrl ? (
                    <Link href={item.actionUrl}>
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Eye className="size-3" />
                        <span className="hidden sm:inline">{isVietnamese ? "Xem" : "View"}</span>
                      </button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. NỘI DUNG: CHƯA ĐỌC ────────────────────────────────────────────── */}
      {activeStat === "unread" && (
        <div className="space-y-2.5">
          {unreadItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-background/40 p-6 text-center text-xs text-muted-foreground space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
              <div>
                <p className="font-bold text-foreground text-xs sm:text-sm">
                  {isVietnamese ? "Tuyệt vời! Tất cả thông báo đã được xử lý" : "All caught up! No unread notifications"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isVietnamese
                    ? "Hộp thư thông báo của bạn không còn bản tin nào đang chờ đọc."
                    : "Your inbox is completely clear of pending alerts."}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-0.5">
              {unreadItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-2.5 shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-2 shrink-0 rounded-full bg-rose-500 animate-pulse" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                          {item.title}
                        </span>
                        {getSeverityBadge(item.severity, isVietnamese)}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{item.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                      {formatDate(item.createdAt, locale)}
                    </span>
                    {onMarkAsRead && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(item.id)}
                        title={isVietnamese ? "Đánh dấu đã đọc" : "Mark as read"}
                        className="rounded-lg border border-border/40 bg-background px-2 py-1 text-[11px] font-semibold text-primary shadow-[1px_1px_3px_var(--shadow-dark)] hover:bg-primary/10 transition-all flex items-center gap-1"
                      >
                        <Check className="size-3" />
                        <span className="hidden sm:inline">{isVietnamese ? "Đã đọc" : "Read"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. NỘI DUNG: CẢNH BÁO VI PHẠM PPE ─────────────────────────────────── */}
      {activeStat === "ppeAlerts" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>
              {isVietnamese
                ? `Tìm thấy ${ppeAlertItems.length} sự cố vi phạm cần chú ý`
                : `${ppeAlertItems.length} safety violations recorded`}
            </span>
            <span className="text-[10px] italic">
              {isVietnamese ? "Nhấp 'Xem sự cố' để truy cập hồ sơ chi tiết" : "Click 'View Incident' to inspect case record"}
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
            {ppeAlertItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {isVietnamese ? "Không có cảnh báo vi phạm PPE nguy cơ cao nào." : "No critical PPE violations detected."}
              </div>
            ) : (
              ppeAlertItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-2.5 sm:p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="size-4 text-rose-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                      {getSeverityBadge(item.severity, isVietnamese)}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => playAlert(item.severity)}
                        title={isVietnamese ? "Nghe thử âm thanh cảnh báo" : "Play sound cue"}
                        className="flex size-6 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-primary transition-all"
                      >
                        <Volume2 className="size-3" />
                      </button>

                      {item.incidentId ? (
                        <Link href={`/incidents/${item.incidentId}`}>
                          <button
                            type="button"
                            className="rounded-lg border border-primary/30 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10 flex items-center gap-1"
                          >
                            <ExternalLink className="size-3" />
                            <span>{isVietnamese ? "Hồ sơ" : "Record"}</span>
                          </button>
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.content}</p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-1">
                    <span className="font-mono">
                      {item.metadata?.cameraCode
                        ? `Camera: ${item.metadata.cameraCode}`
                        : item.metadata?.siteName
                          ? `Site: ${item.metadata.siteName}`
                          : "Hạ tầng Smart PPE"}
                    </span>
                    <span className="font-mono">{formatDate(item.createdAt, locale)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 4. NỘI DUNG: HIỆU SUẤT & TÌNH TRẠNG KÊNH ──────────────────────────── */}
      {activeStat === "resolved" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* Tỷ lệ đọc */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {isVietnamese ? "Tỷ lệ xử lý / đã đọc" : "Resolution / Read Rate"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-lg font-bold text-emerald-500">{readRate}%</span>
                <span className="text-[10px] text-muted-foreground">
                  {totalCount - unreadCount}/{totalCount}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${readRate}%` }}
                />
              </div>
            </div>

            {/* SSE Realtime Heartbeat */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {isVietnamese ? "Luồng trực tiếp SSE" : "Realtime SSE Stream"}
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`size-2.5 rounded-full ${
                    isConnected
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span className="font-mono text-xs font-bold text-foreground">
                  {isConnected
                    ? isVietnamese
                      ? "Đang trực tuyến (Active)"
                      : "Online & Active"
                    : isVietnamese
                      ? "Đang kết nối lại..."
                      : "Reconnecting..."}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Cập nhật cảnh báo PPE tức thời" : "Instant PPE push events"}
              </p>
            </div>

            {/* Trạng thái Âm thanh Synthesizer */}
            <div className="rounded-xl border border-border/40 bg-background/60 p-3 shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Âm thanh cảnh báo" : "Audio Synthesizer"}
                </span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {soundEnabled ? (isVietnamese ? "Tắt" : "Mute") : isVietnamese ? "Bật" : "Unmute"}
                </button>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                {soundEnabled ? (
                  <Volume2 className="size-4 text-primary" />
                ) : (
                  <VolumeX className="size-4 text-muted-foreground" />
                )}
                <span className="font-mono text-xs font-bold text-foreground">
                  {soundEnabled
                    ? isVietnamese
                      ? "Đang kích hoạt (Web Audio)"
                      : "Synthesizer Ready"
                    : isVietnamese
                      ? "Đã tắt chuông"
                      : "Sound Muted"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {isVietnamese ? "Còi khẩn cấp & chuông tam âm" : "Emergency warbles & rising chimes"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-border/30 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="text-[10px]">
              {isVietnamese
                ? "💡 Mẹo: Có thể tùy chỉnh âm thanh và ngưỡng lọc cảnh báo trong tab Cài đặt nhận tin."
                : "💡 Tip: Adjust sound presets and alert fatigue thresholds under Preferences tab."}
            </span>
            {onOpenPreferences && (
              <button
                type="button"
                onClick={onOpenPreferences}
                className="text-primary hover:underline font-semibold text-xs flex items-center gap-1"
              >
                <span>{isVietnamese ? "Mở Cài đặt" : "Open Settings"}</span>
                <ChevronRight className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
