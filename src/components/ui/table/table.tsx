
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTable, type ColumnFiltersState, type ColumnVisibilityState, type PaginationState, type RowData, type RowSelectionState, type SortingState } from "@tanstack/react-table";

import { defaultTableFeatures } from "./table-config";
import { TableProvider } from "./table-context";
import { TableToolbar } from "./table-toolbar";
import { TableContent } from "./table-content";
import { TablePagination } from "./table-pagination";
import { TableError } from "./table-error";
import { TableBulkActions } from "./table-bulk-actions";
import type { TableContextValue } from "./table-context";
import type { TableProps } from "./types";

export interface TableComponentProps<TData extends RowData>
  extends TableProps<TData> {
  children?: ReactNode;
}

export function Table<TData extends RowData>({
  data,
  toolbar,
  columns,
  variant = "soft",
  surface = "standalone",
  features = {},
  loading = false,
  fetching = false,
  error,
  onRetry,
  totalRowCount,
  filterKey,
  getRowClassName,
  emptyMessage = "Không có dữ liệu để hiển thị.",
  className = "",
  hideTopHighlight = false,
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
    sorting: features.sorting === false ? [] : resolvedSorting,
    columnFilters: features.columnFilters === false ? [] : resolvedColumnFilters,
    globalFilter: features.globalFilter === false ? "" : resolvedGlobalFilter,
    pagination: resolvedPagination,
    rowSelection: resolvedRowSelection,
    columnVisibility: resolvedColumnVisibility,

  };

  const table = useTable({
    features: defaultTableFeatures,
    data,
    columns: useMemo(() => columns.map((column) => {
      if (column.id === "select") return { ...column, enableHiding: false };
      if (column.id === "actions") return {
        ...column,
        enableHiding: false,
        enableSorting: false,
        enableGlobalFilter: false
      };
      return column;
    }).filter((column) => !(column.id === "select" && features.rowSelection === false) && !(column.id === "actions" && features.rowActions === false)), [columns, features.rowSelection, features.rowActions]),
    getRowId,
    enableSorting: features.sorting !== false,
    enableMultiSort: !manualSorting,
    enableGlobalFilter: features.globalFilter !== false,
    enableColumnFilters: features.columnFilters !== false,
    enableRowSelection: features.rowSelection !== false,
    enableHiding: features.columnVisibility !== false,
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
    manualPagination: manualPagination || features.pagination === false,

    ...(pageCount !== undefined ? { pageCount } : {}),
    ...(rowCount !== undefined ? { rowCount } : {}),

  });

  const scope = JSON.stringify([resolvedPagination.pageIndex, resolvedPagination.pageSize, resolvedSorting, resolvedGlobalFilter, resolvedColumnFilters, filterKey]);
  useEffect(() => {
    table.resetRowSelection();
  }, [scope]); // Selection is scoped to the visible page/query.

  const criteria = JSON.stringify([resolvedSorting, resolvedGlobalFilter, resolvedColumnFilters, filterKey]);
  const previousCriteria = useRef(criteria);
  useEffect(() => {
    if (previousCriteria.current === criteria) return;
    previousCriteria.current = criteria;
    if (table.state.pagination.pageIndex !== 0) table.setPageIndex(0);
  }, [criteria]);

  const availablePages = table.getPageCount();
  useEffect(() => {
    if (!loading && !fetching && !error && features.pagination !== false && resolvedPagination.pageIndex >= Math.max(1, availablePages)) {
      table.setPageIndex(Math.max(0, availablePages - 1));
    }
  }, [availablePages, resolvedPagination.pageIndex, loading, fetching, error, features.pagination]);

  useEffect(() => {
    if (loading || fetching || error) return;
    const ids = new Set(data.map((row, index) => getRowId?.(row, index) ?? String(index)));
    const selected = table.state.rowSelection ?? {};
    if (Object.keys(selected).some((id) => selected[id] && !ids.has(id))) {
      table.setRowSelection(Object.fromEntries(Object.entries(selected).filter(([id]) => ids.has(id))));
    }
  }, [data, loading, fetching, error]);

  const stateContext = {
    sorting: resolvedSorting,
    columnFilters: resolvedColumnFilters,
    globalFilter: resolvedGlobalFilter,
    pagination: resolvedPagination,
    rowSelection: resolvedRowSelection,
    columnVisibility: resolvedColumnVisibility,
    loading,
    fetching,
    error,
    rowCount,
    totalRowCount,
  };

  const actionsContext = {
    onRetry,
    onRowClick,
    onCellEdit: features.editing === false ? undefined : onCellEdit,
    setSorting: table.setSorting,
    setColumnFilters: table.setColumnFilters,
    setGlobalFilter: table.setGlobalFilter,
    setPagination: table.setPagination,
    setRowSelection: table.setRowSelection,
    setColumnVisibility: table.setColumnVisibility,
  };

  const metaContext = {
    table,
    variant,
    features,
    manualPagination,
    emptyMessage,
    getRowClassName,
  };

  const contextValue: TableContextValue<TData> = {
    state: stateContext,
    actions: actionsContext,
    meta: metaContext,

    // Backward-compatible fields
    table,
    variant,
    loading,
    fetching,
    error,
    onRetry,
    features,
    manualPagination,
    rowCount,
    totalRowCount,
    getRowClassName,
    emptyMessage,
    onRowClick,
    onCellEdit: features.editing === false ? undefined : onCellEdit,
  };

  const surfaceClass = surface === "embedded" ? "rounded-xl border border-border/30 bg-background [&_td]:py-2.5 [&_th]:py-2.5" :
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
        hideTopHighlight ? "border border-border/40" : "border border-white/80 dark:border-white/10",
        hideTopHighlight
          ? "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light),inset_-1px_-1px_2px_var(--shadow-dark)]"
          : "shadow-[10px_10px_24px_var(--shadow-dark),-10px_-10px_24px_var(--shadow-light),inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_var(--shadow-dark)]",
      ].join(" ");

  return (
    <TableProvider value={contextValue}>
      <div
        data-table-root=""
        data-variant={variant}
        aria-busy={loading || fetching}
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
        {!hideTopHighlight && surface === "standalone" ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 z-10 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
          />
        ) : null}

        {/* Subtle ambient light */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/5 blur-3xl"
        />

        {toolbar ? <div className="border-b border-border/30 p-4 sm:p-5">{toolbar}</div> : null}
        {error ? (
          <TableError onRetry={onRetry} />
        ) : null}
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

Table.Toolbar = TableToolbar;
Table.Content = TableContent;
Table.Pagination = TablePagination;
Table.BulkActions = TableBulkActions;
Table.Error = TableError;

export default Table;
