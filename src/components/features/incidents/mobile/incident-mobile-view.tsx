"use client";

import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { FilterChip, FilterChipRow } from "@ui/filter-chip";
import type { IncidentListScope, IncidentWorkStatus } from "@/lib/incident-list-scope";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem, IncidentStatusCounts } from "@/types";
import { IncidentMobileList } from "./incident-mobile-list";
import {
  IncidentMobileFilterSheet,
  countActiveIncidentMobileFilters,
  type IncidentMobileFilterHandlers,
  type IncidentMobileFilterValues,
} from "./incident-mobile-filter-sheet";

interface LaneChip {
  key: string;
  label: string;
  count?: number;
  active: boolean;
  onSelect: () => void;
}

export interface IncidentMobileViewProps {
  scope: IncidentListScope;
  queue?: IncidentWorkStatus | "CLOSED";
  onScopeChange: (scope: IncidentListScope, queue?: IncidentWorkStatus) => void;
  statusCounts?: IncidentStatusCounts;
  isOfficer?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  today: string;
  filterValues: IncidentMobileFilterValues;
  filterHandlers: IncidentMobileFilterHandlers;
  incidents: IncidentItem[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  highlightedId?: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Màn danh sách sự cố trên mobile (< 768px):
 * một hàng chip trạng thái · ô tìm kiếm + nút Lọc · danh sách thẻ.
 * Dùng chung state/dữ liệu với bản desktop trong incidents-content.tsx.
 */
export function IncidentMobileView({
  scope,
  queue,
  onScopeChange,
  statusCounts,
  isOfficer = false,
  search,
  onSearchChange,
  today,
  filterValues,
  filterHandlers,
  incidents,
  loading,
  error,
  onRetry,
  highlightedId,
  page,
  totalPages,
  onPageChange,
}: IncidentMobileViewProps) {
  const { t, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  const lane = (status: IncidentWorkStatus, label: string, count?: number): LaneChip => ({
    key: status,
    label,
    count,
    active: scope === "work" && queue === status,
    onSelect: () => onScopeChange("work", status),
  });

  const pendingReview = lane("PENDING_REVIEW", isVietnamese ? "Chờ duyệt" : "To review", statusCounts?.pendingReview);
  const confirmed = lane("CONFIRMED", t("incidents.status.confirmed"), statusCounts?.confirmed);
  const awaitingCheck = lane("RESOLVED", t("incidents.scope.awaitingAcceptance"), statusCounts?.resolved);
  const dismissed = lane("DISMISSED", t("incidents.status.dismissed"), statusCounts?.dismissed);
  const all: LaneChip = {
    key: "all",
    label: isVietnamese ? "Tất cả" : "All",
    count: statusCounts?.total,
    active: scope === "all",
    onSelect: () => onScopeChange("all"),
  };
  const history: LaneChip = {
    key: "history",
    label: t("incidents.scope.history"),
    count: statusCounts?.closed,
    active: scope === "history",
    onSelect: () => onScopeChange("history"),
  };

  // Cán bộ an toàn: việc chính là khắc phục sự cố đã xác nhận → đặt lên đầu.
  const chips = isOfficer
    ? [confirmed, awaitingCheck, pendingReview, dismissed, all, history]
    : [pendingReview, confirmed, awaitingCheck, dismissed, all, history];

  const activeKey = chips.find((chip) => chip.active)?.key;
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  const activeFilterCount = countActiveIncidentMobileFilters(filterValues);
  const hasActiveFilters = activeFilterCount > 0 || search.trim().length > 0;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">{t("nav.incidents")}</h1>

      <FilterChipRow scrollable label={isVietnamese ? "Trạng thái sự cố" : "Incident status"}>
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            ref={chip.active ? activeChipRef : undefined}
            active={chip.active}
            onClick={chip.onSelect}
            count={chip.count}
          >
            {chip.label}
          </FilterChip>
        ))}
      </FilterChipRow>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={isVietnamese ? "Tìm sự cố, camera…" : "Search incidents, cameras…"}
            aria-label={isVietnamese ? "Tìm sự cố" : "Search incidents"}
            className="h-11 w-full rounded-full border border-border/80 bg-background pl-10 pr-11 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={isVietnamese ? "Xóa tìm kiếm" : "Clear search"}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-label={
            activeFilterCount > 0
              ? isVietnamese
                ? `Bộ lọc, đang bật ${activeFilterCount}`
                : `Filters, ${activeFilterCount} active`
              : isVietnamese
                ? "Bộ lọc"
                : "Filters"
          }
          className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
            activeFilterCount > 0
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/80 bg-background text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <IncidentMobileList
        incidents={incidents}
        loading={loading}
        error={error}
        onRetry={onRetry}
        showStatus={scope !== "work"}
        highlightedId={highlightedId}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          filterHandlers.onReset();
          onSearchChange("");
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <IncidentMobileFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        today={today}
        values={filterValues}
        handlers={filterHandlers}
      />
    </div>
  );
}
