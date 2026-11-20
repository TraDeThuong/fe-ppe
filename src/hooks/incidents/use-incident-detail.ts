"use client";

import { useQuery } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentItem } from "@/types";

export function useIncidentDetail(id: string, enabled = true, userId?: string) {
  return useQuery<IncidentItem>({
    queryKey: userId ? [...incidentKeys.detail(id), "user", userId] : incidentKeys.detail(id),
    queryFn: ({ signal }) => incidentService.getIncidentById(id, { signal }),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}
