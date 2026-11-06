
"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import type { MeDto } from "@/types";
import { ROLE_LABELS } from "@/config/navigation";

export interface DashboardHeroHeaderProps {
  user: MeDto | {
    fullName?: string | null;
    email?: string | null;
    role?: string;
  };
  siteName?: string | null;
  isRealtimeConnected: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function getShiftKey(
  hours: number
): "morning" | "afternoon" | "night" {
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
}: DashboardHeroHeaderProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [shiftKey, setShiftKey] = useState<
    "morning" | "afternoon" | "night"
  >("morning");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setShiftKey(getShiftKey(now.getHours()));

      setCurrentTime(
        new Intl.DateTimeFormat(
          isVietnamese ? "vi-VN" : "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }
        ).format(now)
      );

      setCurrentDate(
        new Intl.DateTimeFormat(
          isVietnamese ? "vi-VN" : "en-US",
          {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        ).format(now)
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [isVietnamese]);

  const roleKey = user.role
    ? ROLE_LABELS[user.role] ?? `roles.${user.role}`
    : "roles.USER";

  const roleDisplay = t(roleKey) || user.role;

  const shiftConfig = {
    morning: {
      icon: Sun,
      label: t("dashboard.shift.morning"),
      description: isVietnamese ? "Ca sáng" : "Morning shift",
    },
    afternoon: {
      icon: Sunset,
      label: t("dashboard.shift.afternoon"),
      description: isVietnamese ? "Ca chiều" : "Afternoon shift",
    },
    night: {
      icon: Moon,
      label: t("dashboard.shift.night"),
      description: isVietnamese ? "Ca đêm" : "Night shift",
    },
  };

  const ShiftIcon = shiftConfig[shiftKey].icon;

  return (
    <section
      className="
        group/hero relative isolate w-full overflow-hidden
        rounded-[24px] border border-border/25
        bg-background
        shadow-[7px_7px_17px_var(--shadow-dark),-7px_-7px_17px_var(--shadow-light)]
        dark:shadow-[7px_7px_17px_var(--shadow-dark),-4px_-4px_12px_var(--shadow-light)]
      "
    >
      {/* ================================================== */}
      {/* Ambient Background */}
      {/* ================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-20 -top-28
          h-72 w-72 rounded-full
          bg-primary/[0.08] blur-[75px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -bottom-28 right-[25%]
          h-56 w-56 rounded-full
          bg-accent/[0.10] blur-[70px]
        "
      />

      {/* Decorative geometry */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute right-[30%] top-0
          h-full w-px bg-gradient-to-b
          from-transparent via-primary/10 to-transparent
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-8 -bottom-24
          h-64 w-64 rounded-full border border-primary/[0.07]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -right-2 -bottom-18
          h-48 w-48 rounded-full border border-primary/[0.06]
        "
      />

      {/* Top highlight */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-x-10 top-0
          h-px bg-gradient-to-r
          from-transparent via-white/80 to-transparent
          dark:via-white/10
        "
      />

      <div className="relative grid grid-cols-1 gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(480px,1.15fr)] xl:items-center xl:gap-8">

        {/* ================================================== */}
        {/* LEFT: Welcome / Identity */}
        {/* ================================================== */}

        <div className="relative flex min-w-0 flex-col justify-center">

          {/* Eyebrow */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="
              flex items-center gap-1.5
              text-[10px] font-extrabold uppercase
              tracking-[0.17em] text-primary
            ">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {isVietnamese
                  ? "Smart PPE · Safety Command Center"
                  : "Smart PPE · Safety Command Center"}
              </span>
            </div>

            <span className="
              h-1 w-1 rounded-full bg-accent
            " />

            <span className="
              text-[9px] font-semibold uppercase
              tracking-wider text-muted-foreground
            ">
              {isVietnamese ? "Hệ thống giám sát" : "Monitoring System"}
            </span>
          </div>

          {/* Main Greeting */}
          <div className="min-w-0">
            <p className="mb-1 text-[12px] font-medium text-muted-foreground">
              {t("dashboard.welcome")}
            </p>

            <h1 className="
              max-w-full break-words
              text-[27px] font-black leading-[1.15]
              tracking-[-0.045em] text-foreground
              sm:text-[32px] lg:text-[36px]
            ">
              {user.fullName || user.email}
              <span className="text-primary">.</span>
            </h1>
          </div>

          {/* Identity / Connection */}
          <div className="mt-4 flex flex-wrap items-center gap-2">

            <div className="
              inline-flex items-center gap-1.5
              rounded-lg bg-primary/10
              px-3 py-1.5 text-[10px] font-bold text-primary
            ">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleDisplay}
            </div>

            <div className="
              inline-flex items-center gap-2
              rounded-lg bg-background px-3 py-1.5
              shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
            ">
              <span className="relative flex h-2 w-2">
                {isRealtimeConnected && (
                  <span className="
                    absolute inline-flex h-full w-full
                    animate-ping rounded-full bg-primary opacity-40
                  " />
                )}
                <span className={`
                  relative h-2 w-2 rounded-full
                  ${isRealtimeConnected
                    ? "bg-primary"
                    : "bg-muted-foreground"}
                `} />
              </span>

              <span className={`
                text-[10px] font-bold
                ${isRealtimeConnected
                  ? "text-primary"
                  : "text-muted-foreground"}
              `}>
                {isRealtimeConnected
                  ? t("dashboard.connected")
                  : t("dashboard.disconnected")}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* RIGHT: Information Modules */}
        {/* ================================================== */}

        <div className="
          relative grid grid-cols-2 gap-3
          sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1.2fr)]
          xl:gap-3
        ">

          {/* Site Module */}
          <div className="
            group/site relative flex min-w-0 items-center gap-3
            overflow-hidden rounded-[17px] bg-background
            px-3.5 py-4
            shadow-[inset_3px_3px_7px_var(--shadow-dark),inset_-3px_-3px_7px_var(--shadow-light)]
            transition-all duration-300
            hover:shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-2px_-2px_6px_var(--shadow-light)]
          ">
            <div className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl bg-background text-primary
              shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
              transition-transform duration-300
              group-hover/site:-translate-y-0.5
            ">
              <Building2 className="h-[18px] w-[18px]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="
                mb-1 text-[9px] font-extrabold uppercase
                tracking-[0.12em] text-muted-foreground
              ">
                {t("dashboard.activeSite")}
              </p>

              <p
                title={siteName || t("dashboard.allSites")}
                className="truncate text-[12px] font-extrabold text-foreground"
              >
                {siteName || t("dashboard.allSites")}
              </p>

              <p className="mt-1 truncate text-[9px] font-medium text-muted-foreground">
                {isVietnamese ? "Phạm vi giám sát" : "Monitoring scope"}
              </p>
            </div>

            <ArrowUpRight className="
              absolute right-2 top-2 h-3 w-3
              text-muted-foreground/40
              transition-colors group-hover/site:text-primary
            " />
          </div>

          {/* Shift Module */}
          <div className="
            group/shift relative flex min-w-0 flex-col
            justify-between overflow-hidden rounded-[17px]
            bg-background p-3.5
            shadow-[4px_4px_9px_var(--shadow-dark),-4px_-4px_9px_var(--shadow-light)]
            transition-all duration-300
            hover:-translate-y-0.5
          ">
            <div className="flex items-center justify-between">
              <span className="
                text-[9px] font-extrabold uppercase
                tracking-[0.12em] text-muted-foreground
              ">
                {isVietnamese ? "Ca trực" : "Shift"}
              </span>

              <div className="
                flex h-8 w-8 items-center justify-center
                rounded-lg bg-accent/20 text-accent-foreground
                shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)]
              ">
                <ShiftIcon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <p className="truncate text-[13px] font-black text-foreground">
                {shiftConfig[shiftKey].label}
              </p>

              <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                {shiftConfig[shiftKey].description}
              </p>
            </div>

            <div className="
              absolute -bottom-4 -right-4
              h-16 w-16 rounded-full bg-accent/[0.07] blur-xl
              transition-all group-hover/shift:bg-accent/[0.15]
            " />
          </div>

          {/* Clock Module */}
          <div className="
            col-span-2 flex min-w-0 items-center gap-3
            rounded-[17px] bg-background px-4 py-3
            shadow-[inset_3px_3px_8px_var(--shadow-dark),inset_-3px_-3px_8px_var(--shadow-light)]
            sm:col-span-1
          ">
            <div className="
              flex h-10 w-10 shrink-0 items-center justify-center
              rounded-xl bg-background text-primary
              shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
            ">
              <Clock3 className="h-[18px] w-[18px]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-1">
                <span className="
                  text-[9px] font-extrabold uppercase
                  tracking-[0.12em] text-muted-foreground
                ">
                  {isVietnamese ? "System Time" : "System Time"}
                </span>

                <Activity className="h-3 w-3 text-primary" />
              </div>

              <p className="
                whitespace-nowrap font-mono
                text-[19px] font-black leading-none
                tracking-[-0.04em] tabular-nums text-foreground
              ">
                {currentTime || "--:--:--"}
              </p>

              <p className="mt-1.5 truncate text-[9px] font-medium text-muted-foreground">
                {currentDate || "..."}
              </p>
            </div>
          </div>

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={isVietnamese ? "Làm mới dữ liệu" : "Refresh data"}
              className="
                absolute -right-2 -top-2 z-10
                h-8 w-8 rounded-lg
                border border-border/30 bg-background
                text-primary
                shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)]
                transition-all duration-200
                hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground
                active:translate-y-0
                active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]
                disabled:opacity-50
              "
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="
        absolute bottom-0 left-6 right-6
        h-[2px] overflow-hidden rounded-full
        bg-border/20
      ">
        <div className="
          h-full w-[22%] rounded-full
          bg-gradient-to-r from-primary/30 via-primary to-accent
          opacity-70
        " />
      </div>
    </section>
  );
}
