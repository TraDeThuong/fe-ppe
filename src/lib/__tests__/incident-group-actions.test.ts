import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import type { DispatchIncidentNotificationPayload, DispatchIncidentNotificationResult, EvidenceItem, NotificationListResponse } from "@/types";
import { dispatchIncidentsWithSignal, sendDispatchSignal } from "../incident-actions";
import { ensureIncidentGroupCompletion, loadIncidentGroup, resolveIncidentGroupMembers, type UploadedGroupEvidence } from "../incident-group-actions";
import { appendIncidentGroupLink, notificationIncidentTarget } from "../incident-group";
import { RESOLVED_REPORT_PREFIX } from "../incident-workflow";
import { uuid, fixtureGroup, fixtureIncident } from "./incident-group.fixtures";
import { ApiError } from "@/lib/axios";

/** BE đang chạy chưa có POST /incidents/batch-assign → FE chuyển sang giao từng sự cố. */
function batchAssignMissing() {
  return mock.method(incidentService, "batchAssignIncidents", async () => { throw new ApiError(404, "NOT_FOUND", "Not found"); });
}

afterEach(() => mock.restoreAll());
function delivered(payload: DispatchIncidentNotificationPayload): DispatchIncidentNotificationResult {
  const notifications = (payload.recipientUserIds || []).map((userId) => ({ id: uuid(999), userId, channel: "IN_APP" as const, status: "SENT" as const }));
  return { incidentId: payload.incidentId, dispatchedCount: notifications.length, channels: ["IN_APP"], notifications };
}
function emptyInbox() {
  return mock.method(notificationService, "getNotifications", async () => ({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } }));
}

describe("dispatch exact successful group membership", () => {
  it("excludes review and assignment failures, sorts stably and retains exact notification for retry", async () => {
    batchAssignMissing();
    const inputs = [fixtureIncident(3, "PENDING_REVIEW"), fixtureIncident(1, "PENDING_REVIEW"), fixtureIncident(4), fixtureIncident(2, "PENDING_REVIEW")];
    mock.method(incidentService, "batchReviewIncidents", async () => ({ updatedIds: [uuid(1), uuid(3)], updatedCount: 2 }));
    const reads = mock.method(incidentService, "getIncidentById", async (id: string) => inputs.find((incident) => incident.id === id) && { ...inputs.find((incident) => incident.id === id)!, status: "CONFIRMED" as const });
    const assignment = mock.method(incidentService, "assignOfficer", async (id: string) => {
      if (id === uuid(3)) throw new Error("Assignment rejected");
      return fixtureIncident(1).assignments![0];
    });
    const trigger = mock.method(notificationService, "triggerIncidentNotification", async () => { throw new Error("offline"); });
    const result = await dispatchIncidentsWithSignal({ incidents: inputs, assignedTo: uuid(201), managerId: uuid(200), groupDispatch: true });
    assert.deepEqual(result.assignedIds, [uuid(1), uuid(4)]);
    assert.deepEqual(result.group!.incidentIds, result.assignedIds);
    assert.equal(result.failedCount, 2);
    assert.ok(result.failedItems.some((row) => row.id === uuid(2) && row.stage === "review"));
    assert.ok(result.failedItems.some((row) => row.id === uuid(3) && row.stage === "assignment"));
    assert.ok(!reads.mock.calls.some((call) => call.arguments[0] === uuid(2)));
    assert.equal(result.signalSent, false);
    const payload = result.notificationPayload!;
    assert.deepEqual(notificationIncidentTarget({ incidentId: payload.incidentId, content: payload.description }).group, result.group);
    trigger.mock.mockImplementation(async (input: DispatchIncidentNotificationPayload) => delivered(input));
    assert.equal(await sendDispatchSignal(payload), true);
    assert.equal(assignment.mock.callCount(), 3, "notification retry must not assign again");
  });
  it("validates the 100-member cap before any write", async () => {
    const review = mock.method(incidentService, "batchReviewIncidents");
    await assert.rejects(dispatchIncidentsWithSignal({ incidents: Array.from({ length: 101 }, (_, i) => fixtureIncident(i + 1, "PENDING_REVIEW")), assignedTo: uuid(201), managerId: uuid(200), groupDispatch: true }), /100/);
    assert.equal(review.mock.callCount(), 0);
  });
  it("does not announce dispatch when a 200 response creates no notifications", async () => {
    batchAssignMissing();
    mock.method(incidentService, "assignOfficer", async () => fixtureIncident(1).assignments![0]);
    mock.method(notificationService, "triggerIncidentNotification", async () => ({ incidentId: uuid(1), dispatchedCount: 0, channels: [], notifications: [] }));
    const result = await dispatchIncidentsWithSignal({ incidents: [fixtureIncident(1)], assignedTo: uuid(201) });
    assert.equal(result.group, undefined, "single legacy actions retain single-record behavior");
    assert.equal(result.assignedCount, 1);
    assert.equal(result.signalSent, false);
  });
});

describe("dispatch through POST /incidents/batch-assign", () => {
  it("assigns in one request, reports skipped ids and lets the server send the notification", async () => {
    const inputs = [fixtureIncident(1, "PENDING_REVIEW"), fixtureIncident(2), fixtureIncident(3)];
    mock.method(incidentService, "batchReviewIncidents", async () => ({ updatedIds: [uuid(1)], updatedCount: 1 }));
    const batch = mock.method(incidentService, "batchAssignIncidents", async (payload: { ids: string[] }) => ({
      total: payload.ids.length, assignedCount: 2, assignedTo: uuid(201), assignedIds: [uuid(1), uuid(2)], skippedIds: [uuid(3)],
    }));
    const single = mock.method(incidentService, "assignOfficer", async () => { throw new Error("must not be called"); });
    const reads = mock.method(incidentService, "getIncidentById", async () => { throw new Error("must not be called"); });
    const trigger = mock.method(notificationService, "triggerIncidentNotification", async () => { throw new Error("must not be called"); });
    const result = await dispatchIncidentsWithSignal({ incidents: inputs, assignedTo: uuid(201), managerId: uuid(200), groupDispatch: true, note: "Đội mũ" });
    assert.equal(batch.mock.callCount(), 1);
    assert.deepEqual(batch.mock.calls[0].arguments[0], { ids: [uuid(1), uuid(2), uuid(3)], assignedTo: uuid(201), note: "Đội mũ" });
    assert.deepEqual(result.assignedIds, [uuid(1), uuid(2)]);
    assert.deepEqual(result.failedItems.map((row) => [row.id, row.stage]), [[uuid(3), "assignment"]]);
    assert.equal(result.notifiedByServer, true);
    assert.equal(result.signalSent, true);
    assert.equal(result.notificationPayload, undefined);
    assert.deepEqual(result.group!.incidentIds, [uuid(1), uuid(2)]);
    assert.equal(single.mock.callCount() + reads.mock.callCount() + trigger.mock.callCount(), 0);
  });
  it("reports a batch error without falling back when the endpoint exists", async () => {
    mock.method(incidentService, "batchAssignIncidents", async () => { throw new ApiError(400, "VALIDATION_ERROR", "Người được phân công không thuộc công trường"); });
    const single = mock.method(incidentService, "assignOfficer", async () => fixtureIncident(1).assignments![0]);
    const result = await dispatchIncidentsWithSignal({ incidents: [fixtureIncident(1)], assignedTo: uuid(201) });
    assert.equal(result.assignedCount, 0);
    assert.equal(result.failedItems[0]?.message, "Người được phân công không thuộc công trường");
    assert.equal(single.mock.callCount(), 0);
  });
});

describe("group reads and remediation", () => {
  it("loads at most four concurrently, preserves order and reports missing members", async () => {
    let concurrent = 0, peak = 0;
    mock.method(incidentService, "getIncidentById", async (id: string) => {
      peak = Math.max(peak, ++concurrent);
      await new Promise((resolve) => setTimeout(resolve, 2));
      concurrent--;
      if (id === uuid(5)) throw new Error("403");
      return { ...fixtureIncident(1), id };
    });
    const group = fixtureGroup(1100, 9);
    const result = await loadIncidentGroup(group);
    assert.equal(peak, 4);
    assert.deepEqual(result.rows.map((row) => row.id), group.incidentIds);
    assert.equal(result.rows[4].error, "403");
    const abort = new AbortController(); abort.abort();
    await assert.rejects(loadIncidentGroup(group, abort.signal), { name: "AbortError" });
  });
  it("reports upload/update/access failures separately and retries only failures without duplicate upload", async () => {
    const group = fixtureGroup(1101, 4);
    const records = new Map(group.incidentIds.map((id, i) => [id, fixtureIncident(i + 1)]));
    records.set(uuid(4), { ...fixtureIncident(4), assignments: [] });
    let uploadFail = true, resolveFail = true;
    mock.method(incidentService, "getIncidentById", async (id: string) => records.get(id)!);
    const upload = mock.method(incidentService, "uploadEvidenceDirect", async ({ incidentId }: { incidentId: string }) => {
      if (incidentId === uuid(2) && uploadFail) throw new Error("Upload failed");
      return { id: `evidence-${incidentId}` } as EvidenceItem;
    });
    const resolve = mock.method(incidentService, "resolveIncident", async (id: string) => {
      if (id === uuid(3) && resolveFail) throw new Error("Update failed");
      const updated = { ...records.get(id)!, status: "RESOLVED" as const };
      records.set(id, updated); return updated;
    });
    const trigger = mock.method(notificationService, "triggerIncidentNotification");
    const uploadedEvidence: UploadedGroupEvidence = new Map();
    const file = new File(["photo"], "remediation.jpg", { type: "image/jpeg" });
    const input = { group, userId: group.assignedTo, resolutionNote: "Fixed with shared evidence", afterFixFile: file, uploadedEvidence };
    const first = await resolveIncidentGroupMembers({ ...input, ids: group.incidentIds });
    assert.deepEqual(first.succeeded.map((row) => row.id), [uuid(1)]);
    assert.deepEqual(first.failed.map(({ id, stage }) => [id, stage]), [[uuid(2), "upload"], [uuid(3), "resolve"], [uuid(4), "access"]]);
    assert.ok(!resolve.mock.calls.some((call) => call.arguments[0] === uuid(2)));
    uploadFail = false; resolveFail = false;
    const retry = await resolveIncidentGroupMembers({ ...input, ids: first.failed.filter((row) => row.stage !== "access").map((row) => row.id) });
    assert.equal(retry.succeeded.length, 2);
    assert.equal(upload.mock.calls.filter((call) => call.arguments[0].incidentId === uuid(3)).length, 1);
    assert.equal(resolve.mock.calls.filter((call) => call.arguments[0] === uuid(1)).length, 1);
    assert.equal(trigger.mock.callCount(), 0, "group remediation must not emit per-record signals");
  });
  it("does not mark a resolve as verified until detail returns RESOLVED", async () => {
    const group = fixtureGroup(1102, 1);
    mock.method(incidentService, "getIncidentById", async () => fixtureIncident(1));
    mock.method(incidentService, "resolveIncident", async () => fixtureIncident(1, "RESOLVED"));
    const result = await resolveIncidentGroupMembers({ group, ids: group.incidentIds, userId: group.assignedTo, resolutionNote: "Done" });
    assert.equal(result.succeeded.length, 0);
    assert.equal(result.failed[0].stage, "verify");
    await assert.rejects(resolveIncidentGroupMembers({ group, ids: group.incidentIds, userId: group.assignedBy, resolutionNote: "Done" }), /quyền/);
  });
  it("stops before resolve if the account/permission scope is cancelled during upload", async () => {
    const group = fixtureGroup(1103, 1);
    const controller = new AbortController();
    mock.method(incidentService, "getIncidentById", async () => fixtureIncident(1));
    mock.method(incidentService, "uploadEvidenceDirect", async () => { controller.abort(); return { id: uuid(900) } as EvidenceItem; });
    const resolve = mock.method(incidentService, "resolveIncident");
    const result = await resolveIncidentGroupMembers({ group, ids: group.incidentIds, userId: group.assignedTo,
      resolutionNote: "Done", afterFixFile: new File(["photo"], "fix.jpg"), signal: controller.signal });
    assert.equal(result.succeeded.length, 0);
    assert.equal(resolve.mock.callCount(), 0);
  });
});

describe("verified completion and one summary", () => {
  it("re-reads all members and never sends while any member is inaccessible or unresolved", async () => {
    const group = fixtureGroup(1200);
    const reads = mock.method(incidentService, "getIncidentById", async (id: string) => {
      if (id === uuid(2)) throw new Error("404");
      return { ...fixtureIncident(1, "RESOLVED"), id };
    });
    const trigger = mock.method(notificationService, "triggerIncidentNotification");
    const result = await ensureIncidentGroupCompletion({ group, userId: group.assignedTo });
    assert.equal(result.delivery.state, "incomplete");
    assert.equal(reads.mock.callCount(), 3);
    assert.equal(trigger.mock.callCount(), 0);
  });
  it("targets only manager and officer, deduplicates concurrent calls and survives a remount", async () => {
    const group = fixtureGroup(1201);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    emptyInbox();
    const trigger = mock.method(notificationService, "triggerIncidentNotification", async (payload: DispatchIncidentNotificationPayload) => delivered(payload));
    const results = await Promise.all([1, 2].map(() => ensureIncidentGroupCompletion({ group, userId: group.assignedTo, officerName: "Officer" })));
    assert.ok(results.every((row) => row.delivery.state === "sent"));
    assert.equal(trigger.mock.callCount(), 1);
    assert.deepEqual(trigger.mock.calls[0].arguments[0].recipientUserIds, [group.assignedBy, group.assignedTo]);
    assert.deepEqual(notificationIncidentTarget({ incidentId: uuid(1), content: trigger.mock.calls[0].arguments[0].description }).group, group);
    await ensureIncidentGroupCompletion({ group, userId: group.assignedTo });
    assert.equal(trigger.mock.callCount(), 1);
  });
  it("uses a persisted inbox receipt on another device without claiming manager delivery", async () => {
    const group = fixtureGroup(1202);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    mock.method(notificationService, "getNotifications", async () => ({ data: [{ incidentId: uuid(1), content: appendIncidentGroupLink(RESOLVED_REPORT_PREFIX, group) }], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } }));
    const trigger = mock.method(notificationService, "triggerIncidentNotification");
    const result = await ensureIncidentGroupCompletion({ group, userId: group.assignedTo });
    assert.equal(result.delivery.state, "recorded");
    assert.equal(trigger.mock.callCount(), 0);
  });
  it("preserves saved remediation on delivery failure and retries the summary alone", async () => {
    const group = fixtureGroup(1203);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    emptyInbox();
    const resolve = mock.method(incidentService, "resolveIncident");
    const trigger = mock.method(notificationService, "triggerIncidentNotification", async () => { throw new Error("Notification offline"); });
    const first = await ensureIncidentGroupCompletion({ group, userId: group.assignedTo });
    assert.equal(first.delivery.state, "failed");
    assert.ok(first.snapshot.rows.every((row) => row.incident?.status === "RESOLVED"));
    trigger.mock.mockImplementation(async (payload: DispatchIncidentNotificationPayload) => delivered(payload));
    assert.equal((await ensureIncidentGroupCompletion({ group, userId: group.assignedTo, retryDelivery: true })).delivery.state, "sent");
    assert.equal(resolve.mock.callCount(), 0);
  });
  it("distinguishes preferences/count-zero and retries only the recipient not yet reached", async () => {
    const group = fixtureGroup(1204);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    emptyInbox();
    const trigger = mock.method(notificationService, "triggerIncidentNotification", async (payload: DispatchIncidentNotificationPayload) => delivered({ ...payload, recipientUserIds: [group.assignedTo] }));
    assert.equal((await ensureIncidentGroupCompletion({ group, userId: group.assignedTo })).delivery.state, "partial");
    trigger.mock.mockImplementation(async (payload: DispatchIncidentNotificationPayload) => delivered(payload));
    assert.equal((await ensureIncidentGroupCompletion({ group, userId: group.assignedTo, retryDelivery: true })).delivery.state, "sent");
    assert.deepEqual(trigger.mock.calls[1].arguments[0].recipientUserIds, [group.assignedBy]);
    const other = fixtureGroup(1205);
    trigger.mock.mockImplementation(async () => ({ incidentId: uuid(1), dispatchedCount: 0, channels: [], notifications: [] }));
    assert.equal((await ensureIncidentGroupCompletion({ group: other, userId: other.assignedTo })).delivery.state, "suppressed");
    await ensureIncidentGroupCompletion({ group: other, userId: other.assignedTo });
    assert.equal(trigger.mock.callCount(), 3, "preferences must not trigger automatic retry loops");
  });
  it("does not send automatically when the prior-notification lookup fails", async () => {
    const group = fixtureGroup(1206);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    mock.method(notificationService, "getNotifications", async () => { throw new Error("Inbox inaccessible"); });
    const trigger = mock.method(notificationService, "triggerIncidentNotification");
    assert.equal((await ensureIncidentGroupCompletion({ group, userId: group.assignedTo })).delivery.state, "failed");
    assert.equal(trigger.mock.callCount(), 0);
  });
  it("reads all receipt pages and rejects missing pagination metadata", async () => {
    const group = fixtureGroup(1207);
    mock.method(incidentService, "getIncidentById", async (id: string) => ({ ...fixtureIncident(1, "RESOLVED"), id }));
    const inbox = mock.method(notificationService, "getNotifications", async (params: { page: number }) => ({ data: params.page === 2 ? [{ incidentId: uuid(1), content: appendIncidentGroupLink(RESOLVED_REPORT_PREFIX, group) }] : [], meta: { page: params.page, limit: 100, total: 101, totalPages: 2 } }));
    const trigger = mock.method(notificationService, "triggerIncidentNotification");
    assert.equal((await ensureIncidentGroupCompletion({ group, userId: group.assignedTo })).delivery.state, "recorded");
    assert.equal(inbox.mock.callCount(), 2);
    assert.equal(trigger.mock.callCount(), 0);
    inbox.mock.mockImplementation(async () => ({ data: [] }) as unknown as NotificationListResponse);
    const other = fixtureGroup(1208);
    assert.equal((await ensureIncidentGroupCompletion({ group: other, userId: other.assignedTo })).delivery.state, "failed");
    assert.equal(trigger.mock.callCount(), 0);
  });
});
