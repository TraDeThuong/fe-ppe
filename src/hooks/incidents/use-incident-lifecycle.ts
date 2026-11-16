"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import type {
  CloseIncidentPayload,
  CreateIncidentPayload,
  ResolveIncidentPayload,
  ReviewIncidentPayload,
} from "@/types";

function invalidateIncidentListsAndCounts(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
  queryClient.invalidateQueries({ queryKey: incidentKeys.statusCountsRoot() });
  queryClient.invalidateQueries({ queryKey: reportingKeys.all });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIncidentPayload) =>
      incidentService.createIncident(payload),
    onSuccess: (createdIncident) => {
      invalidateIncidentListsAndCounts(queryClient);
      toast.success(
        `Đã ghi nhận sự cố vi phạm #${createdIncident.id.slice(0, 8)} vào hệ thống thành công.`
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo sự cố vi phạm.";
      toast.error(msg);
    },
  });
}

export function useReviewIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewIncidentPayload }) =>
      incidentService.reviewIncident(id, payload),
    onSuccess: (updatedIncident, { id, payload }) => {
      invalidateIncidentListsAndCounts(queryClient);
      queryClient.setQueryData(incidentKeys.detail(id), updatedIncident);
      if (payload.decision === "CONFIRMED") {
        toast.success("Đã xác nhận sự cố vi phạm an toàn thành công.");
      } else {
        toast.success("Đã bác bỏ sự cố báo động ảo.");
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể thẩm duyệt sự cố.";
      toast.error(msg);
    },
  });
}

export function useBatchReviewIncidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      ids: string[];
      action: "CONFIRM" | "REJECT";
      resolutionNote?: string;
    }) => incidentService.batchReviewIncidents(payload),
    onSuccess: (result) => {
      invalidateIncidentListsAndCounts(queryClient);
      toast.success(
        `Đã thẩm duyệt hàng loạt ${result.updatedCount}/${result.total} sự cố thành công.`,
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Không thể thẩm duyệt hàng loạt sự cố.";
      toast.error(msg);
    },
  });
}

export function useResolveIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveIncidentPayload }) =>
      incidentService.resolveIncident(id, payload),
    onSuccess: (updatedIncident, { id }) => {
      invalidateIncidentListsAndCounts(queryClient);
      queryClient.setQueryData(incidentKeys.detail(id), updatedIncident);
      toast.success("Đã cập nhật trạng thái giải quyết sự cố thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể giải quyết sự cố.";
      toast.error(msg);
    },
  });
}

export function useCloseIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CloseIncidentPayload }) =>
      incidentService.closeIncident(id, payload),
    onSuccess: (updatedIncident, { id }) => {
      invalidateIncidentListsAndCounts(queryClient);
      queryClient.setQueryData(incidentKeys.detail(id), updatedIncident);
      toast.success("Đã nghiệm thu và đóng hồ sơ sự cố thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể đóng sự cố.";
      toast.error(msg);
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incidentService.deleteIncident(id),
    onSuccess: () => {
      invalidateIncidentListsAndCounts(queryClient);
      toast.success("Đã xóa sự cố thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa sự cố.";
      toast.error(msg);
    },
  });
}
