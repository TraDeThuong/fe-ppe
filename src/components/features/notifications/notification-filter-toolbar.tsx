"use client";

import { useState, useEffect } from "react";
import { Search, X, Filter, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/providers/locale-provider";
import type { NotificationChannel, NotificationSeverity } from "@/types";

export interface NotificationFilterState {
  search: string;
  isRead?: boolean;
  severity?: NotificationSeverity;
  channel?: NotificationChannel;
}

export interface NotificationFilterToolbarProps {
  filter: NotificationFilterState;
  onFilterChange: (newFilter: NotificationFilterState) => void;
  onMarkAllRead?: () => void;
  isMarkingAllRead?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function NotificationFilterToolbar({
  filter,
  onFilterChange,
  onMarkAllRead,
  isMarkingAllRead = false,
  onRefresh,
  isRefreshing = false,
  className = "",
}: NotificationFilterToolbarProps) {
  const { t } = useLocale();
  const [searchInput, setSearchInput] = useState(filter.search || "");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Đồng bộ debounced search với filter ngoài
  useEffect(() => {
    if (debouncedSearch !== filter.search) {
      onFilterChange({ ...filter, search: debouncedSearch });
    }
  }, [debouncedSearch, filter, onFilterChange]);

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.isRead !== undefined ||
      filter.severity ||
      filter.channel,
  );

  const handleResetFilters = () => {
    setSearchInput("");
    onFilterChange({
      search: "",
      isRead: undefined,
      severity: undefined,
      channel: undefined,
    });
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-border/30 bg-background p-3 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar Input */}
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="size-4" />
          </div>

          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("notifications.searchPlaceholder")}
            className="w-full rounded-xl border border-border/40 bg-background py-2.5 pl-9.5 pr-8 text-xs text-foreground shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />

          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Global Actions: Mark All Read & Refresh */}
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkAllRead}
              disabled={isMarkingAllRead}
              className="flex items-center gap-1.5 rounded-xl border-border/40 bg-background text-xs font-semibold text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)]"
            >
              <CheckCheck className="size-3.5 text-primary" />
              <span>{t("notifications.actions.markAllRead")}</span>
            </Button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Làm mới"
              aria-label="Làm mới danh sách"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/20 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground font-medium pr-1">
          <Filter className="size-3" />
          <span>Bộ lọc:</span>
        </span>

        {/* Trạng thái Đã đọc / Chưa đọc */}
        <select
          value={
            filter.isRead === undefined
              ? "all"
              : filter.isRead
                ? "read"
                : "unread"
          }
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              ...filter,
              isRead: val === "all" ? undefined : val === "read",
            });
          }}
          className="rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
        >
          <option value="all">{t("notifications.filter.all")}</option>
          <option value="unread">{t("notifications.filter.unread")}</option>
          <option value="read">{t("notifications.filter.read")}</option>
        </select>

        {/* Mức độ nghiêm trọng (Severity) */}
        <select
          value={filter.severity || "all"}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              ...filter,
              severity:
                val === "all" ? undefined : (val as NotificationSeverity),
            });
          }}
          className="rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
        >
          <option value="all">{t("notifications.filter.allSeverity")}</option>
          <option value="CRITICAL">{t("notifications.severity.CRITICAL")}</option>
          <option value="HIGH">{t("notifications.severity.HIGH")}</option>
          <option value="NORMAL">{t("notifications.severity.NORMAL")}</option>
          <option value="LOW">{t("notifications.severity.LOW")}</option>
        </select>

        {/* Kênh nhận tin (Channel) */}
        <select
          value={filter.channel || "all"}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              ...filter,
              channel:
                val === "all" ? undefined : (val as NotificationChannel),
            });
          }}
          className="rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
        >
          <option value="all">{t("notifications.filter.allChannels")}</option>
          <option value="IN_APP">Web (In-App)</option>
          <option value="EMAIL">Email</option>
        </select>

        {/* Reset filter button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <X className="size-3" />
            <span>{t("notifications.filter.reset")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
