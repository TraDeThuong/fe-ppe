"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
        `Đã kích hoạt chuyển đổi nóng phiên bản ${data.version} vào môi trường giám sát thành công!`
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Triển khai phiên bản mô hình thất bại. Hệ thống đã giữ nguyên mô hình an toàn trước đó.";
      toast.error(msg);
    },
  });
}
