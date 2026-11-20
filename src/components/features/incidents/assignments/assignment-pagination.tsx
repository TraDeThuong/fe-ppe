"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { NM } from "@/components/features/ai-test/nm-styles";
import { useLocale } from "@/providers/locale-provider";
import type { IncidentItem } from "@/types";
import { AssignmentIncidentRow } from "./assignment-incident-row";
import type {
  AssignmentFormatters,
  AssignmentResponsibilityContext,
  AssignmentRowActions,
} from "./types";

export interface PaginationSlice<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Hàm cắt mảng thuần (pure helper) đảm bảo số trang luôn hợp lệ trong [1, pageCount].
 */
export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  requestedPageSize: number,
): PaginationSlice<T> {
  const totalItems = items.length;
  const pageSize = Math.max(1, Math.floor(requestedPageSize) || 10);
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), pageCount);

  const offset = (page - 1) * pageSize;
  const sliced = items.slice(offset, offset + pageSize);
  const startIndex = totalItems === 0 ? 0 : offset + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(offset + pageSize, totalItems);

  return {
    items: sliced,
    page,
    pageSize,
    totalItems,
    pageCount,
    startIndex,
    endIndex,
  };
}

export function useClientPagination<T>(
  items: readonly T[],
  options?: {
    defaultPageSize?: number;
    resetKey?: string;
  },
) {
  const defaultPageSize = options?.defaultPageSize ?? 10;
  const resetKey = options?.resetKey ?? "";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const slice = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize],
  );

  // Giữ state đồng bộ khi tổng số phần tử co lại (vd: sau khi duyệt/đóng hàng loạt)
  useEffect(() => {
    if (page !== slice.page) {
      setPage(slice.page);
    }
  }, [page, slice.page]);

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return {
    ...slice,
    setPage,
    setPageSize: handlePageSizeChange,
  };
}

export interface AssignmentPaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  /** "embedded" đặt bên trong card danh sách; "standalone" là khối Neumorphic độc lập */
  variant?: "embedded" | "standalone";
  /** Đơn vị đếm (mặc định: "sự cố" / "incidents") */
  itemLabel?: { vi: string; en: string };
  /** Ẩn thanh phân trang nếu toàn bộ danh sách ít hơn hoặc bằng ngưỡng tối thiểu */
  hideIfSinglePageAndSmall?: boolean;
  className?: string;
}

export function AssignmentPagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  variant = "embedded",
  itemLabel,
  hideIfSinglePageAndSmall = false,
  className = "",
}: AssignmentPaginationProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const minOption = Math.min(...pageSizeOptions);
  if (totalItems === 0) return null;
  if (hideIfSinglePageAndSmall && pageCount <= 1 && totalItems <= minOption) {
    return null;
  }

  const unit = itemLabel
    ? isVietnamese
      ? itemLabel.vi
      : itemLabel.en
    : isVietnamese
      ? "sự cố"
      : "incidents";

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const controlClass = [
    "inline-flex size-8 items-center justify-center",
    "rounded-xl border border-white/60 dark:border-white/10",
    "bg-background text-foreground",
    "shadow-[2.5px_2.5px_5px_var(--shadow-dark),-2.5px_-2.5px_5px_var(--shadow-light)]",
    "transition-[transform,color,box-shadow] duration-200 hover:-translate-y-0.5 hover:text-primary motion-reduce:transform-none",
    "active:shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] active:translate-y-0",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",
  ].join(" ");

  const containerClass =
    variant === "standalone"
      ? `flex min-w-0 flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between ${NM.extruded}`
      : "flex min-w-0 flex-col gap-3 border-t border-border/30 bg-background/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between";

  return (
    <div
      data-testid="assignment-pagination"
      className={`${containerClass} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
        <p
          className="text-[11px] font-medium text-muted-foreground sm:text-xs"
          aria-live="polite"
        >
          {isVietnamese ? (
            <>
              Hiển thị{" "}
              <strong className="font-bold tabular-nums text-foreground">
                {startIndex}–{endIndex}
              </strong>{" "}
              trong{" "}
              <strong className="font-bold tabular-nums text-foreground">
                {totalItems}
              </strong>{" "}
              {unit}
            </>
          ) : (
            <>
              Showing{" "}
              <strong className="font-bold tabular-nums text-foreground">
                {startIndex}–{endIndex}
              </strong>{" "}
              of{" "}
              <strong className="font-bold tabular-nums text-foreground">
                {totalItems}
              </strong>{" "}
              {unit}
            </>
          )}
        </p>

        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:text-xs">
            <span>{isVietnamese ? "Hiển thị" : "Per page"}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label={
                isVietnamese ? "Số mục trên mỗi trang" : "Items per page"
              }
              className="h-8 cursor-pointer rounded-xl border border-[var(--shadow-dark)]/25 bg-background px-2.5 text-[11px] font-bold text-foreground shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/10 sm:text-xs"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} {isVietnamese ? "/ trang" : "/ page"}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-2.5 sm:justify-end">
        <span className="whitespace-nowrap rounded-xl border border-border/40 bg-background px-2.5 py-1 text-[11px] font-black tabular-nums text-primary shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] sm:px-3 sm:py-1.5 sm:text-xs">
          {isVietnamese
            ? `Trang ${page} / ${pageCount}`
            : `Page ${page} of ${pageCount}`}
        </span>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            className={controlClass}
            onClick={() => onPageChange(1)}
            disabled={!canPrev || pageCount <= 1}
            aria-label={isVietnamese ? "Trang đầu" : "First page"}
            title={isVietnamese ? "Trang đầu" : "First page"}
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!canPrev}
            aria-label={isVietnamese ? "Trang trước" : "Previous page"}
            title={isVietnamese ? "Trang trước" : "Previous page"}
          >
            <ChevronLeft size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={!canNext}
            aria-label={isVietnamese ? "Trang tiếp theo" : "Next page"}
            title={isVietnamese ? "Trang tiếp theo" : "Next page"}
          >
            <ChevronRight size={14} />
          </button>

          <button
            type="button"
            className={controlClass}
            onClick={() => onPageChange(pageCount)}
            disabled={!canNext || pageCount <= 1}
            aria-label={isVietnamese ? "Trang cuối" : "Last page"}
            title={isVietnamese ? "Trang cuối" : "Last page"}
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export interface PaginatedIncidentRowsProps {
  incidents: IncidentItem[];
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  resetKey?: string;
  currentUserId?: string;
  selectedIds?: Set<string>;
  selectable?: boolean;
  showResponsibility?: boolean;
  allowManagerActions?: boolean;
  allowOfficerResolve?: boolean;
  onToggleSelect?: (id: string) => void;
  responsibilityContext: AssignmentResponsibilityContext;
  formatters: AssignmentFormatters;
  actions: AssignmentRowActions;
}

/**
 * Danh sách các dòng sự cố có sẵn phân trang tích hợp ở cuối thẻ nhóm,
 * tránh tình trạng mở rộng 1 nhóm có 40–100 sự cố gây cuộn trang quá dài.
 */
export function PaginatedIncidentRows({
  incidents,
  defaultPageSize = 5,
  pageSizeOptions = [5, 10, 20, 50],
  resetKey,
  currentUserId,
  selectedIds,
  selectable = false,
  showResponsibility = false,
  allowManagerActions = false,
  allowOfficerResolve = false,
  onToggleSelect,
  responsibilityContext,
  formatters,
  actions,
}: PaginatedIncidentRowsProps) {
  const pagination = useClientPagination(incidents, {
    defaultPageSize,
    resetKey,
  });

  return (
    <div>
      <div className="divide-y divide-border/20">
        {pagination.items.map((inc) => (
          <AssignmentIncidentRow
            key={inc.id}
            incident={inc}
            currentUserId={currentUserId}
            selected={selectedIds ? selectedIds.has(inc.id) : false}
            selectable={selectable}
            showResponsibility={showResponsibility}
            allowManagerActions={allowManagerActions}
            allowOfficerResolve={allowOfficerResolve}
            onToggleSelect={onToggleSelect}
            responsibilityContext={responsibilityContext}
            formatters={formatters}
            actions={actions}
          />
        ))}
      </div>

      <AssignmentPagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        pageSizeOptions={pageSizeOptions}
        variant="embedded"
        hideIfSinglePageAndSmall
      />
    </div>
  );
}
