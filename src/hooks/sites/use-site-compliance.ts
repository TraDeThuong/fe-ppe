"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { incidentService } from "@/services/incident.service";
import { reportingService } from "@/services/reporting.service";
import {
  fetchSiteComplianceSummary,
  type SiteComplianceSummary,
} from "./site-compliance.helper";
import { siteKeys } from "./site.query-keys";

export type { SiteComplianceSummary };

export interface UseSiteComplianceSummaryOptions {
  enabled?: boolean;
  canReadReporting?: boolean;
  canReadIncidents?: boolean;
}

/**
 * Tính tỷ lệ tuân thủ an toàn trung bình bằng 1 request tổng hợp từ reporting-service
 * (scope theo siteId nếu xem chi tiết 1 công trường, hoặc tổng hợp toàn phạm vi được phép trên /sites).
 * Không lặp 3 * N requests theo danh sách siteIds.
 */
export function useSiteComplianceSummary(
  siteIds: string[],
  options?: UseSiteComplianceSummaryOptions,
) {
  const canReadReporting = options?.canReadReporting ?? true;
  const canReadIncidents = options?.canReadIncidents ?? true;

  const normalizedSiteIds = useMemo(
    () => [...new Set(siteIds.filter(Boolean))].sort(),
    [siteIds],
  );

  const scopeKey = useMemo(
    () =>
      normalizedSiteIds.length === 1
        ? [normalizedSiteIds[0]]
        : normalizedSiteIds.length > 1
          ? ["all"]
          : [],
    [normalizedSiteIds],
  );

  const isEnabled =
    (options?.enabled ?? true) &&
    normalizedSiteIds.length > 0 &&
    (canReadReporting || canReadIncidents);

  return useQuery<SiteComplianceSummary | null>({
    queryKey: [
      ...siteKeys.complianceSummary(scopeKey),
      canReadReporting,
      canReadIncidents,
    ],
    enabled: isEnabled,
    staleTime: 30 * 1000,
    queryFn: ({ signal }) =>
      fetchSiteComplianceSummary(normalizedSiteIds, {
        canReadReporting,
        canReadIncidents,
        fetchReportingSummary: (siteId) =>
          reportingService.getSummary(
            siteId ? { siteId } : undefined,
            { signal, suppressToast: true },
          ),
        fetchLiveCounts: (siteId) =>
          incidentService.getStatusCounts(
            siteId ? { siteId } : undefined,
            { signal, suppressToast: true },
          ),
      }),
  });
}
