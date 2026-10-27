"use client";

import { useQuery } from "@tanstack/react-query";
import { systemService } from "@/services";
import type { SystemConfigQueryParams } from "@/types";
import { systemQueryKeys } from "./system.query-keys";

export function useSystemConfigs(params?: SystemConfigQueryParams) {
  return useQuery({
    queryKey: systemQueryKeys.configs(params),
    queryFn: () => systemService.getConfigs(params),
    staleTime: 30 * 1000,
  });
}
