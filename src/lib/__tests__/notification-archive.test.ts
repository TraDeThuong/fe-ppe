import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NotificationItemDto } from "@/types";
import {
  applyArchiveAction,
  changeArchiveSettings,
  defaultNotificationArchive,
  isArchiveCheckDue,
  isValidRetentionDays,
  selectArchiveItems,
} from "../notification-archive";
import { BROADCAST_USER_ID, normalizeNotificationInbox } from "../notification-inbox";

const day = 86_400_000;
const now = Date.parse("2026-11-23T12:00:00Z");
const owner = "archive-account";

function item(id: string, created: number, extra: Partial<NotificationItemDto> = {}): NotificationItemDto {
  return {
    id, userId: owner, title: id, content: "Fixture", channel: "IN_APP", status: "READ", severity: "NORMAL",
    incidentId: null, templateId: null, sentAt: null, readAt: null,
    createdAt: new Date(created).toISOString(), ...extra,
  };
}

describe("notification archive rules", () => {
  it("runs strictly after the age cutoff and ignores unread and invalid timestamps", () => {
    const snapshot = { rawTotal: 5, items: [
      item("before", now - day - 1), item("exact", now - day), item("after", now - day + 1),
      item("unread", now - 10 * day, { status: "SENT", severity: "CRITICAL" }),
      item("invalid", now, { createdAt: "invalid" }),
    ] };
    const settings = changeArchiveSettings(defaultNotificationArchive, true, 1);
    const result = applyArchiveAction(settings, snapshot, { type: "auto" }, now);
    assert.equal(result.count, 1);
    assert.deepEqual(selectArchiveItems(snapshot, result.state, "archived").map((row) => row.id), ["before"]);
    assert.equal(result.state.lastRunAt, now);
    assert.equal(isArchiveCheckDue(result.state, now + day - 1), false);
    assert.equal(isArchiveCheckDue(result.state, now + day), true);
    assert.equal(isArchiveCheckDue(changeArchiveSettings(result.state, true, 2), now), true);
    assert.equal(isArchiveCheckDue(changeArchiveSettings(result.state, false, 1), now + day), false);
    assert.equal(isArchiveCheckDue(defaultNotificationArchive, now), false);
    assert.equal(isValidRetentionDays(365), true);
    for (const days of [0, 366, 1.5, NaN, Infinity]) assert.equal(isValidRetentionDays(days), false);
  });

  it("archives complete multichannel deliveries and leaves a new unread copy visible", () => {
    const member = { title: "PPE alert", incidentId: "incident" };
    const first = item("in-app", now - 10 * day, member);
    const email = item("email", now - 10 * day, { ...member, channel: "EMAIL" });
    const snapshot = normalizeNotificationInbox([first, email], owner);
    assert.equal(snapshot.items.length, 1);
    const result = applyArchiveAction(defaultNotificationArchive, snapshot, { type: "manual", ids: new Set([first.id]) }, now);
    assert.equal(result.count, 1);
    assert.deepEqual(result.state.marks, { "in-app": now, email: now });
    const newDelivery = item("web", now - 10 * day, { ...member, channel: "WEB", status: "SENT" });
    const updated = normalizeNotificationInbox([first, email, newDelivery], owner);
    assert.equal(selectArchiveItems(updated, result.state, "active").length, 1);
    assert.equal(selectArchiveItems(updated, result.state, "archived").length, 0);
    assert.equal(applyArchiveAction(result.state, updated, { type: "manual", ids: new Set([first.id]) }, now).count, 0);
  });

  it("carries a broadcast archive forward to a matched owned copy and protects a restored dispatch", () => {
    const shared = item("broadcast", now - 10 * day, { userId: BROADCAST_USER_ID, title: "Broadcast" });
    const personal = { ...shared, id: "personal-broadcast", userId: owner };
    const first = normalizeNotificationInbox([shared], owner);
    const settings = changeArchiveSettings(defaultNotificationArchive, true, 1);
    const archived = applyArchiveAction(settings, first, { type: "auto" }, now).state;
    const paired = normalizeNotificationInbox([shared, personal], owner);
    assert.deepEqual(selectArchiveItems(paired, archived, "archived").map((row) => row.id), [personal.id]);
    const restored = applyArchiveAction(archived, paired, { type: "restore", id: personal.id }, now + 5);
    assert.equal(restored.count, 1);
    assert.deepEqual(restored.state.marks, { [shared.id]: null, [personal.id]: null });
    assert.equal(selectArchiveItems(paired, restored.state, "active").length, 1);
    assert.equal(applyArchiveAction(restored.state, paired, { type: "auto" }, now + day).count, 0);
    assert.equal(applyArchiveAction(restored.state, paired, { type: "manual", ids: new Set([personal.id]) }, now + day).count, 1);
  });

  it("keeps a manual preview scoped to its original read IDs and orders the archive by move time", () => {
    const snapshot = { rawTotal: 3, items: [item("new", now), item("previewed", now - day), item("old", now - 2 * day)] };
    const previewed = applyArchiveAction(defaultNotificationArchive, snapshot, { type: "manual", ids: new Set(["previewed"]) }, now);
    assert.deepEqual(selectArchiveItems(snapshot, previewed.state, "active").map((row) => row.id), ["new", "old"]);
    const next = applyArchiveAction(previewed.state, snapshot, { type: "manual", ids: new Set(["previewed", "old"]) }, now + 1);
    assert.equal(next.count, 1);
    assert.deepEqual(selectArchiveItems(snapshot, next.state, "archived").map((row) => row.id), ["old", "previewed"]);
  });
});
