
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TableCellEditHandler, TableVariant } from "./types";

export interface TableContextValue {
  table: any;
  variant: TableVariant;
  loading: boolean;
  emptyMessage: string;
  onRowClick?: (row: any) => void;
  onCellEdit?: TableCellEditHandler<any>;
}

interface TableProviderProps {
  value: TableContextValue;
  children: ReactNode;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ value, children }: TableProviderProps) {
  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
}

export function useTableContext(): TableContextValue {
  const context = useContext(TableContext);

  if (!context) {
    throw new Error(
      "Table components must be rendered inside the Table component.",
    );
  }

  return context;
}
