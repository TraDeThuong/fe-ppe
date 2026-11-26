"use client";

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { useLocale } from "@/providers/locale-provider";

interface IncidentListStatusProps {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export function IncidentListStatus({ loading, error, onRetry }: IncidentListStatusProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  if (loading) {
    return (
      <div className="space-y-2.5" aria-busy="true">
        {[0, 1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-2xl border border-border/30 bg-surface p-3.5 shadow-nm-sm"
          >
            <div className="h-14 w-20 shrink-0 animate-pulse rounded-xl bg-muted/40" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-20 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/30" />
              </div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 animate-pulse rounded-full bg-muted/30" />
                <div className="h-4 w-20 animate-pulse rounded-full bg-muted/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const errMsg =
      error instanceof Error
        ? error.message
        : isVietnamese
          ? "Không thể tải danh sách sự cố."
          : "Unable to load incidents.";
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-surface p-8 text-center shadow-nm-sm"
      >
        <AlertTriangle className="h-8 w-8 text-danger" />
        <p className="text-sm font-semibold text-foreground">{errMsg}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isVietnamese ? "Thử lại" : "Retry"}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/30 bg-surface p-10 text-center shadow-nm-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground shadow-nm-inset">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {t("incidents.table.empty")}
        </p>
        <p className="text-xs text-muted-foreground">
          {isVietnamese
            ? "Thử thay đổi hoặc đặt lại bộ lọc để xem thêm sự cố."
            : "Try adjusting or resetting filters to see more incidents."}
        </p>
      </div>
    </div>
  );
}
