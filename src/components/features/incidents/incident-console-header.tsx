"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Database,
  Images,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { PeriodFilterStrip } from "@/components/features/app-shell/period-filter-strip";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import { ROLE_LABELS } from "@/config/navigation";
import type {
  IncidentPeriodFilter,
  ResolvedIncidentPeriod,
} from "@/lib/incident-period";
import { useLocale } from "@/providers/locale-provider";

export interface IncidentConsoleHeaderProps {
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  canCreateIncident: boolean;
  onCreateIncident: () => void;
  canExportFeedback?: boolean;
  onExportFeedback?: () => void;
  siteName?: string | null;
  userRole?: string | null;
  criticalCount?: number;
  periodFilter?: IncidentPeriodFilter;
  resolvedPeriod?: ResolvedIncidentPeriod;
  today?: string;
  onPeriodFilterChange?: (next: IncidentPeriodFilter) => void;
}

export function IncidentConsoleHeader({
  isConnected,
  isRefreshing,
  onRefresh,
  canCreateIncident,
  onCreateIncident,
  canExportFeedback = false,
  onExportFeedback,
  siteName,
  userRole,
  criticalCount,
  periodFilter,
  resolvedPeriod,
  today,
  onPeriodFilterChange,
}: IncidentConsoleHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const roleKey = userRole
    ? (ROLE_LABELS[userRole.toUpperCase()] ?? `roles.${userRole.toUpperCase()}`)
    : null;
  const roleDisplay = roleKey ? t(roleKey) || userRole : null;
  const resolvedSiteLabel =
    siteName || (isVietnamese ? "Tất cả công trường" : "All Sites");

  return (
    <section
      aria-label={
        isVietnamese
          ? "Tiêu đề trung tâm quản lý sự cố PPE"
          : "PPE Incident Console Header"
      }
      className={`relative overflow-hidden rounded-[22px] p-3.5 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative space-y-3 sm:space-y-5">
        {/* Layer 1: Mobile xếp 2 hàng thoáng (Tiêu đề đầy đủ trên, Icon buttons dưới); Web giữ nguyên 100% */}
        <div className="flex flex-col gap-3 sm:gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Left Identity Block */}
          <div className="flex min-w-0 items-center sm:items-start gap-3 sm:gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <ShieldAlert className="size-4 sm:size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                    }`}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-0 sm:space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Không dùng truncate để tiêu đề luôn hiển thị đầy đủ */}
                <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("incidents.title")}
                </h1>
                {/* Ẩn subtitle badge trên mobile */}
                <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isVietnamese
                    ? "Giám sát An toàn PPE"
                    : "PPE Safety Monitoring"}
                </span>
              </div>

              {/* Ẩn toàn bộ hàng metadata trên mobile */}
              <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {roleDisplay && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    <ShieldCheck className="size-3.5" />
                    {roleDisplay}
                  </span>
                )}

                <span
                  title={
                    isConnected
                      ? isVietnamese
                        ? "Đang kết nối nhận diện vi phạm tự động thời gian thực"
                        : "Connected to realtime incident detection stream"
                      : isVietnamese
                        ? "Đang duy trì kiểm tra định kỳ (15s)"
                        : "Maintaining polling (15s)"
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${isConnected ? "text-primary" : "text-accent"
                    } ${NM.recessed}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    )}
                    <span
                      className={`relative h-2 w-2 rounded-full ${isConnected ? "bg-primary" : "bg-accent"
                        }`}
                    />
                  </span>
                  {isConnected ? "Realtime Active" : "Polling (30s)"}
                </span>

                <span
                  title={resolvedSiteLabel}
                  className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{resolvedSiteLabel}</span>
                </span>

                {criticalCount !== undefined && <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${criticalCount > 0 ? "text-accent" : "text-muted-foreground"
                    } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${criticalCount > 0
                        ? "animate-pulse bg-accent"
                        : "bg-muted-foreground/40"
                      }`}
                  />
                  {criticalCount > 0
                    ? isVietnamese
                      ? `${criticalCount} vi phạm khẩn cấp`
                      : `${criticalCount} critical alerts`
                    : isVietnamese
                      ? "Không có vi phạm khẩn cấp"
                      : "No critical alerts"}
                </span>}
              </div>
            </div>
          </div>

          {/* Right Action Dock: Mobile nằm gọn 1 hàng dưới tiêu đề, chỉ icon vuông; Web giữ nguyên 100% */}
          <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start gap-2 sm:gap-2.5 2xl:shrink-0">
            {/* Cụm nút tác vụ phụ nằm chung 1 khay khắc lõm (Neumorphic Dock) */}
            <div
              className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 ${NM.recessed}`}
            >
              <Link
                href="/evidences"
                title={t("nav.evidences")}
                aria-label={t("nav.evidences")}
                className={`group inline-flex h-9 w-9 sm:h-10 sm:w-auto shrink-0 items-center justify-center sm:justify-start gap-2.5 whitespace-nowrap rounded-lg sm:rounded-xl px-0 sm:px-3 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <Images className="size-3.5" />
                </span>
                <span className="hidden sm:block text-left leading-none">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                    {t("nav.evidences")}
                  </span>
                  <span className="mt-0.5 hidden text-[10px] font-medium text-muted-foreground md:block">
                    {isVietnamese ? "Ảnh & video" : "Media"}
                  </span>
                </span>
              </Link>

              {canExportFeedback && onExportFeedback && (
                <button
                  type="button"
                  onClick={onExportFeedback}
                  title={isVietnamese ? "Feedback AI" : "AI Feedback"}
                  aria-label={isVietnamese ? "Feedback AI" : "AI Feedback"}
                  className={`group inline-flex h-9 w-9 sm:h-10 sm:w-auto shrink-0 cursor-pointer items-center justify-center sm:justify-start gap-2.5 whitespace-nowrap rounded-lg sm:rounded-xl px-0 sm:px-3 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent transition-transform duration-200 group-hover:scale-105">
                    <Database className="size-3.5" />
                  </span>
                  <span className="hidden sm:block text-left leading-none">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                      {isVietnamese ? "Feedback AI" : "AI Feedback"}
                    </span>
                    <span className="mt-0.5 hidden text-[10px] font-medium text-muted-foreground md:block">
                      {isVietnamese ? "Xuất dataset" : "Export CSV"}
                    </span>
                  </span>
                </button>
              )}

              {/* Mobile: Ép ẩn toàn bộ chữ "Làm mới" bên trong ConsoleRefreshButton, chỉ chừa icon */}
              <div className="shrink-0 sm:hidden [&_span:not(:has(svg))]:hidden [&_button]:w-9 [&_button]:px-0 [&_button]:justify-center">
                <ConsoleRefreshButton
                  compact
                  onRefresh={onRefresh}
                  isRefreshing={isRefreshing}
                  label=""
                  ariaLabel={t("dashboard.data.refresh")}
                />
              </div>
              <div className="hidden shrink-0 sm:block">
                <ConsoleRefreshButton
                  onRefresh={onRefresh}
                  isRefreshing={isRefreshing}
                  subtitle={isVietnamese ? "Dữ liệu" : "Feed"}
                />
              </div>
            </div>

            {/* Nút CTA chính: Icon vuông trên Mobile, đầy đủ text trên Web */}
            {canCreateIncident && (
              <button
                type="button"
                onClick={onCreateIncident}
                title={isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                aria-label={isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                className="inline-flex h-11 w-11 sm:h-[52px] sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl sm:rounded-2xl bg-primary px-0 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)]"
              >
                <Plus className="size-4 shrink-0" />
                <span className="hidden sm:inline">
                  {isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Layer 2: Time Period Filter Strip */}
        {onPeriodFilterChange && (
          <PeriodFilterStrip
            periodFilter={periodFilter}
            resolvedPeriod={resolvedPeriod}
            today={today}
            onPeriodFilterChange={onPeriodFilterChange}
            ariaLabel={
              isVietnamese
                ? "Bộ lọc thời gian sự cố toàn trang"
                : "Page-wide incident time filter"
            }
          />
        )}
      </div>
    </section>
  );
}
