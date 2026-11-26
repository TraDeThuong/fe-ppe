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
  criticalCount: number;
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
      className={`relative overflow-hidden rounded-[24px] p-4 sm:rounded-[30px] sm:p-6 lg:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular highlight (đồng bộ /cameras và /dashboard) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative space-y-5">
        {/* Layer 1: Identity & Right Action Modules */}
        <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Left Identity Block */}
          <div className="flex min-w-0 items-start gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <ShieldAlert className="size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-2 w-2 rounded-full ${isConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-accent/60"
                    }`}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("incidents.title")}
                </h1>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isVietnamese
                    ? "Giám sát An toàn PPE"
                    : "PPE Safety Monitoring"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                  {isConnected ? "Realtime Active" : "Polling (15s)"}
                </span>

                <span
                  title={resolvedSiteLabel}
                  className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{resolvedSiteLabel}</span>
                </span>

                <span
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
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Dock: Khóa 1 hàng duy nhất, chiều cao đồng nhất (h-12), không rớt dòng lẻ */}
          <div className="flex w-full items-center gap-2.5 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0 2xl:shrink-0">
            {/* Cụm nút tác vụ phụ nằm chung 1 khay khắc lõm (Neumorphic Dock) */}
            <div
              className={`flex shrink-0 items-center gap-2 rounded-2xl p-1.5 ${NM.recessed}`}
            >
              <Link
                href="/evidences"
                className={`group inline-flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <Images className="size-3.5" />
                </span>
                <span className="text-left leading-none">
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
                  className={`group inline-flex h-10 shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold text-foreground transition-all duration-200 hover:text-primary active:scale-[0.98] ${NM.tactileBtn}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent transition-transform duration-200 group-hover:scale-105">
                    <Database className="size-3.5" />
                  </span>
                  <span className="text-left leading-none">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider">
                      {isVietnamese ? "Feedback AI" : "AI Feedback"}
                    </span>
                    <span className="mt-0.5 hidden text-[10px] font-medium text-muted-foreground md:block">
                      {isVietnamese ? "Xuất dataset" : "Export CSV"}
                    </span>
                  </span>
                </button>
              )}

              <div className="shrink-0">
                <ConsoleRefreshButton
                  onRefresh={onRefresh}
                  isRefreshing={isRefreshing}
                  subtitle={isVietnamese ? "Dữ liệu" : "Feed"}
                />
              </div>
            </div>

            {/* Nút CTA chính tách biệt, chiều cao khớp tuyệt đối với khay bên cạnh */}
            {canCreateIncident && (
              <button
                type="button"
                onClick={onCreateIncident}
                className="inline-flex h-[52px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-4 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)] sm:px-5"
              >
                <Plus className="size-4 shrink-0" />
                <span>
                  {isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Layer 2: Time Period Filter Strip (tác động toàn trang: header, KPI stats, card điều phối & bảng) */}
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
