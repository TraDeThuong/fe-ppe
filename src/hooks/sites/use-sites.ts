"use client";

import { collectCatalog } from "@/lib/table-utils";
import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
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
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    ...options,
  });
}

/** Complete catalog for aggregate KPI panels; the operational table still pages on the server. */
export function useSitesCatalog() {
  return useQuery({ queryKey: siteKeys.list({ page: 0, limit: 100 }), queryFn: () => collectCatalog((page, limit) => siteService.getSites({ page, limit })), staleTime: 60_000 });
}
