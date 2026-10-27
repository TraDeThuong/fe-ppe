"use client";

import { useQuery } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentItem } from "@/types";

export function useIncidentDetail(id: string, enabled = true) {
  return useQuery<IncidentItem>({
    queryKey: incidentKeys.detail(id),
    queryFn: () => incidentService.getIncidentById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}
