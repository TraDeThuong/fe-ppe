"use client";

import { useQuery } from "@tanstack/react-query";
import { auditService } from "@/services";
import { auditQueryKeys } from "./audit.query-keys";

export function useAuditDetail(id: string | null) {
  return useQuery({
    queryKey: auditQueryKeys.detail(id ?? ""),
    queryFn: () => auditService.getLogDetail(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}
