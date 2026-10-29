
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/providers/locale-provider";
import { ROLE_LABELS } from "@/config/navigation";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initials = (user.fullName || user.email || "U")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const roleLabelKey = ROLE_LABELS[user.role] ?? "roles.USER";

  const itemClass =
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-all duration-200 hover:bg-muted/50 hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.035),inset_-2px_-2px_5px_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        id="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("userMenu.label")}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          "group flex items-center gap-2 rounded-full border border-transparent p-1 pr-2.5",
          "transition-all duration-300",
          "hover:border-border/50 hover:bg-background",
          "hover:shadow-[4px_4px_10px_rgba(0,0,0,0.055),-4px_-4px_10px_rgba(255,255,255,0.55)]",
          open
            ? "border-border/50 bg-background shadow-[inset_3px_3px_7px_rgba(0,0,0,0.045),inset_-3px_-3px_7px_rgba(255,255,255,0.55)]"
            : "",
        ].join(" ")}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-background shadow-[3px_3px_7px_rgba(0,0,0,0.08),-3px_-3px_7px_rgba(255,255,255,0.7)]">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.fullName ?? ""}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {initials}
            </span>
          )}

          <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
        </span>

        <span className="hidden max-w-36 truncate text-sm font-medium text-foreground md:inline">
          {user.fullName || user.email}
        </span>

        <ChevronDown
          className={[
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-300",
            open ? "rotate-180" : "group-hover:translate-y-0.5",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-labelledby="user-menu-btn"
          className="absolute right-0 top-full z-50 mt-3 w-[min(18rem,calc(100vw-24px))] max-h-[calc(100dvh-5rem)] overflow-y-auto origin-top-right animate-in fade-in slide-in-from-top-2 duration-200 rounded-2xl border border-border/50 bg-card p-2 shadow-[8px_8px_24px_rgba(0,0,0,0.09),-6px_-6px_20px_rgba(255,255,255,0.65)]"
        >
          {/* User identity */}
          <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background shadow-[inset_2px_2px_5px_rgba(0,0,0,0.04),inset_-2px_-2px_5px_rgba(255,255,255,0.6),3px_3px_7px_rgba(0,0,0,0.04)]">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName ?? ""}
                    className="size-full rounded-xl object-cover"
                  />
                ) : (
                  <UserRound className="size-5 text-primary" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user.fullName || user.email}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Account role
              </span>
              <span className="rounded-lg border border-primary/10 bg-primary/[0.07] px-2.5 py-1 text-[11px] font-semibold text-primary">
                {t(roleLabelKey)}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-2 space-y-1 p-0.5">
            <Link
              href="/settings/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-[2px_2px_5px_rgba(0,0,0,0.045),-2px_-2px_5px_rgba(255,255,255,0.5)] transition-colors group-hover:text-primary">
                <UserRound className="size-4" />
              </span>
              <span className="flex-1 font-medium">
                {t("userMenu.profile")}
              </span>
            </Link>

            <Link
              href="/settings/security"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-[2px_2px_5px_rgba(0,0,0,0.045),-2px_-2px_5px_rgba(255,255,255,0.5)] transition-colors group-hover:text-primary">
                <ShieldCheck className="size-4" />
              </span>
              <span className="flex-1 font-medium">
                {t("userMenu.security")}
              </span>
            </Link>

            <Link
              href="/change-password"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-[2px_2px_5px_rgba(0,0,0,0.045),-2px_-2px_5px_rgba(255,255,255,0.5)] transition-colors group-hover:text-primary">
                <KeyRound className="size-4" />
              </span>
              <span className="flex-1 font-medium">
                {t("userMenu.changePassword")}
              </span>
            </Link>
          </div>

          {/* Logout */}
          <div className="mt-2 border-t border-border/40 pt-2">
            <button
              type="button"
              id="user-logout-btn"
              role="menuitem"
              onClick={() => void logout()}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive transition-all duration-200 hover:bg-destructive/[0.06] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.025),inset_-2px_-2px_5px_rgba(255,255,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/[0.06] transition-colors group-hover:bg-destructive/10">
                <LogOut className="size-4" />
              </span>
              <span className="flex-1 text-left font-medium">
                {t("common.logout")}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
