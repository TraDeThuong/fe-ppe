import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiClient } from "@/lib/axios";
import { fetchReportArchiveCounts, fetchReportHistoryForTypes } from "@/lib/report-archive";
import { reportingService } from "../reporting.service";

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

/** Giả lập GET /reports/history: trả meta.total theo bộ lọc, ghi lại mọi request. */
function mockHistoryEndpoint(totalFor: (params: Record<string, unknown>) => number) {
  const requests: Array<{ url?: string; params: Record<string, unknown> }> = [];
  apiClient.defaults.adapter = async (config) => {
    const params = (config.params ?? {}) as Record<string, unknown>;
    requests.push({ url: config.url, params });
    const total = totalFor(params);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {
        success: true,
        data: [],
        meta: { page: params.page ?? 1, limit: params.limit ?? 20, total, totalPages: 1 },
      },
    };
  };
  return requests;
}

describe("report archive data through the existing /reports/history API", () => {
  it("builds archive counts from meta.total without any new backend endpoint", async () => {
    const totals: Record<string, number> = {
      DAILY: 25, WEEKLY: 5, MONTHLY: 4, VIOLATION_SUMMARY: 2, AI_PERFORMANCE: 1,
      PENDING: 1, PROCESSING: 1, COMPLETED: 31, FAILED: 4,
    };
    const requests = mockHistoryEndpoint((params) =>
      totals[String(params.reportType ?? params.status ?? "")] ?? 37,
    );

    const counts = await fetchReportArchiveCounts(
      (query) => reportingService.getReportHistory(query),
      { siteId: "site-1" },
    );

    assert.equal(counts.total, 37);
    assert.equal(counts.byType.DAILY, 25);
    assert.equal(counts.byStatus.FAILED, 4);
    assert.equal(requests.length, 10);
    for (const request of requests) {
      assert.equal(request.url, "/reports/history");
      assert.equal(request.params.limit, 1);
      assert.equal(request.params.siteId, "site-1");
      // BE chỉ hiểu reportType/status đơn lẻ — không gửi tham số lạ.
      assert.deepEqual(
        Object.keys(request.params).filter((key) => !["page", "limit", "siteId", "reportType", "status"].includes(key)),
        [],
      );
    }
  });

  it("loads a type group with one request per type, each with a single reportType", async () => {
    const requests = mockHistoryEndpoint(() => 0);

    const page = await fetchReportHistoryForTypes(
      (query) => reportingService.getReportHistory(query),
      ["VIOLATION_SUMMARY", "AI_PERFORMANCE"],
      { page: 1, limit: 10, status: "COMPLETED" },
    );

    assert.equal(page.meta.total, 0);
    assert.deepEqual(
      requests.map((request) => request.params),
      [
        { page: 1, limit: 10, status: "COMPLETED", reportType: "VIOLATION_SUMMARY" },
        { page: 1, limit: 10, status: "COMPLETED", reportType: "AI_PERFORMANCE" },
      ],
    );
  });
});
