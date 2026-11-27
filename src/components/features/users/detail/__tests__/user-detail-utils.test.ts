import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findMatchingContactOfficer,
  getSiteRoleDetails,
  getUserAssignedSites,
  parseContactOfficers,
} from "../user-detail-utils";
import type { SiteItem, UserResponseDto } from "@/types";

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

  it("findMatchingContactOfficer matches strictly by userId", () => {
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
});
