"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { auditService } from "@/services";
import type { AuditLogItem, AuditLogQueryParams, PaginationMeta } from "@/types";
import { auditQueryKeys } from "./audit.query-keys";

export interface UseAuditLogsResult {
  items: AuditLogItem[];
  meta: PaginationMeta;
}

export type UseAuditLogsOptions = Omit<
  UseQueryOptions<UseAuditLogsResult, Error>,
  "queryKey" | "queryFn"
>;

export function useAuditLogs(
  params?: AuditLogQueryParams,
  options?: UseAuditLogsOptions,
) {
  return useQuery<UseAuditLogsResult, Error>({
    queryKey: auditQueryKeys.list(params),
    queryFn: () => auditService.getLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    ...options,
  });
}
