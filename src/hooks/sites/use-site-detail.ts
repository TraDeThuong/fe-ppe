"use client";

import { useQuery } from "@tanstack/react-query";
import { siteService } from "@/services/site.service";
import { siteKeys } from "./site.query-keys";
import type { SiteItem } from "@/types";

export function useSiteDetail(id: string, enabled = true) {
  return useQuery<SiteItem>({
    queryKey: siteKeys.detail(id),
    queryFn: () => siteService.getSiteById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}
