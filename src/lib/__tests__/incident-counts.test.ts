import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countIncidents,
  fetchFilteredStatusCounts,
  fetchIncidentBreakdown,
  hasExtendedCountFilters,
  includeAllAssignmentsFor,
  pickStatusCountsFilters,
  withDerivedCounts,
  type IncidentPageFetcher,
} from "../incident-counts";
import type { IncidentQueryParams } from "@/types";

interface Row {
  id: string;
  status: string;
  severity: string;
  violationType: string;
  /** Người đang được giao (phân công ACTIVE). */
  active?: string;
  /** Mọi người từng được giao. */
  everAssigned?: string[];
}

const ME = "00000000-0000-7000-8000-00000000000a";

const ROWS: Row[] = [
  { id: "1", status: "PENDING_REVIEW", severity: "CRITICAL", violationType: "NO_HELMET", active: ME, everAssigned: [ME] },
  { id: "2", status: "PENDING_REVIEW", severity: "LOW", violationType: "NO_VEST" },
  { id: "3", status: "CONFIRMED", severity: "HIGH", violationType: "NO_HELMET", active: ME, everAssigned: [ME] },
  { id: "4", status: "RESOLVED", severity: "CRITICAL", violationType: "NO_HELMET", everAssigned: [ME] },
  { id: "5", status: "CLOSED", severity: "MEDIUM", violationType: "RESTRICTED_AREA", everAssigned: [ME] },
  { id: "6", status: "DISMISSED", severity: "LOW", violationType: "NO_VEST", everAssigned: [ME] },
];

/** Mô phỏng `GET /incidents` của BE develop (lọc assignedTo theo ACTIVE trừ khi includeAllAssignments). */
function fakeList(rows: Row[] = ROWS) {
  const calls: IncidentQueryParams[] = [];
  const fetchPage: IncidentPageFetcher = async (params) => {
    calls.push(params);
    const assignee = params.assignedToMe ? ME : params.assignedTo;
    const matched = rows.filter((row) => {
      if (params.status && row.status !== params.status) return false;
      if (params.severity && row.severity !== params.severity) return false;
      if (params.violationType && row.violationType !== params.violationType) return false;
      if (assignee) {
        const ok = params.includeAllAssignments
          ? (row.everAssigned ?? []).includes(assignee)
          : row.active === assignee;
        if (!ok) return false;
      }
      return true;
    });
    return { items: matched.slice(0, params.limit ?? 20), meta: { page: 1, limit: 1, total: matched.length, totalPages: matched.length } };
  };
  return { fetchPage, calls };
}

describe("incident-counts", () => {
  it("chỉ coi tìm kiếm / mức độ / loại vi phạm / người được giao là bộ lọc mở rộng", () => {
    assert.equal(hasExtendedCountFilters({ siteId: "s", fromDate: "a", toDate: "b" }), false);
    assert.equal(hasExtendedCountFilters({ search: "   " }), false);
    assert.equal(hasExtendedCountFilters({ search: "cổng" }), true);
    assert.equal(hasExtendedCountFilters({ severity: "HIGH" }), true);
    assert.equal(hasExtendedCountFilters({ assignedToMe: true }), true);
  });

  it("pickStatusCountsFilters bỏ mọi tham số status-counts không hỗ trợ", () => {
    assert.deepEqual(
      pickStatusCountsFilters({ siteId: "s", search: "x", severity: "LOW", assignedToMe: true, fromDate: "f" }),
      { siteId: "s", fromDate: "f" },
    );
  });

  it("chỉ đọc mọi phân công cho đã xử lý, đã đóng và Tất cả khi lọc theo người được giao", () => {
    const mine = { assignedToMe: true };
    assert.equal(includeAllAssignmentsFor(mine), true);
    assert.equal(includeAllAssignmentsFor(mine, "RESOLVED"), true);
    assert.equal(includeAllAssignmentsFor(mine, "CLOSED"), true);
    assert.equal(includeAllAssignmentsFor(mine, "PENDING_REVIEW"), false);
    assert.equal(includeAllAssignmentsFor({ severity: "LOW" }), false);
  });

  it("countIncidents ném lỗi khi BE không trả meta.total hợp lệ", async () => {
    await assert.rejects(countIncidents(async () => ({ items: [] }), {}), /Invalid incident count metadata/);
  });

  it("đếm theo đủ bộ lọc; mỗi số khớp đúng danh sách mở ra khi bấm vào nó", async () => {
    const { fetchPage, calls } = fakeList();
    const counts = await fetchFilteredStatusCounts(fetchPage, { assignedToMe: true });
    assert.deepEqual(counts, {
      total: 5,
      pendingReview: 1,
      confirmed: 1,
      critical: 2,
      resolved: 2,
      closed: 1,
      dismissed: 0,
      remediated: 2,
      falseAlarms: 0,
    });
    assert.ok(calls.every((call) => call.limit === 1 && call.page === 1));
    assert.equal(calls.length, 7);
  });

  it("không gọi request đếm nghiêm trọng khi đang lọc một mức độ khác", async () => {
    const { fetchPage, calls } = fakeList();
    const counts = await fetchFilteredStatusCounts(fetchPage, { severity: "LOW" });
    assert.equal(counts.critical, 0);
    assert.equal(counts.total, 2);
    assert.equal(calls.length, 6);
  });

  it("phân bố theo mức độ / loại vi phạm, chiều đã lọc cố định thì không gọi thêm", async () => {
    const { fetchPage, calls } = fakeList();
    const breakdown = await fetchIncidentBreakdown(fetchPage, { violationType: "NO_HELMET" });
    assert.deepEqual(breakdown.byViolationType, { NO_HELMET: 3, NO_VEST: 0, RESTRICTED_AREA: 0, MULTI_VIOLATION: 0 });
    assert.deepEqual(breakdown.bySeverity, { CRITICAL: 2, HIGH: 1, MEDIUM: 0, LOW: 0 });
    assert.equal(calls.length, 5);
  });

  it("withDerivedCounts giữ giá trị có sẵn và suy ra phần thiếu", () => {
    const base = { total: 3, pendingReview: 1, confirmed: 0, critical: 0, resolved: 1, closed: 0, dismissed: 1 };
    assert.equal(withDerivedCounts(base).remediated, 1);
    assert.equal(withDerivedCounts(base).falseAlarms, 1);
    assert.equal(withDerivedCounts({ ...base, remediated: 7 }).remediated, 7);
  });
});
