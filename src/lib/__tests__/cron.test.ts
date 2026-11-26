import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessCronJobGuidance,
  buildCronPayload,
  calculateNextRun,
  canReadCron,
  detectCronConflicts,
  extractRecentCronExecutions,
  filterCronJobs,
  findNextScheduledJob,
  formatCronOutcomeSummary,
  formatCronRelativeAgo,
  getCronEditChanges,
  getCronHourOptions,
  getCronParameterValue,
  getCronScheduleLabel,
  mergeRecentExecutions,
  parseCronSchedule,
} from "../cron";
import { getVisibleNavItems, resolveRoutePermission } from "@/config/navigation";
import type { AuditLogItem } from "@/types/audit.types";
import type { CronJobItem, CronJobScheduleDto } from "@/types/cron.types";

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
  it("prefers the API label and describes supported legacy schedules", () => {
    const t = (key: string, params?: Record<string, string | number>) => key + ":" + (params?.time ?? "");
    assert.equal(getCronScheduleLabel({ ...jobs[0], scheduleLabel: "API label" }, t), "API label");
    assert.equal(getCronScheduleLabel(jobs[0], t), "cron.schedule.daily:02:00");
    assert.equal(getCronScheduleLabel(jobs[1], t), "cron.schedule.weekly:08:00");
    assert.equal(getCronScheduleLabel({
      ...jobs[0],
      schedule: { frequency: "MONTHLY", dayOfMonth: 28, hour: 23, minute: 59 },
    }, t), "cron.schedule.monthly:23:59");

    for (const cron of ["*/5 * * * *", "0 25 * * *", "0 8 29 * *", "0 8 1 * 2", "bad expression"]) {
      assert.equal(parseCronSchedule(cron), null, cron);
      assert.equal(getCronScheduleLabel({ ...jobs[0], cron }, t), "cron.schedule.custom:");
    }
  });
  it("sends exactly the selected frequency fields and preserves existing hourly intervals", () => {
    const schedules = [
      ["59 */5 * * *", { frequency: "HOURLY", everyHours: 5, minute: 59 }],
      ["0 0 * * *", { frequency: "DAILY", hour: 0, minute: 0 }],
      ["59 23 * * 7", { frequency: "WEEKLY", dayOfWeek: 0, hour: 23, minute: 59 }],
      ["59 23 28 * *", { frequency: "MONTHLY", dayOfMonth: 28, hour: 23, minute: 59 }],
    ] satisfies [string, CronJobScheduleDto][];
    for (const [cron, schedule] of schedules) {
      assert.deepEqual(parseCronSchedule(cron), schedule);
      assert.deepEqual(getCronEditChanges(jobs[0], schedule, jobs[0].description, "30").payload, { schedule });
      assert.deepEqual(getCronEditChanges({ ...jobs[0], cron }, schedule, jobs[0].description, "30").payload, {});
    }
    const hourly = schedules[0][1];
    assert.deepEqual(getCronHourOptions(hourly), [1, 2, 4, 5, 6, 8, 12]);
    assert.deepEqual(getCronHourOptions(), [1, 2, 4, 6, 8, 12]);
  });
  it("allows metadata-only updates for custom schedules and validates changed fields", () => {
    const job = { ...jobs[0], cron: "*/5 * * * *", defaultParams: { retentionDays: 60, maxAgeHours: 24 } };
    assert.equal(getCronParameterValue(job), "60");
    assert.deepEqual(getCronEditChanges(job, null, "  New description  ", "3650"), {
      payload: { description: "New description", defaultParams: { retentionDays: 3650 } },
      invalidDescription: false,
      invalidParameter: false,
    });
    assert.deepEqual(getCronEditChanges(job, null, job.description, "60").payload, {});
    for (const parameter of ["", "29", "3651", "30.5"]) {
      assert.equal(getCronEditChanges(job, null, job.description, parameter).invalidParameter, true, parameter);
    }
    for (const description of ["  ", "a".repeat(501)]) {
      assert.equal(getCronEditChanges(job, null, description, "30").invalidDescription, true);
    }
    assert.deepEqual(getCronEditChanges(jobs[1], null, "Updated digest", "720").payload, { description: "Updated digest" });
    assert.equal(getCronParameterValue({ ...job, name: "cleanup-unconfirmed-uploads", defaultParams: {} }), "24");
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
    const result = calculateNextRun({ cron: "0 2 * * *", isEnabled: false });
    assert.equal(result.isPaused, true);
    assert.equal(result.date, null);
    assert.equal(result.formatted, "Lịch đang tắt");
  });

  it("calculates next daily run correctly", () => {
    // 2026-11-12 01:00:00 VN time (UTC: 2026-11-11 18:00:00)
    const baseBefore2am = new Date(Date.UTC(2026, 10, 11, 18, 0, 0));
    const nextBefore = calculateNextRun({ cron: "0 2 * * *", isEnabled: true }, baseBefore2am);
    assert.equal(nextBefore.isPaused, false);
    assert.notEqual(nextBefore.date, null);
    // Should run at 02:00 VN time today (UTC: 2026-11-11 19:00:00)
    assert.equal(nextBefore.date?.toISOString(), "2026-11-11T19:00:00.000Z");

    // 2026-11-12 03:00:00 VN time (UTC: 2026-11-11 20:00:00)
    const baseAfter2am = new Date(Date.UTC(2026, 10, 11, 20, 0, 0));
    const nextAfter = calculateNextRun({ cron: "0 2 * * *", isEnabled: true }, baseAfter2am);
    // Should run at 02:00 VN time tomorrow (UTC: 2026-11-12 19:00:00)
    assert.equal(nextAfter.date?.toISOString(), "2026-11-12T19:00:00.000Z");
  });

  it("calculates next weekly Monday run correctly", () => {
    // 2026-11-16 is a Monday. 07:00 VN time -> UTC: 2026-11-16 00:00:00
    const mondayMorning = new Date(Date.UTC(2026, 10, 16, 0, 0, 0));
    const nextMonMorning = calculateNextRun({ cron: "0 8 * * 1", isEnabled: true }, mondayMorning);
    // Runs at 08:00 VN time today (UTC: 2026-11-16 01:00:00)
    assert.equal(nextMonMorning.date?.toISOString(), "2026-11-16T01:00:00.000Z");

    // 2026-11-16 Monday 09:00 VN time -> UTC: 2026-11-16 02:00:00
    const mondayAfternoon = new Date(Date.UTC(2026, 10, 16, 2, 0, 0));
    const nextMonNextWeek = calculateNextRun({ cron: "0 8 * * 1", isEnabled: true }, mondayAfternoon);
    // Runs at 08:00 VN time next Monday 2026-11-23 (UTC: 2026-11-23 01:00:00)
    assert.equal(nextMonNextWeek.date?.toISOString(), "2026-11-23T01:00:00.000Z");
  });

  it("detects Monday 08:00 AM conflict between daily and weekly summary", () => {
    const dailyConflict = detectCronConflicts("daily-summary-digest", jobs, (key) => key);
    assert.equal(dailyConflict.hasConflict, true);
    assert.deepEqual(dailyConflict.conflictingJobNames, ["weekly-summary-digest"]);

    const weeklyConflict = detectCronConflicts("weekly-summary-digest", jobs, (key) => key);
    assert.equal(weeklyConflict.hasConflict, true);
    assert.deepEqual(weeklyConflict.conflictingJobNames, ["daily-summary-digest"]);

    // If weekly job is disabled, daily should have no conflict
    const jobsWithWeeklyDisabled: CronJobItem[] = [
      jobs[0],
      { ...jobs[1], isEnabled: false },
    ];
    assert.equal(detectCronConflicts("daily-summary-digest", jobsWithWeeklyDisabled, (key) => key).hasConflict, false);
  });

  it("calculates hourly resets, month rollovers and future API timestamps in Vietnam time", () => {
    const job = { cron: "15 */5 * * *", isEnabled: true };
    const afterLastHour = new Date("2026-11-25T16:14:00Z");
    assert.equal(calculateNextRun(job, afterLastHour).date?.toISOString(), "2026-11-25T17:15:00.000Z");

    const monthEnd = new Date("2026-12-28T17:00:00Z");
    const monthly = {
      ...job, schedule: { frequency: "MONTHLY", dayOfMonth: 28, hour: 0, minute: 0 },
    } satisfies Parameters<typeof calculateNextRun>[0];
    const next = calculateNextRun(monthly, monthEnd);
    assert.equal(next.date?.toISOString(), "2027-01-27T17:00:00.000Z");
    assert.match(next.formatted, /00:00:00/);

    const nextRun = "2027-01-01T00:00:00Z";
    assert.equal(calculateNextRun({ ...monthly, nextRun }, monthEnd).date?.toISOString(), "2027-01-01T00:00:00.000Z");
    for (const nextRun of ["invalid", "2026-12-01T00:00:00Z"]) {
      assert.deepEqual(calculateNextRun({ ...monthly, nextRun }, monthEnd), next);
    }
    assert.equal(calculateNextRun({ ...monthly, nextRun, isEnabled: false }, monthEnd).date, null);
  });

  it("updates conflicts when either digest changes its timing or is disabled", () => {
    const t = (key: string) => key;
    const monthly = { ...jobs[0], cron: "15 12 28 * *" };
    const hourly = { ...jobs[1], cron: "15 */6 * * *" };
    assert.equal(detectCronConflicts(monthly.name, [monthly, hourly], t).hasConflict, true);
    assert.equal(detectCronConflicts(monthly.name, [{ ...monthly, isEnabled: false }, hourly], t).hasConflict, false);
    assert.equal(detectCronConflicts(monthly.name, [monthly, { ...hourly, cron: "15 */5 * * *" }], t).hasConflict, false);
    assert.equal(detectCronConflicts(monthly.name, [monthly, { ...hourly, cron: "15 12 27 * *" }], t).hasConflict, false);
  });

  it("uses the edited cadence for dashboard overdue guidance", () => {
    const now = new Date("2026-11-26T07:15:00Z");
    const lastRun = { timestamp: "2026-11-25T20:00:00Z", success: true, durationMs: 30, fromAuditLog: true };
    const options = { auditAvailable: true, now };
    assert.equal(assessCronJobGuidance({ ...jobs[0], cron: "0 */6 * * *" }, lastRun, options).state, "overdue");
    const month = { ...jobs[0], cron: "0 0 28 * *" };
    assert.equal(assessCronJobGuidance(month, { ...lastRun, timestamp: "2026-10-28T00:00:00Z" }, options).state, "healthy_idle");
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

    const edited: AuditLogItem = { ...auditLogs[0], id: "4", action: "UPDATE_CRON_JOB" };
    assert.deepEqual(extractRecentCronExecutions([edited]), {});
    const fromAudit = extractRecentCronExecutions([edited, ...auditLogs]);
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

