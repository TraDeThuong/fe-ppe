import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  falseAlarmRate,
  incidentOutcomeOf,
  outcomeCountsFromStatusCounts,
  outcomeCountsFromSummary,
  resolutionRate,
  reviewedCount,
} from "../metrics/incident-metrics";

describe("incident-metrics", () => {
  const summary = {
    totalIncidents: 100,
    openIncidents: 40,
    trueViolations: 20, // CONFIRMED
    resolvedIncidents: 30, // RESOLVED + CLOSED
    falseAlarms: 10,
    falseAlarmRate: 33.33, // công thức BE: 10 / (20 + 10)
    complianceRate: 80,
    meanTimeToResolveHours: 1,
  };

  it("tỷ lệ cảnh báo sai tính cả sự cố đã xử lý vào mẫu số (khác BE)", () => {
    const outcome = outcomeCountsFromSummary(summary);
    assert.equal(reviewedCount(outcome), 60);
    assert.equal(falseAlarmRate(outcome), (10 / 60) * 100);
    assert.equal(resolutionRate(outcome), 60);
  });

  it("status-counts và summary cùng dữ liệu cho ra cùng tỷ lệ", () => {
    const fromCounts = outcomeCountsFromStatusCounts({
      total: 100, pendingReview: 40, confirmed: 20, critical: 3, resolved: 30, closed: 12, dismissed: 10,
    });
    assert.equal(falseAlarmRate(fromCounts), falseAlarmRate(outcomeCountsFromSummary(summary)));
  });

  it("không có sự cố được duyệt thì trả null thay vì 0", () => {
    const empty = outcomeCountsFromSummary({ ...summary, trueViolations: 0, resolvedIncidents: 0, falseAlarms: 0 });
    assert.equal(falseAlarmRate(empty), null);
    assert.equal(resolutionRate(empty), null);
  });

  it("CLOSED: ưu tiên lịch sử, thiếu lịch sử thì dựa vào resolvedAt", () => {
    const history = (oldStatus: string) => [{ oldStatus, newStatus: "CLOSED", changedAt: "2026-11-20T00:00:00Z" }];
    assert.equal(incidentOutcomeOf({ status: "CLOSED", statusHistory: history("DISMISSED"), resolvedAt: "x" }), "dismissed");
    assert.equal(incidentOutcomeOf({ status: "CLOSED", statusHistory: history("RESOLVED") }), "resolved");
    assert.equal(incidentOutcomeOf({ status: "CLOSED", resolvedAt: "2026-11-20T00:00:00Z" }), "resolved");
    assert.equal(incidentOutcomeOf({ status: "CLOSED" }), "dismissed");
    assert.equal(incidentOutcomeOf({ status: "PENDING_REVIEW" }), "pending");
  });
});
