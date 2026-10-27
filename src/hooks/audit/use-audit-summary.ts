"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/services";
import { auditQueryKeys } from "./audit.query-keys";

export function useAuditSummary(params?: { fromDate?: string; toDate?: string; siteId?: string }) {
  return useQuery({
    queryKey: auditQueryKeys.summary(params),
    queryFn: () => auditService.getSummary(params),
    staleTime: 30 * 1000,
  });
}
