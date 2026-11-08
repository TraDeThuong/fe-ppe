"use client";

import { createContext, use, type ReactNode } from "react";
import type { TableCellEditHandler, TableFeatures, TableVariant } from "./types";

export interface TableStateContext {
  sorting: any;
  columnFilters: any;
  globalFilter: any;
  pagination: any;
  rowSelection: any;
  columnVisibility: any;
  loading: boolean;
  fetching: boolean;
  error?: unknown;
  rowCount?: number;
  totalRowCount?: number;
}

export interface TableActionsContext<TData = any> {
  onRetry?: () => void;
  onRowClick?: (row: any) => void;
  onCellEdit?: TableCellEditHandler<TData>;
  setSorting: (updater: any) => void;
  setColumnFilters: (updater: any) => void;
  setGlobalFilter: (updater: any) => void;
  setPagination: (updater: any) => void;
  setRowSelection: (updater: any) => void;
  setColumnVisibility: (updater: any) => void;
}

export interface TableMetaContext<TData = any> {
  table: any;
  variant: TableVariant;
  features: TableFeatures;
  manualPagination: boolean;
  emptyMessage: string;
  getRowClassName?: (row: TData) => string;
}

export interface TableContextValue<TData = any> {
  /** Structured State Context */
  state: TableStateContext;
  /** Structured Actions Context */
  actions: TableActionsContext<TData>;
  /** Structured Meta Context */
  meta: TableMetaContext<TData>;

  // Backward compatibility fields
  table: any;
  variant: TableVariant;
  loading: boolean;
  fetching: boolean;
  error?: unknown;
  onRetry?: () => void;
  features: TableFeatures;
  manualPagination: boolean;
  rowCount?: number;
  totalRowCount?: number;
  getRowClassName?: (row: any) => string;
  emptyMessage: string;
  onRowClick?: (row: any) => void;
  onCellEdit?: TableCellEditHandler<any>;
}

interface TableProviderProps<TData = any> {
  value: TableContextValue<TData>;
  children: ReactNode;
}

const TableContext = createContext<TableContextValue<any> | null>(null);

export function TableProvider<TData = any>({
  value,
  children,
}: TableProviderProps<TData>) {
  return (
    <TableContext value={value}>
      {children}
    </TableContext>
  );
}

export function useTableContext<TData = any>(): TableContextValue<TData> {
  const context = use(TableContext);

  if (!context) {
    throw new Error(
      "Table components must be rendered inside the Table component.",
    );
  }

  return context as TableContextValue<TData>;
}
