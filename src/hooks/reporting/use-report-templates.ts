"use client";

import { useQuery } from "@tanstack/react-query";
import { reportingService } from "@/services/reporting.service";
import { reportingKeys } from "./reporting.query-keys";
import type { ReportTemplateDto } from "@/types";

export function useReportTemplates() {
  return useQuery<ReportTemplateDto[]>({
    queryKey: reportingKeys.templates(),
    queryFn: () => reportingService.getTemplates(),
    staleTime: 60 * 1000,
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
