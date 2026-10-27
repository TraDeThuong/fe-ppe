"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import type { IncidentCommentItem } from "@/types";

export function useIncidentComments(incidentId: string, enabled = true) {
  return useQuery<IncidentCommentItem[]>({
    queryKey: incidentKeys.comments(incidentId),
    queryFn: () => incidentService.getComments(incidentId),
    enabled: Boolean(incidentId) && enabled,
    staleTime: 15 * 1000,
  });
}

export function useAddIncidentComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ incidentId, comment }: { incidentId: string; comment: string }) =>
      incidentService.addComment(incidentId, comment),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.comments(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
      toast.success("Đã gửi bình luận thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể gửi bình luận.";
      toast.error(msg);
    },
  });
}
