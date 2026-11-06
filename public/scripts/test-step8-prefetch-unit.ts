/**
 * Test unit Bước 8 — cơ chế resolve prefetch theo role/permissions.
 *
 * Chạy: npx tsx --env-file=.env.local scripts/test-step8-prefetch-unit.ts
 */
import assert from "node:assert/strict";
import {
  PREFETCH_JOBS,
  jobMatchesUser,
  resolvePrefetchJobs,
  type PrefetchJob,
} from "../src/config/prefetch-jobs";
import type { MeDto } from "../src/types/auth.types";

const SYSTEM_ROLES = [
  "ADMIN",
  "SAFETY_MANAGER",
  "SAFETY_OFFICER",
  "MANAGER",
  "USER",
];

function makeUser(role: string, permissions: string[] = []): MeDto {
  return {
    id: "u-1",
    email: "u@ppe.local",
    fullName: "Người Dùng",
    avatarUrl: null,
    phoneNumber: null,
    role,
    roleId: "r-1",
    permissions,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function fakeJob(overrides: Partial<PrefetchJob>): PrefetchJob {
  return {
    id: "fake.job",
    queryKey: ["fake"],
    queryFn: async () => null,
    staleTime: 60_000,
    ...overrides,
  };
}

console.log("=== KIỂM THỬ PREFETCH JOBS (BƯỚC 8) ===");

// 1. Registry hợp lệ
const ids = PREFETCH_JOBS.map((j) => j.id);
assert.equal(new Set(ids).size, ids.length, "mỗi job phải có id duy nhất");
assert.ok(ids.includes("auth.sessions"), "registry phải có job auth.sessions");
console.log("  1. Registry hợp lệ: " + ids.join(", "));

// 2. Job không ràng buộc role → mọi role hệ thống đều nhận
for (const role of SYSTEM_ROLES) {
  const jobs = resolvePrefetchJobs(makeUser(role));
  assert.ok(
    jobs.some((j) => j.id === "auth.sessions"),
    `role ${role} phải nhận job auth.sessions`,
  );
}
console.log("  2. Cả 5 role hệ thống đều nhận auth.sessions");

// 2b. Role mới (BE thêm sau) vẫn nhận job không ràng buộc role
assert.equal(
  resolvePrefetchJobs(makeUser("ROLE_MOI_TRONG_TUONG_LAI")).length,
  resolvePrefetchJobs(makeUser("ADMIN")).length,
  "role mới không có trong registry vẫn nhận job không ràng buộc role",
);
console.log("  2b. Role tương lai vẫn nhận job không ràng buộc role");

// 3. Lọc theo role — cơ chế phân kỳ "role khác nhau → danh sách khác nhau"
const adminOnly = fakeJob({ id: "job.admin", roles: ["ADMIN"] });
assert.ok(jobMatchesUser(adminOnly, makeUser("ADMIN")));
assert.ok(!jobMatchesUser(adminOnly, makeUser("USER")));
assert.ok(!jobMatchesUser(adminOnly, makeUser("SAFETY_MANAGER")));
console.log("  3. Lọc theo role hoạt động đúng");

// 4. Lọc theo permission — ANY-of
const manageUsers = fakeJob({
  id: "job.manage",
  permissions: ["USER_MANAGE", "USER_VIEW"],
});
assert.ok(jobMatchesUser(manageUsers, makeUser("MANAGER", ["USER_VIEW"])));
assert.ok(!jobMatchesUser(manageUsers, makeUser("MANAGER", ["SITE_VIEW"])));
assert.ok(!jobMatchesUser(manageUsers, makeUser("MANAGER")));
console.log("  4. Lọc theo permission (ANY-of) hoạt động đúng");

// 5. Kết hợp role + permission
const combined = fakeJob({
  id: "job.combined",
  roles: ["SAFETY_OFFICER"],
  permissions: ["INCIDENT_REVIEW"],
});
assert.ok(
  jobMatchesUser(combined, makeUser("SAFETY_OFFICER", ["INCIDENT_REVIEW"])),
);
assert.ok(!jobMatchesUser(combined, makeUser("SAFETY_OFFICER", [])));
assert.ok(!jobMatchesUser(combined, makeUser("ADMIN", ["INCIDENT_REVIEW"])));
console.log("  5. Kết hợp role + permission hoạt động đúng");

console.log("\nTất cả assert đạt — cơ chế resolve prefetch hoạt động đúng.");
