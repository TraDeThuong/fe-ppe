"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { auditService } from "@/services";
import type { AuditSummaryDto } from "@/types";
import { auditQueryKeys } from "./audit.query-keys";

export type UseAuditSummaryOptions = Omit<
  UseQueryOptions<AuditSummaryDto, Error>,
  "queryKey" | "queryFn"
>;

export function useAuditSummary(
  params?: { fromDate?: string; toDate?: string; startDate?: string; endDate?: string },
  options?: UseAuditSummaryOptions,
) {
  return useQuery<AuditSummaryDto, Error>({
    queryKey: auditQueryKeys.summary(params),
    queryFn: () => auditService.getSummary(params),
    staleTime: 30 * 1000,
    ...options,
  });
}
