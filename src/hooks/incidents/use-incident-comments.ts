"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
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
    onSuccess: (createdComment, { incidentId }) => {
      if (createdComment?.id) {
        queryClient.setQueryData<IncidentCommentItem[]>(
          incidentKeys.comments(incidentId),
          (previous = []) => {
            if (previous.some((item) => item.id === createdComment.id)) {
              return previous;
            }
            return [...previous, createdComment];
          },
        );
      }
      queryClient.invalidateQueries({ queryKey: incidentKeys.comments(incidentId) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incidentId) });
      toast.success(
        pickLocaleText("Đã gửi bình luận thành công.", "Comment posted successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể gửi bình luận.", "Unable to post comment.");
      toast.error(msg);
    },
  });
}
