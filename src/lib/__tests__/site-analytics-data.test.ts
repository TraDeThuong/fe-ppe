import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  HourlyRiskResponseDto,
  IncidentItem,
  ReportGenerationDto,
  StatisticsSummaryDto,
} from "@/types";
import {
  aggregateSiteAnalytics,
  aggregateSiteHourlyRisk,
  analyticsPeriod,
  analyticsPreset,
  buildSiteAnalyticsFromStatistics,
  buildSiteHourlyRiskFromStatistics,
  canAccessSiteReport,
  fetchSiteStatisticsAnalytics,
  incidentOutcome,
} from "../site-analytics-data";

const today = "2026-11-17";
const period = analyticsPeriod("2026-11-01", today, today)!;
const incident = (id: string, extra: Partial<IncidentItem> = {}): IncidentItem => ({
  id,
  siteId: "site",
  cameraId: "camera",
  status: "CONFIRMED",
  severity: "HIGH",
  violationType: "NO_HELMET",
  detectedAt: "2026-11-16T17:00:00.000Z",
  createdAt: "2026-11-16T17:00:00.000Z",
  updatedAt: "2026-11-17T04:00:00.000Z",
  ...extra,
});
const closed = (id: string, oldStatus: string, extra: Partial<IncidentItem> = {}) =>
  incident(id, {
    status: "CLOSED",
    statusHistory: [
      {
        id: `h-${id}`,
        incidentId: id,
        oldStatus,
        newStatus: "CLOSED",
        changedBy: "user",
        changedAt: "2026-11-17T04:00:00Z",
      },
    ],
    ...extra,
  });

describe("site analytics calendar", () => {
  it("counts exactly 7/30/90 inclusive days and includes all of the final Vietnam day", () => {
    for (const days of [7, 30, 90] as const) {
      const range = analyticsPreset(days, today);
      const p = analyticsPeriod(range.startDate, range.endDate, today)!;
      assert.equal(
        (Date.parse(p.endExclusive) - Date.parse(p.fromDate)) / 86_400_000,
        days,
      );
    }
    const p = analyticsPeriod(today, today, today)!;
    assert.equal(p.fromDate, "2026-11-16T17:00:00.000Z");
    assert.equal(p.toDate, "2026-11-17T16:59:59.999Z");
  });
  it("rejects blank, impossible, reversed, future dates and 91 inclusive days", () => {
    for (const [start, end] of [
      ["", today],
      ["2026-02-30", today],
      [today, "2026-11-16"],
      [today, "2026-11-18"],
      ["2026-08-19", today],
    ]) {
      assert.equal(analyticsPeriod(start, end, today), null);
    }
  });
  it("zero fills buckets and uses the ISO week year at New Year", () => {
    const p = analyticsPeriod("2020-12-31", "2021-01-04", "2021-01-04")!;
    const items = [incident("1", { detectedAt: "2021-01-03T17:00:00Z" })];
    const daily = aggregateSiteAnalytics(items, p, "DAY");
    assert.equal(daily.trends.length, 5);
    assert.equal(daily.trends[4].trueViolations, 1);
    assert.deepEqual(
      aggregateSiteAnalytics(items, p, "WEEK").trends.map((t) => [
        t.date,
        t.trueViolations,
      ]),
      [
        ["2020-W53", 0],
        ["2021-W01", 1],
      ],
    );
    assert.deepEqual(
      aggregateSiteAnalytics(items, p, "MONTH").trends.map((t) => [
        t.date,
        t.trueViolations,
      ]),
      [
        ["2020-12", 0],
        ["2021-01", 1],
      ],
    );
  });
});

describe("confirmed site analytics", () => {
  it("keeps all cards consistent and distinguishes both CLOSED branches", () => {
    const items = [
      incident("pending", { status: "PENDING_REVIEW" }),
      incident("confirmed"),
      incident("resolved", {
        status: "RESOLVED",
        resolvedAt: "2026-11-16T18:00:00.000Z",
      }),
      incident("dismissed", { status: "DISMISSED" }),
      closed("closed-r", "RESOLVED", {
        cameraId: "b",
        violationType: "MULTI_VIOLATION",
        resolvedAt: "2026-11-16T17:00:00.000Z",
      }),
      closed("closed-d", "DISMISSED"),
      incident("legacy", { status: "OTHER" }),
    ];
    const a = aggregateSiteAnalytics(items, period, "DAY");
    assert.deepEqual(
      [a.pending, a.confirmed, a.resolved, a.dismissed, a.unknown],
      [1, 1, 2, 2, 1],
    );
    assert.equal(a.trueViolations, 3);
    assert.equal(
      a.distribution.reduce((sum, row) => sum + row.count, 0),
      3,
    );
    assert.equal(
      a.trends.reduce((sum, row) => sum + row.trueViolations, 0),
      3,
    );
    assert.equal(
      a.cameras.reduce((sum, row) => sum + row.totalViolations, 0),
      3,
    );
    assert.equal(aggregateSiteHourlyRisk(items).total, 3);
    assert.equal(a.falseAlarmRate, 40);
    assert.equal(a.mttrMinutes, 30);
    assert.equal(a.resolutionSamples, 2);
    assert.equal(
      a.severityRows.find((r) => r.key === "HIGH")!.actualMttrMinutes,
      30,
    );
    assert.equal(
      a.distribution.find((row) => row.type === "MULTI_VIOLATION")!.count,
      1,
    );
    assert.equal(a.cameras[0].resolvedCount / a.cameras[0].totalViolations, 0.5);
  });
  it("does not substitute updatedAt for missing or invalid resolution timestamps", () => {
    const a = aggregateSiteAnalytics(
      [
        incident("1", { status: "RESOLVED" }),
        incident("2", { status: "RESOLVED", resolvedAt: "bad" }),
        incident("3", { status: "RESOLVED", resolvedAt: "2026-11-15T00:00:00Z" }),
      ],
      period,
      "DAY",
    );
    assert.equal(a.resolved, 3);
    assert.equal(a.mttrMinutes, null);
    assert.equal(a.resolutionSamples, 0);
  });
  it("keeps unavailable rates null, includes unknown types, sorts camera ties by ID", () => {
    const empty = aggregateSiteAnalytics([], period, "DAY");
    assert.equal(empty.confirmedRate, null);
    assert.equal(empty.falseAlarmRate, null);
    assert.equal(empty.mttrMinutes, null);
    const a = aggregateSiteAnalytics(
      [
        incident("1", { cameraId: "b", violationType: "LEGACY" }),
        incident("2", { cameraId: "a" }),
      ],
      period,
      "DAY",
    );
    assert.deepEqual(
      a.cameras.map((c) => c.cameraId),
      ["a", "b"],
    );
    assert.equal(a.distribution.find((r) => r.type === "OTHER")!.count, 1);
    assert.equal(
      aggregateSiteAnalytics(
        [incident("pending", { status: "PENDING_REVIEW" })],
        period,
        "DAY",
      ).falseAlarmRate,
      null,
    );
  });
  it("requires a dated closure transition and picks the latest transition", () => {
    assert.equal(
      incidentOutcome(
        closed("1", "DISMISSED", { resolvedAt: "2026-11-17T04:00:00Z" }),
      ),
      "dismissed",
    );
    assert.equal(incidentOutcome(closed("2", "CONFIRMED")), "unknown");
    // Không có lịch sử: dựa vào resolvedAt (BE chỉ ghi khi xử lý xong).
    assert.equal(incidentOutcome(incident("3", { status: "CLOSED" })), "dismissed");
    assert.equal(
      incidentOutcome(incident("4", { status: "CLOSED", resolvedAt: "2026-11-17T04:00:00Z" })),
      "resolved",
    );
  });
  it("partitions 00/06/14/22 exactly once and breaks peak ties deterministically", () => {
    const items = ["00", "06", "14", "22"].map((hour) =>
      incident(hour, {
        detectedAt: `2026-11-17T${hour}:00:00+07:00`,
        severity: "LOW",
      }),
    );
    const risk = aggregateSiteHourlyRisk(items);
    assert.deepEqual(
      Object.values(risk.shifts).map((s) => s.totalIncidents),
      [1, 1, 2],
    );
    assert.equal(
      risk.hourly.reduce((n, h) => n + h.count, 0),
      4,
    );
    assert.equal(risk.peakHour, 0);
    assert.equal(risk.peakShift, "night");
    assert.equal(risk.shifts.night.riskLevel, "MEDIUM");
    assert.equal(aggregateSiteHourlyRisk(items.slice(1, 3)).peakShift, "morning");
    assert.equal(aggregateSiteHourlyRisk([]).peakHour, null);
    assert.equal(aggregateSiteHourlyRisk([]).peakShift, null);
  });
  it("retains severity and count based risk thresholds", () => {
    const risk = aggregateSiteHourlyRisk([
      incident("1"),
      incident("2"),
      incident("3"),
    ]);
    assert.equal(risk.hourly[0].riskLevel, "HIGH");
    assert.equal(risk.shifts.night.riskLevel, "CRITICAL");
  });
  it("clusters same-person multi-violation records into 1 MULTI_VIOLATION case in site analytics and hourly risk", () => {
    const mk = (id: string, violationType: string, detectedAt: string) =>
      incident(id, {
        cameraId: "cam-a",
        violationType,
        status: "CONFIRMED",
        detectedAt,
        evidences: [
          {
            id: `ev-${id}`,
            incidentId: id,
            cameraId: "cam-a",
            evidenceType: "SNAPSHOT",
            storageKey: `evidences/site/CAM-A/frame_track5_${id}.jpg`,
            fileName: `frame_track5_${id}.jpg`,
            mimeType: "image/jpeg",
            fileSize: 512,
            capturedAt: detectedAt,
            createdAt: detectedAt,
          },
        ],
      });
    const pair = [
      mk("p1", "NO_HELMET", "2026-11-16T17:00:00.000Z"),
      mk("p2", "NO_VEST", "2026-11-16T17:00:04.000Z"),
    ];
    const clustered = aggregateSiteAnalytics(pair, period, "DAY");
    assert.equal(clustered.totalIncidents, 1);
    assert.equal(clustered.rawTotalIncidents, 2);
    assert.equal(
      clustered.distribution.find((d) => d.type === "MULTI_VIOLATION")?.count,
      1,
    );
    assert.equal(aggregateSiteHourlyRisk(pair).total, 1);

    const raw = aggregateSiteAnalytics(pair, period, "DAY", { mode: "raw" });
    assert.equal(raw.totalIncidents, 2);
    assert.equal(aggregateSiteHourlyRisk(pair, { mode: "raw" }).total, 2);
  });
});

describe("statistics API site analytics (no N+1 incident detail storm)", () => {
  it("fetches site analytics via 4 /statistics/* endpoints and zero-fills trend buckets", async () => {
    let summaryCalls = 0;
    let trendsCalls = 0;
    let distCalls = 0;
    let camCalls = 0;

    const summary: StatisticsSummaryDto = {
      totalIncidents: 500,
      openIncidents: 50,
      resolvedIncidents: 300,
      trueViolations: 100,
      falseAlarms: 50,
      falseAlarmRate: 11.11,
      complianceRate: 80,
      meanTimeToResolveHours: 0.5,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      severityBreakdown: {
        CRITICAL: { count: 100, resolved: 80, targetSlaMinutes: 15, actualMttrMinutes: 20 },
        HIGH: { count: 200, resolved: 120, targetSlaMinutes: 30, actualMttrMinutes: 35 },
        MEDIUM: { count: 100, resolved: 100, targetSlaMinutes: 60, actualMttrMinutes: 30 },
        LOW: { count: 100, resolved: 0, targetSlaMinutes: 120, actualMttrMinutes: 0 },
      },
    };

    const result = await fetchSiteStatisticsAnalytics({
      siteId: "site-1",
      period,
      groupBy: "DAY",
      deps: {
        getSummary: async () => {
          summaryCalls += 1;
          return summary;
        },
        getTrends: async () => {
          trendsCalls += 1;
          return [
            {
              date: "2026-11-17",
              totalIncidents: 500,
              trueViolations: 400,
              falseAlarms: 50,
              resolvedCount: 300,
            },
          ];
        },
        getViolationDistribution: async () => {
          distCalls += 1;
          return [
            {
              violationType: "NO_HELMET",
              count: 250,
              percentage: 62.5,
              severityBreakdown: { LOW: 0, MEDIUM: 50, HIGH: 100, CRITICAL: 100 },
            },
            {
              violationType: "NO_VEST",
              count: 150,
              percentage: 37.5,
              severityBreakdown: { LOW: 0, MEDIUM: 50, HIGH: 100, CRITICAL: 0 },
            },
          ];
        },
        getCameraRankings: async () => {
          camCalls += 1;
          return [
            {
              cameraId: "cam-2",
              totalViolations: 250,
              confirmedCount: 200,
              falseAlarmCount: 20,
              resolvedCount: 180,
            },
            {
              cameraId: "cam-1",
              totalViolations: 250,
              confirmedCount: 200,
              falseAlarmCount: 30,
              resolvedCount: 120,
            },
          ];
        },
      },
    });

    assert.equal(summaryCalls, 1);
    assert.equal(trendsCalls, 1);
    assert.equal(distCalls, 1);
    assert.equal(camCalls, 1);
    assert.equal(result.totalIncidents, 500);
    assert.equal(result.pending, 50);
    assert.equal(result.confirmed, 100);
    assert.equal(result.resolved, 300);
    assert.equal(result.dismissed, 50);
    assert.equal(result.trueViolations, 400);
    assert.equal(result.trends.length, 17);
    assert.equal(result.cameras[0].cameraId, "cam-1");
    assert.equal(result.distribution.length, 2);
  });

  it("maps hourly risk response and clears peakHour/peakShift when total is 0", () => {
    const emptyRisk = buildSiteHourlyRiskFromStatistics(null);
    assert.equal(emptyRisk.total, 0);
    assert.equal(emptyRisk.peakHour, null);
    assert.equal(emptyRisk.peakShift, null);
    assert.equal(emptyRisk.hourly.length, 24);

    const dto: HourlyRiskResponseDto = {
      date: today,
      siteId: "site-1",
      hourly: emptyRisk.hourly.map((h) =>
        h.hour === 14 ? { ...h, count: 5, riskLevel: "HIGH" } : h,
      ),
      shifts: {
        morning: {
          name: "Ca Sáng",
          timeRange: "06:00 - 14:00",
          totalIncidents: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          riskLevel: "LOW",
        },
        afternoon: {
          name: "Ca Chiều",
          timeRange: "14:00 - 22:00",
          totalIncidents: 5,
          criticalCount: 0,
          highCount: 2,
          mediumCount: 3,
          lowCount: 0,
          riskLevel: "HIGH",
        },
        night: {
          name: "Ca Đêm",
          timeRange: "22:00 - 06:00",
          totalIncidents: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          riskLevel: "LOW",
        },
      },
      summary: {
        totalIncidents: 5,
        peakHour: 14,
        peakShift: "AFTERNOON",
        riskLevel: "HIGH",
      },
    };

    const populated = buildSiteHourlyRiskFromStatistics(dto);
    assert.equal(populated.total, 5);
    assert.equal(populated.peakHour, 14);
    assert.equal(populated.peakShift, "afternoon");
  });
});

describe("report file access", () => {
  const report = {
    siteId: "site",
    status: "COMPLETED",
    generatedBy: "author",
  } as ReportGenerationDto;
  it("requires export permission, correct site, completed status and ADMIN or author", () => {
    assert.equal(
      canAccessSiteReport(report, { id: "author", role: "USER" }, true, "site"),
      true,
    );
    assert.equal(
      canAccessSiteReport(report, { id: "admin", role: "ADMIN" }, true, "site"),
      true,
    );
    assert.equal(
      canAccessSiteReport(report, { id: "author", role: "USER" }, false, "site"),
      false,
    );
    assert.equal(
      canAccessSiteReport(report, { id: "author", role: "USER" }, true, "other"),
      false,
    );
    assert.equal(canAccessSiteReport(report, null, true, "site"), false);
    assert.equal(
      canAccessSiteReport(
        report,
        { id: "other", role: "SUPER_ADMIN" },
        true,
        "site",
      ),
      false,
    );
    assert.equal(
      canAccessSiteReport(
        { ...report, generatedBy: "" },
        { id: "author", role: "USER" },
        true,
        "site",
      ),
      false,
    );
    assert.equal(
      canAccessSiteReport(
        { ...report, status: "FAILED" },
        { id: "admin", role: "ADMIN" },
        true,
        "site",
      ),
      false,
    );
  });
});
