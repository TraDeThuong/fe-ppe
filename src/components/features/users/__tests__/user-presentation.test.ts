import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  buildRoleFilterItems,
  getRoleBadgeStyle,
  getUserAccountStatus,
  getUserInitials,
} from "../user-presentation";
import { apiClient } from "@/lib/axios";
import { userService } from "@/services/user.service";
import type { UserResponseDto } from "@/types";

function makeUser(overrides: Partial<UserResponseDto> = {}): UserResponseDto {
  return {
    id: overrides.id ?? "u-1",
    email: overrides.email ?? "user@example.com",
    fullName: overrides.fullName ?? "Nguyen Van A",
    roleId: overrides.roleId ?? "role-1",
    role: overrides.role ?? { id: "role-1", name: "USER" },
    isActive: overrides.isActive ?? true,
    twoFactorEnabled: overrides.twoFactorEnabled ?? false,
    lockedUntil: overrides.lockedUntil ?? null,
    deletedAt: overrides.deletedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-11-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("user-presentation helpers", () => {
  it("classifies account status accurately (deleted, locked, active, inactive)", () => {
    const now = new Date("2026-11-22T12:00:00.000Z");

    assert.equal(
      getUserAccountStatus(
        { isActive: true, lockedUntil: null, deletedAt: "2026-11-20T00:00:00.000Z" },
        now,
      ),
      "deleted",
    );
    assert.equal(
      getUserAccountStatus(
        { isActive: true, lockedUntil: "2026-11-23T00:00:00.000Z", deletedAt: null },
        now,
      ),
      "locked",
    );
    assert.equal(
      getUserAccountStatus(
        { isActive: true, lockedUntil: "2026-11-21T00:00:00.000Z", deletedAt: null },
        now,
      ),
      "active",
    );
    assert.equal(
      getUserAccountStatus(
        { isActive: false, lockedUntil: null, deletedAt: null },
        now,
      ),
      "inactive",
    );
  });

  it("extracts user initials cleanly with multi-word and email fallbacks", () => {
    assert.equal(getUserInitials({ fullName: "Trần Thanh Trà", email: "tra@ppe.vn" }), "TT");
    assert.equal(getUserInitials({ fullName: "Admin", email: "admin@ppe.vn" }), "A");
    assert.equal(getUserInitials({ fullName: "", email: "safety@ppe.vn" }), "S");
    assert.equal(getUserInitials({ fullName: null, email: null }), "U");
  });

  it("returns minimal consistent badge styles (primary for ADMIN, neutral for others)", () => {
    assert.match(getRoleBadgeStyle("ADMIN").badgeClass, /text-primary/);
    assert.match(getRoleBadgeStyle("SAFETY_OFFICER").badgeClass, /text-foreground/);
    assert.match(getRoleBadgeStyle("CUSTOM_AUDITOR").badgeClass, /text-foreground/);
  });

  it("builds ordered role filter items with summary counts, fallbacks, and deep-link preservation", () => {
    const items = buildRoleFilterItems({
      allLabel: "Tất cả",
      roles: [
        { id: "r-user", name: "USER", isSystem: true, userCount: 5 },
        { id: "r-custom-b", name: "SITE_INSPECTOR", isSystem: false, userCount: 2 },
        { id: "r-admin", name: "ADMIN", isSystem: true, userCount: 1 },
        { id: "r-custom-a", name: "AUDITOR", isSystem: false, userCount: 1 },
        { id: "r-officer", name: "SAFETY_OFFICER", isSystem: true, userCount: 4 },
      ],
      roleCounts: {
        ADMIN: 2,
        SAFETY_OFFICER: 6,
      },
      summaryTotal: 15,
      activeRole: "LEGACY_ROLE",
    });

    assert.deepEqual(
      items.map((i) => i.value),
      ["all", "ADMIN", "SAFETY_OFFICER", "USER", "AUDITOR", "LEGACY_ROLE", "SITE_INSPECTOR"],
    );
    assert.equal(items[0].count, 15);
    assert.equal(items.find((i) => i.value === "ADMIN")?.count, 2);
    assert.equal(items.find((i) => i.value === "SAFETY_OFFICER")?.count, 6);
    assert.equal(items.find((i) => i.value === "USER")?.count, 5);
  });
});

describe("userService server-side 2FA / isLocked filtering & summary endpoint", () => {
  it("passes twoFactorEnabled and isLocked directly to GET /users in a single request", async () => {
    const matchedUsers: UserResponseDto[] = [
      makeUser({ id: "user-12", twoFactorEnabled: true }),
      makeUser({ id: "user-15", twoFactorEnabled: true }),
    ];

    let capturedUrl = "";
    let capturedParams: unknown = null;
    const getStub = mock.method(
      apiClient,
      "get",
      async (url: string, config?: { params?: unknown }) => {
        capturedUrl = url;
        capturedParams = config?.params;
        return {
          data: matchedUsers,
          meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
        } as never;
      },
    );

    try {
      const res = await userService.getUsers({
        page: 1,
        limit: 10,
        twoFactorEnabled: true,
        isLocked: true,
        sortBy: "createdAt",
        order: "desc",
      });

      assert.equal(getStub.mock.callCount(), 1);
      assert.equal(capturedUrl, "/users");
      assert.deepEqual(capturedParams, {
        page: 1,
        limit: 10,
        twoFactorEnabled: true,
        isLocked: true,
        sortBy: "createdAt",
        order: "desc",
      });
      assert.equal(res.meta.total, 2);
      assert.deepEqual(
        res.data.map((u) => u.id),
        ["user-12", "user-15"],
      );
    } finally {
      getStub.mock.restore();
    }
  });

  it("fetches user KPI summary and byRole counts via single GET /users/summary request", async () => {
    let capturedUrl = "";
    const getStub = mock.method(apiClient, "get", async (url: string) => {
      capturedUrl = url;
      return {
        total: 3,
        active: 2,
        locked: 1,
        twoFactor: 2,
        byRole: {
          ADMIN: 1,
          SAFETY_OFFICER: 2,
        },
      } as never;
    });

    try {
      const summary = await userService.getUserSummary();
      assert.equal(getStub.mock.callCount(), 1);
      assert.equal(capturedUrl, "/users/summary");
      assert.equal(summary.total, 3);
      assert.equal(summary.active, 2);
      assert.equal(summary.locked, 1);
      assert.equal(summary.twoFactor, 2);
      assert.deepEqual(summary.byRole, {
        ADMIN: 1,
        SAFETY_OFFICER: 2,
      });
    } finally {
      getStub.mock.restore();
    }
  });
});
