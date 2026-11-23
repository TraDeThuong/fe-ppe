import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultIncidentPeriodFilter,
  filterItemsByDateRange,
  formatIncidentPeriodLabel,
  getMonthBounds,
  getWeekBounds,
  getYearBounds,
  isIncidentPeriodCurrent,
  parseIncidentPeriodFromUrl,
  resolveIncidentPeriod,
  shiftIncidentPeriodAnchor,
} from "../incident-period";

describe("incident-period helpers (Asia/Ho_Chi_Minh UTC+7)", () => {
  it("resolves all-time mode without fromDate/toDate", () => {
    const resolved = resolveIncidentPeriod(
      createDefaultIncidentPeriodFilter("2026-11-23"),
    );
    assert.equal(resolved.mode, "all");
    assert.equal(resolved.isValid, true);
    assert.equal(resolved.fromDate, undefined);
    assert.equal(resolved.toDate, undefined);
  });

  it("resolves day mode to exact Vietnam 00:00:00..23:59:59.999 UTC+7 bounds", () => {
    const resolved = resolveIncidentPeriod({
      mode: "day",
      anchorDate: "2026-11-23",
      customStart: "2026-11-23",
      customEnd: "2026-11-23",
    });
    assert.equal(resolved.isValid, true);
    assert.equal(resolved.startDate, "2026-11-23");
    assert.equal(resolved.endDate, "2026-11-23");
    assert.equal(resolved.fromDate, "2026-11-22T17:00:00.000Z");
    assert.equal(resolved.toDate, "2026-11-23T16:59:59.999Z");
  });

  it("resolves week mode as 7-day rolling window ending on anchor date (aligned with Dashboard 7d)", () => {
    assert.deepEqual(getWeekBounds("2026-11-23"), {
      startDate: "2026-11-17",
      endDate: "2026-11-23",
    });
    const resolved = resolveIncidentPeriod({
      mode: "week",
      anchorDate: "2026-11-23",
      customStart: "2026-11-23",
      customEnd: "2026-11-23",
    });
    assert.equal(resolved.startDate, "2026-11-17");
    assert.equal(resolved.endDate, "2026-11-23");
    assert.equal(resolved.fromDate, "2026-11-16T17:00:00.000Z");
    assert.equal(resolved.toDate, "2026-11-23T16:59:59.999Z");
  });

  it("resolves month bounds including leap year February and year bounds", () => {
    assert.deepEqual(getMonthBounds("2024-02-15"), {
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
    assert.deepEqual(getMonthBounds("2026-02-10"), {
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    assert.deepEqual(getYearBounds("2026-11-23"), {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
  });

  it("validates custom date ranges and rejects inverted start > end", () => {
    const valid = resolveIncidentPeriod({
      mode: "custom",
      anchorDate: "2026-11-23",
      customStart: "2026-11-01",
      customEnd: "2026-11-15",
    });
    assert.equal(valid.isValid, true);
    assert.equal(valid.fromDate, "2026-10-31T17:00:00.000Z");
    assert.equal(valid.toDate, "2026-11-15T16:59:59.999Z");

    const invalid = resolveIncidentPeriod({
      mode: "custom",
      anchorDate: "2026-11-23",
      customStart: "2026-11-20",
      customEnd: "2026-11-10",
    });
    assert.equal(invalid.isValid, false);
    assert.equal(invalid.fromDate, undefined);
    assert.equal(invalid.toDate, undefined);
  });

  it("shifts anchor dates across day, week, month (including year boundary), and year", () => {
    assert.equal(shiftIncidentPeriodAnchor("day", "2026-11-23", -1), "2026-11-22");
    assert.equal(shiftIncidentPeriodAnchor("week", "2026-11-23", 1), "2026-11-30");
    assert.equal(shiftIncidentPeriodAnchor("month", "2026-01-15", -1), "2025-12-01");
    assert.equal(shiftIncidentPeriodAnchor("month", "2026-12-20", 1), "2027-01-01");
    assert.equal(shiftIncidentPeriodAnchor("year", "2026-11-23", -1), "2025-01-01");
  });

  it("parses URL query params with explicit period or inferred Dashboard drilldown bounds", () => {
    const dayFromDashboard = parseIncidentPeriodFromUrl(
      {
        fromDate: "2026-11-22T17:00:00.000Z",
        toDate: "2026-11-23T16:59:59.999Z",
      },
      "2026-11-23",
    );
    assert.equal(dayFromDashboard.mode, "day");
    assert.equal(dayFromDashboard.anchorDate, "2026-11-23");

    const monthInferred = parseIncidentPeriodFromUrl(
      {
        fromDate: "2026-10-31T17:00:00.000Z",
        toDate: "2026-11-30T16:59:59.999Z",
      },
      "2026-11-23",
    );
    assert.equal(monthInferred.mode, "month");
    assert.equal(monthInferred.anchorDate, "2026-11-01");

    const weekFromDashboard7d = parseIncidentPeriodFromUrl(
      {
        fromDate: "2026-11-16T17:00:00.000Z",
        toDate: "2026-11-23T16:59:59.999Z",
      },
      "2026-11-23",
    );
    assert.equal(weekFromDashboard7d.mode, "week");
    assert.equal(weekFromDashboard7d.anchorDate, "2026-11-23");

    const custom10d = parseIncidentPeriodFromUrl(
      {
        fromDate: "2026-11-12T17:00:00.000Z",
        toDate: "2026-11-23T16:59:59.999Z",
      },
      "2026-11-23",
    );
    assert.equal(custom10d.mode, "custom");
    assert.equal(custom10d.customStart, "2026-11-13");
    assert.equal(custom10d.customEnd, "2026-11-23");

    const explicitYear = parseIncidentPeriodFromUrl(
      {
        period: "year",
        fromDate: "2025-12-31T17:00:00.000Z",
        toDate: "2026-12-31T16:59:59.999Z",
      },
      "2026-11-23",
    );
    assert.equal(explicitYear.mode, "year");
    assert.equal(explicitYear.anchorDate, "2026-01-01");
  });

  it("checks current period detection and formats labels cleanly", () => {
    assert.equal(
      isIncidentPeriodCurrent(
        {
          mode: "week",
          anchorDate: "2026-11-23",
          customStart: "2026-11-17",
          customEnd: "2026-11-23",
        },
        "2026-11-23",
      ),
      true,
    );
    assert.equal(
      isIncidentPeriodCurrent(
        {
          mode: "month",
          anchorDate: "2026-10-01",
          customStart: "2026-10-01",
          customEnd: "2026-10-01",
        },
        "2026-11-23",
      ),
      false,
    );
    assert.equal(
      formatIncidentPeriodLabel(
        resolveIncidentPeriod({
          mode: "month",
          anchorDate: "2026-11-01",
          customStart: "2026-11-01",
          customEnd: "2026-11-01",
        }),
        "vi-VN",
      ),
      "Tháng 11/2026",
    );
  });

  it("filters items strictly within [fromDate, toDate] for client-side cards", () => {
    const items = [
      { id: "1", createdAt: "2026-11-22T16:59:59.999Z" },
      { id: "2", createdAt: "2026-11-22T17:00:00.000Z" },
      { id: "3", createdAt: "2026-11-23T16:59:59.999Z" },
      { id: "4", createdAt: "2026-11-23T17:00:00.000Z" },
    ];
    const filtered = filterItemsByDateRange(
      items,
      (x) => x.createdAt,
      "2026-11-22T17:00:00.000Z",
      "2026-11-23T16:59:59.999Z",
    );
    assert.deepEqual(
      filtered.map((x) => x.id),
      ["2", "3"],
    );
  });
});
