
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  OnChangeFn,
  PaginationState,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";

import type { TableFeatureSet } from "./table-config";

export type TableVariant = "soft" | "sculpted";

export type TableFeature =
  | "sorting"
  | "globalFilter"
  | "columnFilters"
  | "pagination"
  | "rowSelection"
  | "columnVisibility"
  | "editing"
  | "rowActions";

export type TableFeatures = Partial<Record<TableFeature, boolean>>;

export type TableCellEditHandler<TData> = (params: {
  row: TData;
  rowId: string;
  columnId: string;
  previousValue: unknown;
  value: unknown;
}) => void | Promise<void>;

export interface TableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TableFeatureSet, TData, any>[];

  variant?: TableVariant;
  features?: TableFeatures;

  loading?: boolean;
  emptyMessage?: string;
  className?: string;

  getRowId?: (
    originalRow: TData,
    index: number,
    parent?: Row<TableFeatureSet, TData>,
  ) => string;

  onRowClick?: (row: Row<TableFeatureSet, TData>) => void;

  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;

  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;

  globalFilter?: unknown;
  onGlobalFilterChange?: OnChangeFn<unknown>;

  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageCount?: number;

  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  columnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>;

  onCellEdit?: TableCellEditHandler<TData>;


  /** Enable server-side sorting when the server returns sorted data. */
  manualSorting?: boolean;

  /** Enable server-side filtering when the server returns filtered data. */
  manualFiltering?: boolean;

  /** Enable server-side pagination when the server returns one page. */
  manualPagination?: boolean;

  /** Total row count for server-side pagination. */
  rowCount?: number;

}
