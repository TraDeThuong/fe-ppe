import type { StatisticsSummaryDto } from "@/types";

export interface SiteComplianceSummary {
  complianceRate: number;
  totalIncidents: number;
  trueViolations: number;
}

export interface LiveIncidentCounts {
  total: number;
  confirmed: number;
}

export interface SiteComplianceCounts {
  totalIncidents: number;
  trueViolations: number;
}

/**
 * Tính tỷ lệ tuân thủ an toàn tuyến tính (0 - 100%) đồng bộ với công thức BE:
 * 100 - (trueViolations / totalIncidents) * 100, mặc định 100% khi chưa có sự cố.
 */
export function computeComplianceRate(
  totalIncidents: number,
  trueViolations: number,
): number {
  if (totalIncidents <= 0) return 100;
  return Number(
    Math.max(0, 100 - (trueViolations / totalIncidents) * 100).toFixed(2),
  );
}

/**
 * Phân biệt response hợp lệ từ /statistics/summary với EMPTY_SUMMARY fallback khi lỗi:
 * BE luôn trả complianceRate = 100 khi totalIncidents === 0, còn EMPTY_SUMMARY trả 0.
 */
export function isUsableReportingSummary(
  summary: StatisticsSummaryDto | null | undefined,
): summary is StatisticsSummaryDto {
  return Boolean(
    summary && (summary.totalIncidents > 0 || summary.complianceRate === 100),
  );
}

/**
 * Đối chiếu số liệu của 1 công trường: ưu tiên đếm trực tiếp từ incident-service
 * để tránh dính bản ghi tổng hợp cũ/sai trong incident_statistics; fallback về
 * reporting summary nếu không truy cập được incident-service.
 */
export function reconcileSingleSiteCompliance(
  reportingSummary: StatisticsSummaryDto | null | undefined,
  liveCounts: LiveIncidentCounts | null | undefined,
): SiteComplianceCounts | null {
  if (liveCounts) {
    return {
      totalIncidents: Math.max(0, liveCounts.total),
      trueViolations: Math.max(0, liveCounts.confirmed),
    };
  }

  if (isUsableReportingSummary(reportingSummary)) {
    return {
      totalIncidents: Math.max(0, reportingSummary.totalIncidents),
      trueViolations: Math.max(0, reportingSummary.trueViolations),
    };
  }

  return null;
}

export function aggregateSitesCompliance(
  siteMetrics: Array<SiteComplianceCounts | null>,
): SiteComplianceSummary | null {
  const valid = siteMetrics.filter(
    (item): item is SiteComplianceCounts => item !== null,
  );
  if (valid.length === 0) return null;

  const totalIncidents = valid.reduce((sum, item) => sum + item.totalIncidents, 0);
  const trueViolations = valid.reduce((sum, item) => sum + item.trueViolations, 0);

  return {
    complianceRate: computeComplianceRate(totalIncidents, trueViolations),
    totalIncidents,
    trueViolations,
  };
}

export async function fetchSiteComplianceSummary(
  siteIds: string[],
  deps: {
    canReadReporting: boolean;
    canReadIncidents: boolean;
    fetchReportingSummary: (siteId: string) => Promise<StatisticsSummaryDto | null>;
    fetchLiveCounts: (siteId: string) => Promise<LiveIncidentCounts | null>;
  },
): Promise<SiteComplianceSummary | null> {
  if (siteIds.length === 0) return null;
  if (!deps.canReadReporting && !deps.canReadIncidents) return null;

  const perSiteResults = await Promise.all(
    siteIds.map(async (id) => {
      const [liveResult, summaryResult] = await Promise.allSettled([
        deps.canReadIncidents ? deps.fetchLiveCounts(id) : Promise.resolve(null),
        deps.canReadReporting
          ? deps.fetchReportingSummary(id)
          : Promise.resolve(null),
      ]);

      const liveCounts =
        liveResult.status === "fulfilled" ? liveResult.value : null;
      const reportingSummary =
        summaryResult.status === "fulfilled" ? summaryResult.value : null;

      return reconcileSingleSiteCompliance(reportingSummary, liveCounts);
    }),
  );

  return aggregateSitesCompliance(perSiteResults);
}
