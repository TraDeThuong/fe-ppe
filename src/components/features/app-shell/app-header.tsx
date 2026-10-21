"use client";

import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";
import { Globe2, Radio, Activity } from "lucide-react";

import { NotificationBell } from "./notification-bell";
import { SiteSelector } from "./site-selector";
import { UserMenu } from "./user-menu";

const headerActionClass =
  "relative z-10 flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--shadow-light)_42%,transparent)] bg-background shadow-[3px_3px_6px_color-mix(in_srgb,var(--shadow-dark)_30%,transparent),-3px_-3px_6px_color-mix(in_srgb,var(--shadow-light)_88%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_65%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--shadow-light)_72%,transparent)] hover:shadow-[4px_5px_9px_color-mix(in_srgb,var(--shadow-dark)_32%,transparent),-4px_-4px_9px_color-mix(in_srgb,var(--shadow-light)_95%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_90%,transparent)] active:translate-y-0 active:shadow-[inset_3px_3px_6px_color-mix(in_srgb,var(--shadow-dark)_34%,transparent),inset_-3px_-3px_6px_color-mix(in_srgb,var(--shadow-light)_90%,transparent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0";

export function AppHeader() {
  const { isConnected } = useRealtime();
  const { t, locale, setLocale } = useLocale();

  const isVietnamese = locale === "vi-VN";
  const realtimeTitle = t(
    isConnected ? "header.realtime.on" : "header.realtime.off"
  );

  return (
    <header className="sticky top-0 z-30 shrink-0 isolate">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--shadow-light)_30%,transparent),transparent_72%)] opacity-80"
      />

      <div className="relative px-3 pt-3 sm:px-5 sm:pt-4 lg:px-7">
        {/* OUTER CONVEX SHELL */}
        <div className="relative rounded-[21px] p-1 sm:rounded-[25px] sm:p-[5px] bg-background border border-[color-mix(in_srgb,var(--shadow-light)_35%,transparent)] shadow-[0_2px_2px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),0_6px_12px_color-mix(in_srgb,var(--shadow-dark)_14%,transparent),0_12px_26px_color-mix(in_srgb,var(--shadow-dark)_9%,transparent),-5px_-5px_12px_color-mix(in_srgb,var(--shadow-light)_72%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_90%,transparent),inset_0_-1px_0_color-mix(in_srgb,var(--shadow-dark)_10%,transparent)] hover:shadow-[0_3px_3px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),0_9px_18px_color-mix(in_srgb,var(--shadow-dark)_15%,transparent),0_16px_32px_color-mix(in_srgb,var(--shadow-dark)_10%,transparent),-6px_-6px_14px_color-mix(in_srgb,var(--shadow-light)_76%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--shadow-light)_95%,transparent)] transition-[box-shadow,border-color] duration-300 motion-reduce:transition-none">
          {/* Outer rim / reflective edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[21px] sm:rounded-[25px] border border-white/20 dark:border-white/5 opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_3px_color-mix(in_srgb,var(--shadow-dark)_10%,transparent)]"
          />

          {/* Concave inner cavity */}
          <div className="relative isolate flex h-[54px] sm:h-[58px] items-center gap-2 overflow-visible rounded-[17px] sm:rounded-[20px] px-2.5 sm:gap-3 sm:px-4 bg-background border border-[color-mix(in_srgb,var(--shadow-dark)_8%,transparent)] dark:border-white/[0.04] shadow-[inset_4px_4px_9px_color-mix(in_srgb,var(--shadow-dark)_32%,transparent),inset_1px_1px_3px_color-mix(in_srgb,var(--shadow-dark)_12%,transparent),inset_-4px_-4px_9px_color-mix(in_srgb,var(--shadow-light)_78%,transparent),inset_-1px_-1px_3px_color-mix(in_srgb,var(--shadow-light)_90%,transparent)]">
            {/* Inner edge highlights */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 bottom-0 h-px rounded-full bg-gradient-to-r from-transparent via-black/[0.08] to-transparent dark:via-black/40"
            />

            {/* Ambient light inside the cavity */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-[17px] sm:rounded-[20px] opacity-85 bg-[radial-gradient(ellipse_at_12%_-25%,color-mix(in_srgb,var(--shadow-light)_45%,transparent),transparent_52%),radial-gradient(ellipse_at_90%_120%,color-mix(in_srgb,var(--shadow-dark)_8%,transparent),transparent_48%)]"
            />

            {/* Site selector */}
            <div className="relative z-10 min-w-0">
              <SiteSelector />
            </div>

            <div className="flex-1" />

            {/* Realtime status */}
            <div
              role="status"
              title={realtimeTitle}
              className={`group relative z-10 flex h-9 shrink-0 items-center gap-2 rounded-xl border px-2.5 transition-[background,box-shadow,border-color,color] duration-200 motion-reduce:transition-none ${
                isConnected
                  ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-[inset_2px_2px_4px_rgba(16,185,129,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.25)]"
                  : "border-rose-500/15 bg-rose-500/5 text-rose-500 dark:text-rose-400 shadow-[inset_2px_2px_4px_rgba(239,68,68,0.07),inset_-2px_-2px_4px_rgba(255,255,255,0.2)]"
              }`}
            >
              <span className="relative flex h-6 w-6 items-center justify-center rounded-lg shadow-[2px_2px_4px_color-mix(in_srgb,var(--shadow-dark)_20%,transparent),-2px_-2px_4px_color-mix(in_srgb,var(--shadow-light)_75%,transparent)]">
                {isConnected ? (
                  <Activity className="relative z-10 h-3.5 w-3.5" />
                ) : (
                  <Radio className="relative z-10 h-3.5 w-3.5" />
                )}

                {isConnected && (
                  <span className="absolute inset-0 animate-ping rounded-lg bg-emerald-400/20 [animation-duration:2.5s]" />
                )}
              </span>

              <span className="hidden text-[10px] font-extrabold tracking-[0.16em] xl:inline">
                {isConnected ? "LIVE" : "OFFLINE"}
              </span>

              <span
                title={realtimeTitle}
                className={`relative h-1.5 w-1.5 rounded-full ${
                  isConnected
                    ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.75),0_0_12px_rgba(16,185,129,0.35)] animate-pulse motion-reduce:animate-none"
                    : "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.35)]"
                }`}
              />
            </div>

            {/* Notifications */}
            <div className={headerActionClass}>
              <NotificationBell />
            </div>

            {/* Theme */}
            <div className={headerActionClass}>
              <ThemeToggle />
            </div>

            {/* Language */}
            <button
              type="button"
              id="locale-toggle-btn"
              aria-label="Toggle language"
              title={
                isVietnamese ? "Switch to English" : "Chuyển sang tiếng Việt"
              }
              onClick={() => setLocale(isVietnamese ? "en-US" : "vi-VN")}
              className={`${headerActionClass} group h-9 cursor-pointer gap-1.5 px-2.5 text-xs font-extrabold text-muted-foreground hover:text-foreground`}
            >
              <Globe2 className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-[35deg]" />
              <span>{isVietnamese ? "EN" : "VI"}</span>
            </button>

            {/* Sculpted separator */}
            <div className="mx-0.5 h-7 w-px shrink-0 bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--shadow-dark)_20%,transparent),color-mix(in_srgb,var(--shadow-light)_70%,transparent),transparent)]" />

            {/* User profile */}
            <div className="relative z-10 shrink-0">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Sculpted transition below the header */}
      <div aria-hidden="true" className="relative h-5">
        <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(to_right,transparent,color-mix(in_srgb,var(--shadow-dark)_20%,transparent),transparent)]" />
        <div className="absolute inset-x-12 top-0 h-4 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--shadow-dark)_8%,transparent),transparent_72%)] blur-[5px]" />
      </div>
    </header>
  );
}