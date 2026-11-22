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
  HardHat,
  Inbox,
  Radio,
  ShieldAlert,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/providers/locale-provider";
import { useRealtime } from "@/contexts/RealtimeContext";
import { getNotificationChannels, isNotificationRead } from "@/lib/notification-inbox";
import { notificationIncidentTarget } from "@/lib/incident-group";
import { stripEmojis } from "@/lib/strip-emojis";
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
    case "MEDIUM":
      return (
        <Badge variant="info" size="sm" shape="pill" className="text-[10px] font-semibold">
          {isVietnamese ? "Trung bình" : "Medium"}
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
    () => notifications.filter((item) => !isNotificationRead(item)),
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
      else if (item.severity === "MEDIUM" || item.severity === "NORMAL") normal++;
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
      for (const ch of getNotificationChannels(item)) {
        if (ch === "IN_APP" || ch === "WEB") inApp++;
        else if (ch === "EMAIL") email++;
        else if (ch === "WEBHOOK") webhook++;
        else if (ch === "ZALO_ZNS") zalo++;
        else inApp++;
      }
    }
    return { inApp, email, webhook, zalo };
  }, [notifications]);

  const readRate = useMemo(() => {
    if (!totalCount || totalCount <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((totalCount - unreadCount) / totalCount) * 100)));
  }, [totalCount, unreadCount]);

  return (
<div className="group/panel relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/80 bg-surface/95 p-4 sm:p-6 shadow-[12px_12px_28px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)] transition-all duration-500 dark:border-white/[0.07] dark:bg-card/95 animate-in fade-in slide-in-from-top-3">
      {/* Ambient Radial Aura (Primary & Accent blend) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-primary/15 via-accent/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-tr from-accent/15 via-primary/5 to-transparent blur-3xl"
      />

      {/* Specular Metallic Top Rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-24 top-[1.5px] h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      {/* Precision Corner Micro-Indicators */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 left-3 h-1 w-1 rounded-full bg-primary/40 shadow-[0_0_6px_hsl(var(--primary))]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 h-1 w-1 rounded-full bg-accent/40"
      />

      {/* ===================================================================== */}
      {/* HEADER TOOLBAR                                                        */}
      {/* ===================================================================== */}
      <div className="relative mb-4 sm:mb-5 flex items-center justify-between gap-3 pb-3.5 sm:pb-4">
        {/* Engraved Divider Line */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/[0.08]"
        />

        <div className="flex items-center gap-3.5 min-w-0">
          {/* Extruded Neumorphic Medallion Icon */}
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-surface-elevated to-surface shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/10 dark:from-card dark:to-background">
            <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10" />
            <div className="relative text-primary drop-shadow-[0_2px_6px_hsl(var(--primary)/0.35)]">
              {activeStat === "total" && <Bell className="h-4 w-4 sm:h-5 sm:w-5" />}
              {activeStat === "unread" && <Inbox className="h-4 w-4 sm:h-5 sm:w-5" />}
              {activeStat === "ppeAlerts" && <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />}
              {activeStat === "resolved" && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                {activeStat === "total" && (isVietnamese ? "Tổng quan Hộp thư & Kênh phát" : "Total Notifications Overview")}
                {activeStat === "unread" && (isVietnamese ? "Hàng đợi Thông báo Chưa xử lý" : "Unread Notifications Queue")}
                {activeStat === "ppeAlerts" && (isVietnamese ? "Cảnh báo Vi phạm An toàn PPE" : "PPE Safety Violations Feed")}
                {activeStat === "resolved" && (isVietnamese ? "Hiệu suất Phản hồi & Tình trạng Kênh" : "Response Health & Channel Performance")}
              </h3>

              {/* Inset Neumorphic Pill Counter */}
              <Badge
                variant="outline"
                size="sm"
                className="border-primary/20 bg-primary/[0.06] font-mono text-[11px] font-semibold tracking-wider text-primary px-2.5 py-0.5 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
              >
                {activeStat === "total" && `${totalCount}`}
                {activeStat === "unread" && `${unreadCount}`}
                {activeStat === "ppeAlerts" && `${ppeAlertItems.length}`}
                {activeStat === "resolved" && `${readRate}%`}
              </Badge>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5 hidden sm:block">
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

        {/* Action Controls & Tactile Close */}
        <div className="flex items-center gap-2 shrink-0">
          {activeStat === "unread" && unreadCount > 0 && onMarkAllAsRead && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              className="h-8 gap-1.5 rounded-xl border-primary/25 bg-surface px-2.5 sm:px-3.5 text-xs font-semibold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/50 hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Đọc tất cả" : "Mark all read"}</span>
            </Button>
          )}

          {activeStat === "ppeAlerts" && (
            <Link href="/incidents">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl border-primary/25 bg-surface px-2.5 sm:px-3.5 text-xs font-semibold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/50 hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
              >
                <HardHat className="h-3.5 w-3.5" />
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
              className="h-8 gap-1.5 rounded-xl border-primary/25 bg-surface px-2.5 sm:px-3.5 text-xs font-semibold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/50 hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            >
              <Radio className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "+ Phát thông báo" : "+ Broadcast"}</span>
            </Button>
          )}

          {activeStat === "resolved" && onOpenPreferences && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPreferences}
              className="h-8 gap-1.5 rounded-xl border-primary/25 bg-surface px-2.5 sm:px-3.5 text-xs font-semibold text-primary shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all hover:border-primary/50 hover:bg-primary/5 active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isVietnamese ? "Tùy chọn nhận tin" : "Preferences"}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/60 bg-surface text-muted-foreground shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] dark:border-white/10 dark:bg-card"
            aria-label={isVietnamese ? "Đóng bảng chi tiết" : "Close detail panel"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 1. NỘI DUNG: TỔNG SỐ THÔNG BÁO ──────────────────────────────────── */}
      {activeStat === "total" && (
        <div className="space-y-4">
          {/* Recessed Telemetry Wells: Phân bổ kênh & Mức độ */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
            {[
              {
                label: "In-App Web",
                value: channelBreakdown.inApp,
                usePrimary: true,
              },
              {
                label: "Email SMTP",
                value: channelBreakdown.email,
                usePrimary: false,
              },
              {
                label: isVietnamese ? "Khẩn cấp" : "Critical",
                value: severityBreakdown.critical,
                usePrimary: true,
              },
              {
                label: isVietnamese ? "Mức cao" : "High",
                value: severityBreakdown.high,
                usePrimary: false,
              },
            ].map((metric, idx) => {
              const pct = totalCount > 0 ? Math.min(100, (metric.value / totalCount) * 100) : 0;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-black/[0.04] bg-background/60 p-3 shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)] dark:border-white/[0.04] dark:bg-background/40"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2">
                    <span className="truncate">{metric.label}</span>
                    <span
                      className={`font-mono font-bold ${
                        metric.usePrimary ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {metric.value}
                    </span>
                  </div>
                  {/* Tactile Recessed Progress Track */}
                  <div className="h-2 w-full rounded-full bg-surface p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metric.usePrimary
                          ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                          : "bg-gradient-to-r from-primary/70 to-accent"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Danh sách thông báo tóm lược gần nhất */}
          <div className="max-h-[270px] overflow-y-auto space-y-2 pr-1">
            {notifications.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="group/item flex items-center justify-between gap-3 rounded-2xl border border-white/75 bg-surface/90 p-2.5 sm:p-3 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] transition-all duration-200 hover:border-primary/30 dark:border-white/[0.07] dark:bg-card/85"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]">
                    <Bell className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate max-w-[220px] sm:max-w-md group-hover/item:text-primary transition-colors">
                        {stripEmojis(item.title)}
                      </span>
                      {getSeverityBadge(item.severity, isVietnamese)}
                      <span className="font-mono text-[9px] font-medium text-primary/80 px-1.5 py-0.5 rounded-md border border-primary/15 bg-primary/[0.05]">
                        {getNotificationChannels(item).join(" · ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {stripEmojis(item.content)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                    {formatDate(item.createdAt, locale)}
                  </span>
                  {item.actionUrl ? (
                    <Link href={item.actionUrl}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-xl border border-primary/25 bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-background/50 p-7 text-center shadow-[inset_5px_5px_12px_var(--shadow-dark),inset_-5px_-5px_12px_var(--shadow-light)] dark:border-white/[0.04] space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[3px_3px_8px_var(--shadow-dark),-3px_-3px_8px_var(--shadow-light)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-foreground text-xs sm:text-sm">
                  {isVietnamese ? "Tuyệt vời! Tất cả thông báo đã được xử lý" : "All caught up! No unread notifications"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isVietnamese
                    ? "Hộp thư thông báo của bạn không còn bản tin nào đang chờ đọc."
                    : "Your inbox is completely clear of pending alerts."}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[270px] overflow-y-auto space-y-2 pr-1">
              {unreadItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.06] via-surface/90 to-accent/[0.05] p-3 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Pulsing Primary Beacon */}
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                          {stripEmojis(item.title)}
                        </span>
                        {getSeverityBadge(item.severity, isVietnamese)}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {stripEmojis(item.content)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                      {formatDate(item.createdAt, locale)}
                    </span>
                    {onMarkAsRead && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(item.id)}
                        title={isVietnamese ? "Đánh dấu đã đọc" : "Mark as read"}
                        className="rounded-xl border border-primary/25 bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:bg-primary hover:text-primary-foreground active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] transition-all flex items-center gap-1"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-black/[0.04] bg-background/50 px-3 py-1.5 text-[11px] text-muted-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <span className="font-medium">
              {isVietnamese
                ? `Tìm thấy ${ppeAlertItems.length} sự cố vi phạm cần chú ý`
                : `${ppeAlertItems.length} safety violations recorded`}
            </span>
            <span className="text-[10px] italic hidden sm:inline">
              {isVietnamese ? "Nhấp 'Hồ sơ' để truy cập chi tiết" : "Click 'Record' to inspect case"}
            </span>
          </div>

          <div className="max-h-[270px] overflow-y-auto space-y-2.5 pr-1">
            {ppeAlertItems.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.04] bg-background/50 p-6 text-center text-xs text-muted-foreground shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
                {isVietnamese ? "Không có cảnh báo vi phạm PPE nguy cơ cao nào." : "No critical PPE violations detected."}
              </div>
            ) : (
              ppeAlertItems.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-surface/95 to-accent/[0.06] p-3 sm:p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] space-y-2"
                >
                  {/* Left Accent Bar */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                  />

                  <div className="flex items-center justify-between gap-2 pl-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="size-4 text-primary shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
                      <span className="text-xs font-bold text-foreground truncate">{stripEmojis(item.title)}</span>
                      {getSeverityBadge(item.severity, isVietnamese)}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => playAlert(item.severity)}
                        title={isVietnamese ? "Nghe thử âm thanh cảnh báo" : "Play sound cue"}
                        className="flex size-7 items-center justify-center rounded-xl border border-white/60 bg-surface text-muted-foreground shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] transition-all dark:border-white/10"
                      >
                        <Volume2 className="size-3.5" />
                      </button>

                      {(() => {
                        const targetIncidentId = item.incidentId || (typeof item.metadata?.incidentId === "string" ? item.metadata.incidentId : undefined);
                        const incidentTarget = notificationIncidentTarget({ incidentId: targetIncidentId, content: item.content });
                        return incidentTarget.href ? (
                          <Link href={incidentTarget.href}>
                            <button
                              type="button"
                              className="rounded-xl border border-primary/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1"
                            >
                              <ExternalLink className="size-3" />
                              <span>{isVietnamese ? "Hồ sơ" : "Record"}</span>
                            </button>
                          </Link>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <p className="pl-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {stripEmojis(item.content)}
                  </p>

                  <div className="flex items-center justify-between pl-1.5 text-[10px] text-muted-foreground border-t border-border/30 pt-1.5">
                    <span className="font-mono font-medium text-primary/80">
                      {item.metadata?.cameraCode
                        ? `Camera: ${item.metadata.cameraCode}`
                        : item.metadata?.siteName
                          ? `Site: ${item.metadata.siteName}`
                          : isVietnamese
                            ? "Hạ tầng Smart PPE"
                            : "Smart PPE Infrastructure"}
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
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Tỷ lệ đọc */}
            <div className="rounded-2xl border border-white/70 bg-surface/90 p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/[0.07] dark:bg-card/85 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                {isVietnamese ? "Tỷ lệ xử lý / đã đọc" : "Resolution / Read Rate"}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xl font-bold text-primary">{readRate}%</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {totalCount - unreadCount}/{totalCount}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-background p-[2px] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
                  style={{ width: `${readRate}%` }}
                />
              </div>
            </div>

            {/* SSE Realtime Heartbeat */}
            <div className="rounded-2xl border border-white/70 bg-surface/90 p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/[0.07] dark:bg-card/85 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                {isVietnamese ? "Luồng trực tiếp SSE" : "Realtime SSE Stream"}
              </span>
              <div className="flex items-center gap-2.5 pt-0.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {isConnected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      isConnected
                        ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                        : "bg-accent border border-primary/30"
                    }`}
                  />
                </span>
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
            <div className="rounded-2xl border border-white/70 bg-surface/90 p-3.5 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)] dark:border-white/[0.07] dark:bg-card/85 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isVietnamese ? "Âm thanh cảnh báo" : "Audio Synthesizer"}
                </span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-lg border border-primary/20 bg-primary/[0.07] px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
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

          {/* Recessed Tip Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.05] via-background/60 to-accent/[0.08] px-3.5 py-2.5 text-[11px] text-muted-foreground shadow-[inset_4px_4px_9px_var(--shadow-dark),inset_-4px_-4px_9px_var(--shadow-light)]">
            <span className="text-[11px]">
              {isVietnamese
                ? "Mẹo: Có thể tùy chỉnh âm thanh và ngưỡng lọc cảnh báo trong tab Cài đặt nhận tin."
                : "Tip: Adjust sound presets and alert fatigue thresholds under Preferences tab."}
            </span>
            {onOpenPreferences && (
              <button
                type="button"
                onClick={onOpenPreferences}
                className="text-primary hover:underline font-semibold text-xs flex items-center gap-1"
              >
                <span>{isVietnamese ? "Mở Cài đặt" : "Open Settings"}</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
