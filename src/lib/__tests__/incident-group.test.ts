import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IncidentItem } from "@/types";
import {
  appendIncidentGroupLink, canResolveGroupIncident, decodeIncidentGroup, encodeIncidentGroup,
  groupProgress, incidentGroupHref, isGroupCompletionReceipt, isGroupIncidentResolved,
  nextGroupIncident, notificationIncidentTarget, type IncidentGroupContext,
} from "../incident-group";
import { DISPATCH_SIGNAL_PREFIX, RESOLVED_REPORT_PREFIX } from "../incident-workflow";

import { uuid, fixtureGroup, fixtureIncident } from "./incident-group.fixtures";

describe("incident group navigation context", () => {
  it("round trips 100 members in a self-contained URL without copying unknown fields", () => {
    const group = fixtureGroup(1000, 100);
    const encoded = encodeIncidentGroup({ ...group, sensitiveNote: "do not copy" } as IncidentGroupContext);
    assert.ok(encoded.length < 7500);
    assert.deepEqual(decodeIncidentGroup(encoded, group.groupId, group.incidentIds[99]), group);
    assert.ok(!atob(encoded.replace(/-/g, "+").replace(/_/g, "/")).includes("sensitiveNote"));
  });
  it("rejects damaged, oversized, duplicate, wrong-version, wrong-group and nonmember contexts", () => {
    const group = fixtureGroup();
    const raw = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "");
    for (const value of [{ ...group, v: 2 }, { ...group, assignedTo: "officer" },
      { ...group, incidentIds: [] }, { ...group, incidentIds: [uuid(1), uuid(1)] },
      { ...group, incidentIds: fixtureGroup(1000, 101).incidentIds }, { ...group, createdAt: "yesterday" }]) {
      assert.equal(decodeIncidentGroup(raw(value), group.groupId, uuid(1)), null);
    }
    assert.equal(decodeIncidentGroup("x".repeat(7501), group.groupId, uuid(1)), null);
    assert.equal(decodeIncidentGroup("bad!", group.groupId, uuid(1)), null);
    assert.equal(decodeIncidentGroup(encodeIncidentGroup(group), uuid(999), uuid(1)), null);
    assert.equal(decodeIncidentGroup(encodeIncidentGroup(group), group.groupId, uuid(99)), null);
    assert.throws(() => incidentGroupHref(group, uuid(99)));
  });
  it("uses one local target for inbox, toast and compare; hides context from displayed content", () => {
    const group = fixtureGroup();
    const content = appendIncidentGroupLink(`${DISPATCH_SIGNAL_PREFIX} 3 sự cố`, group, "https://external.example");
    const target = notificationIncidentTarget({ incidentId: uuid(1), content }, true);
    assert.equal(target.href, incidentGroupHref(group, uuid(1), true));
    assert.equal(target.content, `${DISPATCH_SIGNAL_PREFIX} 3 sự cố`);
    assert.equal(target.legacy, false);
    assert.deepEqual(target.group, group);
    assert.ok(!target.href!.includes("external.example"));
  });
  it("does not infer membership from legacy text or a broken URL", () => {
    for (const content of [`${DISPATCH_SIGNAL_PREFIX} Có 8 sự cố`, `${DISPATCH_SIGNAL_PREFIX}\nMở nhóm xử lý: /incidents/${uuid(1)}?group=bad&context=bad`]) {
      const target = notificationIncidentTarget({ incidentId: uuid(1), content });
      assert.equal(target.group, null);
      assert.equal(target.href, `/incidents/${uuid(1)}?dispatch=legacy`);
      assert.ok(!target.content.includes("context="));
    }
  });
});

describe("group progress and next incident", () => {
  it("counts CLOSED only with remediation proof and rejects a dismissed closing branch", () => {
    const closed = fixtureIncident(1, "CLOSED");
    assert.equal(isGroupIncidentResolved(closed), false);
    assert.equal(isGroupIncidentResolved({ ...closed, resolvedAt: "2026-11-18T01:00:00Z" }), true);
    assert.equal(isGroupIncidentResolved({ ...closed, resolvedAt: "2026-11-17T01:00:00Z" }), false);
    const history = (oldStatus: string) => [{ oldStatus, newStatus: "CLOSED", changedAt: "2026-11-18T02:00:00Z" }] as IncidentItem["statusHistory"];
    assert.equal(isGroupIncidentResolved({ ...closed, statusHistory: history("RESOLVED") }), true);
    assert.equal(isGroupIncidentResolved({ ...closed, resolvedAt: "2026-11-18T01:00:00Z", statusHistory: history("DISMISSED") }), false);
  });
  it("requires ACTIVE current assignment and wraps to the next eligible member", () => {
    const group = fixtureGroup();
    const rows = [fixtureIncident(1), fixtureIncident(2, "RESOLVED"), fixtureIncident(3)].map((incident) => ({ id: incident.id, incident }));
    assert.equal(nextGroupIncident(group, uuid(3), rows, group.assignedTo), uuid(1));
    assert.equal(nextGroupIncident(group, uuid(1), rows, group.assignedTo), uuid(3));
    assert.equal(nextGroupIncident(group, uuid(1), rows, uuid(99)), null);
    assert.equal(canResolveGroupIncident({ ...fixtureIncident(1), assignments: [{ ...fixtureIncident(1).assignments![0], status: "COMPLETED" }] }, group.assignedTo), false);
  });
  it("cannot complete with missing, inaccessible, reassigned or pending members", () => {
    const group = fixtureGroup();
    const resolved = [fixtureIncident(1, "RESOLVED"), fixtureIncident(2, "RESOLVED")].map((incident) => ({ id: incident.id, incident }));
    for (const row of [{ id: uuid(3), error: "403" }, { id: uuid(3), incident: fixtureIncident(3) }, { id: uuid(3), incident: fixtureIncident(3, "PENDING_REVIEW") }]) {
      const progress = groupProgress(group, [...resolved, row]);
      assert.equal(progress.complete, false);
      assert.equal(progress.resolved, 2);
    }
    assert.equal(groupProgress(group, [...resolved, { id: uuid(3), incident: fixtureIncident(3, "RESOLVED") }]).complete, true);
  });
  it("recognizes only summary receipts for the same immutable membership and parties", () => {
    const group = fixtureGroup();
    const content = appendIncidentGroupLink(RESOLVED_REPORT_PREFIX, group);
    assert.equal(isGroupCompletionReceipt(content, uuid(1), group), true);
    assert.equal(isGroupCompletionReceipt(content, uuid(1), { ...group, assignedTo: uuid(999) }), false);
    assert.equal(isGroupCompletionReceipt(content, uuid(1), { ...group, incidentIds: group.incidentIds.slice(1) }), false);
    assert.equal(isGroupCompletionReceipt(appendIncidentGroupLink(DISPATCH_SIGNAL_PREFIX, group), uuid(1), group), false);
  });
});
