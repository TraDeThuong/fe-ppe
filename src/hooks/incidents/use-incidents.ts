"use client";

import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentItem, IncidentQueryParams, PaginationMeta } from "@/types";

export interface UseIncidentsResult {
  items: IncidentItem[];
  meta?: PaginationMeta;
}

export function useIncidents(
  params?: IncidentQueryParams,
  options?: Omit<UseQueryOptions<UseIncidentsResult, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: incidentKeys.list(params),
    queryFn: () => incidentService.getIncidents(params),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    ...options,
  });
}
