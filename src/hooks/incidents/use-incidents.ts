"use client";

import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useRealtime } from "@/contexts/RealtimeContext";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentItem, IncidentQueryParams, PaginationMeta } from "@/types";

export interface UseIncidentsResult {
  items: IncidentItem[];
  meta?: PaginationMeta;
}

function isRateLimitError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number((error as { status?: unknown }).status) === 429,
  );
}

export function useIncidents(
  params?: IncidentQueryParams,
  options?: Omit<UseQueryOptions<UseIncidentsResult, Error>, "queryKey" | "queryFn">,
) {
  const { isConnected } = useRealtime();

  return useQuery({
    queryKey: incidentKeys.list(params),
    queryFn: ({ signal }) => incidentService.getIncidents(params, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: (query) =>
      isRateLimitError(query.state.error)
        ? false
        : isConnected
          ? 60 * 1000
          : 30 * 1000,
    refetchIntervalInBackground: false,
    ...options,
  });
}
