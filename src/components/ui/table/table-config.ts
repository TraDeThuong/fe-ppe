
import {
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  sortFn_alphanumeric,
  stockFeatures,
  tableFeatures,
} from "@tanstack/react-table";

export const defaultTableFeatures = tableFeatures({
  ...stockFeatures,

  // Row models
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),

  // Default functions
  filterFns: {
    includesString: filterFn_includesString,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
  },
});

export type TableFeatureSet = typeof defaultTableFeatures;
