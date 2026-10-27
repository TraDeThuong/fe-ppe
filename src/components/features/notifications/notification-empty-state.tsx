"use client";

import { Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export interface NotificationEmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  className?: string;
}

export function NotificationEmptyState({
  title,
  description,
  onResetFilters,
  className = "",
}: NotificationEmptyStateProps) {
  const { t } = useLocale();

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-background p-8 text-center shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] sm:p-12 ${className}`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/40 bg-background text-muted-foreground shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
        <Inbox className="size-7 text-primary" strokeWidth={1.7} />
      </div>

      <h3 className="text-base font-bold text-foreground sm:text-lg">
        {title || t("notifications.empty.inboxTitle")}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground sm:text-sm">
        {description || t("notifications.empty.inboxDesc")}
      </p>

      {onResetFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="mt-5 flex items-center gap-1.5 rounded-xl border-border/40 bg-background text-xs font-semibold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
        >
          <RotateCcw className="size-3.5" />
          <span>{t("notifications.filter.reset")}</span>
        </Button>
      )}
    </div>
  );
}
