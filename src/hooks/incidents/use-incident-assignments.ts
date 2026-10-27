"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { CreateAssignmentPayload, IncidentAssignmentItem } from "@/types";

export function useIncidentAssignments(incidentId: string, enabled = true) {
  return useQuery<IncidentAssignmentItem[]>({
    queryKey: incidentKeys.assignments(incidentId),
    queryFn: () => incidentService.getAssignments(incidentId),
    enabled: Boolean(incidentId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useAssignOfficer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      payload,
    }: {
      incidentId: string;
      payload: CreateAssignmentPayload;
    }) => incidentService.assignOfficer(incidentId, payload),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.assignments(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      toast.success("Đã phân công cán bộ an toàn phụ trách sự cố.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể phân công cán bộ.";
      toast.error(msg);
    },
  });
}
