"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";

import type {
  CreateAiModelDto,
  CreateAiModelVersionDto,
  RecordAiPerformanceDto,
} from "@/types";

export function useDeployModelVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelId, versionId }: { modelId: string; versionId: string }) =>
      aiMetricsService.deployModelVersion(modelId, versionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiMetricsKeys.all });
      toast.success(
        pickLocaleText(
          `Đã kích hoạt chuyển đổi nóng phiên bản ${data.version} vào môi trường giám sát thành công!`,
          `Hot-swapped model version ${data.version} into production monitoring!`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Triển khai phiên bản mô hình thất bại. Hệ thống đã giữ nguyên mô hình an toàn trước đó.",
              "Model deployment failed. The previous safe model version remains active.",
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
      toast.error(err instanceof Error ? err.message : "Failed to register AI model");
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
      toast.success(
        pickLocaleText(
          `Đã thêm phiên bản v${ver.version} thành công.`,
          `Registered model version v${ver.version}.`,
        ),
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create model version");
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
      toast.error(err instanceof Error ? err.message : "Failed to record AI telemetry");
    },
  });
}
