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
    assert.equal(
      isUsableReportingSummary(makeSummary({ totalIncidents: 0, complianceRate: 0 })),
      false,
    );
    assert.equal(
      isUsableReportingSummary(makeSummary({ totalIncidents: 0, complianceRate: 100 })),
      true,
    );
    assert.equal(
      isUsableReportingSummary(makeSummary({ totalIncidents: 5, complianceRate: 0 })),
      true,
    );
  });

  it("prefers authoritative reporting summary over live incident counts to avoid formula drift", () => {
    const reportingSummary = makeSummary({
      totalIncidents: 100,
      trueViolations: 20,
      complianceRate: 80,
    });
    const reconciled = reconcileSingleSiteCompliance(reportingSummary, {
      total: 100,
      confirmed: 15,
    });
    assert.deepEqual(reconciled, { totalIncidents: 100, trueViolations: 20 });
  });

  it("falls back to live status counts when reporting summary is unavailable", () => {
    assert.deepEqual(
      reconcileSingleSiteCompliance(makeSummary(), {
        total: 20,
        confirmed: 4,
      }),
      {
        totalIncidents: 20,
        trueViolations: 4,
      },
    );
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

  it("uses 1 single summary request across multiple sites (no 3N loop)", async () => {
    const reportingCalls: Array<string | undefined> = [];
    let liveCalls = 0;

    const result = await fetchSiteComplianceSummary(
      ["site-1", "site-2", "site-3", "site-4", "site-5"],
      {
        canReadReporting: true,
        canReadIncidents: true,
        fetchReportingSummary: async (siteId) => {
          reportingCalls.push(siteId);
          return makeSummary({
            totalIncidents: 200,
            trueViolations: 30,
            complianceRate: 85,
          });
        },
        fetchLiveCounts: async () => {
          liveCalls += 1;
          return { total: 200, confirmed: 30 };
        },
      },
    );

    assert.equal(reportingCalls.length, 1);
    assert.equal(reportingCalls[0], undefined);
    assert.equal(liveCalls, 0);
    assert.deepEqual(result, {
      complianceRate: 85,
      totalIncidents: 200,
      trueViolations: 30,
    });
  });

  it("scopes to siteId when a single site is queried and falls back to 1 live status-counts request on error", async () => {
    const reportingCalls: Array<string | undefined> = [];
    const liveCalls: Array<string | undefined> = [];

    const result = await fetchSiteComplianceSummary(["site-1"], {
      canReadReporting: true,
      canReadIncidents: true,
      fetchReportingSummary: async (siteId) => {
        reportingCalls.push(siteId);
        throw new Error("Reporting service error");
      },
      fetchLiveCounts: async (siteId) => {
        liveCalls.push(siteId);
        return { total: 224, confirmed: 110 };
      },
    });

    assert.deepEqual(reportingCalls, ["site-1"]);
    assert.deepEqual(liveCalls, ["site-1"]);
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
