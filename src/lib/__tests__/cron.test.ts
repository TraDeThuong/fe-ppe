import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessCronJobGuidance,
  buildCronPayload,
  calculateNextRun,
  canReadCron,
  describeCronSchedule,
  detectCronConflicts,
  extractRecentCronExecutions,
  filterCronJobs,
  findNextScheduledJob,
  formatCronOutcomeSummary,
  formatCronRelativeAgo,
  mergeRecentExecutions,
} from "../cron";
import { getVisibleNavItems, resolveRoutePermission } from "@/config/navigation";
import type { AuditLogItem } from "@/types/audit.types";
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
  it("filters jobs with localized Vietnamese name via translator function", () => {
    const t = (key: string) => {
      if (key === "cron.jobs.cleanup-audit-logs") return "Dọn dẹp nhật ký kiểm toán";
      if (key === "cron.jobs.weekly-summary-digest") return "Báo cáo hoạt động hằng tuần";
      return key;
    };
    const matched = filterCronJobs(jobs, "dọn dẹp", "all", t);
    assert.equal(matched.length, 1);
    assert.equal(matched[0].name, "cleanup-audit-logs");
  });
});

describe("Cron next run calculation & conflict detection", () => {
  const jobs: CronJobItem[] = [
    { name: "daily-summary-digest", description: "Daily", cron: "0 8 * * *", isEnabled: true },
    { name: "weekly-summary-digest", description: "Weekly", cron: "0 8 * * 1", isEnabled: true },
  ];

  it("returns paused status when job is disabled", () => {
    const result = calculateNextRun("0 2 * * *", false);
    assert.equal(result.isPaused, true);
    assert.equal(result.date, null);
    assert.equal(result.formatted, "Lịch đang tắt");
  });

  it("calculates next daily run correctly", () => {
    // 2026-11-12 01:00:00 VN time (UTC: 2026-11-11 18:00:00)
    const baseBefore2am = new Date(Date.UTC(2026, 10, 11, 18, 0, 0));
    const nextBefore = calculateNextRun("0 2 * * *", true, baseBefore2am);
    assert.equal(nextBefore.isPaused, false);
    assert.notEqual(nextBefore.date, null);
    // Should run at 02:00 VN time today (UTC: 2026-11-11 19:00:00)
    assert.equal(nextBefore.date?.toISOString(), "2026-11-11T19:00:00.000Z");

    // 2026-11-12 03:00:00 VN time (UTC: 2026-11-11 20:00:00)
    const baseAfter2am = new Date(Date.UTC(2026, 10, 11, 20, 0, 0));
    const nextAfter = calculateNextRun("0 2 * * *", true, baseAfter2am);
    // Should run at 02:00 VN time tomorrow (UTC: 2026-11-12 19:00:00)
    assert.equal(nextAfter.date?.toISOString(), "2026-11-12T19:00:00.000Z");
  });

  it("calculates next weekly Monday run correctly", () => {
    // 2026-11-16 is a Monday. 07:00 VN time -> UTC: 2026-11-16 00:00:00
    const mondayMorning = new Date(Date.UTC(2026, 10, 16, 0, 0, 0));
    const nextMonMorning = calculateNextRun("0 8 * * 1", true, mondayMorning);
    // Runs at 08:00 VN time today (UTC: 2026-11-16 01:00:00)
    assert.equal(nextMonMorning.date?.toISOString(), "2026-11-16T01:00:00.000Z");

    // 2026-11-16 Monday 09:00 VN time -> UTC: 2026-11-16 02:00:00
    const mondayAfternoon = new Date(Date.UTC(2026, 10, 16, 2, 0, 0));
    const nextMonNextWeek = calculateNextRun("0 8 * * 1", true, mondayAfternoon);
    // Runs at 08:00 VN time next Monday 2026-11-23 (UTC: 2026-11-23 01:00:00)
    assert.equal(nextMonNextWeek.date?.toISOString(), "2026-11-23T01:00:00.000Z");
  });

  it("detects Monday 08:00 AM conflict between daily and weekly summary", () => {
    const dailyConflict = detectCronConflicts("daily-summary-digest", jobs);
    assert.equal(dailyConflict.hasConflict, true);
    assert.deepEqual(dailyConflict.conflictingJobNames, ["weekly-summary-digest"]);

    const weeklyConflict = detectCronConflicts("weekly-summary-digest", jobs);
    assert.equal(weeklyConflict.hasConflict, true);
    assert.deepEqual(weeklyConflict.conflictingJobNames, ["daily-summary-digest"]);

    // If weekly job is disabled, daily should have no conflict
    const jobsWithWeeklyDisabled: CronJobItem[] = [
      jobs[0],
      { ...jobs[1], isEnabled: false },
    ];
    assert.equal(detectCronConflicts("daily-summary-digest", jobsWithWeeklyDisabled).hasConflict, false);
  });

  it("finds the earliest upcoming enabled job", () => {
    const sampleJobs: CronJobItem[] = [
      { name: "cleanup-audit-logs", description: "Audit", cron: "0 2 * * *", isEnabled: false },
      { name: "cleanup-expired-tokens", description: "Tokens", cron: "0 4 * * *", isEnabled: true },
      { name: "daily-summary-digest", description: "Daily", cron: "0 8 * * *", isEnabled: true },
    ];
    // 2026-11-16 03:00 VN time -> UTC: 2026-11-15 20:00:00
    const now = new Date(Date.UTC(2026, 10, 15, 20, 0, 0));
    const earliest = findNextScheduledJob(sampleJobs, now);
    assert.equal(earliest?.job.name, "cleanup-expired-tokens");
  });

  it("extracts latest execution per cron job from audit logs and merges session runs", () => {
    const auditLogs: AuditLogItem[] = [
      {
        id: "1",
        userId: null,
        actorId: null,
        action: "TOGGLE_CRON_JOB",
        targetType: "CRON_JOB",
        targetId: "cleanup-audit-logs",
        status: "SUCCESS",
        createdAt: "2026-11-16T05:00:00.000Z",
      },
      {
        id: "2",
        userId: "admin-1",
        actorId: "admin-1",
        action: "TRIGGER_CRON_JOB",
        targetType: "CRON_JOB",
        targetId: "cleanup-audit-logs",
        status: "SUCCESS",
        details: { durationMs: 88, result: { deletedCount: 4 } },
        createdAt: "2026-11-16T01:00:00.000Z",
      },
      {
        id: "3",
        userId: null,
        actorId: null,
        action: "CLEANUP_AUDIT_LOGS",
        targetType: "CRON_JOB",
        targetId: "cleanup-audit-logs",
        status: "SUCCESS",
        details: { deletedCount: 4 },
        createdAt: "2026-11-16T01:00:00.100Z",
      },
    ];

    const fromAudit = extractRecentCronExecutions(auditLogs);
    assert.equal(fromAudit["cleanup-audit-logs"]?.durationMs, 88);
    assert.equal(fromAudit["cleanup-audit-logs"]?.triggerType, "MANUAL");
    assert.equal(fromAudit["cleanup-audit-logs"]?.fromAuditLog, true);

    const merged = mergeRecentExecutions(fromAudit, {
      "cleanup-audit-logs": {
        timestamp: "2026-11-16T06:00:00.000Z",
        success: true,
        durationMs: 42,
        triggerType: "MANUAL",
        fromAuditLog: false,
      },
    });
    assert.equal(merged["cleanup-audit-logs"]?.durationMs, 42);
    assert.equal(merged["cleanup-audit-logs"]?.fromAuditLog, false);
  });

  it("assesses guidance to highlight just-ran, failed, overdue, never-ran, and healthy jobs", () => {
    const now = new Date("2026-11-16T10:00:00.000Z");
    const dailyJob: CronJobItem = {
      name: "cleanup-audit-logs",
      cron: "0 2 * * *",
      description: "Audit",
      isEnabled: true,
    };

    // Never ran when audit history is available -> shouldClickRun
    assert.equal(
      assessCronJobGuidance(dailyJob, undefined, { auditAvailable: true, now }).state,
      "never_ran",
    );
    assert.equal(
      assessCronJobGuidance(dailyJob, undefined, { auditAvailable: true, now }).shouldClickRun,
      true,
    );

    // Just ran 5 minutes ago -> just_ran, no click needed
    const justRan = assessCronJobGuidance(
      dailyJob,
      { timestamp: "2026-11-16T09:55:00.000Z", success: true, durationMs: 30, fromAuditLog: true },
      { auditAvailable: true, now },
    );
    assert.equal(justRan.state, "just_ran");
    assert.equal(justRan.isJustRan, true);
    assert.equal(justRan.shouldClickRun, false);

    // Overdue (>26h ago for daily) -> overdue, shouldClickRun
    const overdue = assessCronJobGuidance(
      dailyJob,
      { timestamp: "2026-11-14T10:00:00.000Z", success: true, durationMs: 30, fromAuditLog: true },
      { auditAvailable: true, now },
    );
    assert.equal(overdue.state, "overdue");
    assert.equal(overdue.shouldClickRun, true);

    // Failed -> failed, shouldClickRun
    const failed = assessCronJobGuidance(
      dailyJob,
      { timestamp: "2026-11-16T09:58:00.000Z", success: false, durationMs: 30, fromAuditLog: true },
      { auditAvailable: true, now },
    );
    assert.equal(failed.state, "failed");
    assert.equal(failed.shouldClickRun, true);

    // Relative time & outcome formatting
    assert.equal(formatCronRelativeAgo("2026-11-16T09:55:00.000Z", now), "5 phút trước");
    assert.equal(
      formatCronOutcomeSummary("cleanup-audit-logs", { deletedCount: 12 }),
      "Đã xóa 12 nhật ký cũ",
    );
  });
});

