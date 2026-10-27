"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";

import { useTableContext } from "./table-context";

export interface TableHeaderProps {
  className?: string;
}

export function TableHeader({
  className = "",
}: TableHeaderProps) {
  const { table, variant } = useTableContext();

  return (
    <thead
      className={[
        "border-b border-border/40 select-none",
        variant === "sculpted"
          ? "bg-black/[0.04] dark:bg-black/[0.25]"
          : "bg-black/[0.02] dark:bg-black/[0.15] backdrop-blur-sm",
        "text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {table.getHeaderGroups().map((headerGroup: any) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header: any) => {
            const column = header.column;
            const canSort = column.getCanSort();
            const sorted = column.getIsSorted();

            const headerLabel =
              typeof column.columnDef.header === "string"
                ? column.columnDef.header
                : column.id;

            const sortLabel =
              sorted === "asc"
                ? "Đang sắp xếp tăng dần"
                : sorted === "desc"
                  ? "Đang sắp xếp giảm dần"
                  : "Chưa sắp xếp";

            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                scope="col"
                aria-sort={
                  sorted === "asc"
                    ? "ascending"
                    : sorted === "desc"
                      ? "descending"
                      : "none"
                }
                className={[
                  "px-4 sm:px-5 py-3.5 sm:py-4 align-middle",
                  "text-left text-[11px] font-black uppercase tracking-[0.12em]",
                  "border-r border-border/15 last:border-r-0",
                  sorted ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                {header.isPlaceholder ? null : (
                  <div className="flex min-w-0 items-center gap-2">
                    {canSort ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        title={
                          column.getNextSortingOrder() === "asc"
                            ? "Sắp xếp tăng dần"
                            : column.getNextSortingOrder() === "desc"
                              ? "Sắp xếp giảm dần"
                              : "Bỏ sắp xếp"
                        }
                        aria-label={`${String(headerLabel)}: ${sortLabel}`}
                        className={[
                          "group inline-flex min-w-0 items-center gap-2",
                          "rounded-xl px-2.5 py-1.5 -ml-2.5 text-left",
                          "transition-all duration-200",
                          sorted
                            ? "bg-primary/10 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] text-primary"
                            : "hover:bg-foreground/[0.04] hover:text-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        ].join(" ")}
                      >
                        <span className="min-w-0 font-black">
                          <table.FlexRender header={header} />
                        </span>

                        <span
                          aria-hidden="true"
                          className={[
                            "flex size-5 shrink-0 items-center justify-center rounded-md",
                            "border border-border/40 bg-background",
                            "transition-all duration-200 group-hover:scale-105",
                            sorted
                              ? "text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)]"
                              : "text-muted-foreground/60 shadow-[1.5px_1.5px_3px_var(--shadow-dark),-1.5px_-1.5px_3px_var(--shadow-light)] group-hover:text-foreground",
                          ].join(" ")}
                        >
                          {sorted === "asc" ? (
                            <ArrowUp size={11} strokeWidth={2.5} />
                          ) : sorted === "desc" ? (
                            <ArrowDown size={11} strokeWidth={2.5} />
                          ) : (
                            <ArrowUpDown size={11} strokeWidth={2} />
                          )}
                        </span>
                      </button>
                    ) : (
                      <div className="min-w-0 font-black text-muted-foreground/80">
                        <table.FlexRender header={header} />
                      </div>
                    )}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

export default TableHeader;
