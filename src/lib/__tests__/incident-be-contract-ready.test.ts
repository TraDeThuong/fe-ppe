import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { ApiError, apiClient } from "@/lib/axios";
import { incidentService } from "@/services/incident.service";
import { userService } from "@/services/user.service";
import type { IncidentItem } from "@/types";
import { dispatchIncidentsWithSignal } from "../incident-actions";
import { deriveDispatchBatches, groupFromBatchItems, UNKNOWN_DISPATCHER_ID } from "../incident-dispatch-batches";
import { mergeStatusBuckets } from "@/hooks/incidents/use-assignment-incidents";
import { groupServerFilter, mergeLoadedIncidents } from "@/hooks/incidents/use-group-load-more";
import { uuid, fixtureIncident } from "./incident-group.fixtures";

afterEach(() => mock.restoreAll());

const BATCH = "11111111-1111-4111-8111-111111111111";
const withAssignment = (n: number, extra: Record<string, unknown>, status: IncidentItem["status"] = "CONFIRMED"): IncidentItem => ({
  ...fixtureIncident(n, status),
  assignments: [{ id: uuid(700 + n), incidentId: uuid(n), assignedTo: uuid(201), status: "ACTIVE", assignedAt: "2026-11-18T01:00:00.000Z", ...extra }],
});

describe("Hợp đồng mục 3 — CONFIRMED chưa giao / đã giao", () => {
  it("gộp nhóm tách và giữ 2 số đếm", () => {
    const merged = mergeStatusBuckets({
      confirmedUnassigned: { items: [fixtureIncident(1)], total: 140 },
      confirmedAssigned: { items: [withAssignment(2, {})], total: 60 },
    });
    assert.equal(merged.totals.confirmedUnassigned, 140);
    assert.equal(merged.totals.confirmedAssigned, 60);
    assert.equal(merged.totals.confirmed, 200);
    assert.equal(merged.items.length, 2);
  });

  it("BE cũ: không có nhóm tách thì không có số đếm tách", () => {
    const merged = mergeStatusBuckets({ confirmed: { items: [fixtureIncident(1)], total: 139 } });
    assert.equal(merged.totals.confirmedUnassigned, undefined);
    assert.equal(merged.totals.confirmed, 139);
  });

  it("bộ lọc server theo cách gom nhóm", () => {
    const inc = fixtureIncident(1);
    assert.deepEqual(groupServerFilter({ groupBy: "camera", items: [inc] }), { cameraId: inc.cameraId });
    assert.deepEqual(groupServerFilter({ groupBy: "severity", items: [inc] }), { severity: "HIGH" });
    assert.deepEqual(groupServerFilter({ groupBy: "violation", items: [inc] }), { violationType: "NO_HELMET" });
    assert.deepEqual(
      groupServerFilter({ groupBy: "officer", items: [inc], officerMeta: { officerId: uuid(201), officerName: "A", activeCount: 1, resolvedCount: 0 } }),
      { assignedTo: uuid(201) },
    );
    assert.deepEqual(groupServerFilter({ groupBy: "hour", items: [inc] }), {});
  });

  it("hồ sơ tải thêm không đè bản mới hơn trong danh sách chính", () => {
    const fresh = { ...fixtureIncident(1), status: "RESOLVED" as const };
    const stale = fixtureIncident(1);
    const merged = mergeLoadedIncidents([fresh], [stale, fixtureIncident(2)]);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((i) => i.id === uuid(1))!.status, "RESOLVED");
  });
});

describe("Hợp đồng mục 4 — đợt giao việc có batchId / assignedBy / note", () => {
  it("BE có batchId: gom đúng đợt (kể cả 1 sự cố), có người giao và chỉ đạo", () => {
    const batches = deriveDispatchBatches([
      withAssignment(1, { batchId: BATCH, assignedBy: uuid(200), note: "Nhắc tổ 4" }),
      withAssignment(2, { batchId: BATCH, assignedBy: uuid(200), assignedAt: "2026-11-18T05:00:00.000Z" }),
      withAssignment(3, { batchId: "22222222-2222-4222-8222-222222222222" }),
    ]);
    const main = batches.find((b) => b.groupId === BATCH)!;
    assert.deepEqual(main.incidentIds, [uuid(1), uuid(2)]);
    assert.equal(main.assignedBy, uuid(200));
    assert.equal(main.note, "Nhắc tổ 4");
    const single = batches.find((b) => b.groupId !== BATCH)!;
    assert.equal(single.incidentIds.length, 1);
    assert.equal(single.assignedBy, UNKNOWN_DISPATCHER_ID);
  });

  it("dựng nhóm từ GET /incidents?batchId chỉ khi kết quả mang đúng batchId (BE cũ bỏ qua tham số)", () => {
    assert.equal(groupFromBatchItems(BATCH, [fixtureIncident(1), fixtureIncident(2)]), null);
    const group = groupFromBatchItems(BATCH, [
      withAssignment(1, { batchId: BATCH, assignedBy: uuid(200) }, "RESOLVED"),
      fixtureIncident(9),
    ]);
    assert.deepEqual(group?.incidentIds, [uuid(1)]);
  });

  it("batch-assign trả batchId → dùng làm id nhóm", async () => {
    mock.method(incidentService, "batchAssignIncidents", async (payload: { ids: string[] }) => ({
      total: payload.ids.length, assignedCount: payload.ids.length, assignedTo: uuid(201),
      assignedIds: payload.ids, skippedIds: [], batchId: BATCH,
    }));
    const res = await dispatchIncidentsWithSignal({
      incidents: [fixtureIncident(1), fixtureIncident(2)], assignedTo: uuid(201), managerId: uuid(200), groupDispatch: true,
    });
    assert.equal(res.group?.groupId, BATCH);
  });
});

describe("Hợp đồng mục 5 — GET /users/site-staff", () => {
  it("BE có endpoint: trả danh sách", async () => {
    mock.method(apiClient, "get", async () => ({ success: true, data: [{ id: uuid(201), fullName: "Officer A", role: { name: "SAFETY_OFFICER" } }] }));
    const users = await userService.getSiteStaff(uuid(400));
    assert.equal(users?.[0].id, uuid(201));
  });

  it("BE hiện tại khớp nhầm /users/:id (422) hoặc 404/403 → null để dùng cách cũ", async () => {
    for (const error of [
      new ApiError(422, "VALIDATION_ERROR", "Validation failed", [{ field: "id", message: "Invalid user ID format" }] as never),
      new ApiError(404, "NOT_FOUND", "Not found"),
      new ApiError(403, "FORBIDDEN", "Forbidden"),
    ]) {
      mock.method(apiClient, "get", async () => { throw error; });
      assert.equal(await userService.getSiteStaff(uuid(400)), null);
      mock.restoreAll();
    }
  });

  it("lỗi khác (500) vẫn ném ra", async () => {
    mock.method(apiClient, "get", async () => { throw new ApiError(500, "INTERNAL", "boom"); });
    await assert.rejects(userService.getSiteStaff(uuid(400)), /boom/);
  });
});
