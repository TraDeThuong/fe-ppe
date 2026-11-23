import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterAssignmentIncidents,
  groupIncidentsForAssignment,
  summarizeIncidentGroup,
} from "../incident-assignment-groups";
import type { IncidentItem } from "@/types";

function makeIncident(
  id: string,
  extra: Partial<IncidentItem> = {},
): IncidentItem {
  return {
    id,
    siteId: "site-1",
    siteName: "Công trường A",
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "PENDING_REVIEW",
    detectedAt: "2026-11-22T09:00:02.000Z",
    createdAt: "2026-11-22T09:00:02.000Z",
    updatedAt: "2026-11-22T09:00:02.000Z",
    assignments: [],
    ...extra,
  };
}

function withTrackEvidence(
  id: string,
  trackId: number,
  box = { x: 0.2, y: 0.2, width: 0.2, height: 0.5 },
): IncidentItem["evidences"] {
  return [
    {
      id: `ev-${id}`,
      incidentId: id,
      cameraId: "cam-1",
      evidenceType: "SNAPSHOT",
      storageKey: `evidences/site-1/CAM-01/20261122_track${trackId}_${id}.jpg`,
      fileName: `20261122_track${trackId}_${id}.jpg`,
      mimeType: "image/jpeg",
      fileSize: 10000,
      capturedAt: "2026-11-22T09:00:02.000Z",
      createdAt: "2026-11-22T09:00:02.000Z",
      metadata: {
        id: `m-${id}`,
        evidenceId: `ev-${id}`,
        width: 1280,
        height: 720,
        createdAt: "2026-11-22T09:00:02.000Z",
        aiDetections: {
          violation: { type: "NO_HELMET", confidence: 0.9, box },
          allDetections: [{ class: "PERSON", track_id: trackId, confidence: 0.95, box }],
        } as unknown as NonNullable<NonNullable<IncidentItem["evidences"]>[number]["metadata"]>["aiDetections"],
      },
    },
  ];
}

const ctx = {
  isVietnamese: true,
  resolveSiteLabel: (_sid: string, fb?: string) => fb || "Công trường A",
  resolveCameraLabel: (inc: IncidentItem) => inc.cameraCode || inc.cameraId,
  formatViolation: (v: string) => {
    if (v === "NO_HELMET") return "Không đội mũ bảo hộ";
    if (v === "NO_VEST") return "Không mặc áo phản quang";
    if (v === "RESTRICTED_AREA") return "Xâm nhập vùng cấm";
    return v;
  },
  responsibilityContext: {
    usersById: new Map([
      ["off-1", { id: "off-1", name: "Nguyễn Văn A", email: "a@ppe.local" }],
      ["off-2", { id: "off-2", name: "Trần Văn B", email: "b@ppe.local" }],
    ]),
  },
};

describe("incident-assignment-groups", () => {
  it("groups same-person NO_HELMET + NO_VEST into 1 Multi-Violation work group without merging a different person", () => {
    const i1 = makeIncident("i-helmet", {
      violationType: "NO_HELMET",
      severity: "HIGH",
      detectedAt: "2026-11-22T09:00:02.000Z",
      evidences: withTrackEvidence("i-helmet", 7),
    });
    const i2 = makeIncident("i-vest", {
      violationType: "NO_VEST",
      severity: "MEDIUM",
      detectedAt: "2026-11-22T09:00:04.000Z",
      evidences: withTrackEvidence("i-vest", 7),
    });
    const i3 = makeIncident("i-other", {
      violationType: "NO_HELMET",
      severity: "HIGH",
      detectedAt: "2026-11-22T09:00:03.000Z",
      evidences: withTrackEvidence("i-other", 9, { x: 0.72, y: 0.2, width: 0.18, height: 0.48 }),
    });

    const groups = groupIncidentsForAssignment([i1, i2, i3], "person", ctx);
    assert.equal(groups.length, 2);
    // Multi-violation group sorted first
    assert.equal(groups[0].personMeta?.isMultiViolation, true);
    assert.equal(groups[0].personMeta?.trackId, 7);
    assert.equal(groups[0].items.length, 2);
    assert.equal(groups[1].personMeta?.trackId, 9);
    assert.equal(groups[1].items.length, 1);

    // Summary estimates 2 distinct persons across 3 records
    const summary = summarizeIncidentGroup([i1, i2, i3], ctx.resolveCameraLabel);
    assert.equal(summary.total, 3);
    assert.equal(summary.estimatedDistinctPersons, 2);
  });

  it("orders severity groups strictly CRITICAL -> HIGH -> MEDIUM -> LOW", () => {
    const items = [
      makeIncident("low-1", { severity: "LOW" }),
      makeIncident("crit-1", { severity: "CRITICAL" }),
      makeIncident("med-1", { severity: "MEDIUM" }),
      makeIncident("high-1", { severity: "HIGH" }),
    ];

    const groups = groupIncidentsForAssignment(items, "severity", ctx);
    assert.deepEqual(
      groups.map((g) => g.key),
      ["sev:CRITICAL", "sev:HIGH", "sev:MEDIUM", "sev:LOW"],
    );
  });

  it("groups accurately by work shift (Morning 06-14, Afternoon 14-22, Night 22-06) and by hour", () => {
    const morning = makeIncident("m-1", {
      detectedAt: new Date(2026, 10, 22, 8, 30, 0).toISOString(),
    });
    const afternoon = makeIncident("a-1", {
      detectedAt: new Date(2026, 10, 22, 15, 15, 0).toISOString(),
    });
    const night = makeIncident("n-1", {
      detectedAt: new Date(2026, 10, 22, 23, 10, 0).toISOString(),
    });

    const shifts = groupIncidentsForAssignment([morning, afternoon, night], "shift", ctx);
    assert.equal(shifts.length, 3);
    assert.ok(shifts[0].title.includes("Ca Đêm"));
    assert.ok(shifts[1].title.includes("Ca Chiều"));
    assert.ok(shifts[2].title.includes("Ca Sáng"));

    const hours = groupIncidentsForAssignment([morning, afternoon, night], "hour", ctx);
    assert.equal(hours.length, 3);
    assert.equal(hours[0].title, "23:00 – 00:00");
    assert.equal(hours[1].title, "15:00 – 16:00");
    assert.equal(hours[2].title, "08:00 – 09:00");
  });

  it("groups by assigned officer with unassigned bucket surfaced first and supports quick filtering", () => {
    const unassigned = makeIncident("u-1", { status: "CONFIRMED", assignments: [] });
    const assignedA = makeIncident("a-1", {
      status: "CONFIRMED",
      violationType: "NO_VEST",
      severity: "CRITICAL",
      assignments: [
        { id: "as-1", incidentId: "a-1", assignedTo: "off-1", assignedAt: "2026-11-22T09:00:00Z", status: "ACTIVE" },
      ],
    });
    const assignedB = makeIncident("b-1", {
      status: "CONFIRMED",
      assignments: [
        { id: "as-2", incidentId: "b-1", assignedTo: "off-2", assignedAt: "2026-11-22T09:00:00Z", status: "ACTIVE" },
      ],
    });

    const groups = groupIncidentsForAssignment([assignedA, assignedB, unassigned], "officer", ctx);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].key, "off:__unassigned__");
    assert.ok(groups.some((g) => g.title === "Nguyễn Văn A"));
    assert.ok(groups.some((g) => g.title === "Trần Văn B"));

    const filtered = filterAssignmentIncidents(
      [assignedA, assignedB, unassigned],
      { violationType: "NO_VEST", severity: "CRITICAL", search: "Nguyễn" },
      ctx,
    );
    assert.deepEqual(filtered.map((i) => i.id), ["a-1"]);
  });
});
