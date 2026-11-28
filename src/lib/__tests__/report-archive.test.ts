import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countReportTemplates,
  fetchReportArchiveCounts,
  fetchReportHistoryForTypes,
  isReportTypeGroup,
  mergeReportHistoryPages,
  REPORT_TYPE_GROUPS,
  resolveReportTypeFilter,
  toReportArchiveStats,
  type ReportHistoryPage,
} from "../report-archive";
import type { ReportGenerationDto, ReportHistoryQueryDto, ReportTemplateDto } from "@/types";

const BASE_MS = Date.parse("2026-11-01T00:00:00.000Z");

function report(
  id: string,
  reportType: string,
  minuteOffset: number,
  overrides: Partial<ReportGenerationDto> = {},
): ReportGenerationDto {
  const at = new Date(BASE_MS + minuteOffset * 60_000).toISOString();
  return {
    id,
    templateId: "tpl-1",
    siteId: "site-1",
    reportType,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-01",
    generatedBy: "user-1",
    status: "COMPLETED",
    generatedAt: at,
    createdAt: at,
    ...overrides,
  };
}

/** BE giả: lọc 1 reportType / 1 status / siteId, sắp mới → cũ, phân trang offset như GET /reports/history. */
function fakeHistoryApi(rows: ReportGenerationDto[]) {
  const calls: ReportHistoryQueryDto[] = [];
  const fetchPage = async (params: ReportHistoryQueryDto): Promise<ReportHistoryPage> => {
    calls.push(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    assert.ok(limit <= 100, "BE rejects limit > 100");
    const matched = rows
      .filter((row) => !params.siteId || row.siteId === params.siteId)
      .filter((row) => !params.reportType || row.reportType === params.reportType)
      .filter((row) => !params.status || row.status === params.status)
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));
    return {
      items: matched.slice((page - 1) * limit, page * limit),
      meta: {
        page,
        limit,
        total: matched.length,
        totalPages: Math.ceil(matched.length / limit),
      },
    };
  };
  return { calls, fetchPage };
}

describe("report archive filters", () => {
  it("maps the archive type filter to one reportType or to the types of a group", () => {
    assert.deepEqual(resolveReportTypeFilter(""), {});
    assert.deepEqual(resolveReportTypeFilter("DAILY"), { reportType: "DAILY" });
    assert.deepEqual(resolveReportTypeFilter("PERIODIC"), {
      reportTypes: ["DAILY", "WEEKLY", "MONTHLY"],
    });
    assert.deepEqual(resolveReportTypeFilter("SPECIALIZED"), {
      reportTypes: ["VIOLATION_SUMMARY", "AI_PERFORMANCE"],
    });
    assert.equal(isReportTypeGroup("PERIODIC"), true);
    assert.equal(isReportTypeGroup("DAILY"), false);
    assert.equal(isReportTypeGroup("toString"), false);
    assert.deepEqual([...REPORT_TYPE_GROUPS.SPECIALIZED], ["VIOLATION_SUMMARY", "AI_PERFORMANCE"]);
  });
});

describe("report archive counts", () => {
  // 37 hồ sơ ở site-1 (+1 ở site khác), trong khi danh sách chỉ hiện 10 dòng/trang.
  const rows: ReportGenerationDto[] = [
    ...Array.from({ length: 25 }, (_, i) => report(`d${i}`, "DAILY", i)),
    ...Array.from({ length: 5 }, (_, i) => report(`w${i}`, "WEEKLY", 100 + i)),
    ...Array.from({ length: 4 }, (_, i) => report(`m${i}`, "MONTHLY", 200 + i, { status: "FAILED" })),
    report("v1", "VIOLATION_SUMMARY", 300, { status: "PROCESSING" }),
    report("v2", "VIOLATION_SUMMARY", 301, { status: "PENDING" }),
    report("a1", "AI_PERFORMANCE", 400),
    report("other-site", "DAILY", 500, { siteId: "site-2" }),
  ];

  it("counts the whole site from meta.total of limit=1 requests, independent of the visible page", async () => {
    const { calls, fetchPage } = fakeHistoryApi(rows);

    const counts = await fetchReportArchiveCounts(fetchPage, { siteId: "site-1" });

    assert.equal(counts.total, 37);
    assert.deepEqual(counts.byType, {
      DAILY: 25,
      WEEKLY: 5,
      MONTHLY: 4,
      VIOLATION_SUMMARY: 2,
      AI_PERFORMANCE: 1,
    });
    assert.deepEqual(counts.byStatus, { PENDING: 1, PROCESSING: 1, COMPLETED: 31, FAILED: 4 });

    // 1 tổng + 5 loại + 4 trạng thái, mỗi request chỉ xin 1 dòng và giữ đúng cơ sở.
    assert.equal(calls.length, 10);
    for (const call of calls) {
      assert.equal(call.page, 1);
      assert.equal(call.limit, 1);
      assert.equal(call.siteId, "site-1");
    }

    const stats = toReportArchiveStats(counts);
    assert.ok(stats);
    assert.equal(stats.totalReports, 37);
    assert.equal(stats.completedCount, 31);
    assert.equal(stats.processingCount, 2);
    assert.equal(stats.failedCount, 4);
    assert.equal(stats.periodicCount, 34);
    assert.equal(stats.specializedCount, 3);
  });

  it("never invents numbers: missing pagination meta fails, and no data maps to undefined", async () => {
    await assert.rejects(
      fetchReportArchiveCounts(async () => ({ items: [rows[0]] })),
      /meta\.total/,
    );
    assert.equal(toReportArchiveStats(undefined), undefined);
    assert.equal(toReportArchiveStats(null), undefined);
  });

  it("counts templates from the loaded list and stays undefined until it is loaded", () => {
    const templates = [
      { id: "t1", status: "ACTIVE" },
      { id: "t2", status: "INACTIVE" },
      { id: "t3" },
    ] as ReportTemplateDto[];
    assert.deepEqual(countReportTemplates(templates), { active: 2, total: 3 });
    assert.deepEqual(countReportTemplates([]), { active: 0, total: 0 });
    assert.equal(countReportTemplates(undefined), undefined);
  });
});

describe("report history for a type group", () => {
  it("merges several types into one newest-first page with the combined total", () => {
    const page = mergeReportHistoryPages(
      [
        { items: [report("d2", "DAILY", 30), report("d1", "DAILY", 10)], total: 12 },
        { items: [report("w1", "WEEKLY", 20)], total: 3 },
      ],
      1,
      2,
    );
    assert.deepEqual(page.items.map((item) => item.id), ["d2", "w1"]);
    assert.deepEqual(page.meta, { page: 1, limit: 2, total: 15, totalPages: 8 });
  });

  it("returns exactly the requested page of the whole group, with status and site filters kept", async () => {
    const rows = [
      ...Array.from({ length: 12 }, (_, i) => report(`d${i}`, "DAILY", i * 3)),
      ...Array.from({ length: 7 }, (_, i) => report(`w${i}`, "WEEKLY", i * 3 + 1)),
      ...Array.from({ length: 4 }, (_, i) => report(`m${i}`, "MONTHLY", i * 3 + 2)),
      report("failed-daily", "DAILY", 999, { status: "FAILED" }),
      report("violation", "VIOLATION_SUMMARY", 998),
    ];
    const periodicTypes: readonly string[] = REPORT_TYPE_GROUPS.PERIODIC;
    const expectedAll = rows
      .filter((row) => row.status === "COMPLETED" && periodicTypes.includes(row.reportType))
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))
      .map((row) => row.id);

    const { calls, fetchPage } = fakeHistoryApi(rows);
    const page2 = await fetchReportHistoryForTypes(fetchPage, REPORT_TYPE_GROUPS.PERIODIC, {
      page: 2,
      limit: 10,
      status: "COMPLETED",
      siteId: "site-1",
    });

    assert.deepEqual(page2.items.map((item) => item.id), expectedAll.slice(10, 20));
    assert.equal(page2.meta.total, 23);
    assert.equal(page2.meta.totalPages, 3);
    // Mỗi loại 1 request, xin đủ 20 dòng mới nhất cho trang 2, giữ status/site.
    assert.deepEqual(
      calls.map((call) => [call.reportType, call.page, call.limit, call.status, call.siteId]),
      [
        ["DAILY", 1, 20, "COMPLETED", "site-1"],
        ["WEEKLY", 1, 20, "COMPLETED", "site-1"],
        ["MONTHLY", 1, 20, "COMPLETED", "site-1"],
      ],
    );
  });

  it("splits deep pages into batches of 100 only for types that still have rows", async () => {
    const rows = [
      ...Array.from({ length: 150 }, (_, i) => report(`d${i}`, "DAILY", i * 2)),
      ...Array.from({ length: 5 }, (_, i) => report(`w${i}`, "WEEKLY", i * 2 + 1)),
    ];
    const expectedAll = [...rows]
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))
      .map((row) => row.id);

    const { calls, fetchPage } = fakeHistoryApi(rows);
    const page12 = await fetchReportHistoryForTypes(fetchPage, ["DAILY", "WEEKLY"], {
      page: 12,
      limit: 10,
    });

    assert.deepEqual(page12.items.map((item) => item.id), expectedAll.slice(110, 120));
    assert.equal(page12.meta.total, 155);
    assert.deepEqual(
      calls.map((call) => [call.reportType, call.page, call.limit]),
      [
        ["DAILY", 1, 100],
        ["WEEKLY", 1, 100],
        ["DAILY", 2, 100],
      ],
    );
  });
});
