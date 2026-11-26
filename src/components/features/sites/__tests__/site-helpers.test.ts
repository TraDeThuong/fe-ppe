import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canSyncSiteOfficers,
  clampSiteConfirmationDuration,
  generateUniqueZoneCode,
  isAdminRole,
  normalizeZoneCode,
  parseSiteContactOfficers,
  resolveDisplayOfficers,
  resolveSiteConfirmationDurations,
  toDateInputValue,
} from "../site-helpers";

describe("site-helpers", () => {
  it("normalizes Vietnamese zone names into BE-compatible ASCII codes", () => {
    const cases: Array<[string, string]> = [
      ["Khu vực A - Móng hầm", "ZONE-KHU-VUC-A-MONG-HAM"],
      ["Đào đất tầng hầm Đ1", "ZONE-DAO-DAT-TANG-HAM-D1"],
      ["Zone B - Cần cẩu tháp", "ZONE-B-CAN-CAU-THAP"],
      ["   ", "ZONE-AREA"],
    ];

    for (const [input, expected] of cases) {
      const result = normalizeZoneCode(input);
      assert.equal(result, expected);
      assert.match(result, /^[A-Z0-9_-]+$/i);
    }
  });

  it("parses contactOfficers safely from arrays, JSON strings, or invalid strings", () => {
    const officers = [{ name: "Nguyen Van A", roleTitle: "Lead", phones: ["0901234567"] }];
    assert.deepEqual(parseSiteContactOfficers(officers), officers);
    assert.deepEqual(parseSiteContactOfficers(JSON.stringify(officers)), officers);
    assert.deepEqual(parseSiteContactOfficers("{bad json"), []);
    assert.deepEqual(parseSiteContactOfficers(null), []);
  });

  it("resolves display officers with legacy contactPerson/contactPhone fallback", () => {
    const legacy = resolveDisplayOfficers(
      {
        contactOfficers: [],
        contactPerson: "Tran Van B",
        contactPhone: "0911111111, 0922222222",
      },
      "Officer in Charge",
    );
    assert.equal(legacy.length, 1);
    assert.equal(legacy[0].name, "Tran Van B");
    assert.equal(legacy[0].roleTitle, "Officer in Charge");
    assert.deepEqual(legacy[0].phones, ["0911111111", "0922222222"]);
  });

  it("formats date inputs as YYYY-MM-DD safely", () => {
    assert.equal(toDateInputValue("2026-11-16"), "2026-11-16");
    assert.equal(toDateInputValue("2026-11-16T08:30:00.000Z"), "2026-11-16");
    assert.equal(toDateInputValue("invalid-date"), "");
    assert.equal(toDateInputValue(null), "");
  });

  it("generates unique zone codes that avoid existing zone codes in the site", () => {
    const existing = ["ZONE-KHU-A", "ZONE-AREA"];
    const first = generateUniqueZoneCode("Khu B", existing, false);
    assert.equal(first, "ZONE-KHU-B");

    const collided = generateUniqueZoneCode("Khu A", existing, false);
    assert.notEqual(collided, "ZONE-KHU-A");
    assert.match(collided, /^ZONE-KHU-A-[A-Z0-9]{4}$/);

    const forcedRandom = generateUniqueZoneCode("Khu A", existing, true);
    assert.notEqual(forcedRandom, "ZONE-KHU-A");
    assert.match(forcedRandom, /^ZONE-[A-Z0-9-]+$/);
  });

  it("normalizes admin roles (ADMIN and SUPER_ADMIN) and officer sync permission checks", () => {
    assert.equal(isAdminRole("ADMIN"), true);
    assert.equal(isAdminRole("SUPER_ADMIN"), true);
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("SAFETY_MANAGER"), false);
    assert.equal(isAdminRole(null), false);

    assert.equal(canSyncSiteOfficers("ADMIN"), true);
    assert.equal(canSyncSiteOfficers("SUPER_ADMIN"), true);
    assert.equal(canSyncSiteOfficers("SAFETY_MANAGER", true), true);
    assert.equal(canSyncSiteOfficers("SAFETY_MANAGER", false), false);
    assert.equal(canSyncSiteOfficers("SAFETY_OFFICER"), false);
  });

  it("resolves independent helmet and vest confirmation durations with 4.0s vest fallback and 1-60s clamping", () => {
    assert.equal(clampSiteConfirmationDuration(0.5, 2), 1);
    assert.equal(clampSiteConfirmationDuration(75, 4), 60);
    assert.equal(clampSiteConfirmationDuration(undefined, 4), 4);

    assert.deepEqual(
      resolveSiteConfirmationDurations({
        helmetConfirmationDuration: 3.5,
        confirmationDuration: 3.5,
        vestConfirmationDuration: 6.5,
      }),
      {
        helmetConfirmationDuration: 3.5,
        vestConfirmationDuration: 6.5,
      },
    );

    // Backward-compatible legacy payload without vestConfirmationDuration keeps Vest at 4s
    assert.deepEqual(
      resolveSiteConfirmationDurations({
        confirmationDuration: 2,
      }),
      {
        helmetConfirmationDuration: 2,
        vestConfirmationDuration: 4,
      },
    );
  });
});
