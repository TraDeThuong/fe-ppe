"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { aiMetricsService } from "@/services/ai-metrics.service";
import { aiMetricsKeys } from "./ai-metrics.query-keys";

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
