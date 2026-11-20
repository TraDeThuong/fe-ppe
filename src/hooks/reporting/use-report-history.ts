"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
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
> & { scopeUserId?: string };

export function useReportHistory(
  params?: ReportHistoryQueryDto,
  options?: UseReportHistoryOptions,
) {
  const { scopeUserId, ...queryOptions } = options ?? {};
  return useQuery<UseReportHistoryResult, Error>({
    queryKey: scopeUserId ? [...reportingKeys.history(params), scopeUserId] : reportingKeys.history(params),
    queryFn: ({ signal }) => reportingService.getReportHistory(params, { signal }),
    placeholderData: keepPreviousData,
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
