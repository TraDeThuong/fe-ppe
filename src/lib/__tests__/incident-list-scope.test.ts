import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getIncidentClosure, resolveIncidentListScope } from "../incident-list-scope";
import type { IncidentItem } from "@/types";

function scope(query: string, role?: string) {
  const params = new URLSearchParams(query);
  return resolveIncidentListScope((key) => params.get(key), role);
}

describe("incident work queues and history", () => {
  it("depends on the signed-in role only when the URL does not specify a list", () => {
    assert.deepEqual(scope("", "SAFETY_OFFICER"), { scope: "work", status: "CONFIRMED", requiresRole: false });
    assert.equal(scope("scope=work", "SAFETY_MANAGER").status, "PENDING_REVIEW");
    assert.equal(scope("").requiresRole, true);
    assert.equal(scope("scope=work&status=DISMISSED").requiresRole, false);
  });

  it("preserves legacy status links and unfiltered site, camera, and reporting drill-downs", () => {
    for (const status of ["PENDING_REVIEW", "CONFIRMED", "RESOLVED", "DISMISSED"]) {
      assert.equal(scope(`status=${status}&siteId=s`).status, status);
    }
    for (const query of ["siteId=", "cameraId=c", "fromDate=2026-10-01", "stat=critical", "stat=total"]) {
      assert.deepEqual(scope(query), { scope: "all", requiresRole: false });
    }
    assert.equal(scope("stat=pending-review").status, "PENDING_REVIEW");
    assert.equal(scope("stat=resolved").status, "RESOLVED");
  });

  it("routes closed records to history and supports a whole-list scope without a status", () => {
    assert.deepEqual(scope("status=CLOSED&siteId=s"), { scope: "history", status: "CLOSED", requiresRole: false });
    assert.equal(scope("scope=history&status=CONFIRMED").status, "CLOSED");
    assert.equal(scope("scope=all&stat=pending-review").status, undefined);
    assert.equal(scope("scope=work&siteId=s", "SAFETY_OFFICER").status, "CONFIRMED");
  });

  it("uses the last valid closure entry and does not guess a date for legacy records", () => {
    const record = { status: "CLOSED", updatedAt: "2026-11-23T00:00:00Z" } as IncidentItem;
    assert.deepEqual(getIncidentClosure(record), { label: "incidents.status.closed", date: undefined });
    const history = (oldStatus: string, newStatus: string, changedAt: string) =>
      ({ id: changedAt, incidentId: "incident", oldStatus, newStatus, changedAt, changedBy: "manager" });
    record.statusHistory = [
      history("PENDING_REVIEW", "CONFIRMED", "2026-11-23T00:00:00Z"),
      history("DISMISSED", "CLOSED", "2026-11-22T00:00:00Z"),
      history("RESOLVED", "CLOSED", "invalid"),
      history("RESOLVED", "CLOSED", "2026-11-21T00:00:00Z"),
    ];
    assert.deepEqual(getIncidentClosure(record), {
      label: "incidents.scope.closedAfterDismissal", date: "2026-11-22T00:00:00Z",
    });
    assert.equal(getIncidentClosure({ ...record, statusHistory: record.statusHistory.slice(-1) }).label, "incidents.scope.closedAfterAcceptance");
  });
});
