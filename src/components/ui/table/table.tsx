
"use client";

import { useState, type ReactNode } from "react";
import {
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";

import { defaultTableFeatures } from "./table-config";
import { TableProvider } from "./table-context";
import { TableToolbar } from "./table-toolbar";
import { TableContent } from "./table-content";
import { TablePagination } from "./table-pagination";
import type { TableProps } from "./types";

export interface TableComponentProps<TData extends RowData>
  extends TableProps<TData> {
  children?: ReactNode;
}

export function Table<TData extends RowData>({
  data,
  columns,
  variant = "soft",
  features: _features,
  loading = false,
  emptyMessage = "Không có dữ liệu để hiển thị.",
  className = "",
  getRowId,
  onRowClick,

  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  pagination,
  onPaginationChange,
  pageCount,
  rowCount,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,

  manualSorting = false,
  manualFiltering = false,
  manualPagination = false,

  onCellEdit,
  children,
}: TableComponentProps<TData>) {
  // Internal state for uncontrolled mode
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState<any>("");
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<ColumnVisibilityState>({});

  const resolvedSorting = sorting ?? internalSorting;
  const resolvedColumnFilters = columnFilters ?? internalColumnFilters;
  const resolvedGlobalFilter = globalFilter ?? internalGlobalFilter;
  const resolvedPagination = pagination ?? internalPagination;
  const resolvedRowSelection = rowSelection ?? internalRowSelection;
  const resolvedColumnVisibility = columnVisibility ?? internalColumnVisibility;

  const state = {
    sorting: resolvedSorting,
    columnFilters: resolvedColumnFilters,
    globalFilter: resolvedGlobalFilter,
    pagination: resolvedPagination,
    rowSelection: resolvedRowSelection,
    columnVisibility: resolvedColumnVisibility,
  };

  const table = useTable({
    features: defaultTableFeatures,
    data,
    columns,
    getRowId,
    state,

    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedSorting) : updater;
      if (onSortingChange) onSortingChange(next);
      if (sorting === undefined) setInternalSorting(next);
    },

    onColumnFiltersChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedColumnFilters) : updater;
      if (onColumnFiltersChange) onColumnFiltersChange(next);
      if (columnFilters === undefined) setInternalColumnFilters(next);
    },

    onGlobalFilterChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedGlobalFilter) : updater;
      if (onGlobalFilterChange) onGlobalFilterChange(next);
      if (globalFilter === undefined) setInternalGlobalFilter(next);
    },

    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedPagination) : updater;
      if (onPaginationChange) onPaginationChange(next);
      if (pagination === undefined) setInternalPagination(next);
    },

    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedRowSelection) : updater;
      if (onRowSelectionChange) onRowSelectionChange(next);
      if (rowSelection === undefined) setInternalRowSelection(next);
    },

    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? (updater as any)(resolvedColumnVisibility) : updater;
      if (onColumnVisibilityChange) onColumnVisibilityChange(next);
      if (columnVisibility === undefined) setInternalColumnVisibility(next);
    },

    manualSorting,
    manualFiltering,
    manualPagination,

    ...(pageCount !== undefined ? { pageCount } : {}),
    ...(rowCount !== undefined ? { rowCount } : {}),
  });

  const contextValue = {
    table,
    variant,
    loading,
    emptyMessage,
    onRowClick,
    onCellEdit,
  };

  const surfaceClass =
    variant === "sculpted"
      ? [
          "bg-background/95",
          "rounded-[24px] sm:rounded-[28px]",
          "border border-[var(--shadow-dark)]/25 dark:border-white/5",
          "shadow-[inset_6px_6px_14px_var(--shadow-dark),inset_-6px_-6px_14px_var(--shadow-light)]",
        ].join(" ")
      : [
          "bg-background",
          "rounded-[24px] sm:rounded-[28px]",
          "border border-white/80 dark:border-white/10",
          "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_var(--shadow-dark)]",
        ].join(" ");

  return (
    <TableProvider value={contextValue}>
      <div
        data-table-root=""
        data-variant={variant}
        aria-busy={loading}
        className={[
          "group relative min-w-0 w-full overflow-hidden",
          "text-foreground",
          "transition-all duration-300",
          surfaceClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Specular highlight on top edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20 z-10"
        />

        {/* Subtle ambient light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/5 blur-3xl"
        />

        {children ?? (
          <>
            <TableToolbar />
            <TableContent />
            <TablePagination />
          </>
        )}
      </div>
    </TableProvider>
  );
}

export default Table;
