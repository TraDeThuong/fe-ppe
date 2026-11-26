import type { IncidentStatusCounts, StatisticsSummaryDto } from "@/types";

export interface SiteComplianceSummary {
  complianceRate: number;
  totalIncidents: number;
  trueViolations: number;
}

export interface LiveIncidentCounts {
  total: number;
  confirmed: number;
  resolved?: number;
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
 * Chuẩn hóa số liệu tuân thủ từ reporting-service (ưu tiên số liệu chính thức của BE)
 * hoặc fallback sang bộ đếm status-counts từ incident-service khi reporting-service không khả dụng.
 */
export function reconcileSingleSiteCompliance(
  reportingSummary: StatisticsSummaryDto | null | undefined,
  liveCounts?: LiveIncidentCounts | IncidentStatusCounts | null,
): SiteComplianceCounts | null {
  if (isUsableReportingSummary(reportingSummary)) {
    return {
      totalIncidents: Math.max(0, reportingSummary.totalIncidents),
      trueViolations: Math.max(0, reportingSummary.trueViolations),
    };
  }

  if (liveCounts) {
    const total = Math.max(0, liveCounts.total);
    const confirmed = Math.max(0, liveCounts.confirmed);
    return {
      totalIncidents: total,
      trueViolations: Math.min(total, confirmed),
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

/**
 * Lấy số liệu tuân thủ an toàn bằng 1 request tổng hợp từ reporting-service
 * (hoặc 1 request status-counts từ incident-service khi thiếu quyền reporting),
 * loại bỏ hoàn toàn vòng lặp 3 * N requests theo từng siteId.
 */
export async function fetchSiteComplianceSummary(
  siteIds: string[],
  deps: {
    canReadReporting: boolean;
    canReadIncidents: boolean;
    fetchReportingSummary: (
      siteId?: string,
    ) => Promise<StatisticsSummaryDto | null>;
    fetchLiveCounts?: (
      siteId?: string,
    ) => Promise<LiveIncidentCounts | IncidentStatusCounts | null>;
  },
): Promise<SiteComplianceSummary | null> {
  if (siteIds.length === 0) return null;
  if (!deps.canReadReporting && !deps.canReadIncidents) return null;

  const targetSiteId = siteIds.length === 1 ? siteIds[0] : undefined;

  if (deps.canReadReporting) {
    try {
      const reportingSummary = await deps.fetchReportingSummary(targetSiteId);
      if (isUsableReportingSummary(reportingSummary)) {
        const totalIncidents = Math.max(0, reportingSummary.totalIncidents);
        const trueViolations = Math.max(0, reportingSummary.trueViolations);
        const complianceRate =
          typeof reportingSummary.complianceRate === "number" &&
          Number.isFinite(reportingSummary.complianceRate)
            ? Number(reportingSummary.complianceRate.toFixed(2))
            : computeComplianceRate(totalIncidents, trueViolations);
        return {
          complianceRate,
          totalIncidents,
          trueViolations,
        };
      }
    } catch {
      // Fallback sang 1 request status-counts nếu có quyền đọc incident
    }
  }

  if (deps.canReadIncidents && deps.fetchLiveCounts) {
    try {
      const liveCounts = await deps.fetchLiveCounts(targetSiteId);
      const reconciled = reconcileSingleSiteCompliance(null, liveCounts);
      if (reconciled) {
        return {
          complianceRate: computeComplianceRate(
            reconciled.totalIncidents,
            reconciled.trueViolations,
          ),
          totalIncidents: reconciled.totalIncidents,
          trueViolations: reconciled.trueViolations,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}
