"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { PaginationMeta, SiteItem, SiteQueryParams } from "@/types";

export interface UseSitesResult {
  items: SiteItem[];
  meta?: PaginationMeta;
}

export function useSites(
  params?: SiteQueryParams,
  options?: Omit<UseQueryOptions<UseSitesResult, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: siteKeys.list(params),
    queryFn: () => siteService.getSites(params),
    staleTime: 30 * 1000,
    ...options,
  });
}
