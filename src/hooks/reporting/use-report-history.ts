"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type { PaginationMeta, ReportGenerationDto, ReportHistoryQueryDto } from "@/types";

export interface UseReportHistoryResult {
  items: ReportGenerationDto[];
  meta?: PaginationMeta;
}

export function useReportHistory(params?: ReportHistoryQueryDto) {
  return useQuery<UseReportHistoryResult>({
    queryKey: reportingKeys.history(params),
    queryFn: () => reportingService.getReportHistory(params),
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
  });
}
