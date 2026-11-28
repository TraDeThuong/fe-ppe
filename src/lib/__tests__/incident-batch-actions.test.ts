import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { ApiError } from "@/lib/axios";
import { incidentService } from "@/services/incident.service";
import { notificationService } from "@/services/notification.service";
import type { EvidenceItem, IncidentItem } from "@/types";
import { batchCountLabel, capBatchItems, closeIncidentsBatch, resolveIncidentsWithReport } from "../incident-actions";
import { deriveDispatchBatches, stableBatchId } from "../incident-dispatch-batches";
import {
  decodeIncidentGroup, incidentGroupHref, notificationIncidentTarget, appendIncidentGroupLink,
} from "../incident-group";
import { uuid, fixtureGroup, fixtureIncident } from "./incident-group.fixtures";

afterEach(() => mock.restoreAll());

const missing = () => new ApiError(404, "NOT_FOUND", "Not found");
const inSite = (n: number, site: number): IncidentItem => ({ ...fixtureIncident(n), siteId: uuid(site) });
const file = new File(["img"], "fixed.jpg", { type: "image/jpeg" });
const uploaded = (incidentId: string, site: number): EvidenceItem => ({
  id: uuid(900), incidentId, cameraId: uuid(300), evidenceType: "SNAPSHOT", mimeType: "image/jpeg",
  fileName: "after_fix_fixed.jpg", fileSize: 3, storageKey: `evidences/${uuid(site)}/${uuid(300)}/after.jpg`,
  capturedAt: "2026-11-18T02:00:00Z", createdAt: "2026-11-18T02:00:00Z",
} as EvidenceItem);

describe("resolveIncidentsWithReport via batch endpoints", () => {
  it("uploads the after-fix photo once per site and shares it through batch-resolve", async () => {
    const incidents = [inSite(1, 400), inSite(2, 400), inSite(3, 400), inSite(4, 401)];
    const upload = mock.method(incidentService, "uploadEvidenceDirect", async (args: { incidentId: string }) =>
      uploaded(args.incidentId, args.incidentId === uuid(4) ? 401 : 400));
    const resolveCalls: Array<{ ids: string[]; sharedEvidence?: { storageKey: string } }> = [];
    mock.method(incidentService, "batchResolveIncidents", async (payload: { ids: string[]; sharedEvidence?: { storageKey: string } }) => {
      resolveCalls.push(payload);
      return { total: payload.ids.length, resolvedCount: payload.ids.length, newStatus: "RESOLVED", resolvedIds: payload.ids, skippedIds: [] };
    });
    const single = mock.method(incidentService, "resolveIncident", async () => { throw new Error("must not be called"); });
    mock.method(notificationService, "triggerIncidentNotification", async () => ({ dispatchedCount: 1, notifications: [] }));

    const res = await resolveIncidentsWithReport({ incidents, resolutionNote: "Đã khắc phục", afterFixFile: file });

    assert.equal(upload.mock.callCount(), 2, "one upload per site, not one per incident");
    assert.equal(single.mock.callCount(), 0);
    assert.equal(res.resolvedCount, 4);
    assert.equal(res.failedCount, 0);
    // Sự cố nhận tệp khi upload không bị gắn thêm bản ghi trùng
    const plain = resolveCalls.find((c) => !c.sharedEvidence)!;
    assert.deepEqual(plain.ids.sort(), [uuid(1), uuid(4)].sort());
    const shared = resolveCalls.find((c) => c.sharedEvidence)!;
    assert.deepEqual(shared.ids, [uuid(2), uuid(3)]);
    assert.match(shared.sharedEvidence!.storageKey, new RegExp(`^evidences/${uuid(400)}/`));
  });

  it("reports close failures instead of swallowing them", async () => {
    mock.method(incidentService, "batchResolveIncidents", async (payload: { ids: string[] }) => ({
      total: payload.ids.length, resolvedCount: payload.ids.length, newStatus: "RESOLVED", resolvedIds: payload.ids, skippedIds: [],
    }));
    mock.method(incidentService, "batchCloseIncidents", async (payload: { ids: string[] }) => ({
      total: payload.ids.length, closedCount: 1, newStatus: "CLOSED", closedIds: [payload.ids[0]], skippedIds: payload.ids.slice(1),
    }));
    const res = await resolveIncidentsWithReport({
      incidents: [fixtureIncident(1), fixtureIncident(2)], resolutionNote: "Đã khắc phục", closeImmediately: true,
    });
    assert.equal(res.resolvedCount, 2);
    assert.equal(res.closedCount, 1);
    assert.equal(res.closeFailedCount, 1);
    assert.ok(res.firstError);
  });

  it("falls back to per-incident calls on 404 and reuses the uploaded file without re-uploading", async () => {
    const incidents = [inSite(1, 400), inSite(2, 400)];
    const upload = mock.method(incidentService, "uploadEvidenceDirect", async (args: { incidentId: string }) => uploaded(args.incidentId, 400));
    mock.method(incidentService, "batchResolveIncidents", async () => { throw missing(); });
    const attach = mock.method(incidentService, "addEvidence", async () => uploaded(uuid(2), 400));
    const resolve = mock.method(incidentService, "resolveIncident", async (id: string) => ({ ...fixtureIncident(1), id, status: "RESOLVED" as const }));
    mock.method(incidentService, "batchCloseIncidents", async () => { throw missing(); });
    const close = mock.method(incidentService, "closeIncident", async (id: string) => {
      if (id === uuid(2)) throw new Error("Không có quyền đóng");
      return { ...fixtureIncident(1), id, status: "CLOSED" as const };
    });

    const res = await resolveIncidentsWithReport({ incidents, resolutionNote: "Đã khắc phục", afterFixFile: file, closeImmediately: true });

    assert.equal(upload.mock.callCount(), 1);
    assert.equal(attach.mock.callCount(), 1, "second incident gets a record pointing to the same object");
    assert.equal(resolve.mock.callCount(), 2);
    assert.equal(close.mock.callCount(), 2);
    assert.equal(res.closedCount, 1);
    assert.equal(res.closeFailedCount, 1);
    assert.equal(res.firstError, "Không có quyền đóng");
  });
});

describe("closeIncidentsBatch", () => {
  it("closes in one request and lists skipped ids", async () => {
    const batch = mock.method(incidentService, "batchCloseIncidents", async (payload: { ids: string[] }) => ({
      total: 3, closedCount: 2, newStatus: "CLOSED", closedIds: payload.ids.slice(0, 2), skippedIds: [payload.ids[2]],
    }));
    const single = mock.method(incidentService, "closeIncident", async () => { throw new Error("must not be called"); });
    const res = await closeIncidentsBatch([uuid(1), uuid(2), uuid(3)], "Nghiệm thu");
    assert.equal(batch.mock.callCount(), 1);
    assert.equal(single.mock.callCount(), 0);
    assert.deepEqual(res.failedIds, [uuid(3)]);
  });
});

describe("deriveDispatchBatches", () => {
  const assigned = (n: number, officer: number, at: string, status: IncidentItem["status"] = "CONFIRMED"): IncidentItem => ({
    ...fixtureIncident(n, status),
    assignments: [{ id: uuid(600 + n), incidentId: uuid(n), assignedTo: uuid(officer), status: "ACTIVE", assignedAt: at }],
  });

  it("groups incidents assigned to the same officer in one operation and keeps a stable id", () => {
    const incidents = [
      assigned(1, 201, "2026-11-18T01:00:00.000Z"),
      assigned(2, 201, "2026-11-18T01:00:00.000Z"),
      assigned(3, 201, "2026-11-18T01:00:04.000Z"),
      assigned(4, 201, "2026-11-18T03:00:00.000Z"), // đợt khác (cách xa) và chỉ 1 sự cố → không tính
      assigned(5, 202, "2026-11-18T01:00:00.000Z"),
      assigned(6, 202, "2026-11-18T01:00:00.000Z", "RESOLVED"),
      { ...fixtureIncident(7, "PENDING_REVIEW"), assignments: [] },
    ];
    const batches = deriveDispatchBatches(incidents);
    assert.equal(batches.length, 2);
    const first = batches.find((b) => b.assignedTo === uuid(201))!;
    assert.deepEqual(first.incidentIds, [uuid(1), uuid(2), uuid(3)]);
    assert.equal(first.groupId, deriveDispatchBatches(incidents).find((b) => b.assignedTo === uuid(201))!.groupId);
    assert.deepEqual(deriveDispatchBatches(incidents, { assignedTo: uuid(202) }).map((b) => b.incidentIds), [[uuid(5), uuid(6)]]);
  });

  it("produces UUID-shaped ids", () => {
    assert.match(stableBatchId("x"), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("group links without member ids in the URL", () => {
  it("links with ?group only and restores members from the browser registry", () => {
    const store = new Map<string, string>();
    const fakeWindow = { localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } };
    const g = globalThis as { window?: unknown };
    const previous = g.window;
    g.window = fakeWindow;
    try {
      const group = fixtureGroup(1000, 100);
      const href = incidentGroupHref(group, uuid(5));
      assert.equal(href, `/incidents/${uuid(5)}?group=${group.groupId}`);
      assert.ok(href.length < 120);
      assert.deepEqual(decodeIncidentGroup(null, group.groupId, uuid(5)), group);
      assert.equal(decodeIncidentGroup(null, group.groupId, uuid(999)), null, "non-member is rejected");
      // Link cũ trong thông báo vẫn mở được và được ghi vào sổ để điều hướng tiếp bằng ?group
      const legacy = fixtureGroup(2000, 3);
      const target = notificationIncidentTarget({ incidentId: uuid(1), content: appendIncidentGroupLink("[ĐIỀU PHỐI] 3 sự cố", legacy) });
      assert.equal(target.href, `/incidents/${uuid(1)}?group=${legacy.groupId}`);
      assert.deepEqual(decodeIncidentGroup(null, legacy.groupId, uuid(2)), legacy);
    } finally {
      g.window = previous;
    }
  });
});

describe("capBatchItems / batchCountLabel", () => {
  it("keeps the 100 newest incidents and labels (100/151)", () => {
    const items = Array.from({ length: 151 }, (_, i) => ({
      ...fixtureIncident(i + 1),
      detectedAt: new Date(Date.UTC(2026, 10, 1) + i * 60_000).toISOString(),
    }));
    const capped = capBatchItems(items);
    assert.equal(capped.length, 100);
    assert.equal(capped[0].id, uuid(151), "newest first");
    assert.ok(!capped.some((i) => i.id === uuid(51)), "oldest 51 are left out");
    assert.equal(batchCountLabel(151), "(100/151)");
    assert.equal(batchCountLabel(7), "(7)");
    assert.equal(capBatchItems(items.slice(0, 5)).length, 5);
  });
});
