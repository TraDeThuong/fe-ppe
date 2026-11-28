"use client";

import {
  hashKey,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  fetchReportArchiveCounts,
  fetchReportHistoryForTypes,
  type ReportArchiveCounts,
} from "@/lib/report-archive";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type { PaginationMeta, ReportGenerationDto, ReportHistoryQueryDto } from "@/types";

export interface UseReportHistoryResult {
  items: ReportGenerationDto[];
  meta?: PaginationMeta;
}

export type UseReportHistoryOptions = Omit<
  UseQueryOptions<UseReportHistoryResult, Error>,
  "queryKey" | "queryFn"
> & {
  scopeUserId?: string;
  /**
   * Lọc theo nhiều loại cùng lúc (vd nhóm Định kỳ). BE chỉ nhận 1 reportType,
   * nên mỗi loại được gọi riêng rồi gộp đúng trang ở FE.
   */
  reportTypes?: readonly string[];
};

export function useReportHistory(
  params?: ReportHistoryQueryDto,
  options?: UseReportHistoryOptions,
) {
  const { scopeUserId, reportTypes, ...queryOptions } = options ?? {};
  const multiTypes = reportTypes?.length ? reportTypes : undefined;
  const queryKey = reportingKeys.history(params, multiTypes, scopeUserId);
  const scopeHash = hashKey(queryKey.slice(0, -1));
  return useQuery<UseReportHistoryResult, Error>({
    queryKey,
    queryFn: ({ signal }) =>
      multiTypes
        ? fetchReportHistoryForTypes(
            (query) => reportingService.getReportHistory(query, { signal }),
            multiTypes,
            params,
          )
        : reportingService.getReportHistory(params, { signal }),
    placeholderData: (previousData, previousQuery) =>
      previousQuery && hashKey(previousQuery.queryKey.slice(0, -1)) === scopeHash
        ? previousData
        : undefined,
    staleTime: 5 * 1000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasPendingOrProcessing = items.some(
        (item) => item.status === "PENDING" || item.status === "PROCESSING"
      );
      // Auto-poll every 4 seconds if there are reports actively generating
      return hasPendingOrProcessing ? 4000 : false;
    },
    ...queryOptions,
  });
}

/**
 * Số đếm của kho báo cáo theo cơ sở (tổng, theo loại, theo trạng thái) từ meta.total của
 * các request limit=1 — không phụ thuộc trang đang xem hay bộ lọc của danh sách.
 * Không tự poll: được làm mới khi tạo báo cáo (invalidate historyAll), khi một hồ sơ
 * đổi trạng thái, hoặc khi bấm Làm mới.
 */
export function useReportArchiveCounts(
  params: { siteId?: string },
  options?: { enabled?: boolean },
) {
  return useQuery<ReportArchiveCounts, Error>({
    queryKey: reportingKeys.archiveCounts(params),
    queryFn: ({ signal }) =>
      fetchReportArchiveCounts(
        (query) => reportingService.getReportHistory(query, { signal }),
        params,
      ),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}
