"use client";

import { useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";
import { Activity, Globe2, Menu, Radio } from "lucide-react";

import { NotificationBell } from "./notification-bell";
import { SiteSelector } from "./site-selector";
import { UserMenu } from "./user-menu";
import { MobileHeaderSettings } from "./mobile-header-settings";
import { MobileSidebar } from "./mobile-sidebar";

const headerActionClass =
  "relative z-10 flex h-9 shrink-0 items-center justify-center " +
  "rounded-xl border border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)] " +
  "bg-background transition-all duration-200 " +
  "hover:text-primary active:shadow-nm-pressed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export function AppHeader() {
  const { isConnected } = useRealtime();
  const { t, locale, setLocale } = useLocale();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVietnamese = locale === "vi-VN";

  const realtimeTitle = t(
    isConnected ? "header.realtime.on" : "header.realtime.off",
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 isolate">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24
          bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--shadow-light)_30%,transparent),transparent_72%)]
          opacity-80"
      />

      <div className="relative px-2 pt-2 sm:px-5 sm:pt-4 lg:px-7">
        {/* OUTER CONVEX SHELL */}
        <div
          className="
            relative rounded-[19px] border
            border-[color-mix(in_srgb,var(--shadow-light)_35%,transparent)]
            bg-background p-1
            shadow-[0_2px_2px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),0_6px_12px_color-mix(in_srgb,var(--shadow-dark)_14%,transparent),-4px_-4px_10px_color-mix(in_srgb,var(--shadow-light)_65%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_90%,transparent)]
            transition-[box-shadow,border-color] duration-300
            sm:rounded-[25px] sm:p-[5px]
            sm:shadow-[0_2px_2px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),0_6px_12px_color-mix(in_srgb,var(--shadow-dark)_14%,transparent),0_12px_26px_color-mix(in_srgb,var(--shadow-dark)_9%,transparent),-5px_-5px_12px_color-mix(in_srgb,var(--shadow-light)_72%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_90%,transparent)]
            sm:hover:shadow-[0_3px_3px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),0_9px_18px_color-mix(in_srgb,var(--shadow-dark)_15%,transparent),0_16px_32px_color-mix(in_srgb,var(--shadow-dark)_10%,transparent),-6px_-6px_14px_color-mix(in_srgb,var(--shadow-light)_76%,transparent)]
          "
        >
          {/* Outer rim */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute inset-0 rounded-[19px]
              border border-white/20 opacity-80
              shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_3px_color-mix(in_srgb,var(--shadow-dark)_10%,transparent)]
              dark:border-white/5
              sm:rounded-[25px]
            "
          />

          {/* Concave inner cavity */}
          <div
            className="
              relative isolate flex h-[50px] items-center gap-1.5
              overflow-visible rounded-[15px] border
              border-[color-mix(in_srgb,var(--shadow-dark)_8%,transparent)]
              bg-background px-2
              shadow-[inset_3px_3px_7px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent),inset_-3px_-3px_7px_color-mix(in_srgb,var(--shadow-light)_70%,transparent)]
              dark:border-white/[0.04]
              sm:h-[58px] sm:gap-3 sm:rounded-[20px] sm:px-4
              sm:shadow-[inset_4px_4px_9px_color-mix(in_srgb,var(--shadow-dark)_32%,transparent),inset_1px_1px_3px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),inset_-4px_-4px_9px_color-mix(in_srgb,var(--shadow-light)_78%,transparent),inset_-1px_-1px_3px_color-mix(in_srgb,var(--shadow-light)_90%,transparent)]
            "
          >
            {/* Inner highlights */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 top-0 h-px
                rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent
                dark:via-white/15"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 bottom-0 h-px
                rounded-full bg-gradient-to-r from-transparent via-black/[0.08] to-transparent
                dark:via-black/40"
            />

            {/* Ambient light */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none absolute inset-0 -z-10 rounded-[15px]
                bg-[radial-gradient(ellipse_at_12%_-25%,color-mix(in_srgb,var(--shadow-light)_45%,transparent),transparent_52%),radial-gradient(ellipse_at_90%_120%,color-mix(in_srgb,var(--shadow-dark)_8%,transparent),transparent_48%)]
                opacity-85 sm:rounded-[20px]
              "
            />

            {/* Mobile hamburger: nằm trong Header, trước SiteSelector */}
            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? "Đóng menu điều hướng"
                  : "Mở menu điều hướng"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((previous) => !previous)}
              className="
                relative z-20 flex h-9 w-9 shrink-0 items-center justify-center
                rounded-xl border
                border-[color-mix(in_srgb,var(--shadow-light)_35%,transparent)]
                bg-background text-muted-foreground
                shadow-[2px_2px_5px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent),-2px_-2px_5px_color-mix(in_srgb,var(--shadow-light)_70%,transparent)]
                transition-all duration-200
                hover:text-primary
                active:shadow-[inset_2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent)]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-primary/50
                md:hidden
              "
            >
              <Menu
                aria-hidden="true"
                className={`h-5 w-5 transition-transform duration-200 ${
                  mobileMenuOpen ? "rotate-90" : ""
                }`}
              />
            </button>

            {/* Site selector */}
            <div className="relative z-10 min-w-0 max-w-[55%] sm:max-w-none">
              <SiteSelector />
            </div>

            <div className="min-w-0 flex-1" />

            {/* Realtime status */}
            <div
              role="status"
              title={realtimeTitle}
              aria-label={realtimeTitle}
              className={`
                relative z-10 flex h-8 shrink-0 items-center gap-1.5
                rounded-lg px-1.5 transition-colors duration-200
                sm:h-9 sm:gap-2 sm:rounded-xl sm:border sm:px-2.5
                ${
                  isConnected
                    ? "text-emerald-600 dark:text-emerald-400 sm:border-emerald-500/15 sm:bg-emerald-500/5 sm:shadow-[inset_2px_2px_4px_rgba(16,185,129,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.25)]"
                    : "text-rose-500 dark:text-rose-400 sm:border-rose-500/15 sm:bg-rose-500/5 sm:shadow-[inset_2px_2px_4px_rgba(239,68,68,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]"
                }
              `}
            >
              <span className="relative flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6 sm:rounded-lg sm:shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent),-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_75%,transparent)]">
                {isConnected ? (
                  <Activity className="relative z-10 h-4 w-4 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <Radio className="relative z-10 h-4 w-4 sm:h-3.5 sm:w-3.5" />
                )}

                {isConnected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-ping rounded-lg
                      bg-emerald-400/20 [animation-duration:2.5s]
                      motion-reduce:animate-none"
                  />
                )}
              </span>

              <span className="hidden text-[10px] font-extrabold tracking-[0.16em] xl:inline">
                {isConnected ? "LIVE" : "OFFLINE"}
              </span>

              <span
                aria-hidden="true"
                className={`
                  h-1.5 w-1.5 rounded-full
                  ${
                    isConnected
                      ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.75),0_0_12px_rgba(16,185,129,0.35)]"
                      : "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.35)]"
                  }
                `}
              />
            </div>

            {/* Notifications */}
            <div
              className="
                relative z-10 flex h-8 w-8 shrink-0 items-center justify-center
                sm:h-9 sm:w-auto sm:rounded-xl sm:border sm:px-1
                sm:border-[color-mix(in_srgb,var(--shadow-light)_30%,transparent)]
                sm:bg-background
                sm:shadow-[3px_3px_6px_color-mix(in_srgb,var(--shadow-dark)_25%,transparent),-3px_-3px_6px_color-mix(in_srgb,var(--shadow-light)_75%,transparent)]
              "
            >
              <NotificationBell />
            </div>

            {/* Theme: desktop only */}
            <div className={`hidden sm:flex ${headerActionClass}`}>
              <ThemeToggle />
            </div>

            {/* Language: desktop only */}
            <button
              type="button"
              id="locale-toggle-btn"
              aria-label="Toggle language"
              title={
                isVietnamese
                  ? "Switch to English"
                  : "Chuyển sang tiếng Việt"
              }
              onClick={() => setLocale(isVietnamese ? "en-US" : "vi-VN")}
              className={`
                hidden sm:flex ${headerActionClass}
                group h-9 cursor-pointer gap-1.5 px-2.5
                text-xs font-extrabold text-muted-foreground
                hover:text-foreground
              `}
            >
              <Globe2 className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-[35deg]" />
              <span>{isVietnamese ? "EN" : "VI"}</span>
            </button>

            {/* Mobile: theme + language settings */}
            <MobileHeaderSettings />

            {/* Sculpted separator */}
            <div
              aria-hidden="true"
              className="
                mx-0.5 h-6 w-px shrink-0
                bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--shadow-dark)_20%,transparent),color-mix(in_srgb,var(--shadow-light)_70%,transparent),transparent)]
                sm:mx-0.5 sm:h-7
              "
            />

            {/* User profile */}
            <div className="relative z-10 shrink-0">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Sculpted transition below header */}
      <div aria-hidden="true" className="relative h-3 sm:h-5">
        <div
          className="absolute inset-x-8 top-0 h-px
            bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--shadow-dark)_20%,transparent),transparent)]"
        />
        <div
          className="absolute inset-x-12 top-0 h-3
            bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--shadow-dark)_8%,transparent),transparent_72%)]
            blur-[5px] sm:h-4"
        />
      </div>
    </header>
  );
}