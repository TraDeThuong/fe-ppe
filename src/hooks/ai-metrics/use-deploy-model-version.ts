"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/axios";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { reportingKeys } from "@/hooks/reporting/reporting.query-keys";
import { aiMetricsKeys } from "./ai-metrics.query-keys";

import type {
  CreateAiModelDto,
  CreateAiModelVersionDto,
  RecordAiPerformanceDto,
} from "@/types";

function formatVersionLabel(version: string): string {
  const clean = version.trim().replace(/^v/i, "");
  return clean ? `v${clean}` : version;
}

function formatMutationError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && Array.isArray(err.errors) && err.errors.length > 0) {
    const details = err.errors
      .map((item) => (item.field ? `${item.field}: ${item.message}` : item.message))
      .filter(Boolean)
      .join(" • ");
    if (details) return details;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function useDeployModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelId, versionId }: { modelId: string; versionId: string }) =>
      aiMetricsService.deployModelVersion(modelId, versionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiMetricsKeys.all });
      queryClient.invalidateQueries({ queryKey: reportingKeys.dashboardKpi() });
      const versionLabel = formatVersionLabel(data.version);
      toast.success(
        pickLocaleText(
          `Đã kích hoạt chuyển đổi nóng phiên bản ${versionLabel} vào môi trường giám sát thành công!`,
          `Hot-swapped model version ${versionLabel} into production monitoring!`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg = formatMutationError(
        err,
        pickLocaleText(
          "Triển khai phiên bản mô hình thất bại. Hệ thống đã giữ nguyên mô hình an toàn trước đó.",
          "Model deployment failed. The previous safe model version remains active.",
        ),
      );
      toast.error(msg);
    },
  });
}

export function useCreateAiModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAiModelDto) => aiMetricsService.createAiModel(dto),
    onSuccess: (model) => {
      void queryClient.invalidateQueries({ queryKey: aiMetricsKeys.all });
      toast.success(
        pickLocaleText(
          `Đã đăng ký mô hình AI "${model.name}" thành công.`,
          `Registered AI model "${model.name}".`,
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        formatMutationError(
          err,
          pickLocaleText("Đăng ký mô hình AI thất bại.", "Failed to register AI model"),
        ),
      );
    },
  });
}

export function useCreateAiModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      modelId,
      dto,
    }: {
      modelId: string;
      dto: CreateAiModelVersionDto;
    }) => aiMetricsService.createAiModelVersion(modelId, dto),
    onSuccess: (ver) => {
      void queryClient.invalidateQueries({ queryKey: aiMetricsKeys.all });
      const versionLabel = formatVersionLabel(ver.version);
      toast.success(
        pickLocaleText(
          `Đã thêm phiên bản ${versionLabel} thành công.`,
          `Registered model version ${versionLabel}.`,
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        formatMutationError(
          err,
          pickLocaleText("Thêm phiên bản mô hình thất bại.", "Failed to create model version"),
        ),
      );
    },
  });
}

export function useRecordAiPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RecordAiPerformanceDto) =>
      aiMetricsService.recordAiPerformance(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiMetricsKeys.all });
      toast.success(
        pickLocaleText(
          "Đã ghi nhận telemetry hiệu năng AI vào Reporting DB.",
          "Recorded AI performance telemetry.",
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        formatMutationError(
          err,
          pickLocaleText("Ghi nhận telemetry hiệu năng AI thất bại.", "Failed to record AI telemetry"),
        ),
      );
    },
  });
}
