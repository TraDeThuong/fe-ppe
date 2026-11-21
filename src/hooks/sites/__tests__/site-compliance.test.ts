import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateSitesCompliance,
  computeComplianceRate,
  fetchSiteComplianceSummary,
  isUsableReportingSummary,
  reconcileSingleSiteCompliance,
} from "../site-compliance.helper";
import type { StatisticsSummaryDto } from "@/types";

function makeSummary(
  overrides: Partial<StatisticsSummaryDto> = {},
): StatisticsSummaryDto {
  return {
    totalIncidents: 0,
    openIncidents: 0,
    resolvedIncidents: 0,
    trueViolations: 0,
    falseAlarms: 0,
    falseAlarmRate: 0,
    complianceRate: 0,
    meanTimeToResolveHours: 0,
    periodStart: "",
    periodEnd: "",
    ...overrides,
  };
}

describe("site-compliance.helper", () => {
  it("computes complianceRate linearly and defaults to 100 when totalIncidents is 0", () => {
    assert.equal(computeComplianceRate(0, 0), 100);
    assert.equal(computeComplianceRate(224, 110), 50.89);
    assert.equal(computeComplianceRate(6, 6), 0);
  });

  it("distinguishes valid empty reporting summary (100%) from error EMPTY_SUMMARY (0%)", () => {
    assert.equal(isUsableReportingSummary(makeSummary({ totalIncidents: 0, complianceRate: 0 })), false);
    assert.equal(isUsableReportingSummary(makeSummary({ totalIncidents: 0, complianceRate: 100 })), true);
    assert.equal(isUsableReportingSummary(makeSummary({ totalIncidents: 5, complianceRate: 0 })), true);
  });

  it("prefers live incident counts over stale reporting rollup rows", () => {
    const staleSummary = makeSummary({ totalIncidents: 6, trueViolations: 6, complianceRate: 0 });
    const reconciled = reconcileSingleSiteCompliance(staleSummary, {
      total: 224,
      confirmed: 110,
    });
    assert.deepEqual(reconciled, { totalIncidents: 224, trueViolations: 110 });
  });

  it("falls back to usable reporting summary when live counts are unavailable", () => {
    const validSummary = makeSummary({ totalIncidents: 20, trueViolations: 4, complianceRate: 80 });
    assert.deepEqual(reconcileSingleSiteCompliance(validSummary, null), {
      totalIncidents: 20,
      trueViolations: 4,
    });
    assert.equal(reconcileSingleSiteCompliance(makeSummary(), null), null);
  });

  it("aggregates across active sites and ignores null entries", () => {
    const aggregated = aggregateSitesCompliance([
      { totalIncidents: 224, trueViolations: 110 },
      null,
      { totalIncidents: 76, trueViolations: 10 },
    ]);
    assert.deepEqual(aggregated, {
      complianceRate: 60,
      totalIncidents: 300,
      trueViolations: 120,
    });
    assert.equal(aggregateSitesCompliance([null]), null);
  });

  it("fetches scoped site compliance and degrades gracefully when one service fails", async () => {
    const queriedSites: string[] = [];
    const result = await fetchSiteComplianceSummary(["site-1", "site-2"], {
      canReadReporting: true,
      canReadIncidents: true,
      fetchReportingSummary: async (siteId) => {
        queriedSites.push(siteId);
        // Simulate stale rollup returning 0% on site-1 and error on site-2
        if (siteId === "site-1") {
          return makeSummary({ totalIncidents: 6, trueViolations: 6, complianceRate: 0 });
        }
        throw new Error("Reporting service error");
      },
      fetchLiveCounts: async (siteId) => {
        if (siteId === "site-1") return { total: 224, confirmed: 110 };
        return { total: 0, confirmed: 0 };
      },
    });

    assert.deepEqual(queriedSites, ["site-1", "site-2"]);
    assert.deepEqual(result, {
      complianceRate: 50.89,
      totalIncidents: 224,
      trueViolations: 110,
    });
  });

  it("returns null when siteIds is empty or user has neither reporting nor incident permission", async () => {
    assert.equal(
      await fetchSiteComplianceSummary([], {
        canReadReporting: true,
        canReadIncidents: true,
        fetchReportingSummary: async () => null,
        fetchLiveCounts: async () => null,
      }),
      null,
    );
    assert.equal(
      await fetchSiteComplianceSummary(["site-1"], {
        canReadReporting: false,
        canReadIncidents: false,
        fetchReportingSummary: async () => null,
        fetchLiveCounts: async () => null,
      }),
      null,
    );
  });
});
