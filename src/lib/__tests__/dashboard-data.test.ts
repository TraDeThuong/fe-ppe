import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateDashboard,
  buildDashboardAnalyticsFromReporting,
  collectDashboardPages,
  dashboardIncidentHref,
  dashboardPeriod,
  incidentInPeriod,
  normalizeDashboardTrends,
  pageTotal,
  partitionDashboardCameras,
  resolveDashboardTrendsWindow,
  summarizeAiPerformanceTelemetry,
  vietnamToday,
} from "../dashboard-data";
import type { CameraItem, IncidentItem } from "@/types";
import type { DashboardPage } from "@/types/dashboard.types";

const incident = (override: Partial<IncidentItem> = {}): IncidentItem => ({
  id: "i",
  siteId: "s",
  cameraId: "c",
  violationType: "NO_VEST",
  severity: "HIGH",
  status: "PENDING_REVIEW",
  detectedAt: "2026-11-07T03:00:00Z",
  createdAt: "2026-11-07T03:00:00Z",
  updatedAt: "2026-11-07T03:00:00Z",
  ...override,
});
const page = <T>(
  items: T[],
  total: number,
  current = 1,
  limit = 100,
): DashboardPage<T> => ({
  items,
  meta: { total, page: current, limit, totalPages: Math.ceil(total / limit) },
});

describe("dashboard Vietnam calendar", () => {
  it("uses Vietnam's date across UTC midnight", () => {
    assert.equal(vietnamToday(new Date("2026-11-06T16:59:59Z")), "2026-11-06");
    assert.equal(vietnamToday(new Date("2026-11-06T17:00:00Z")), "2026-11-07");
  });
  it("builds an inclusive API endpoint and exclusive local boundary", () => {
    const period = dashboardPeriod("today", "2026-11-07")!;
    assert.equal(period.fromDate, "2026-11-06T17:00:00.000Z");
    assert.equal(period.toDate, "2026-11-07T16:59:59.999Z");
    assert.equal(period.endExclusive, "2026-11-07T17:00:00.000Z");
    assert.ok(
      incidentInPeriod(incident({ detectedAt: period.fromDate }), period, "s"),
    );
    assert.ok(
      incidentInPeriod(incident({ detectedAt: period.toDate }), period, "s"),
    );
    assert.ok(
      !incidentInPeriod(
        incident({ detectedAt: period.endExclusive }),
        period,
        "s",
      ),
    );
    assert.ok(!incidentInPeriod(incident({ siteId: "other" }), period, "s"));
    assert.ok(!incidentInPeriod(incident({ detectedAt: "bad-date" }), period));
  });
  it("includes today and six previous calendar days, including month boundaries", () => {
    assert.equal(dashboardPeriod("7d", "2026-11-03")?.startDate, "2026-10-28");
    assert.equal(
      dashboardPeriod("month", "2026-11-07")?.startDate,
      "2026-11-01",
    );
    assert.equal(
      dashboardPeriod("today", "2026-12-01")?.startDate,
      "2026-12-01",
    );
  });
  it("accepts 90 calendar days and rejects 91, future, reversed, and invalid dates", () => {
    assert.ok(
      dashboardPeriod("custom", "2026-11-07", "2026-08-10", "2026-11-07"),
    );
    assert.equal(
      dashboardPeriod("custom", "2026-11-07", "2026-08-09", "2026-11-07"),
      null,
    );
    for (const [start, end] of [
      ["2026-11-07", "2026-11-08"],
      ["2026-11-07", "2026-11-06"],
      ["2026-02-30", "2026-03-01"],
      ["", "2026-11-07"],
    ])
      assert.equal(dashboardPeriod("custom", "2026-11-07", start, end), null);
    assert.ok(
      dashboardPeriod("custom", "2028-03-01", "2028-02-29", "2028-03-01"),
    );
  });
  it("creates period and all-date pending links with explicit site selection", () => {
    const params = new URL(
      dashboardIncidentHref("s", dashboardPeriod("today", "2026-11-07")),
      "http://localhost",
    ).searchParams;
    assert.equal(params.get("fromDate"), "2026-11-06T17:00:00.000Z");
    const pending = new URL(
      dashboardIncidentHref(null, null, "PENDING_REVIEW"),
      "http://localhost",
    ).searchParams;
    assert.ok(pending.has("siteId"));
    assert.equal(pending.get("status"), "PENDING_REVIEW");
    assert.ok(!pending.has("fromDate"));
  });
});

describe("dashboard complete pagination", () => {
  for (const total of [0, 1, 100, 101, 250, 5000])
    it(`loads ${total} records completely with at most three page requests in flight`, async () => {
      let active = 0;
      let peak = 0;
      const result = await collectDashboardPages(async (current, limit) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        return page(
          Array.from(
            { length: Math.min(limit, total - (current - 1) * limit) },
            (_, index) => ({ id: String((current - 1) * limit + index) }),
          ),
          total,
          current,
          limit,
        );
      });
      assert.equal(result.complete, true);
      assert.equal(result.items.length, total);
      assert.equal(result.total, total);
      assert.ok(peak <= 3);
    });
  it("keeps a valid total but does not aggregate more than 5000 records", async () => {
    let calls = 0;
    const result = await collectDashboardPages(async () => {
      calls++;
      return page([{ id: "1" }], 5001);
    });
    assert.equal(result.total, 5001);
    assert.equal(result.issue, "limit");
    assert.deepEqual(result.items, []);
    assert.equal(calls, 1);
  });
  it("rejects missing, wrong-page, or inconsistent metadata", async () => {
    assert.equal(pageTotal({ items: [] }, 1, 100), null);
    assert.equal(pageTotal(page([], 2, 2), 1, 100), null);
    const result = await collectDashboardPages(async () => ({
      items: [{ id: "1" }],
    }));
    assert.equal(result.complete, false);
    assert.equal(result.total, null);
    assert.equal(result.issue, "metadata");
  });
  it("never publishes duplicate IDs or missing records as complete", async () => {
    for (const ids of [["1", "1"], ["1"]]) {
      const result = await collectDashboardPages(async () =>
        page(
          ids.map((id) => ({ id })),
          2,
        ),
      );
      assert.equal(result.issue, "changed");
      assert.deepEqual(result.items, []);
    }
  });
  it("detects totals changing between pages", async () => {
    const result = await collectDashboardPages(async (current) =>
      page([{ id: String(current) }], current === 1 ? 101 : 102, current),
    );
    assert.equal(result.issue, "changed");
    assert.equal(result.total, 101);
  });
  it("retains the metadata count on a middle-page failure", async () => {
    const result = await collectDashboardPages(async (current) => {
      if (current === 2) throw new Error("offline");
      return page([{ id: "first" }], 250, current);
    });
    assert.equal(result.issue, "page-error");
    assert.equal(result.total, 250);
    assert.deepEqual(result.items, []);
  });
  it("propagates authorization failures instead of keeping old totals", async () => {
    await assert.rejects(
      collectDashboardPages(async (current) => {
        if (current > 1)
          throw Object.assign(new Error("forbidden"), { status: 403 });
        return page([{ id: "1" }], 101);
      }),
      /forbidden/,
    );
  });
  it("rejects records from another period or site", async () => {
    const period = dashboardPeriod("today", "2026-11-07")!;
    const result = await collectDashboardPages(
      async () => page([incident({ siteId: "wrong" })], 1),
      { accept: (item) => incidentInPeriod(item, period, "s") },
    );
    assert.equal(result.issue, "invalid-record");
  });
  it("aborts before loading a new filter", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    await assert.rejects(
      collectDashboardPages(
        async () => {
          calls++;
          return page([], 0);
        },
        { signal: controller.signal },
      ),
    );
    assert.equal(calls, 0);
  });
});

describe("dashboard aggregate semantics", () => {
  it("counts all statuses but only reviewed records in the dismissal denominator", () => {
    const rows = [
      ...Array.from({ length: 4 }, (_, i) => incident({ id: `p${i}` })),
      ...Array.from({ length: 3 }, (_, i) =>
        incident({ id: `c${i}`, status: "CONFIRMED" }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        incident({ id: `d${i}`, status: "DISMISSED" }),
      ),
      incident({
        id: "r",
        status: "RESOLVED",
        resolvedAt: "2026-11-07T03:30:00Z",
      }),
    ];
    const result = aggregateDashboard(rows);
    assert.equal(result.total, 10);
    assert.equal(result.reviewed, 6);
    assert.equal(result.dismissed, 2);
    assert.ok(Math.abs(result.dismissedRate! - 33.3333) < 0.001);
    assert.equal(result.mttrMinutes, 30);
    assert.equal(result.resolutionSamples, 1);
    assert.equal(result.cameras[0].pending, 7);
    assert.equal(result.cameras[0].resolved, 1);
    assert.equal(result.cameras[0].dismissed, 2);
    assert.equal(
      result.distribution.reduce((sum, row) => sum + row.count, 0),
      10,
    );
    assert.equal(
      result.hours.reduce((a, b) => a + b, 0),
      10,
    );
    assert.equal(
      result.severities.reduce((sum, row) => sum + row.count, 0),
      10,
    );
  });
  it("does not treat old pending incidents as part of today", () => {
    const period = dashboardPeriod("today", "2026-11-07")!;
    assert.equal(
      aggregateDashboard(
        [incident({ detectedAt: "2026-11-05T03:00:00Z" }), incident()].filter(
          (row) => incidentInPeriod(row, period),
        ),
      ).total,
      1,
    );
  });
  it("counts 00, 06, 14 and 22 Vietnam hours in exactly one shift", () => {
    const result = aggregateDashboard(
      [
        "2026-11-06T17:00:00Z",
        "2026-11-06T23:00:00Z",
        "2026-11-07T07:00:00Z",
        "2026-11-07T15:00:00Z",
      ].map((detectedAt, i) => incident({ id: String(i), detectedAt })),
    );
    assert.deepEqual(result.shifts, { morning: 1, afternoon: 1, night: 2 });
    for (const hour of [0, 6, 14, 22]) assert.equal(result.hours[hour], 1);
  });
  it("keeps unknown types/severities and counts MULTI_VIOLATION once", () => {
    const result = aggregateDashboard([
      incident({
        violationType: "UNKNOWN",
        severity: "UNKNOWN",
        status: "UNKNOWN",
      }),
      incident({ violationType: "MULTI_VIOLATION" }),
    ]);
    assert.equal(
      result.distribution.find((row) => row.key === "OTHER")?.count,
      1,
    );
    assert.equal(
      result.distribution.find((row) => row.key === "MULTI_VIOLATION")?.count,
      1,
    );
    assert.equal(
      result.severities.find((row) => row.key === "OTHER")?.other,
      1,
    );
  });
  it("uses only valid resolved timestamps, including zero-minute resolution", () => {
    const result = aggregateDashboard([
      incident({ status: "RESOLVED", resolvedAt: "2026-11-07T02:00:00Z" }),
      incident({ status: "CLOSED", resolvedAt: "invalid" }),
      incident({ status: "CONFIRMED", resolvedAt: "2026-11-07T05:00:00Z" }),
      incident({ status: "RESOLVED" }),
      incident({ status: "CLOSED", resolvedAt: "2026-11-07T03:00:00Z" }),
      incident({ status: "RESOLVED", resolvedAt: "2026-11-07T03:20:00Z" }),
    ]);
    assert.equal(result.resolutionSamples, 2);
    assert.equal(result.mttrMinutes, 10);
    assert.equal(aggregateDashboard([]).mttrMinutes, null);
    assert.equal(aggregateDashboard([]).dismissedRate, null);
    assert.equal(
      aggregateDashboard([incident({ status: "CONFIRMED" })]).dismissedRate,
      0,
    );
  });
  it("retains all cameras for totals; top five is a view concern", () => {
    const result = aggregateDashboard(
      Array.from({ length: 125 }, (_, i) =>
        incident({ id: String(i), cameraId: `camera-${i}` }),
      ),
    );
    assert.equal(result.cameras.length, 125);
    assert.equal(
      result.cameras.reduce((sum, row) => sum + row.total, 0),
      125,
    );
  });
  it("partitions active catalog cameras and collapses deleted historical cameras when catalogComplete is true", () => {
    const mkCam = (id: string, name: string): CameraItem => ({
      id,
      siteId: "s",
      name,
      code: id.toUpperCase(),
      sourceType: "RTSP",
      streamUrl: "rtsp://example",
      status: "ONLINE",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    });
    const activeCameras = [
      mkCam("cam-1", "Cổng chính"),
      mkCam("cam-2", "Kho vật tư"),
      mkCam("cam-3", "Khu hàn"),
    ];
    const stats = aggregateDashboard([
      incident({ id: "i1", cameraId: "cam-2", status: "PENDING_REVIEW" }),
      incident({ id: "i2", cameraId: "cam-2", status: "RESOLVED" }),
      incident({ id: "i3", cameraId: "deleted-old-1", status: "CONFIRMED" }),
      incident({ id: "i4", cameraId: "deleted-old-2", status: "DISMISSED" }),
    ]).cameras;

    const partitioned = partitionDashboardCameras(activeCameras, stats, {
      catalogComplete: true,
    });
    assert.equal(partitioned.rows.length, 3);
    assert.deepEqual(
      partitioned.rows.map((r) => r.cameraId),
      ["cam-2", "cam-1", "cam-3"],
    );
    assert.ok(partitioned.rows.every((r) => r.inCatalog));
    assert.deepEqual(partitioned.archived, {
      cameraCount: 2,
      total: 2,
      pending: 1,
      resolved: 0,
      dismissed: 1,
    });

    const fallback = partitionDashboardCameras([activeCameras[0]], stats, {
      catalogComplete: false,
    });
    assert.equal(fallback.archived, null);
    assert.equal(
      fallback.rows.find((r) => r.cameraId === "deleted-old-1")?.inCatalog,
      false,
    );
    assert.equal(
      fallback.rows.find((r) => r.cameraId === "cam-1")?.inCatalog,
      true,
    );
  });

  it("clusters same-person multi-violation detections into 1 MULTI_VIOLATION case in clustered mode and preserves raw mode", () => {
    const withTrack = (
      id: string,
      violationType: string,
      detectedAt: string,
      severity: string,
    ) =>
      incident({
        id,
        cameraId: "cam-1",
        violationType,
        severity,
        status: "CONFIRMED",
        detectedAt,
        evidences: [
          {
            id: `ev-${id}`,
            incidentId: id,
            cameraId: "cam-1",
            evidenceType: "SNAPSHOT",
            storageKey: `evidences/s/CAM-01/shot_track7_${id}.jpg`,
            fileName: `shot_track7_${id}.jpg`,
            mimeType: "image/jpeg",
            fileSize: 1024,
            capturedAt: detectedAt,
            createdAt: detectedAt,
          },
        ],
      });

    const items = [
      withTrack("m-1", "NO_HELMET", "2026-11-07T03:00:00Z", "HIGH"),
      withTrack("m-2", "NO_VEST", "2026-11-07T03:00:03Z", "MEDIUM"),
    ];

    const clustered = aggregateDashboard(items, { mode: "clustered" });
    assert.equal(clustered.total, 1);
    assert.equal(clustered.rawTotal, 2);
    assert.equal(clustered.multiViolationClusters, 1);
    assert.equal(
      clustered.distribution.find((r) => r.key === "MULTI_VIOLATION")?.count,
      1,
    );
    assert.equal(
      clustered.componentViolationBreakdown.find((r) => r.key === "NO_HELMET")
        ?.count,
      1,
    );
    assert.equal(
      clustered.componentViolationBreakdown.find((r) => r.key === "NO_VEST")
        ?.count,
      1,
    );
    assert.equal(clustered.cameras[0].total, 1);
    assert.equal(clustered.shifts.morning, 1);

    const raw = aggregateDashboard(items, { mode: "raw" });
    assert.equal(raw.total, 2);
    assert.equal(raw.rawTotal, 2);
    assert.equal(raw.cameras[0].total, 2);
  });

  it("resolves safe <= 90-day windows and zero-fills Day/Week/Month trend buckets", () => {
    const todayPeriod = dashboardPeriod("today", "2026-11-25")!;
    const dayWin = resolveDashboardTrendsWindow(todayPeriod, "DAY")!;
    assert.equal(dayWin.startDate, "2026-11-19");
    assert.equal(dayWin.endDate, "2026-11-25");
    assert.equal(dayWin.autoExpanded, true);

    const normalizedDay = normalizeDashboardTrends(
      [
        {
          date: "2026-11-20",
          totalIncidents: 5,
          trueViolations: 4,
          falseAlarms: 1,
          resolvedCount: 3,
        },
      ],
      dayWin,
    );
    assert.equal(normalizedDay.length, 7);
    assert.equal(normalizedDay[0].date, "2026-11-19");
    assert.equal(normalizedDay[0].totalIncidents, 0);
    assert.equal(normalizedDay[1].date, "2026-11-20");
    assert.equal(normalizedDay[1].totalIncidents, 5);

    const monthWin = resolveDashboardTrendsWindow(todayPeriod, "MONTH")!;
    const diffDays =
      (Date.parse(`${monthWin.endDate}T00:00:00Z`) -
        Date.parse(`${monthWin.startDate}T00:00:00Z`)) /
      86_400_000;
    assert.ok(diffDays <= 90);
    const normalizedMonth = normalizeDashboardTrends([], monthWin);
    assert.ok(normalizedMonth.length >= 3);
  });

  it("computes frame-weighted AI telemetry FPS & Latency and falls back to declared metrics", () => {
    const telemetry = summarizeAiPerformanceTelemetry(
      [
        {
          id: "t1",
          cameraId: "cam-1",
          modelVersionId: "ver-1",
          statDate: "2026-11-24",
          avgFps: 30,
          avgLatencyMs: 12,
          maxLatencyMs: 18,
          totalFrames: "1000",
        },
        {
          id: "t2",
          cameraId: "cam-2",
          modelVersionId: "ver-1",
          statDate: "2026-11-25",
          avgFps: 20,
          avgLatencyMs: 22,
          maxLatencyMs: 35,
          totalFrames: "3000",
        },
      ],
      {
        id: "ver-1",
        modelId: "mod-1",
        version: "1.2.0",
        framework: "TENSORRT",
        inputSize: "640x640",
        status: "DEPLOYED",
        metrics: { fps: 45, latencyMs: 8 },
        createdAt: "2026-11-01T00:00:00Z",
      },
    );
    assert.equal(telemetry.source, "telemetry");
    assert.equal(telemetry.totalFrames, 4000);
    assert.equal(telemetry.avgFps, 22.5);
    assert.equal(telemetry.avgLatencyMs, 19.5);
    assert.equal(telemetry.maxLatencyMs, 35);

    const fallback = summarizeAiPerformanceTelemetry([], {
      id: "ver-1",
      modelId: "mod-1",
      version: "1.2.0",
      framework: "TENSORRT",
      inputSize: "640x640",
      status: "DEPLOYED",
      metrics: { fps: 45, latencyMs: 8 },
      createdAt: "2026-11-01T00:00:00Z",
    });
    assert.equal(fallback.source, "declared");
    assert.equal(fallback.avgFps, 45);
    assert.equal(fallback.avgLatencyMs, 8);
  });

  it("maps Backend /statistics/* DTOs via buildDashboardAnalyticsFromReporting and strips TOTAL_AGGREGATED", () => {
    const emptySev = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const analytics = buildDashboardAnalyticsFromReporting({
      summary: {
        totalIncidents: 20,
        openIncidents: 4,
        resolvedIncidents: 10,
        trueViolations: 4,
        falseAlarms: 2,
        falseAlarmRate: 12.5,
        complianceRate: 94.2,
        meanTimeToResolveHours: 0.5,
        periodStart: "2026-11-19",
        periodEnd: "2026-11-25",
        severityBreakdown: {
          CRITICAL: {
            count: 5,
            resolved: 3,
            targetSlaMinutes: 15,
            actualMttrMinutes: 12,
          },
          HIGH: {
            count: 8,
            resolved: 4,
            targetSlaMinutes: 30,
            actualMttrMinutes: 25,
          },
          MEDIUM: {
            count: 5,
            resolved: 2,
            targetSlaMinutes: 60,
            actualMttrMinutes: 45,
          },
          LOW: {
            count: 2,
            resolved: 1,
            targetSlaMinutes: 120,
            actualMttrMinutes: 60,
          },
        },
      },
      violations: [
        {
          violationType: "TOTAL_AGGREGATED",
          count: 0,
          percentage: 0,
          severityBreakdown: emptySev,
        },
        {
          violationType: "NO_HARD_HAT",
          count: 9,
          percentage: 45,
          severityBreakdown: emptySev,
        },
        {
          violationType: "NO_SAFETY_VEST",
          count: 6,
          percentage: 30,
          severityBreakdown: emptySev,
        },
        {
          violationType: "RESTRICTED_ZONE",
          count: 3,
          percentage: 15,
          severityBreakdown: emptySev,
        },
        {
          violationType: "MULTI_VIOLATION",
          count: 2,
          percentage: 10,
          severityBreakdown: emptySev,
        },
      ],
      hourlyRisk: {
        date: "2026-11-25",
        hourly: [
          {
            hour: 2,
            label: "02:00",
            shift: "NIGHT",
            count: 3,
            riskLevel: "LOW",
            severityBreakdown: emptySev,
          },
          {
            hour: 9,
            label: "09:00",
            shift: "MORNING",
            count: 7,
            riskLevel: "HIGH",
            severityBreakdown: emptySev,
          },
          {
            hour: 15,
            label: "15:00",
            shift: "AFTERNOON",
            count: 6,
            riskLevel: "MEDIUM",
            severityBreakdown: emptySev,
          },
          {
            hour: 23,
            label: "23:00",
            shift: "NIGHT",
            count: 4,
            riskLevel: "MEDIUM",
            severityBreakdown: emptySev,
          },
        ],
        shifts: {
          morning: {
            name: "Ca sáng",
            timeRange: "06:00 - 14:00",
            totalIncidents: 7,
            criticalCount: 2,
            highCount: 3,
            mediumCount: 2,
            lowCount: 0,
            riskLevel: "HIGH",
          },
          afternoon: {
            name: "Ca chiều",
            timeRange: "14:00 - 22:00",
            totalIncidents: 6,
            criticalCount: 1,
            highCount: 3,
            mediumCount: 2,
            lowCount: 0,
            riskLevel: "MEDIUM",
          },
          night: {
            name: "Ca đêm",
            timeRange: "22:00 - 06:00",
            totalIncidents: 7,
            criticalCount: 2,
            highCount: 2,
            mediumCount: 1,
            lowCount: 2,
            riskLevel: "HIGH",
          },
        },
        summary: {
          totalIncidents: 20,
          peakHour: 9,
          peakShift: "MORNING",
          riskLevel: "HIGH",
        },
      },
      cameraRankings: [
        {
          cameraId: "cam-2",
          cameraName: "Camera Kho",
          totalViolations: 12,
          confirmedCount: 3,
          resolvedCount: 7,
          falseAlarmCount: 2,
        },
        {
          cameraId: "cam-1",
          cameraName: "Camera Cổng",
          totalViolations: 8,
          confirmedCount: 5,
          resolvedCount: 3,
          falseAlarmCount: 0,
        },
      ],
    });

    assert.equal(analytics.total, 20);
    assert.equal(analytics.multiViolationClusters, 2);
    assert.equal(
      analytics.distribution.find((d) => d.key === "OTHER"),
      undefined,
    );
    assert.equal(
      analytics.distribution.find((d) => d.key === "NO_HELMET")?.count,
      9,
    );
    assert.equal(
      analytics.distribution.find((d) => d.key === "NO_VEST")?.count,
      6,
    );
    assert.equal(
      analytics.distribution.find((d) => d.key === "RESTRICTED_AREA")?.count,
      3,
    );

    assert.equal(analytics.hours[9], 7);
    assert.equal(analytics.hours[15], 6);
    assert.deepEqual(analytics.shifts, { morning: 7, afternoon: 6, night: 7 });

    const critical = analytics.severities.find((s) => s.key === "CRITICAL")!;
    assert.equal(critical.count, 5);
    assert.equal(critical.resolved, 3);
    // Không có số đếm theo mức độ: phần chưa xử lý để ở "other", không chia ước lượng.
    assert.equal(critical.pending + critical.confirmed + critical.dismissed, 0);
    assert.equal(critical.other, 2);
    assert.equal(analytics.severitySplitSource, "unavailable");
    assert.equal(critical.mttrMinutes, 12);
    assert.equal(critical.targetSlaMinutes, 15);

    assert.equal(analytics.mttrMinutes, 30); // 0.5h * 60
    assert.equal(analytics.reviewed, 16); // 4 + 10 + 2
    assert.equal(analytics.dismissedRate, 12.5);
    assert.equal(analytics.complianceRate, 94.2);

    assert.equal(analytics.cameras[0].cameraId, "cam-2");
    assert.equal(analytics.cameras[0].total, 12);
    assert.equal(analytics.cameras[0].resolved, 7);
    assert.equal(analytics.cameras[0].dismissed, 2);
    assert.equal(analytics.cameras[0].pending, 3); // 12 - 7 - 2
  });

  it("ưu tiên bộ đếm chính xác của kỳ và số đếm thật theo mức độ khi có", () => {
    const summary = {
      totalIncidents: 1000, // reporting bị chặn trần 1.000 bản ghi
      openIncidents: 800,
      resolvedIncidents: 90,
      trueViolations: 100,
      falseAlarms: 10,
      falseAlarmRate: 9.09, // công thức BE: 10 / (100 + 10)
      complianceRate: 90,
      meanTimeToResolveHours: 1,
      periodStart: "2026-11-01",
      periodEnd: "2026-11-28",
    };
    const row = (total: number, pending: number, confirmed: number, resolved: number, dismissed: number) => ({
      total, pending, confirmed, resolved, dismissed,
    });
    const analytics = buildDashboardAnalyticsFromReporting({
      summary,
      violations: [{ violationType: "NO_HELMET", count: 2000, percentage: 100, severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } }],
      periodCounts: {
        total: 1364,
        pendingReview: 1106,
        confirmed: 139,
        critical: 40,
        resolved: 119,
        closed: 118,
        dismissed: 0,
      },
      severityMatrix: {
        CRITICAL: row(40, 30, 5, 5, 0),
        HIGH: row(100, 80, 10, 10, 0),
        MEDIUM: row(1000, 800, 100, 100, 0),
        LOW: row(224, 196, 24, 4, 0),
      },
    });
    assert.equal(analytics.total, 1364); // không lấy max với tổng by-violation (2000)
    assert.equal(analytics.chartSampleTotal, 1000);
    assert.equal(analytics.openIncidents, 1106);
    assert.equal(analytics.reviewed, 139 + 119);
    assert.equal(analytics.dismissedRate, 0);
    assert.equal(analytics.severitySplitSource, "counts");
    const critical = analytics.severities.find((s) => s.key === "CRITICAL")!;
    assert.deepEqual(
      [critical.count, critical.pending, critical.confirmed, critical.resolved, critical.dismissed, critical.other],
      [40, 30, 5, 5, 0, 0],
    );
  });
});
