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
 * Tính tỷ lệ tuân thủ an toàn trung bình theo danh sách công trường đang hoạt động.
 * Luôn scope theo từng siteId để loại trừ các bản ghi thống kê cũ của site đã xóa,
 * đồng thời đối chiếu dữ liệu live từ incident-service.
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

  const isEnabled =
    (options?.enabled ?? true) &&
    normalizedSiteIds.length > 0 &&
    (canReadReporting || canReadIncidents);

  return useQuery<SiteComplianceSummary | null>({
    queryKey: [
      ...siteKeys.complianceSummary(normalizedSiteIds),
      canReadReporting,
      canReadIncidents,
    ],
    enabled: isEnabled,
    staleTime: 30 * 1000,
    queryFn: ({ signal }) =>
      fetchSiteComplianceSummary(normalizedSiteIds, {
        canReadReporting,
        canReadIncidents,
        fetchReportingSummary: (id) =>
          reportingService.getSummary(
            { siteId: id },
            { signal, suppressToast: true },
          ),
        fetchLiveCounts: async (id) => {
          const [totalPage, confirmedPage] = await Promise.all([
            incidentService.getIncidents(
              { siteId: id, page: 1, limit: 1 },
              { signal, suppressToast: true },
            ),
            incidentService.getIncidents(
              { siteId: id, status: "CONFIRMED", page: 1, limit: 1 },
              { signal, suppressToast: true },
            ),
          ]);
          return {
            total: totalPage.meta?.total ?? totalPage.items.length,
            confirmed: confirmedPage.meta?.total ?? confirmedPage.items.length,
          };
        },
      }),
  });
}
