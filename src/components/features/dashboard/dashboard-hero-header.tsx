"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  Moon,
  ShieldCheck,
  Sun,
  Sunset,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { ConsoleRefreshButton } from "@/components/ui/refresh-action";
import { ROLE_LABELS } from "@/config/navigation";
import { useLocale } from "@/providers/locale-provider";
import type { MeDto } from "@/types";
import {
  DashboardNavTabs,
  type DashboardTabKey,
} from "./dashboard-nav-tabs";
import {
  DashboardScopeFilterBar,
  type DashboardPeriodState,
  type DashboardScopeSiteOption,
} from "./dashboard-scope-filter-bar";

export interface DashboardHeroHeaderProps {
  user:
  | MeDto
  | {
    fullName?: string | null;
    email?: string | null;
    role?: string;
  };
  siteName?: string | null;
  isRealtimeConnected: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Integrated quick actions & badges
  pendingCount?: number | null;
  canExportReports?: boolean;
  onOpenExportReport?: () => void;
  // Integrated domain navigation tabs
  activeTab?: DashboardTabKey;
  onChangeTab?: (tab: DashboardTabKey) => void;
  onlineCameras?: number | null;
  totalCameras?: number | null;
  canViewSafety?: boolean;
  canViewDevices?: boolean;
  // Integrated scope & period filter bar
  showFilterBar?: boolean;
  sites?: DashboardScopeSiteOption[];
  siteId?: string | null;
  onSiteChange?: (siteId: string | null) => void;
  canViewSites?: boolean;
  periodState?: DashboardPeriodState;
  groupingMode?: import("@/lib/incident-cluster-engine").IncidentAggregationMode;
  onChangeGroupingMode?: (
    mode: import("@/lib/incident-cluster-engine").IncidentAggregationMode,
  ) => void;
}

function getShiftKey(hours: number): "morning" | "afternoon" | "night" {
  if (hours >= 6 && hours < 14) return "morning";
  if (hours >= 14 && hours < 22) return "afternoon";
  return "night";
}

export function DashboardHeroHeader({
  user,
  siteName,
  isRealtimeConnected,
  onRefresh,
  isRefreshing = false,
  pendingCount,
  canExportReports = false,
  onOpenExportReport,
  activeTab,
  onChangeTab,
  onlineCameras,
  totalCameras,
  canViewSafety = true,
  canViewDevices = true,
  showFilterBar = false,
  sites = [],
  siteId = null,
  onSiteChange,
  canViewSites = true,
  periodState,
  groupingMode,
  onChangeGroupingMode,
}: DashboardHeroHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [shiftKey, setShiftKey] = useState<"morning" | "afternoon" | "night">(
    "morning",
  );

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setShiftKey(getShiftKey(now.getHours()));

      setCurrentTime(
        new Intl.DateTimeFormat(isVietnamese ? "vi-VN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now),
      );

      setCurrentDate(
        new Intl.DateTimeFormat(isVietnamese ? "vi-VN" : "en-US", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(now),
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isVietnamese]);

  const roleKey = user.role
    ? (ROLE_LABELS[user.role] ?? `roles.${user.role}`)
    : "roles.USER";
  const roleDisplay = t(roleKey) || user.role;

  const shiftConfig = {
    morning: {
      icon: Sun,
      label: t("dashboard.shift.morning"),
    },
    afternoon: {
      icon: Sunset,
      label: t("dashboard.shift.afternoon"),
    },
    night: {
      icon: Moon,
      label: t("dashboard.shift.night"),
    },
  };

  const ShiftIcon = shiftConfig[shiftKey].icon;
  const resolvedSiteLabel = siteName || t("dashboard.allSites");

  return (
    <section
      aria-label="Dashboard Command Console Header"
      className={`relative overflow-hidden rounded-[22px] p-3.5 sm:rounded-[30px] sm:p-7 transition-all duration-300 ${NM.chassis}`}
    >
      {/* Top specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 sm:inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="relative space-y-3.5 sm:space-y-5">
        {/* ============================================================
            TẦNG 1: IDENTITY (TRÁI) & COMPACT CLOCK + ICON ACTIONS (PHẢI)
           ============================================================ */}
        <div className="flex flex-col gap-3 sm:gap-5 xl:flex-row xl:items-center xl:justify-between">
          {/* Left Identity Cluster */}
          <div className="flex items-center sm:items-start gap-3 sm:gap-4">
            {/* 3D Extruded Emblem */}
            <div
              className={`relative flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl ${NM.extruded}`}
            >
              <div className="flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
                <LayoutDashboard className="size-4 sm:size-5" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-3 w-3 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full bg-background shadow-sm">
                <span
                  className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isRealtimeConnected
                      ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                      : "bg-muted-foreground/60"
                    }`}
                />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-0 sm:space-y-2">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {t("nav.dashboard")}
                </h1>

                {/* Mobile-only minimal live dot */}
                <span
                  title={
                    isRealtimeConnected
                      ? t("dashboard.connected")
                      : t("dashboard.disconnected")
                  }
                  className="inline-flex sm:hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground"
                      }`}
                  />
                  LIVE
                </span>

                {/* Desktop-only Subtitle Badge */}
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Smart PPE · Command Center
                </span>
              </div>

              {/* Desktop-only Metadata Row (Ẩn hoàn toàn trên Mobile) */}
              <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {t("dashboard.welcome")},{" "}
                  <strong className="font-bold text-foreground">
                    {user.fullName || user.email}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <ShieldCheck className="size-3.5" />
                  {roleDisplay}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-semibold ${isRealtimeConnected
                      ? "text-primary"
                      : "text-muted-foreground"
                    } ${NM.recessed}`}
                >
                  <span className="relative flex h-2 w-2">
                    {isRealtimeConnected && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    )}
                    <span
                      className={`relative h-2 w-2 rounded-full ${isRealtimeConnected
                          ? "bg-primary"
                          : "bg-muted-foreground"
                        }`}
                    />
                  </span>
                  {isRealtimeConnected
                    ? t("dashboard.connected")
                    : t("dashboard.disconnected")}
                </span>

                <span
                  title={resolvedSiteLabel}
                  className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-semibold text-foreground ${NM.recessed}`}
                >
                  <Building2 className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{resolvedSiteLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Telemetry Pod & Icon-only Actions (Mobile) / Full Controls (Web) */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 sm:self-start xl:self-center">
            {/* Shift & Live Clock Pod */}
            <div
              className={`flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 ${NM.extruded}`}
            >
              <div
                className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-primary ${NM.recessed}`}
              >
                <ShiftIcon className="size-3.5 sm:size-4" />
              </div>
              <div className="min-w-0">
                {/* Ẩn label ca trực trên mobile */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {shiftConfig[shiftKey].label}
                  </span>
                  <Activity className="size-3 text-primary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap font-mono text-xs sm:text-sm font-black tabular-nums text-foreground">
                    {currentTime || "--:--:--"}
                  </span>
                  {/* Ẩn ngày tháng trên mobile */}
                  <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
                    {currentDate || "..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Chỉ giữ icon trên mobile, đủ text trên web */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {onRefresh && (
                <ConsoleRefreshButton
                  compact
                  onRefresh={onRefresh}
                  isRefreshing={isRefreshing}
                  label={t("dashboard.data.refresh")}
                  ariaLabel={t("dashboard.data.refresh")}
                />
              )}

              {canExportReports && onOpenExportReport && (
                <button
                  type="button"
                  onClick={onOpenExportReport}
                  title={t("dashboard.data.export")}
                  aria-label={t("dashboard.data.export")}
                  className="inline-flex h-10 w-10 sm:h-12 sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-0 sm:px-4 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-[6px_6px_14px_rgba(0,0,0,0.16),-4px_-4px_10px_rgba(255,255,255,0.7),inset_1px_1px_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.5)]"
                >
                  <FileSpreadsheet className="size-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {t("dashboard.data.export")}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            TẦNG 2: DOMAIN NAVIGATION SWITCH TRACK
           ============================================================ */}
        {activeTab && onChangeTab && (
          <div className="-mx-3.5 px-3.5 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
            <DashboardNavTabs
              activeTab={activeTab}
              onChangeTab={onChangeTab}
              pendingCount={pendingCount}
              onlineCameras={onlineCameras}
              totalCameras={totalCameras}
              canViewSafety={canViewSafety}
              canViewDevices={canViewDevices}
            />
          </div>
        )}

        {/* ============================================================
            TẦNG 3: INTEGRATED SCOPE & PERIOD FILTER STRIP
           ============================================================ */}
        {showFilterBar && periodState && (
          <DashboardScopeFilterBar
            sites={sites}
            siteId={siteId}
            siteName={siteName}
            onSiteChange={onSiteChange}
            canViewSites={canViewSites}
            periodState={periodState}
            groupingMode={groupingMode}
            onChangeGroupingMode={onChangeGroupingMode}
          />
        )}
      </div>
    </section>
  );
}
