"use client";

import { useState, useEffect, useRef } from "react";
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
  type?: string;
  fromDate?: string;
  toDate?: string;
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
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [searchInput, setSearchInput] = useState(filter.search || "");
  const debouncedSearch = useDebounce(searchInput, 300);
  const latestFilterRef = useRef(filter);
  const latestOnFilterChangeRef = useRef(onFilterChange);
  const prevFilterSearchRef = useRef(filter.search);
  latestFilterRef.current = filter;
  latestOnFilterChangeRef.current = onFilterChange;

  useEffect(() => {
    if (prevFilterSearchRef.current !== filter.search && filter.search === "") {
      setSearchInput("");
    }
    prevFilterSearchRef.current = filter.search;
  }, [filter.search]);

  useEffect(() => {
    const currentFilter = latestFilterRef.current;
    if (debouncedSearch !== currentFilter.search) {
      latestOnFilterChangeRef.current({ ...currentFilter, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.isRead !== undefined ||
      filter.severity ||
      filter.channel ||
      filter.type ||
      filter.fromDate ||
      filter.toDate,
  );

  const handleResetFilters = () => {
    setSearchInput("");
    onFilterChange({
      search: "",
      isRead: undefined,
      severity: undefined,
      channel: undefined,
      type: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
  };

  const readStatusOptions: Array<{
    key: "all" | "unread" | "read";
    label: string;
    value: boolean | undefined;
  }> = [
    { key: "all", label: t("notifications.filter.all"), value: undefined },
    { key: "unread", label: t("notifications.filter.unread"), value: false },
    { key: "read", label: t("notifications.filter.read"), value: true },
  ];

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-border/30 bg-background p-3.5 shadow-[6px_6px_15px_var(--shadow-dark),-6px_-6px_15px_var(--shadow-light)] sm:p-4 ${className}`}
    >
      {/* Top Row: Search + Quick Read Status Pills + Global Actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
              aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick 1-click Read Status Switcher */}
          <div
            role="group"
            aria-label={isVietnamese ? "Trạng thái đọc" : "Read status"}
            className="inline-flex items-center gap-1 rounded-xl border border-border/30 bg-background p-1 shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]"
          >
            {readStatusOptions.map((opt) => {
              const active = filter.isRead === opt.value;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onFilterChange({ ...filter, isRead: opt.value })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[2px_2px_5px_var(--shadow-dark)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

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
              title={isVietnamese ? "Làm mới" : "Refresh"}
              aria-label={isVietnamese ? "Làm mới danh sách" : "Refresh list"}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background text-foreground shadow-[3px_3px_7px_var(--shadow-dark),-3px_-3px_7px_var(--shadow-light)] transition-all hover:text-primary active:shadow-[inset_2px_2px_4px_var(--shadow-dark)] disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Filter Strip: Severity, Channel, Date Range */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/20 pt-2.5 text-xs">
        <span className="flex items-center gap-1 pr-1 font-medium text-muted-foreground">
          <Filter className="size-3" />
          <span>{isVietnamese ? "Bộ lọc:" : "Filters:"}</span>
        </span>

        {/* Severity */}
        <select
          value={filter.severity || "all"}
          aria-label={t("notifications.filter.allSeverity")}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              ...filter,
              severity:
                val === "all" ? undefined : (val as NotificationSeverity),
            });
          }}
          className="flex-1 sm:flex-initial max-w-full rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
        >
          <option value="all">{t("notifications.filter.allSeverity")}</option>
          <option value="CRITICAL">{t("notifications.severity.CRITICAL")}</option>
          <option value="HIGH">{t("notifications.severity.HIGH")}</option>
          <option value="MEDIUM">{t("notifications.severity.MEDIUM") || "Medium"}</option>
          <option value="NORMAL">{t("notifications.severity.NORMAL")}</option>
          <option value="LOW">{t("notifications.severity.LOW")}</option>
        </select>

        {/* Channel */}
        <select
          value={filter.channel || "all"}
          aria-label={t("notifications.filter.allChannels")}
          onChange={(e) => {
            const val = e.target.value;
            onFilterChange({
              ...filter,
              channel:
                val === "all" ? undefined : (val as NotificationChannel),
            });
          }}
          className="flex-1 sm:flex-initial max-w-full rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
        >
          <option value="all">{t("notifications.filter.allChannels")}</option>
          <option value="IN_APP">Web (In-App)</option>
          <option value="WEB">Web</option>
          <option value="EMAIL">Email</option>
        </select>

        {/* Date Range with explicit labels */}
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="text-[11px] font-medium">
              {isVietnamese ? "Từ" : "From"}
            </span>
            <input
              type="date"
              value={filter.fromDate || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  fromDate: e.target.value || undefined,
                })
              }
              aria-label={isVietnamese ? "Từ ngày" : "From date"}
              className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
            />
          </label>

          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="text-[11px] font-medium">
              {isVietnamese ? "Đến" : "To"}
            </span>
            <input
              type="date"
              value={filter.toDate || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  toDate: e.target.value || undefined,
                })
              }
              aria-label={isVietnamese ? "Đến ngày" : "To date"}
              className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground shadow-[inset_1px_1px_3px_var(--shadow-dark)] outline-none focus:border-primary/50"
            />
          </label>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <X className="size-3" />
            <span>{t("notifications.filter.reset")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
