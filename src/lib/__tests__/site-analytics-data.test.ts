import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IncidentItem, ReportGenerationDto } from "@/types";
import {
  aggregateSiteAnalytics, aggregateSiteHourlyRisk, analyticsPeriod, analyticsPreset,
  canAccessSiteReport, collectAnalyticsIncidents, incidentOutcome,
} from "../site-analytics-data";

const today = "2026-11-17";
const period = analyticsPeriod("2026-11-01", today, today)!;
const incident = (id: string, extra: Partial<IncidentItem> = {}): IncidentItem => ({
  id, siteId: "site", cameraId: "camera", status: "CONFIRMED", severity: "HIGH",
  violationType: "NO_HELMET", detectedAt: "2026-11-16T17:00:00.000Z",
  createdAt: "2026-11-16T17:00:00.000Z", updatedAt: "2026-11-17T04:00:00.000Z", ...extra,
});
const closed = (id: string, oldStatus: string, extra: Partial<IncidentItem> = {}) => incident(id, {
  status: "CLOSED", statusHistory: [{ id: `h-${id}`, incidentId: id, oldStatus, newStatus: "CLOSED", changedBy: "user", changedAt: "2026-11-17T04:00:00Z" }], ...extra,
});
const page = (items: IncidentItem[], total = items.length, current = 1) => ({
  items, meta: { page: current, limit: 100, total, totalPages: Math.ceil(total / 100) },
});

describe("site analytics calendar", () => {
  it("counts exactly 7/30/90 inclusive days and includes all of the final Vietnam day", () => {
    for (const days of [7, 30, 90] as const) {
      const range = analyticsPreset(days, today);
      const p = analyticsPeriod(range.startDate, range.endDate, today)!;
      assert.equal((Date.parse(p.endExclusive) - Date.parse(p.fromDate)) / 86_400_000, days);
    }
    const p = analyticsPeriod(today, today, today)!;
    assert.equal(p.fromDate, "2026-11-16T17:00:00.000Z");
    assert.equal(p.toDate, "2026-11-17T16:59:59.999Z");
  });
  it("rejects blank, impossible, reversed, future dates and 91 inclusive days", () => {
    for (const [start, end] of [["", today], ["2026-02-30", today], [today, "2026-11-16"], [today, "2026-11-18"], ["2026-08-19", today]]) {
      assert.equal(analyticsPeriod(start, end, today), null);
    }
  });
  it("zero fills buckets and uses the ISO week year at New Year", () => {
    const p = analyticsPeriod("2020-12-31", "2021-01-04", "2021-01-04")!;
    const items = [incident("1", { detectedAt: "2021-01-03T17:00:00Z" })];
    const daily = aggregateSiteAnalytics(items, p, "DAY");
    assert.equal(daily.trends.length, 5);
    assert.equal(daily.trends[4].trueViolations, 1);
    assert.deepEqual(aggregateSiteAnalytics(items, p, "WEEK").trends.map((t) => [t.date, t.trueViolations]), [["2020-W53", 0], ["2021-W01", 1]]);
    assert.deepEqual(aggregateSiteAnalytics(items, p, "MONTH").trends.map((t) => [t.date, t.trueViolations]), [["2020-12", 0], ["2021-01", 1]]);
  });
});

describe("confirmed site analytics", () => {
  it("keeps all cards consistent and distinguishes both CLOSED branches", () => {
    const items = [
      incident("pending", { status: "PENDING_REVIEW" }), incident("confirmed"),
      incident("resolved", { status: "RESOLVED", resolvedAt: "2026-11-16T18:00:00.000Z" }),
      incident("dismissed", { status: "DISMISSED" }),
      closed("closed-r", "RESOLVED", { cameraId: "b", violationType: "MULTI_VIOLATION", resolvedAt: "2026-11-16T17:00:00.000Z" }),
      closed("closed-d", "DISMISSED"), incident("legacy", { status: "OTHER" }),
    ];
    const a = aggregateSiteAnalytics(items, period, "DAY");
    assert.deepEqual([a.pending, a.confirmed, a.resolved, a.dismissed, a.unknown], [1, 1, 2, 2, 1]);
    assert.equal(a.trueViolations, 3);
    assert.equal(a.distribution.reduce((sum, row) => sum + row.count, 0), 3);
    assert.equal(a.trends.reduce((sum, row) => sum + row.trueViolations, 0), 3);
    assert.equal(a.cameras.reduce((sum, row) => sum + row.totalViolations, 0), 3);
    assert.equal(aggregateSiteHourlyRisk(items).total, 3);
    assert.equal(a.falseAlarmRate, 40);
    assert.equal(a.mttrMinutes, 30); // Includes the valid 0-minute resolution, excludes dismissed.
    assert.equal(a.resolutionSamples, 2);
    assert.equal(a.severityRows.find((r) => r.key === "HIGH")!.actualMttrMinutes, 30);
    assert.equal(a.distribution.find((row) => row.type === "MULTI_VIOLATION")!.count, 1);
    assert.equal(a.cameras[0].resolvedCount / a.cameras[0].totalViolations, 0.5);
  });
  it("does not substitute updatedAt for missing or invalid resolution timestamps", () => {
    const a = aggregateSiteAnalytics([
      incident("1", { status: "RESOLVED" }),
      incident("2", { status: "RESOLVED", resolvedAt: "bad" }),
      incident("3", { status: "RESOLVED", resolvedAt: "2026-11-15T00:00:00Z" }),
    ], period, "DAY");
    assert.equal(a.resolved, 3);
    assert.equal(a.mttrMinutes, null);
    assert.equal(a.resolutionSamples, 0);
  });
  it("keeps unavailable rates null, includes unknown types, sorts camera ties by ID", () => {
    const empty = aggregateSiteAnalytics([], period, "DAY");
    assert.equal(empty.confirmedRate, null);
    assert.equal(empty.falseAlarmRate, null);
    assert.equal(empty.mttrMinutes, null);
    const a = aggregateSiteAnalytics([incident("1", { cameraId: "b", violationType: "LEGACY" }), incident("2", { cameraId: "a" })], period, "DAY");
    assert.deepEqual(a.cameras.map((c) => c.cameraId), ["a", "b"]);
    assert.equal(a.distribution.find((r) => r.type === "OTHER")!.count, 1);
    assert.equal(aggregateSiteAnalytics([incident("pending", { status: "PENDING_REVIEW" })], period, "DAY").falseAlarmRate, null);
  });
  it("requires a dated closure transition and picks the latest transition", () => {
    assert.equal(incidentOutcome(closed("1", "DISMISSED", { resolvedAt: "2026-11-17T04:00:00Z" })), "dismissed");
    assert.equal(incidentOutcome(closed("2", "CONFIRMED")), "unknown");
    assert.equal(incidentOutcome(incident("3", { status: "CLOSED" })), "unknown");
  });
  it("partitions 00/06/14/22 exactly once and breaks peak ties deterministically", () => {
    const items = ["00", "06", "14", "22"].map((hour) => incident(hour, { detectedAt: `2026-11-17T${hour}:00:00+07:00`, severity: "LOW" }));
    const risk = aggregateSiteHourlyRisk(items);
    assert.deepEqual(Object.values(risk.shifts).map((s) => s.totalIncidents), [1, 1, 2]);
    assert.equal(risk.hourly.reduce((n, h) => n + h.count, 0), 4);
    assert.equal(risk.peakHour, 0);
    assert.equal(risk.peakShift, "night");
    assert.equal(risk.shifts.night.riskLevel, "MEDIUM");
    assert.equal(aggregateSiteHourlyRisk(items.slice(1, 3)).peakShift, "morning");
    assert.equal(aggregateSiteHourlyRisk([]).peakHour, null);
    assert.equal(aggregateSiteHourlyRisk([]).peakShift, null);
  });
  it("retains severity and count based risk thresholds", () => {
    const risk = aggregateSiteHourlyRisk([incident("1"), incident("2"), incident("3")]);
    assert.equal(risk.hourly[0].riskLevel, "HIGH");
    assert.equal(risk.shifts.night.riskLevel, "CRITICAL");
  });
});

describe("complete incident collection", () => {
  it("collects multiple pages, verifies CLOSED details and bounds concurrency to three", async () => {
    const items = Array.from({ length: 301 }, (_, n) => closed(String(n), "RESOLVED"));
    // Stay below the independent 200-detail limit, while exercising four list pages.
    items.splice(100, 201, ...Array.from({ length: 201 }, (_, n) => incident(`open-${n}`)));
    let active = 0, peak = 0;
    const result = await collectAnalyticsIncidents(async (p) => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--;
      return page(items.slice((p - 1) * 100, p * 100), items.length, p);
    }, async (id) => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--;
      return items.find((item) => item.id === id)!;
    }, period, "site");
    assert.equal(result.complete, true);
    assert.equal(result.items.length, 301);
    assert.equal(peak, 3);
  });
  it("rejects partial, duplicate, changed and wrong-site collections", async () => {
    const cases = [
      async (p: number) => p === 1 ? page(Array.from({ length: 100 }, (_, n) => incident(String(n))), 101) : Promise.reject(new Error("offline")),
      async () => page([incident("1"), incident("1")]),
      async (p: number) => page(p === 1 ? Array.from({ length: 100 }, (_, n) => incident(String(n))) : [incident("last")], p === 1 ? 101 : 102, p),
      async () => page([incident("1", { siteId: "other" })]),
    ];
    for (const fetchPage of cases) {
      const result = await collectAnalyticsIncidents(fetchPage, async () => incident("unused"), period, "site");
      assert.equal(result.complete, false);
      assert.deepEqual(result.items, []);
    }
  });
  it("rejects limits and missing metadata before expensive detail requests", async () => {
    let details = 0;
    const getDetail = async () => { details++; return incident("unused"); };
    assert.equal((await collectAnalyticsIncidents(async () => page([], 5001), getDetail, period, "site")).issue, "limit");
    assert.equal((await collectAnalyticsIncidents(async () => ({ items: [] }), getDetail, period, "site")).issue, "metadata");
    const closedItems = Array.from({ length: 201 }, (_, n) => closed(String(n), "RESOLVED"));
    assert.equal((await collectAnalyticsIncidents(async (p) => page(closedItems.slice((p - 1) * 100, p * 100), 201, p), getDetail, period, "site")).issue, "closed-limit");
    assert.equal(details, 0);
  });
  it("withholds totals when CLOSED history is missing, changed, or cannot load", async () => {
    for (const [detail, issue] of [
      [async () => incident("1", { status: "CLOSED" }), "closed-history"],
      [async () => closed("1", "RESOLVED", { severity: "LOW" }), "changed"],
      [async () => { throw new Error("offline"); }, "detail-error"],
    ] as const) {
      const result = await collectAnalyticsIncidents(async () => page([closed("1", "RESOLVED")]), detail, period, "site");
      assert.equal(result.issue, issue);
      assert.deepEqual(result.items, []);
    }
  });
  it("propagates denied access and cancellation instead of reporting empty data", async () => {
    await assert.rejects(collectAnalyticsIncidents(async () => page([closed("1", "RESOLVED")]), async () => { throw Object.assign(new Error("denied"), { status: 403 }); }, period, "site"), /denied/);
    const controller = new AbortController();
    await assert.rejects(collectAnalyticsIncidents(async () => page([closed("1", "RESOLVED")]), async () => { controller.abort(); return closed("1", "RESOLVED"); }, period, "site", controller.signal), { name: "AbortError" });
  });
});

describe("report file access", () => {
  const report = { siteId: "site", status: "COMPLETED", generatedBy: "author" } as ReportGenerationDto;
  it("requires export permission, correct site, completed status and ADMIN or author", () => {
    assert.equal(canAccessSiteReport(report, { id: "author", role: "USER" }, true, "site"), true);
    assert.equal(canAccessSiteReport(report, { id: "admin", role: "ADMIN" }, true, "site"), true);
    assert.equal(canAccessSiteReport(report, { id: "author", role: "USER" }, false, "site"), false);
    assert.equal(canAccessSiteReport(report, { id: "author", role: "USER" }, true, "other"), false);
    assert.equal(canAccessSiteReport(report, null, true, "site"), false);
    assert.equal(canAccessSiteReport(report, { id: "other", role: "SUPER_ADMIN" }, true, "site"), false);
    assert.equal(canAccessSiteReport({ ...report, generatedBy: "" }, { id: "author", role: "USER" }, true, "site"), false);
    assert.equal(canAccessSiteReport({ ...report, status: "FAILED" }, { id: "admin", role: "ADMIN" }, true, "site"), false);
  });
});
