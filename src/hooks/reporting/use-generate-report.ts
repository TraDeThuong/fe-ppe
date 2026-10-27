"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type { GenerateReportDto } from "@/types";

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: GenerateReportDto) => reportingService.generateReport(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportingKeys.history() });
      toast.success(
        `Đã kích hoạt tạo báo cáo "${data.fileName || "Tài liệu mới"}". Vui lòng kiểm tra hàng đợi xuất file!`
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Không thể kích hoạt tiến trình tạo báo cáo.";
      toast.error(msg);
    },
  });
}
