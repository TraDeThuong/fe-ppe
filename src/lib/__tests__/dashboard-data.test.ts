import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateDashboard,
  collectDashboardPages,
  dashboardIncidentHref,
  dashboardPeriod,
  incidentInPeriod,
  pageTotal,
  vietnamToday,
} from "../dashboard-data";
import type { IncidentItem } from "@/types";
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
});
