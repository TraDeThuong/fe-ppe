
"use client";

import { useRealtime } from "@/contexts/RealtimeContext";
import { useLocale } from "@/providers/locale-provider";
import { ThemeToggle } from "@ui/theme-toggle";
import { Globe2, Radio, Activity } from "lucide-react";

import { NotificationBell } from "./notification-bell";
import { SiteSelector } from "./site-selector";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const { isConnected } = useRealtime();
  const { t, locale, setLocale } = useLocale();

  const isVietnamese = locale === "vi-VN";

  return (
    <header className="header-root sticky top-0 z-30 shrink-0">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="header-ambient pointer-events-none absolute inset-x-0 top-0 h-24"
      />

      <div className="relative px-3 pt-3 sm:px-5 sm:pt-4 lg:px-7">
        {/* OUTER CONVEX SHELL */}
        <div className="header-shell relative rounded-[25px] p-[5px]">
          {/* Outer rim / reflective edge */}
          <div
            aria-hidden="true"
            className="header-rim pointer-events-none absolute inset-0 rounded-[25px]"
          />

          {/* Concave inner cavity */}
          <div className="header-cavity relative isolate flex h-[58px] items-center gap-2 overflow-visible rounded-[20px] px-2.5 sm:gap-3 sm:px-4">
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
              className="header-inner-glow pointer-events-none absolute inset-0 -z-10 rounded-[20px]"
            />

            {/* Site selector */}
            <div className="relative z-10 min-w-0">
              <SiteSelector />
            </div>

            <div className="flex-1" />

            {/* Realtime status */}
            <div
              role="status"
              title={t(
                isConnected ? "header.realtime.on" : "header.realtime.off"
              )}
              className={`realtime-pill group relative z-10 flex h-9 shrink-0 items-center gap-2 rounded-xl px-2.5 ${
                isConnected ? "is-connected" : "is-disconnected"
              }`}
            >
              <span className="realtime-icon-wrap relative flex h-6 w-6 items-center justify-center rounded-lg">
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

              <span className="realtime-dot relative h-1.5 w-1.5 rounded-full" />
            </div>

            {/* Notifications */}
            <div className="header-action">
              <NotificationBell />
            </div>

            {/* Theme */}
            <div className="header-action">
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
              className="header-action header-language group flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-xs font-extrabold"
            >
              <Globe2 className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-[35deg]" />
              <span>{isVietnamese ? "EN" : "VI"}</span>
            </button>

            {/* Sculpted separator */}
            <div className="header-separator mx-0.5 h-7 w-px shrink-0" />

            {/* User profile */}
            <div className="relative z-10 shrink-0">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Sculpted transition below the header */}
      <div aria-hidden="true" className="header-bottom relative h-5">
        <div className="header-bottom-ridge absolute inset-x-8 top-0 h-px" />
        <div className="header-bottom-glow absolute inset-x-12 top-0 h-4" />
      </div>

      <style jsx>{`
        .header-root {
          --header-light: var(--shadow-light);
          --header-dark: var(--shadow-dark);
          isolation: isolate;
        }

        /* The shell protrudes from the page */
        .header-shell {
          background: var(--background);
          border: 1px solid
            color-mix(in srgb, var(--header-light) 35%, transparent);
          box-shadow:
            0 2px 2px color-mix(in srgb, var(--header-dark) 12%, transparent),
            0 6px 12px color-mix(in srgb, var(--header-dark) 14%, transparent),
            0 12px 26px color-mix(in srgb, var(--header-dark) 9%, transparent),
            -5px -5px 12px
              color-mix(in srgb, var(--header-light) 72%, transparent),
            inset 0 1px 0
              color-mix(in srgb, var(--header-light) 90%, transparent),
            inset 0 -1px 0
              color-mix(in srgb, var(--header-dark) 10%, transparent);
          transition:
            box-shadow 300ms ease,
            border-color 300ms ease;
        }

        .header-shell:hover {
          box-shadow:
            0 3px 3px color-mix(in srgb, var(--header-dark) 12%, transparent),
            0 9px 18px color-mix(in srgb, var(--header-dark) 15%, transparent),
            0 16px 32px color-mix(in srgb, var(--header-dark) 10%, transparent),
            -6px -6px 14px
              color-mix(in srgb, var(--header-light) 76%, transparent),
            inset 0 1px 0
              color-mix(in srgb, var(--header-light) 95%, transparent);
        }

        .header-rim {
          border: 1px solid color-mix(in srgb, white 22%, transparent);
          opacity: 0.8;
          box-shadow:
            inset 0 1px 0 color-mix(in srgb, white 65%, transparent),
            inset 0 -2px 3px
              color-mix(in srgb, var(--header-dark) 10%, transparent);
        }

        /* The cavity sinks into the raised outer shell */
        .header-cavity {
          background: var(--background);
          border: 1px solid
            color-mix(in srgb, var(--header-dark) 8%, transparent);
          box-shadow:
            inset 4px 4px 9px
              color-mix(in srgb, var(--header-dark) 32%, transparent),
            inset 1px 1px 3px
              color-mix(in srgb, var(--header-dark) 12%, transparent),
            inset -4px -4px 9px
              color-mix(in srgb, var(--header-light) 78%, transparent),
            inset -1px -1px 3px
              color-mix(in srgb, var(--header-light) 90%, transparent);
        }

        .header-inner-glow {
          background:
            radial-gradient(
              ellipse at 12% -25%,
              color-mix(in srgb, var(--header-light) 45%, transparent),
              transparent 52%
            ),
            radial-gradient(
              ellipse at 90% 120%,
              color-mix(in srgb, var(--header-dark) 8%, transparent),
              transparent 48%
            );
          opacity: 0.85;
        }

        .header-ambient {
          z-index: -1;
          background: radial-gradient(
            ellipse at 50% 0%,
            color-mix(in srgb, var(--header-light) 30%, transparent),
            transparent 72%
          );
          opacity: 0.8;
        }

        /* Floating controls inside the recessed cavity */
        .header-action {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-height: 36px;
          border: 1px solid
            color-mix(in srgb, var(--header-light) 42%, transparent);
          border-radius: 12px;
          background: var(--background);
          box-shadow:
            3px 3px 6px
              color-mix(in srgb, var(--header-dark) 30%, transparent),
            -3px -3px 6px
              color-mix(in srgb, var(--header-light) 88%, transparent),
            inset 0 1px 0
              color-mix(in srgb, var(--header-light) 65%, transparent);
          transition:
            box-shadow 240ms ease,
            transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
            border-color 240ms ease,
            color 240ms ease;
        }

        .header-action:hover {
          transform: translateY(-1.5px);
          border-color: color-mix(
            in srgb,
            var(--header-light) 72%,
            transparent
          );
          box-shadow:
            4px 5px 9px
              color-mix(in srgb, var(--header-dark) 32%, transparent),
            -4px -4px 9px
              color-mix(in srgb, var(--header-light) 95%, transparent),
            inset 0 1px 0
              color-mix(in srgb, var(--header-light) 90%, transparent);
        }

        .header-action:active {
          transform: translateY(0);
          box-shadow:
            inset 3px 3px 6px
              color-mix(in srgb, var(--header-dark) 34%, transparent),
            inset -3px -3px 6px
              color-mix(in srgb, var(--header-light) 90%, transparent);
        }

        .header-language {
          color: var(--muted-foreground);
          cursor: pointer;
        }

        .header-language:hover {
          color: var(--foreground);
        }

        .realtime-pill {
          border: 1px solid transparent;
          transition:
            background 250ms ease,
            box-shadow 250ms ease;
        }

        .realtime-pill.is-connected {
          color: rgb(5 150 105);
          border-color: rgb(16 185 129 / 15%);
          background: rgb(16 185 129 / 5%);
          box-shadow:
            inset 2px 2px 4px rgb(16 185 129 / 7%),
            inset -2px -2px 4px rgb(255 255 255 / 25%);
        }

        .realtime-pill.is-disconnected {
          color: rgb(239 68 68);
          border-color: rgb(239 68 68 / 15%);
          background: rgb(239 68 68 / 5%);
          box-shadow:
            inset 2px 2px 4px rgb(239 68 68 / 7%),
            inset -2px -2px 4px rgb(255 255 255 / 20%);
        }

        .realtime-icon-wrap {
          box-shadow:
            2px 2px 4px
              color-mix(in srgb, var(--header-dark) 20%, transparent),
            -2px -2px 4px
              color-mix(in srgb, var(--header-light) 75%, transparent);
        }

        .is-connected .realtime-dot {
          background: #10b981;
          box-shadow:
            0 0 5px rgb(16 185 129 / 75%),
            0 0 12px rgb(16 185 129 / 35%);
          animation: live-glow 2s ease-in-out infinite;
        }

        .is-disconnected .realtime-dot {
          background: #ef4444;
          box-shadow: 0 0 6px rgb(239 68 68 / 35%);
        }

        .header-separator {
          background: linear-gradient(
            to bottom,
            transparent,
            color-mix(in srgb, var(--header-dark) 20%, transparent),
            color-mix(in srgb, var(--header-light) 70%, transparent),
            transparent
          );
        }

        .header-bottom-ridge {
          background: linear-gradient(
            to right,
            transparent,
            color-mix(in srgb, var(--header-dark) 20%, transparent),
            transparent
          );
        }

        .header-bottom-glow {
          background: radial-gradient(
            ellipse at top,
            color-mix(in srgb, var(--header-dark) 8%, transparent),
            transparent 72%
          );
          filter: blur(5px);
        }

        @keyframes live-glow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.65;
            transform: scale(0.82);
          }
        }

        @media (prefers-color-scheme: dark) {
          .header-rim {
            border-color: rgb(255 255 255 / 5%);
          }

          .header-cavity {
            border-color: rgb(255 255 255 / 4%);
          }

          .realtime-pill.is-connected {
            color: rgb(52 211 153);
          }

          .realtime-pill.is-disconnected {
            color: rgb(248 113 113);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .header-shell,
          .header-action,
          .realtime-pill {
            transition: none;
          }

          .header-action:hover,
          .header-action:active {
            transform: none;
          }

          .is-connected .realtime-dot {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .header-shell {
            border-radius: 21px;
            padding: 4px;
          }

          .header-rim {
            border-radius: 21px;
          }

          .header-cavity {
            border-radius: 17px;
            height: 54px;
          }
        }
      `}</style>
    </header>
  );
}