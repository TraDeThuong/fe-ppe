"use client";
import { useState, useCallback, useEffect } from "react";
import type { PaginationState, SortingState, OnChangeFn } from "@tanstack/react-table";
export function useTableState(initialSorting: SortingState = [], filterKey = "") {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [search, setSearchValue] = useState("");
  const resetPage = useCallback(() => setPagination(p => p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }), []);
  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    resetPage();
  }, [resetPage]);
  const onSortingChange: OnChangeFn<SortingState> = useCallback(updater => {
    setSorting(updater);
    resetPage();
  }, [resetPage]);
  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(updater => setPagination(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next;
  }), []);
  useEffect(resetPage, [filterKey, resetPage]);
  return {
    filterKey,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    search,
    setSearch,
    resetPage
  };
}
