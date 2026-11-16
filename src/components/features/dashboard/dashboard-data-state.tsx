"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/providers/locale-provider";
import { DASHBOARD_TIME_ZONE } from "@/lib/dashboard-data";

export function DashboardPanel({
  title,
  description,
  icon,
  headerAction,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-[22px] border border-border/40 bg-surface/90 p-4 sm:p-5 shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)] transition-all duration-300 dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background/80 text-primary shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] dark:border-white/[0.08] dark:bg-background/50 dark:shadow-none">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className={`mt-4 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function DashboardDataState({
  loading,
  message,
  stale,
  updatedAt,
  onRetry,
}: {
  loading?: boolean;
  message?: string | null;
  stale?: boolean;
  updatedAt?: number;
  onRetry?: () => void;
}) {
  const { locale, t } = useLocale();
  return (
    <div className="space-y-2 text-xs text-muted-foreground" aria-live="polite">
      {loading && <p role="status">{t("dashboard.data.loading")}</p>}
      {message && (
        <p role="status" className="text-amber-700 dark:text-amber-400">
          {message}
        </p>
      )}
      {stale && (
        <p className="text-amber-700 dark:text-amber-400">
          {t("dashboard.data.stale")}
        </p>
      )}
      {!!updatedAt && (
        <p>
          {t("dashboard.data.updated")}{" "}
          {new Intl.DateTimeFormat(locale, {
            timeZone: DASHBOARD_TIME_ZONE,
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          }).format(updatedAt)}{" "}
          · UTC+7
        </p>
      )}
      {(message || stale) && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border px-3 py-1 font-semibold text-primary hover:bg-background"
        >
          {t("dashboard.data.retry")}
        </button>
      )}
    </div>
  );
}
