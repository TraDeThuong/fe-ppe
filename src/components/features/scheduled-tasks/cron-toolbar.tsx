"use client";

import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form/foundation/input";
import { Select } from "@/components/ui/form/selection-controls/select";
import { useLocale } from "@/providers/locale-provider";
import type { CronScheduleFilter } from "@/types/cron.types";

export interface CronToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: CronScheduleFilter;
  onFilterChange: (filter: CronScheduleFilter) => void;
  totalCount: number;
  visibleCount: number;
  enabledCount: number;
  disabledCount: number;
  className?: string;
}

export function CronToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  totalCount,
  visibleCount,
  enabledCount: _enabledCount,
  disabledCount: _disabledCount,
  className = "",
}: CronToolbarProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const filterOptions = [
    { value: "all", label: t("cron.all") },
    { value: "enabled", label: t("cron.enabled") },
    { value: "disabled", label: t("cron.disabled") },
  ];

  return (
    <div
      className={`flex flex-col gap-2.5 sm:gap-3 rounded-2xl border border-white/60 bg-surface/90 p-3 sm:p-4 shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] dark:border-white/10 dark:bg-card/80 ${className}`}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-md">
          <Input
            type="search"
            aria-label={t("cron.search")}
            placeholder={t("cron.search")}
            prefix={<Search className="size-4 text-muted-foreground" />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Select & Counter */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <div className="w-40 sm:w-48">
            <Select
              ariaLabel={t("cron.filter")}
              value={filter}
              onValueChange={(value) => onFilterChange(value as CronScheduleFilter)}
              options={filterOptions}
              className="w-full text-xs"
            />
          </div>

          <Badge
            variant="outline"
            size="sm"
            className="font-mono text-[11px] px-2.5 py-1 shrink-0 text-muted-foreground"
          >
            {t("cron.showing", { count: visibleCount, total: totalCount })}
          </Badge>
        </div>
      </div>
    </div>
  );
}
