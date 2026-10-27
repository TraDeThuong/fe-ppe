"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/services";
import type { AuditLogQueryParams } from "@/types";
import { auditQueryKeys } from "./audit.query-keys";

export function useAuditLogs(params?: AuditLogQueryParams) {
  return useQuery({
    queryKey: auditQueryKeys.list(params),
    queryFn: () => auditService.getLogs(params),
    staleTime: 15 * 1000,
  });
}
