"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { TableColumnVisibility } from "./table-column-visibility";
import { useTableContext } from "./table-context";
import { useLocale } from "@/providers/locale-provider";

export interface TableToolbarProps {
  className?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showColumnVisibility?: boolean;
  showRowCount?: boolean;
  actions?: ReactNode;
  columnsLabel?: string;
  toggleColumnsLabel?: string;
  resetLabel?: string;
  recordsText?: (allRows: number, filteredRows?: number, isFiltered?: boolean) => string;
  loadingText?: string;
  clearSearchLabel?: string;
}

export function TableToolbar({
  className = "",
  searchPlaceholder,
  showSearch = true,
  showColumnVisibility = true,
  showRowCount = true,
  actions,
  columnsLabel,
  toggleColumnsLabel,
  resetLabel,
  recordsText,
  loadingText,
  clearSearchLabel,
}: TableToolbarProps) {
  const { t: translate, locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const effectiveSearchPlaceholder =
    searchPlaceholder ?? translate?.("table.search") ?? (isVietnamese ? "Tìm kiếm dữ liệu toàn bảng…" : "Search entire table…");
  const effectiveColumnsLabel =
    columnsLabel ?? translate?.("table.columns") ?? (isVietnamese ? "Cột" : "Columns");
  const effectiveToggleColumnsLabel =
    toggleColumnsLabel ?? translate?.("table.toggleColumns") ?? (isVietnamese ? "Hiển thị cột" : "Toggle columns");
  const effectiveResetLabel =
    resetLabel ?? translate?.("table.default") ?? (isVietnamese ? "Mặc định" : "Default");
  const effectiveLoadingText =
    loadingText ?? translate?.("table.loading") ?? (isVietnamese ? "Đang tải dữ liệu…" : "Loading data…");
  const effectiveClearSearchLabel =
    clearSearchLabel ?? translate?.("table.clearSearch") ?? (isVietnamese ? "Xóa tìm kiếm" : "Clear search");

  const { table, variant, loading, fetching, features, manualPagination, rowCount, totalRowCount } = useTableContext();

  const globalFilter = String(table.state.globalFilter ?? "");
  const filteredRows = manualPagination ? (rowCount ?? table.getRowCount()) : table.getFilteredRowModel().rows.length;
  const allRows = manualPagination ? (totalRowCount ?? filteredRows) : table.getPreFilteredRowModel().rows.length;
  const isFiltered = filteredRows !== allRows;
  if (features.globalFilter === false) showSearch = false;
  if (features.columnVisibility === false) showColumnVisibility = false;

  const surfaceClass =
    variant === "sculpted"
      ? "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
      : "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]";

  return (
    <div
      className={[
        "flex min-w-0 flex-col gap-3.5 p-4 sm:p-5 sm:flex-row",
        "sm:items-center sm:justify-between border-b border-border/30",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Search Input & Count Badge */}
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center gap-3">
        {showSearch && (
          <div
            className={[
              "flex min-w-0 items-center gap-2.5",
              "rounded-2xl px-3.5",
              "border border-[var(--shadow-dark)]/30 dark:border-white/5 bg-background",
              surfaceClass,
              "w-full sm:max-w-md",
              "focus-within:ring-2 focus-within:ring-accent/50",
            ].join(" ")}
          >
            <Search
              size={15}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground/80"
            />

            <input
              type="search"
              value={globalFilter}
              onChange={(event) => {
                table.setGlobalFilter(event.target.value);
              }}
              placeholder={effectiveSearchPlaceholder}
              aria-label={isVietnamese ? "Tìm kiếm toàn bộ bảng" : "Search whole table"}
              disabled={loading}
              className={[
                "h-10 min-w-0 w-full bg-transparent",
                "text-xs sm:text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground/60 font-medium",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            />

            {globalFilter && (
              <button
                type="button"
                onClick={() => table.setGlobalFilter("")}
                aria-label={effectiveClearSearchLabel}
                title={effectiveClearSearchLabel}
                className={[
                  "flex size-6 shrink-0 items-center justify-center",
                  "rounded-lg text-muted-foreground",
                  "transition-colors hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                ].join(" ")}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {showRowCount && (
          <div className="flex items-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-background border border-border/40 text-[11px] font-bold text-muted-foreground shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]"
              aria-live="polite"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              {loading || fetching
                ? effectiveLoadingText
                : recordsText
                  ? recordsText(allRows, filteredRows, isFiltered)
                  : isFiltered
                    ? `${filteredRows} / ${allRows} ${isVietnamese ? "bản ghi" : "records"}`
                    : `${allRows} ${isVietnamese ? "bản ghi" : "records"}`}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons & Column Visibility */}
      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
        {showColumnVisibility && (
          <TableColumnVisibility label={effectiveColumnsLabel} title={effectiveToggleColumnsLabel} resetLabel={effectiveResetLabel} />
        )}

        {actions}
      </div>
    </div>
  );
}

export default TableToolbar;
