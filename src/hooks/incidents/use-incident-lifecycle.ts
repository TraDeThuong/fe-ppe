"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/axios";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { incidentService } from "@/services/incident.service";
import { incidentKeys } from "./incident.query-keys";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import type {
  CloseIncidentPayload,
  CreateIncidentPayload,
  ResolveIncidentPayload,
  ReviewIncidentPayload,
  UpdateIncidentPayload,
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
        pickLocaleText(
          `Đã ghi nhận sự cố vi phạm #${createdIncident.id.slice(0, 8)} vào hệ thống thành công.`,
          `Incident #${createdIncident.id.slice(0, 8)} recorded successfully.`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể tạo sự cố vi phạm.",
              "Unable to create violation incident.",
            );
      toast.error(msg);
    },
  });
}

export function useReviewIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewIncidentPayload }) =>
      incidentService.reviewIncident(id, payload),
    onSuccess: (_updatedIncident, { id, payload }) => {
      invalidateIncidentListsAndCounts(queryClient);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      if (payload.decision === "CONFIRMED") {
        toast.success(
          pickLocaleText(
            "Đã xác nhận sự cố vi phạm an toàn thành công.",
            "Safety violation incident confirmed.",
          ),
        );
      } else {
        toast.success(
          pickLocaleText(
            "Đã bác bỏ sự cố báo động ảo.",
            "False-alarm incident dismissed.",
          ),
        );
      }
    },
    onError: (err: unknown, { id }) => {
      if (err instanceof ApiError && (err.status === 409 || err.code === "INVALID_STATUS_TRANSITION")) {
        invalidateIncidentListsAndCounts(queryClient);
        void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      }
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể thẩm duyệt sự cố.",
              "Unable to review incident.",
            );
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
      void queryClient.invalidateQueries({ queryKey: incidentKeys.details() });
      toast.success(
        pickLocaleText(
          `Đã thẩm duyệt hàng loạt ${result.updatedCount}/${result.total} sự cố thành công.`,
          `Batch reviewed ${result.updatedCount}/${result.total} incidents.`,
        ),
      );
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        invalidateIncidentListsAndCounts(queryClient);
        void queryClient.invalidateQueries({ queryKey: incidentKeys.details() });
      }
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể thẩm duyệt hàng loạt sự cố.",
              "Unable to batch review incidents.",
            );
      toast.error(msg);
    },
  });
}

export function useResolveIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResolveIncidentPayload }) =>
      incidentService.resolveIncident(id, payload),
    onSuccess: (_updatedIncident, { id }) => {
      invalidateIncidentListsAndCounts(queryClient);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      toast.success(
        pickLocaleText(
          "Đã cập nhật trạng thái giải quyết sự cố thành công.",
          "Incident marked as resolved.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể giải quyết sự cố.",
              "Unable to resolve incident.",
            );
      toast.error(msg);
    },
  });
}

export function useCloseIncident(historyHref = "/incidents?scope=history") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CloseIncidentPayload }) =>
      incidentService.closeIncident(id, payload),
    onSuccess: (_updatedIncident, { id }) => {
      invalidateIncidentListsAndCounts(queryClient);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      toast.success(
        pickLocaleText(
          "Đã nghiệm thu và đóng hồ sơ sự cố thành công.",
          "Incident verified and closed.",
        ),
        { action: { label: pickLocaleText("Xem Lịch sử", "View history"), href: historyHref } },
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể đóng sự cố.", "Unable to close incident.");
      toast.error(msg);
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateIncidentPayload }) =>
      incidentService.updateIncident(id, payload),
    onSuccess: (_updatedIncident, { id }) => {
      invalidateIncidentListsAndCounts(queryClient);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      toast.success(
        pickLocaleText(
          "Đã cập nhật thông tin sự cố thành công.",
          "Incident updated successfully.",
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể cập nhật sự cố.",
              "Unable to update incident.",
            );
      toast.error(msg);
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => incidentService.deleteIncident(id),
    onSuccess: (_res, id) => {
      invalidateIncidentListsAndCounts(queryClient);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.evidences() });
      toast.success(
        pickLocaleText("Đã xóa sự cố thành công.", "Incident deleted successfully."),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText("Không thể xóa sự cố.", "Unable to delete incident.");
      toast.error(msg);
    },
  });
}
