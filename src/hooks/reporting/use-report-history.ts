"use client";

import { useQuery } from "@tanstack/react-query";
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
    staleTime: 15 * 1000,
  });
}
