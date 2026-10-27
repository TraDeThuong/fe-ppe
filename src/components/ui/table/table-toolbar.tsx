"use client";

import {
  Columns3,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { useTableContext } from "./table-context";

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
  searchPlaceholder = "Tìm kiếm dữ liệu toàn bảng...",
  showSearch = true,
  showColumnVisibility = true,
  showRowCount = true,
  actions,
  columnsLabel = "Cột",
  toggleColumnsLabel = "Hiển thị cột",
  resetLabel = "Mặc định",
  recordsText,
  loadingText = "Đang tải dữ liệu...",
  clearSearchLabel = "Xóa tìm kiếm",
}: TableToolbarProps) {
  const { table, variant, loading } = useTableContext();

  const globalFilter = String(table.state.globalFilter ?? "");
  const allRows = table.getPreFilteredRowModel().rows.length;
  const filteredRows = table.getRowModel().rows.length;

  const surfaceClass =
    variant === "sculpted"
      ? "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
      : "shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]";

  const buttonSocketClass = [
    "rounded-xl border border-white/60 dark:border-white/10",
    "bg-background text-foreground text-xs font-bold",
    "shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]",
    "transition-all duration-200 hover:-translate-y-0.5",
    "active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  ].join(" ");

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
              placeholder={searchPlaceholder}
              aria-label="Tìm kiếm toàn bộ bảng"
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
                aria-label="Xóa nội dung tìm kiếm"
                title="Xóa tìm kiếm"
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
              {loading
                ? loadingText
                : recordsText
                  ? recordsText(allRows, filteredRows, Boolean(globalFilter))
                  : globalFilter
                    ? `${filteredRows} / ${allRows} bản ghi`
                    : `${allRows} bản ghi`}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons & Column Visibility */}
      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
        {showColumnVisibility && (
          <details className="group relative">
            <summary
              className={[
                buttonSocketClass,
                "flex h-9 sm:h-10 cursor-pointer list-none",
                "items-center gap-2 px-3 sm:px-3.5",
                "hover:text-foreground",
                "[&::-webkit-details-marker]:hidden",
              ].join(" ")}
            >
              <Columns3 size={14} className="text-primary" />
              <span>{columnsLabel}</span>
            </summary>

            <div
              className={[
                "absolute right-0 top-full z-40 mt-2",
                "max-h-72 min-w-56 overflow-y-auto",
                "rounded-2xl border border-white/70 dark:border-white/10",
                "bg-background/95 backdrop-blur-md p-3 text-foreground",
                "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light)]",
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between px-2 py-1 border-b border-border/30 pb-2">
                <span className="text-xs font-bold text-foreground">
                  {toggleColumnsLabel}
                </span>

                <button
                  type="button"
                  onClick={() => table.resetColumnVisibility()}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                  title={resetLabel}
                >
                  <RotateCcw size={11} />
                  {resetLabel}
                </button>
              </div>

              <div className="space-y-1">
                {table.getAllLeafColumns().map((column: any) => {
                  if (!column.getCanHide()) return null;

                  const label =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;

                  const isChecked = column.getIsVisible();

                  return (
                    <label
                      key={column.id}
                      className={[
                        "flex cursor-pointer items-center justify-between gap-2",
                        "rounded-xl px-2.5 py-1.5 text-xs font-medium",
                        "transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      <span className="truncate">{label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) =>
                          column.toggleVisibility(event.target.checked)
                        }
                        className="accent-[var(--primary)] size-4 rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </details>
        )}

        {actions}
      </div>
    </div>
  );
}

export default TableToolbar;
