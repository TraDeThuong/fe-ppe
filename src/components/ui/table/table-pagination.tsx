"use client";

import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useTableContext } from "./table-context";
import { useLocale } from "@/providers/locale-provider";

export interface TablePaginationProps {
  className?: string;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showRowCount?: boolean;
  pageSizeLabel?: string;
  perPageSuffix?: string;
  emptyText?: string;
  showingText?: (startRow: number, endRow: number, totalRows: number) => React.ReactNode;
  pageOfText?: (currentPage: number, pageCount: number) => string;
  firstPageTitle?: string;
  prevPageTitle?: string;
  nextPageTitle?: string;
  lastPageTitle?: string;
}

export function TablePagination({
  className = "",
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showRowCount = true,
  pageSizeLabel,
  perPageSuffix,
  emptyText,
  showingText,
  pageOfText,
  firstPageTitle,
  prevPageTitle,
  nextPageTitle,
  lastPageTitle,
}: TablePaginationProps) {
  let isVietnamese = true;
  try {
    const localeCtx = useLocale();
    isVietnamese = localeCtx.locale === "vi-VN";
  } catch {
    // fallback if used outside LocaleProvider
  }

  const effectivePageSizeLabel =
    pageSizeLabel ?? (isVietnamese ? "Số dòng" : "Page size");
  const effectivePerPageSuffix =
    perPageSuffix ?? (isVietnamese ? "/ trang" : "/ page");
  const effectiveEmptyText =
    emptyText ?? (isVietnamese ? "Không có bản ghi" : "No records found");
  const effectiveFirstPageTitle =
    firstPageTitle ?? (isVietnamese ? "Trang đầu" : "First page");
  const effectivePrevPageTitle =
    prevPageTitle ?? (isVietnamese ? "Trang trước" : "Previous page");
  const effectiveNextPageTitle =
    nextPageTitle ?? (isVietnamese ? "Trang tiếp theo" : "Next page");
  const effectiveLastPageTitle =
    lastPageTitle ?? (isVietnamese ? "Trang cuối" : "Last page");

  const { table, loading } = useTableContext();

  const pagination = table.state.pagination;
  const pageIndex = pagination?.pageIndex ?? 0;
  const pageSize = pagination?.pageSize ?? 10;
  const pageCount = table.getPageCount();
  const totalRows =
    typeof table.getRowCount === "function"
      ? table.getRowCount()
      : (table.getPrePaginatedRowModel?.()?.rows?.length ??
         table.getFilteredRowModel?.()?.rows?.length ??
         0);

  const startRow =
    totalRows === 0 ? 0 : pageIndex * pageSize + 1;

  const endRow = Math.min(
    (pageIndex + 1) * pageSize,
    totalRows,
  );

  const controlClass = [
    "inline-flex size-8 sm:size-9 items-center justify-center",
    "rounded-xl border border-white/60 dark:border-white/10",
    "bg-background text-foreground",
    "shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]",
    "transition-all duration-200 hover:-translate-y-0.5 hover:text-primary",
    "active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] active:translate-y-0",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  ].join(" ");

  const currentPage = Math.min(
    pageIndex + 1,
    Math.max(pageCount, 1),
  );

  return (
    <div
      className={[
        "flex min-w-0 flex-col gap-3.5 p-3.5 sm:p-5",
        "border-t border-border/30 bg-background/50",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-x-4 gap-y-2">
        {showRowCount && (
          <p
            className="text-[11px] sm:text-xs font-medium text-muted-foreground"
            aria-live="polite"
          >
            {totalRows === 0
              ? effectiveEmptyText
              : showingText
                ? showingText(startRow, endRow, totalRows)
                : (
                  <span>
                    {isVietnamese ? (
                      <>
                        Hiển thị <strong className="text-foreground font-mono font-bold">{startRow}–{endRow}</strong> trong <strong className="text-foreground font-mono font-bold">{totalRows}</strong> dòng
                      </>
                    ) : (
                      <>
                        Showing <strong className="text-foreground font-mono font-bold">{startRow}–{endRow}</strong> of <strong className="text-foreground font-mono font-bold">{totalRows}</strong> rows
                      </>
                    )}
                  </span>
                )}
          </p>
        )}

        {showPageSizeSelector && (
          <label className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-muted-foreground">
            <span>{effectivePageSizeLabel}</span>

            <select
              value={pageSize}
              disabled={loading}
              onChange={(event) => {
                table.setPageSize(Number(event.target.value));
              }}
              aria-label={effectivePageSizeLabel}
              className={[
                "h-8 sm:h-9 rounded-xl border border-[var(--shadow-dark)]/25 dark:border-white/10",
                "bg-background px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-foreground",
                "shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)]",
                "outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
              ].join(" ")}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} {effectivePerPageSuffix}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2.5">
        <span className="whitespace-nowrap font-mono text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-background border border-border/40 shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] text-primary">
          {pageOfText
            ? pageOfText(currentPage, Math.max(pageCount, 1))
            : isVietnamese
              ? `Trang ${currentPage} / ${Math.max(pageCount, 1)}`
              : `Page ${currentPage} of ${Math.max(pageCount, 1)}`}
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            className={controlClass}
            onClick={() => table.setPageIndex(0)}
            disabled={
              loading ||
              pageCount <= 1 ||
              !table.getCanPreviousPage()
            }
            aria-label={effectiveFirstPageTitle}
            title={effectiveFirstPageTitle}
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() => table.previousPage()}
            disabled={loading || !table.getCanPreviousPage()}
            aria-label={effectivePrevPageTitle}
            title={effectivePrevPageTitle}
          >
            <ChevronLeft size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() => table.nextPage()}
            disabled={loading || !table.getCanNextPage()}
            aria-label={effectiveNextPageTitle}
            title={effectiveNextPageTitle}
          >
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() =>
              table.setPageIndex(Math.max(pageCount - 1, 0))
            }
            disabled={
              loading ||
              pageCount <= 1 ||
              !table.getCanNextPage()
            }
            aria-label={effectiveLastPageTitle}
            title={effectiveLastPageTitle}
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
