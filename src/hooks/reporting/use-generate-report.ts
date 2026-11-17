"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type { GenerateReportDto } from "@/types";

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GenerateReportDto) => reportingService.generateReport(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportingKeys.historyAll() });
      toast.success(
        pickLocaleText(
          `Đã tạo báo cáo "${data.fileName || "Tài liệu mới"}" thành công và đang tự động tải về máy!`,
          `Report "${data.fileName || "New document"}" generated and downloading automatically!`,
        ),
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : pickLocaleText(
              "Không thể kích hoạt tiến trình tạo báo cáo.",
              "Unable to start report generation.",
            );
      toast.error(msg);
    },
  });
}
