"use client";

import { useQuery } from "@tanstack/react-query";
import { systemService } from "@/services";
import { systemQueryKeys } from "./system.query-keys";

export function useSystemHealth(refetchInterval: number | false = 30000) {
  return useQuery({
    queryKey: systemQueryKeys.health(),
    queryFn: () => systemService.checkServicesHealth(),
    refetchInterval,
    staleTime: 15000,
  });
}
