import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCronPayload, canReadCron, describeCronSchedule, filterCronJobs } from "../cron";
import { getVisibleNavItems, resolveRoutePermission } from "@/config/navigation";
import type { CronJobItem } from "@/types/cron.types";

describe("Cron manual execution validation", () => {
  for (const [job, minimum, maximum, key] of [
    ["cleanup-audit-logs", 30, 3650, "retentionDays"],
    ["cleanup-unconfirmed-uploads", 1, 720, "maxAgeHours"],
  ] as const) {
    it(`${job}: accepts both boundaries and only its own parameter`, () => {
      for (const value of [minimum, maximum]) assert.deepEqual(buildCronPayload(job, String(value)), { params: { [key]: value } });
    });
    it(`${job}: rejects blank, fractional, non-finite, and out-of-range input`, () => {
      for (const value of ["", " ", "1.5", "NaN", "Infinity", "1e2", "-1", String(minimum - 1), String(maximum + 1)]) assert.equal(buildCronPayload(job, value), null, value);
    });
  }
  it("sends no unrelated cleanup parameters for the other three jobs", () => {
    for (const job of ["cleanup-expired-tokens", "daily-summary-digest", "weekly-summary-digest"] as const) assert.deepEqual(buildCronPayload(job, "3650"), { params: {} });
  });
});

describe("Cron page data and authorization", () => {
  const jobs: CronJobItem[] = [
    { name: "cleanup-audit-logs", description: "Audit records", cron: "0 2 * * *", isEnabled: true, lastStatus: "READY" },
    { name: "weekly-summary-digest", description: "Weekly digest", cron: "0 8 * * 1", isEnabled: false, lastStatus: "READY" },
  ];
  it("combines search and schedule filters without mutating the source", () => {
    assert.deepEqual(filterCronJobs(jobs, " AUDIT ", "enabled"), [jobs[0]]);
    assert.deepEqual(filterCronJobs(jobs, "weekly-summary", "disabled"), [jobs[1]]);
    assert.deepEqual(filterCronJobs(jobs, "audit", "disabled"), []);
    assert.equal(jobs.length, 2);
    assert.equal(jobs[1].lastStatus, "READY");
  });
  it("requires authentication and the explicit read permission", () => {
    assert.equal(canReadCron("loading", ["CRON_JOB_READ"]), false);
    assert.equal(canReadCron("unauthenticated", ["CRON_JOB_READ"]), false);
    assert.equal(canReadCron("authenticated", ["CRON_JOB_MANAGE"]), false);
    assert.equal(canReadCron("authenticated", ["CRON_JOB_READ"]), true);
    assert.equal(getVisibleNavItems([]).some((item) => item.route === "/scheduled-tasks"), false);
    assert.equal(getVisibleNavItems(["CRON_JOB_READ"]).some((item) => item.route === "/scheduled-tasks"), true);
    assert.equal(resolveRoutePermission("/scheduled-tasks"), "CRON_JOB_READ");
    assert.equal(resolveRoutePermission("/scheduled-tasks/anything"), "CRON_JOB_READ");
  });
  it("describes the API expression and falls back for unfamiliar cron syntax", () => {
    const t = (key: string, params?: Record<string, string | number>) => `${key}:${params?.time ?? ""}`;
    assert.equal(describeCronSchedule("0 2 * * *", t), "cron.schedule.daily:02:00");
    assert.equal(describeCronSchedule("0 8 * * 1", t), "cron.schedule.monday:08:00");
    for (const cron of ["*/5 * * * *", "0 25 * * *", "0 8 * * 2", "bad expression"]) assert.equal(describeCronSchedule(cron, t), "cron.schedule.custom:");
  });
});
