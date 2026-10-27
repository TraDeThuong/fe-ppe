"use client";

import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTableContext } from "./table-context";

export interface TableFilterOption {
  label: string;
  value: string;
}

export interface TableColumnFilter {
  columnId: string;
  label: string;
  type?: "text" | "select";
  placeholder?: string;
  options?: TableFilterOption[];
}

export interface TableFilterProps {
  filters: TableColumnFilter[];
  showReset?: boolean;
  className?: string;
  title?: string;
}

export function TableFilter({
  filters,
  showReset = true,
  className = "",
  title = "Bộ lọc dữ liệu",
}: TableFilterProps) {
  const { table, variant } = useTableContext();

  const hasActiveFilters =
    (table.state.columnFilters?.length ?? 0) > 0 ||
    Boolean(table.state.globalFilter);

  const resetFilters = () => {
    table.resetColumnFilters();
    table.setGlobalFilter(undefined);
  };

  const controlClass = [
    "h-10 w-full min-w-0 rounded-xl px-3.5 text-xs sm:text-sm font-medium",
    "border border-[var(--shadow-dark)]/35 dark:border-white/10",
    "bg-background text-foreground",
    "shadow-[inset_2.5px_2.5px_5px_var(--shadow-dark),inset_-2.5px_-2.5px_5px_var(--shadow-light)]",
    "outline-none transition-all duration-200",
    "focus-visible:ring-2 focus-visible:ring-accent",
  ].join(" ");

  return (
    <div
      className={[
        "rounded-2xl p-3.5 sm:p-4",
        "bg-black/[0.02] dark:bg-black/[0.12]",
        "border border-border/30",
        variant === "sculpted"
          ? "shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)]"
          : "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
        "space-y-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Filter size={13} className="text-primary" />
          <span>{title}</span>
        </div>

        {showReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="text-xs h-8 px-2.5"
          >
            <RotateCcw size={12} className={hasActiveFilters ? "text-primary" : ""} />
            Đặt lại bộ lọc
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filters.map((filter) => {
          const column = table.getColumn(filter.columnId);

          if (!column || !column.getCanFilter()) return null;

          const value = column.getFilterValue() ?? "";

          return (
            <label
              key={filter.columnId}
              className="flex min-w-0 flex-col gap-1.5"
            >
              <span className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground/80">
                {filter.label}
              </span>

              {filter.type === "select" ? (
                <div className="relative">
                  <select
                    value={String(value)}
                    onChange={(event) =>
                      column.setFilterValue(event.target.value || undefined)
                    }
                    className={controlClass}
                    aria-label={filter.label}
                  >
                    <option value="">Tất cả {filter.label.toLowerCase()}</option>
                    {(filter.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  value={String(value)}
                  onChange={(event) =>
                    column.setFilterValue(event.target.value || undefined)
                  }
                  placeholder={filter.placeholder ?? `Nhập để lọc ${filter.label.toLowerCase()}...`}
                  className={controlClass}
                  aria-label={filter.label}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default TableFilter;
