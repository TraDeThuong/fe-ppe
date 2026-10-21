"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!user) return null;

  const initials = (user.fullName || user.email || "").slice(0, 2).toUpperCase();
  const roleLabelKey = ROLE_LABELS[user.role] ?? "roles.USER";

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:shadow-nm-sm";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 hover:shadow-nm-sm"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.fullName ?? ""}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
        )}
        <span className="hidden text-sm text-foreground md:inline">
          {user.fullName || user.email}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl bg-card p-2 shadow-nm">
          <div className="border-b border-(--shadow-dark) px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {t(roleLabelKey)}
            </span>
          </div>
          <div className="p-1">
            <Link
              href="/settings/security"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("userMenu.security")}
            </Link>
            <Link
              href="/change-password"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <KeyRound className="h-4 w-4" />
              {t("userMenu.changePassword")}
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className={itemClass}
            >
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
