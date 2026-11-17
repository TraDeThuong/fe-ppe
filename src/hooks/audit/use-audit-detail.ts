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

export function useResourceAuditTrail(
  targetType: string,
  targetId: string | undefined | null,
  limit = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: auditQueryKeys.resourceTrail(targetType, targetId ?? "", limit),
    queryFn: () =>
      auditService.getResourceTrail(targetType, targetId!, { limit }),
    enabled: Boolean(targetType && targetId) && enabled,
    staleTime: 30 * 1000,
  });
}
