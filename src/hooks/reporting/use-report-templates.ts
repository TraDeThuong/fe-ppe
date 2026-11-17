"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type {
  AggregateDailyPayload,
  CreateReportTemplateDto,
  ReportTemplateDto,
} from "@/types";

export function useReportTemplates(options?: { enabled?: boolean }) {
  return useQuery<ReportTemplateDto[]>({
    queryKey: reportingKeys.templates(),
    queryFn: () => reportingService.getTemplates(),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useReportTemplateDetail(id: string, enabled = true) {
  return useQuery<ReportTemplateDto>({
    queryKey: reportingKeys.template(id),
    queryFn: () => reportingService.getTemplateById(id),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateReportTemplateDto) =>
      reportingService.createTemplate(dto),
    onSuccess: (tpl) => {
      void queryClient.invalidateQueries({ queryKey: reportingKeys.templates() });
      toast.success(
        pickLocaleText(
          `Đã tạo mẫu báo cáo "${tpl.name}" thành công.`,
          `Report template "${tpl.name}" created.`,
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
    },
  });
}

export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reportingService.deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportingKeys.templates() });
      toast.success(
        pickLocaleText(
          "Đã xóa mẫu báo cáo thành công.",
          "Report template deleted.",
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    },
  });
}

export function useAggregateDaily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AggregateDailyPayload) =>
      reportingService.aggregateDaily(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportingKeys.all });
      toast.success(
        pickLocaleText(
          "Đã tổng hợp lại dữ liệu thống kê ngày thành công.",
          "Daily statistics aggregated successfully.",
        ),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to aggregate daily stats");
    },
  });
}
