"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/providers/locale-provider";
import { DASHBOARD_TIME_ZONE } from "@/lib/dashboard-data";

export function DashboardPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border/30 bg-surface p-4 sm:p-5 shadow-[7px_7px_18px_var(--shadow-dark),-7px_-7px_18px_var(--shadow-light)] ${className}`}
    >
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
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
