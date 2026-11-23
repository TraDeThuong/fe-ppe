"use client";

import React from "react";
import { Bell, Inbox, Radio, Send } from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { PeriodFilterStrip } from "@/components/features/app-shell/period-filter-strip";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import type {
  IncidentPeriodFilter,
  ResolvedIncidentPeriod,
} from "@/lib/incident-period";
import { useLocale } from "@/providers/locale-provider";

export interface NotificationConsoleHeaderProps {
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  totalCount: number;
  unreadCount: number;
  canBroadcast: boolean;
  onOpenCustomDispatch: () => void;
  onOpenBroadcast: () => void;
  periodFilter?: IncidentPeriodFilter;
  resolvedPeriod?: ResolvedIncidentPeriod;
  today?: string;
  onPeriodFilterChange?: (next: IncidentPeriodFilter) => void;
}

export function NotificationConsoleHeader({
  isConnected,
  isRefreshing,
  onRefresh,
  totalCount,
  unreadCount,
  canBroadcast,
  onOpenCustomDispatch,
  onOpenBroadcast,
  periodFilter,
  resolvedPeriod,
  today,
  onPeriodFilterChange,
}: NotificationConsoleHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  return (
    <section
      aria-label={
        isVietnamese
          ? "Tiêu đề trung tâm thông báo"
          : "Notification Center Console Header"
      }
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative space-y-5">
        {/* Layer 1: Identity & Right Action Controls */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <Bell className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                  }`}
                />
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("notifications.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isVietnamese ? "Trung tâm Thông báo" : "Notification Center"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${
                    isConnected ? "text-primary" : "text-accent"
                  } ${NM.recessed}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    )}
                    <span
                      className={`relative h-2 w-2 rounded-full ${
                        isConnected ? "bg-primary" : "bg-accent"
                      }`}
                    />
                  </span>
                  {isConnected
                    ? isVietnamese
                      ? "Luồng SSE Trực tuyến"
                      : "Realtime SSE Active"
                    : isVietnamese
                      ? "Đang kết nối SSE..."
                      : "SSE Connecting..."}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Inbox className="size-3.5 shrink-0 text-primary" />
                  <span>
                    {totalCount}{" "}
                    {isVietnamese ? "thông báo" : "notifications"}
                  </span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${
                    unreadCount > 0 ? "text-accent" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      unreadCount > 0
                        ? "animate-pulse bg-accent"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  {unreadCount > 0
                    ? isVietnamese
                      ? `${unreadCount} chưa đọc`
                      : `${unreadCount} unread`
                    : isVietnamese
                      ? "Đã đọc hết"
                      : "All read"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-center">
            <ConsoleRefreshButton
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              subtitle={isVietnamese ? "Hộp thư" : "Inbox feed"}
            />

            {canBroadcast && (
              <>
                <button
                  type="button"
                  onClick={onOpenCustomDispatch}
                  className={`group inline-flex shrink-0 cursor-pointer items-center gap-2.5 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary transition-all duration-200 group-hover:scale-105 ${NM.recessed}`}
                  >
                    <Send className="size-4" />
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block font-extrabold">
                      {isVietnamese ? "Gửi tùy chỉnh" : "Custom Dispatch"}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                      {isVietnamese ? "Theo mẫu & người nhận" : "Targeted dispatch"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onOpenBroadcast}
                  className="inline-flex h-11 sm:h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)]"
                >
                  <Radio className="size-4" />
                  <span>
                    {isVietnamese
                      ? "+ Phát lệnh khẩn cấp"
                      : "+ Broadcast Alert"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Layer 2: Time Period Filter Strip (tác động toàn trang: header, KPI stats, hộp thư & nhật ký email) */}
        {onPeriodFilterChange && (
          <PeriodFilterStrip
            periodFilter={periodFilter}
            resolvedPeriod={resolvedPeriod}
            today={today}
            onPeriodFilterChange={onPeriodFilterChange}
            ariaLabel={
              isVietnamese
                ? "Bộ lọc thời gian thông báo toàn trang"
                : "Page-wide notification time filter"
            }
            allScopeCaption={
              isVietnamese
                ? "Áp dụng toàn trang (Thống kê, Hộp thư & Nhật ký Email)"
                : "Applies page-wide (Stats, Inbox & Email Logs)"
            }
          />
        )}
      </div>
    </section>
  );
}
