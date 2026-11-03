"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldAlert, Wrench } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

export interface MaintenanceAdminBannerProps {
  className?: string;
}

export function MaintenanceAdminBanner({
  className = "",
}: MaintenanceAdminBannerProps) {
  const { t } = useLocale();

  return (
    <aside
      aria-label="System Maintenance Banner"
      className={`relative z-40 flex items-center justify-between gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 px-3 py-2 text-xs text-foreground backdrop-blur-md shadow-[0_2px_8px_rgba(245,158,11,0.15)] sm:px-6 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 animate-pulse" />
        </span>
        <p className="truncate font-semibold tracking-wide">
          {t("maintenance.banner.warning")}
        </p>
      </div>

      <Link
        href="/maintenance"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-background/80 px-3 py-1 font-bold text-amber-600 shadow-[2px_2px_5px_var(--shadow-dark)] transition-all hover:bg-background hover:text-amber-500 active:scale-95 dark:text-amber-400"
      >
        <Wrench className="h-3.5 w-3.5" />
        <span>{t("maintenance.banner.action")}</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    </aside>
  );
}
