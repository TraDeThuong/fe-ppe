"use client";

import React from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ROLE_LABELS } from "@/config/navigation";
import { useLocale } from "@/providers/locale-provider";

export interface IncidentConsoleHeaderProps {
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  canCreateIncident: boolean;
  onCreateIncident: () => void;
  siteName?: string | null;
  userRole?: string | null;
  criticalCount: number;
}

export function IncidentConsoleHeader({
  isConnected,
  isRefreshing,
  onRefresh,
  canCreateIncident,
  onCreateIncident,
  siteName,
  userRole,
  criticalCount,
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

      <div className="relative">
        {/* Layer 1: Identity & Right Action Modules */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <ShieldAlert className="size-5" />
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
                  {t("incidents.title")}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {isVietnamese
                    ? "Giám sát An toàn PPE"
                    : "PPE Safety Monitoring"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {roleDisplay && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
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
                  {isConnected ? "Realtime Active" : "Polling (15s)"}
                </span>

                <span
                  title={resolvedSiteLabel}
                  className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{resolvedSiteLabel}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${
                    criticalCount > 0 ? "text-accent" : "text-muted-foreground"
                  } ${NM.recessed}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      criticalCount > 0
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

          {/* Right Action Controls (đồng bộ /cameras & /dashboard) */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-center">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`group inline-flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold uppercase tracking-wider text-foreground disabled:opacity-60 ${NM.tactileBtn}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${NM.recessed}`}
              >
                <RefreshCw
                  className={`size-4 text-primary transition-transform duration-500 ${
                    isRefreshing ? "animate-spin" : "group-hover:rotate-90"
                  }`}
                />
              </span>
              <span className="text-left leading-tight">
                <span className="block">
                  {isRefreshing
                    ? isVietnamese
                      ? "Đang đồng bộ"
                      : "Syncing"
                    : t("common.refresh")}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                  {isVietnamese ? "Dữ liệu sự cố" : "Incident feed"}
                </span>
              </span>
            </button>

            {canCreateIncident && (
              <button
                type="button"
                onClick={onCreateIncident}
                className="inline-flex h-11 sm:h-14 shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 sm:px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)]"
              >
                <Plus className="size-4" />
                <span>
                  {isVietnamese ? "Báo cáo Sự cố" : "Report Incident"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
