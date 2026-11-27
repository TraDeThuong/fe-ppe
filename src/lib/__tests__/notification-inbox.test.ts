import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NotificationItemDto } from "@/types";
import { BROADCAST_USER_ID, normalizeNotificationInbox, isNotificationRead } from "../notification-inbox";
import { applyNotificationInboxAction } from "../notification-inbox-actions";

const row = (id: string, userId: string, extra: Partial<NotificationItemDto> = {}): NotificationItemDto => ({
  id, userId, title: "Thông báo an toàn", content: "Kiểm tra PPE", channel: "IN_APP", status: "SENT", severity: "NORMAL",
  incidentId: null, templateId: null, sentAt: "2026-11-18T09:00:00Z", readAt: null, createdAt: "2026-11-18T09:00:00Z", ...extra,
});
const service = { markAsRead: async (_id: string) => {}, markAllAsRead: async () => {}, deleteNotification: async (_id: string) => {} };
describe("frontend-only broadcast inbox", () => {
  it("keeps the owned copy and preserves its read state", () => {
    const raw = [row("global-1", BROADCAST_USER_ID), row("owned-1", "u1", { status: "READ", isRead: true })];
    const snapshot = normalizeNotificationInbox(raw, "u1");
    assert.deepEqual(snapshot.items.map((item) => item.id), ["owned-1"]);
    assert.equal(isNotificationRead(snapshot.items[0]), true);
  });
  it("does not merge repeated sends, two same-channel owned rows, different incidents or payloads", () => {
    const raw = [row("global-2", BROADCAST_USER_ID), row("owned-2", "u2"), row("direct-2", "u2"),
      row("later-global-2", BROADCAST_USER_ID, { createdAt: "2026-11-18T09:01:00Z" }),
      row("later-owned-2", "u2", { createdAt: "2026-11-18T09:01:00Z" }),
      row("email-2", "u2", { channel: "EMAIL", createdAt: "2026-11-18T09:02:00Z" }),
      row("incident-2", "u2", { incidentId: "incident" }),
      row("different-2", BROADCAST_USER_ID, { content: "Khác nội dung" })];
    const snapshot = normalizeNotificationInbox(raw, "u2");
    assert.equal(snapshot.items.length, 6);
    assert.ok(snapshot.items.some((item) => item.id === "direct-2"));
  });
  it("merges simultaneous IN_APP and EMAIL deliveries of the same PPE incident into one item and syncs read/delete across all merged IDs", async () => {
    const raw = [
      row("inc-email", "u-mc", {
        incidentId: "inc-99",
        channel: "EMAIL",
        severity: "HIGH",
        title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường",
        content: "Không đội mũ bảo hộ lao động",
        createdAt: "2026-11-22T10:50:00.120Z",
      }),
      row("inc-inapp", "u-mc", {
        incidentId: "inc-99",
        channel: "IN_APP",
        severity: "HIGH",
        title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường",
        content: "Không đội mũ bảo hộ lao động",
        createdAt: "2026-11-22T10:50:00.125Z",
      }),
    ];
    const snapshot = normalizeNotificationInbox(raw, "u-mc");
    assert.equal(snapshot.items.length, 1);
    const merged = snapshot.items[0];
    assert.equal(merged.id, "inc-inapp");
    assert.equal(merged.channel, "IN_APP");
    assert.deepEqual(merged.deliveredChannels, ["IN_APP", "EMAIL"]);
    assert.deepEqual(merged.mergedIds, ["inc-inapp", "inc-email"]);
    assert.deepEqual(merged.unreadIds, ["inc-inapp", "inc-email"]);


    // Đánh dấu đã đọc phải gọi markAsRead cho CẢ 2 bản ghi IN_APP và EMAIL
    const readIds: string[] = [];
    const afterRead = await applyNotificationInboxAction(
      { snapshot, userId: "u-mc", action: "read", id: merged.id },
      { ...service, markAsRead: async (id) => { readIds.push(id); } },
    );
    assert.deepEqual(readIds.sort(), ["inc-email", "inc-inapp"]);
    assert.equal(isNotificationRead(afterRead.items[0]), true);

    // Xóa phải gọi deleteNotification cho CẢ 2 bản ghi IN_APP và EMAIL
    const deletedIds: string[] = [];
    const afterDelete = await applyNotificationInboxAction(
      { snapshot: afterRead, userId: "u-mc", action: "delete", id: merged.id },
      { ...service, deleteNotification: async (id) => { deletedIds.push(id); } },
    );
    assert.deepEqual(deletedIds.sort(), ["inc-email", "inc-inapp"]);
    assert.equal(afterDelete.items.length, 0);
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
});
