import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeUserIncidentStats,
  correlateUserIncidents,
  findMatchingContactOfficer,
  getSiteRoleDetails,
  getUserAssignedSites,
  parseContactOfficers,
} from "../user-detail-utils";
import type { CameraItem, IncidentItem, SiteItem, UserResponseDto } from "@/types";

const makeSite = (overrides: Partial<SiteItem> = {}): SiteItem => ({
  id: "site-1",
  name: "Công trường 1",
  code: "SITE-1",
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const makeUser = (overrides: Partial<UserResponseDto> = {}): UserResponseDto => ({
  id: "user-officer-1",
  email: "officer@ppe.local",
  fullName: "Trần Thị An Toàn (Safety Officer)",
  phoneNumber: "0912345678",
  roleId: "role-1",
  role: { id: "role-1", name: "SAFETY_OFFICER" },
  siteIds: [],
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const makeIncident = (overrides: Partial<IncidentItem> = {}): IncidentItem => ({
  id: "inc-1",
  siteId: "site-1",
  cameraId: "cam-1",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status: "PENDING_REVIEW",
  detectedAt: "2026-11-02T04:00:00.000Z",
  createdAt: "2026-11-02T04:00:00.000Z",
  updatedAt: "2026-11-02T04:00:00.000Z",
  ...overrides,
});

describe("user-detail-utils", () => {
  it("parseContactOfficers handles arrays, valid JSON strings, and malformed strings safely", () => {
    assert.deepEqual(parseContactOfficers(null), []);
    assert.deepEqual(parseContactOfficers("{invalid json"), []);
    const parsed = parseContactOfficers(
      JSON.stringify([{ userId: "u1", name: "Officer A", roleTitle: "Lead", phones: ["0901"] }]),
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].userId, "u1");
  });

  it("getUserAssignedSites merges user.siteIds and site.contactOfficers[].userId", () => {
    const user = makeUser({ id: "u-1", siteIds: ["site-explicit"] });
    const sites: SiteItem[] = [
      makeSite({ id: "site-explicit", code: "S1", contactOfficers: [] }),
      makeSite({
        id: "site-officer",
        code: "S2",
        contactOfficers: [{ userId: "u-1", name: "Officer", roleTitle: "Lead", phones: [] }],
      }),
      makeSite({
        id: "site-other",
        code: "S3",
        contactOfficers: [{ userId: "u-other", name: "Other", phones: [] }],
      }),
    ];

    const result = getUserAssignedSites(user, sites);
    assert.deepEqual(
      result.userSites.map((s) => s.id),
      ["site-explicit", "site-officer"],
    );
    assert.equal(result.explicitSiteIdSet.has("site-explicit"), true);
    assert.equal(result.contactOfficerSiteIdSet.has("site-officer"), true);
  });

  it("findMatchingContactOfficer prioritizes userId even when fullName includes role suffix", () => {
    const user = makeUser({
      id: "u-officer",
      fullName: "Trần Thị An Toàn (Safety Officer)",
      phoneNumber: undefined,
    });
    const site = makeSite({
      contactOfficers: [
        {
          userId: "u-officer",
          name: "Trần Thị An Toàn",
          roleTitle: "Trưởng ban An toàn (Lead)",
          phones: ["0912 345 678"],
        },
      ],
    });

    const matched = findMatchingContactOfficer(site, user);
    assert.equal(matched?.roleTitle, "Trưởng ban An toàn (Lead)");

    const roleDetails = getSiteRoleDetails(site, user, true);
    assert.equal(roleDetails.isSpecific, true);
    assert.equal(roleDetails.roleTitle, "Trưởng ban An toàn (Lead)");
  });

  it("correlateUserIncidents matches site, assignments, statusHistory and enriches siteName/cameraName", () => {
    const user = makeUser({ id: "u-1", email: "u1@ppe.local" });
    const siteMap = new Map<string, SiteItem>([
      ["site-1", makeSite({ id: "site-1", name: "Landmark 81" })],
      ["site-2", makeSite({ id: "site-2", name: "Block B" })],
    ]);
    const cameraMap = new Map<string, CameraItem>([
      [
        "cam-1",
        {
          id: "cam-1",
          siteId: "site-1",
          name: "Gate Cam 01",
          code: "CAM-01",
          sourceType: "RTSP",
          streamUrl: "rtsp://example",
          status: "ONLINE",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
    ]);

    const incidents: IncidentItem[] = [
      makeIncident({ id: "inc-site", siteId: "site-1", cameraId: "cam-1" }),
      makeIncident({
        id: "inc-assigned",
        siteId: "site-2",
        cameraId: "cam-missing",
        assignments: [
          {
            id: "a1",
            incidentId: "inc-assigned",
            assignedTo: "u-1",
            assignedAt: "2026-11-02T00:00:00.000Z",
            status: "ACTIVE",
          },
        ],
      }),
      makeIncident({ id: "inc-unrelated", siteId: "site-2", cameraId: "cam-missing" }),
    ];

    const correlated = correlateUserIncidents(
      incidents,
      user,
      new Set(["site-1"]),
      siteMap,
      cameraMap,
    );

    assert.deepEqual(
      correlated.map((i) => i.id),
      ["inc-site", "inc-assigned"],
    );
    assert.equal(correlated[0].siteName, "Landmark 81");
    assert.equal(correlated[0].cameraName, "Gate Cam 01");
    assert.equal(correlated[1].siteName, "Block B");
  });

  it("computeUserIncidentStats excludes DISMISSED from pending and handles missing/invalid resolvedAt gracefully", () => {
    const incidents: IncidentItem[] = [
      makeIncident({
        id: "1",
        status: "CLOSED",
        severity: "CRITICAL",
        detectedAt: "2026-11-02T00:00:00.000Z",
        resolvedAt: "2026-11-02T01:00:00.000Z", // 1h <= 2h SLA
      }),
      makeIncident({
        id: "2",
        status: "RESOLVED",
        resolvedAt: null,
      }),
      makeIncident({
        id: "3",
        status: "DISMISSED",
      }),
      makeIncident({
        id: "4",
        status: "CONFIRMED",
      }),
    ];

    const stats = computeUserIncidentStats(incidents);
    assert.equal(stats.totalIncidents, 4);
    assert.equal(stats.resolvedIncidents, 2);
    assert.equal(stats.dismissedIncidents, 1);
    assert.equal(stats.pendingIncidents, 1);
    assert.equal(stats.resolutionRate, 67); // 2 / (4 - 1) = 66.7 -> 67%
    assert.equal(stats.hasSlaData, true);
    assert.equal(stats.mttrHours, 1);
    assert.equal(stats.slaComplianceRate, 100);
    assert.equal(stats.performanceTier, "AVERAGE");

    // When resolvedAt < detectedAt (seed anomaly), hasSlaData should be false
    const anomalyStats = computeUserIncidentStats([
      makeIncident({
        id: "anom",
        status: "CLOSED",
        detectedAt: "2026-11-02T04:00:00.000Z",
        resolvedAt: "2026-10-31T16:00:00.000Z",
      }),
    ]);
    assert.equal(anomalyStats.hasSlaData, false);
    assert.equal(anomalyStats.mttrHours, 0);
    assert.equal(anomalyStats.slaComplianceRate, 0);
    assert.equal(anomalyStats.resolutionRate, 100);
    assert.equal(anomalyStats.performanceTier, "EXCELLENT");
  });
});
