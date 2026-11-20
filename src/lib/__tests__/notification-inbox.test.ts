import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NotificationItemDto, NotificationListResponse } from "@/types";
import { BROADCAST_USER_ID, collectNotificationInbox, normalizeNotificationInbox, notificationInboxPage, isNotificationRead } from "../notification-inbox";
import { applyNotificationInboxAction } from "../notification-inbox-actions";

const row = (id: string, userId: string, extra: Partial<NotificationItemDto> = {}): NotificationItemDto => ({
  id, userId, title: "Thông báo an toàn", content: "Kiểm tra PPE", channel: "IN_APP", status: "SENT", severity: "NORMAL",
  incidentId: null, templateId: null, sentAt: "2026-11-18T09:00:00Z", readAt: null, createdAt: "2026-11-18T09:00:00Z", ...extra,
});
const service = { markAsRead: async (_id: string) => {}, markAllAsRead: async () => {}, deleteNotification: async (_id: string) => {} };
describe("frontend-only broadcast inbox", () => {
  it("keeps the owned copy and normalizes before read filtering and pagination", () => {
    const raw = [row("global-1", BROADCAST_USER_ID), row("owned-1", "u1", { status: "READ", isRead: true })];
    const snapshot = normalizeNotificationInbox(raw, "u1");
    assert.deepEqual(snapshot.items.map((item) => item.id), ["owned-1"]);
    assert.equal(notificationInboxPage(snapshot, { isRead: false }).meta.total, 0);
    assert.equal(notificationInboxPage(snapshot, { isRead: true, limit: 1 }).meta.total, 1);
  });
  it("does not merge repeated sends, two owned rows, different incidents/channels or payloads", () => {
    const raw = [row("global-2", BROADCAST_USER_ID), row("owned-2", "u2"), row("direct-2", "u2"),
      row("later-global-2", BROADCAST_USER_ID, { createdAt: "2026-11-18T09:01:00Z" }),
      row("later-owned-2", "u2", { createdAt: "2026-11-18T09:01:00Z" }),
      row("email-2", "u2", { channel: "EMAIL" }), row("incident-2", "u2", { incidentId: "incident" }),
      row("different-2", BROADCAST_USER_ID, { content: "Khác nội dung" })];
    const snapshot = normalizeNotificationInbox(raw, "u2");
    assert.equal(snapshot.items.length, 6);
    assert.ok(snapshot.items.some((item) => item.id === "direct-2"));
    assert.equal(notificationInboxPage(snapshot, { channel: "EMAIL" }).meta.total, 1);
    assert.equal(notificationInboxPage(snapshot, { search: "Khác nội dung" }).meta.total, 1);
  });
  it("keeps orphan global notifications and scopes receipts to the account", () => {
    const global = row("global-3", BROADCAST_USER_ID);
    normalizeNotificationInbox([global, row("owned-3", "u3")], "u3");
    assert.equal(normalizeNotificationInbox([global], "u3").items.length, 0, "deleted owned copy must not reveal shared copy");
    assert.equal(normalizeNotificationInbox([global], "another-user-3").items.length, 1);
    assert.throws(() => normalizeNotificationInbox([row("wrong-owner", "u3")], "other-account"), /tài khoản/);
  });
  it("marks/deletes shared-only records locally and never mutates another owner's server row", async () => {
    const global = row("global-4", BROADCAST_USER_ID);
    const snapshot = normalizeNotificationInbox([global], "u4");
    const rejectServer = { markAsRead: async () => { throw Error("must not PATCH shared"); }, deleteNotification: async () => { throw Error("must not DELETE shared"); }, markAllAsRead: service.markAllAsRead };
    const read = await applyNotificationInboxAction({ snapshot, userId: "u4", action: "read", id: global.id }, rejectServer);
    assert.equal(isNotificationRead(read.items[0]), true);
    assert.equal(isNotificationRead(normalizeNotificationInbox([global], "u4").items[0]), true);
    await applyNotificationInboxAction({ snapshot: read, userId: "u4", action: "delete", id: global.id }, rejectServer);
    assert.equal(normalizeNotificationInbox([global], "u4").items.length, 0);
    assert.equal(normalizeNotificationInbox([global], "other-u4").items.length, 1);
  });
  it("only writes the canonical owned ID; failure preserves state and retry is possible", async () => {
    const raw = [row("global-5", BROADCAST_USER_ID), row("owned-5", "u5")];
    const snapshot = normalizeNotificationInbox(raw, "u5");
    const called: string[] = [];
    const read = await applyNotificationInboxAction({ snapshot, userId: "u5", action: "read", id: "owned-5" }, { ...service, markAsRead: async (id) => { called.push(id); } });
    assert.deepEqual(called, ["owned-5"]);
    assert.equal(isNotificationRead(read.items[0]), true);
    await assert.rejects(applyNotificationInboxAction({ snapshot, userId: "u5", action: "delete", id: "owned-5" }, { ...service, deleteNotification: async () => { throw Error("offline"); } }), /offline/);
    assert.equal(snapshot.items.length, 1);
    await applyNotificationInboxAction({ snapshot, userId: "u5", action: "delete", id: "owned-5" }, service);
    assert.equal(normalizeNotificationInbox([raw[0]], "u5").items.length, 0);
  });
  it("read-all includes local-only broadcasts and preserves pending/failed states", async () => {
    const snapshot = normalizeNotificationInbox([row("global-6", BROADCAST_USER_ID), row("pending-6", "u6", { status: "PENDING" })], "u6");
    const result = await applyNotificationInboxAction({ snapshot, userId: "u6", action: "read-all" }, service);
    assert.equal(result.items.find((item) => item.id === "global-6")?.status, "READ");
    assert.equal(result.items.find((item) => item.id === "pending-6")?.status, "PENDING");
  });
  it("walks inclusive time windows and covers ties across the old page boundary", async () => {
    const base = Date.parse("2026-11-18T09:00:00Z");
    const raw = Array.from({ length: 401 }, (_, i) => row(`r-${i}`, "u7", { incidentId: `i-${i}`, createdAt: new Date(base - i * 1000).toISOString() }));
    raw[99] = row("global-7", BROADCAST_USER_ID, { createdAt: raw[99].createdAt });
    raw[100] = row("owned-7", "u7", { createdAt: raw[99].createdAt });
    const seenWindows: string[] = [];
    const collected = await collectNotificationInbox(async (page, limit, range) => {
      assert.equal(page, 1, "never depend on unstable OFFSET pages");
      if (range?.toDate) seenWindows.push(range.toDate);
      const matching = raw.filter((item) => !range?.toDate || new Date(item.createdAt).getTime() <= Date.parse(range.toDate));
      return { data: matching.slice(0, limit), meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) } };
    });
    assert.ok(seenWindows.length >= 4);
    assert.equal(collected.length, 401);
    assert.equal(new Set(collected.map((item) => item.id)).size, 401);
    const snapshot = normalizeNotificationInbox(collected, "u7");
    assert.equal(snapshot.items.length, 400);
    assert.equal(notificationInboxPage(snapshot, { page: 41, limit: 10 }).meta.page, 40);
  });
  it("preserves equal-time records even when the server changes tie ordering", async () => {
    const raw = Array.from({ length: 150 }, (_, i) => row(`tie-${i}`, "u9", { createdAt: new Date(Date.parse("2026-11-18T09:00:00Z") - Math.floor(i / 2) * 1000).toISOString() }));
    let calls = 0;
    const result = await collectNotificationInbox(async (page, limit, range) => {
      const matching = raw.filter((item) => !range?.toDate || new Date(item.createdAt).getTime() <= Date.parse(range.toDate));
      const reverse = ++calls % 2 === 0;
      matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || (reverse ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));
      return { data: matching.slice(0, limit), meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) } };
    });
    assert.equal(result.length, 150);
    assert.equal(new Set(result.map((item) => item.id)).size, 150);
  });
  it("rejects incomplete windows, duplicate IDs inside a response and cancellation", async () => {
    const raw = Array.from({ length: 101 }, (_, i) => row(`p-${i}`, "u8", { createdAt: new Date(Date.parse("2026-11-18T09:00:00Z") - i * 1000).toISOString() }));
    const first: NotificationListResponse = { data: raw.slice(0, 100), meta: { page: 1, limit: 100, total: 101, totalPages: 2 } };
    await assert.rejects(collectNotificationInbox(async (_page, _limit, range) => { if (range) throw Error("window failed"); return first; }), /window failed/);
    await assert.rejects(collectNotificationInbox(async (_page, _limit, range) => range ? { data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } } : first), /thay đổi/);
    await assert.rejects(collectNotificationInbox(async () => ({ ...first, data: Array(100).fill(raw[0]) })), /không hợp lệ/);
    await assert.rejects(collectNotificationInbox(async () => ({ data: [] } as unknown as NotificationListResponse)), /đầy đủ/);
    const abort = new AbortController(); abort.abort();
    await assert.rejects(collectNotificationInbox(async () => first, abort.signal), { name: "AbortError" });
  });
  it("never publishes an incomplete total when a single timestamp exceeds the API limit", async () => {
    const data = Array.from({ length: 100 }, (_, i) => row(`dense-${i}`, "dense-user"));
    await assert.rejects(collectNotificationInbox(async () => ({ data, meta: { page: 1, limit: 100, total: 101, totalPages: 2 } })), /cùng thời điểm/);
  });
  it("advances past a complete bucket of exactly 100 equal timestamps", async () => {
    const raw = [...Array.from({ length: 100 }, (_, i) => row(`bucket-${i}`, "u10")), row("older", "u10", { createdAt: "2026-11-18T08:00:00Z" })];
    const result = await collectNotificationInbox(async (page, limit, range) => {
      const matching = raw.filter((item) => (!range?.toDate || Date.parse(String(item.createdAt)) <= Date.parse(range.toDate)) &&
        (!range?.fromDate || Date.parse(String(item.createdAt)) >= Date.parse(range.fromDate)));
      return { data: matching.slice(0, limit), meta: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) } };
    });
    assert.equal(result.length, 101);
    assert.ok(result.some((item) => item.id === "older"));
  });
});
