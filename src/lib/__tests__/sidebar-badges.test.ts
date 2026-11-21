import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSidebarBadges, formatBadgeCount } from "../sidebar-badges";
import { getNavLastSeenAt, markNavAsSeen } from "../sidebar-seen-store";

const ALL_PERMISSIONS = [
  "PPE_INCIDENT_READ",
  "NOTIFICATION_READ",
  "PPE_CAMERA_READ",
  "PPE_REPORTING_READ",
  "USER_READ",
  "AUDIT_LOG_READ",
  "MAINTENANCE_MANAGE",
  "CRON_JOB_READ",
];

const formatLabel = (key: string, count: number) => `${key}:${count}`;

describe("sidebar-badges", () => {
  it("returns empty map when user has no matching permissions", () => {
    const badges = computeSidebarBadges({
      permissions: [],
      pendingIncidentsCount: 12,
      unreadNotificationsCount: 5,
      offlineCamerasCount: 3,
      maintenanceEnabled: true,
      cronJobs: [{ lastStatus: "FAILED" }],
      formatLabel,
    });

    assert.deepEqual(badges, {});
  });

  it("computes incidents pending review and other badges when permitted", () => {
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const oneHourAgoMs = now - 60 * 60 * 1000;

    const badges = computeSidebarBadges({
      permissions: ALL_PERMISSIONS,
      pendingIncidentsCount: 7,
      unreadNotificationsCount: 4,
      offlineCamerasCount: 2,
      reportHistory: [
        { status: "PROCESSING", createdAt: twoHoursAgo, generatedAt: twoHoursAgo },
        { status: "COMPLETED", createdAt: twoHoursAgo, generatedAt: twoHoursAgo },
        { status: "COMPLETED", createdAt: tenMinutesAgo, generatedAt: tenMinutesAgo },
      ],
      reportsLastSeenAt: oneHourAgoMs,
      failedAuditLogs: [
        { status: "FAILED", createdAt: twoHoursAgo },
        { status: "FAILED", createdAt: tenMinutesAgo },
        { status: "SUCCESS", createdAt: tenMinutesAgo },
      ],
      auditLastSeenAt: oneHourAgoMs,
      maintenanceEnabled: true,
      cronJobs: [
        { lastStatus: "SUCCESS" },
        { lastStatus: "FAILED" },
      ],
      nowMs: now,
      formatLabel,
    });

    assert.deepEqual(badges.incidents, {
      count: 7,
      variant: "danger",
      label: "nav.badge.incidents:7",
      pulse: true,
    });
    assert.deepEqual(badges.notifications, {
      count: 4,
      variant: "danger",
      label: "nav.badge.notifications:4",
    });
    assert.deepEqual(badges.cameras, {
      count: 2,
      variant: "accent",
      label: "nav.badge.cameras:2",
    });
    assert.deepEqual(badges.reports, {
      count: 2, // 1 PROCESSING + 1 COMPLETED after oneHourAgoMs
      variant: "primary",
      label: "nav.badge.reports:2",
    });
    assert.equal(badges.users, undefined);
    assert.deepEqual(badges.auditLogs, {
      count: 2, // both FAILED and SUCCESS logs after oneHourAgoMs
      variant: "accent",
      label: "nav.badge.auditLogs:2",
    });
    assert.deepEqual(badges.maintenance, {
      count: 1,
      displayText: "ON",
      variant: "accent",
      label: "nav.badge.maintenance:1",
    });
    assert.deepEqual(badges.scheduledTasks, {
      count: 1,
      variant: "danger",
      label: "nav.badge.scheduledTasks:1",
    });
  });

  it("omits badges when counts are zero or all logs/reports were already seen", () => {
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

    const badges = computeSidebarBadges({
      permissions: ALL_PERMISSIONS,
      pendingIncidentsCount: 0,
      unreadNotificationsCount: 0,
      offlineCamerasCount: 0,
      reportHistory: [
        { status: "COMPLETED", createdAt: twoHoursAgo, generatedAt: twoHoursAgo },
      ],
      reportsLastSeenAt: now,
      failedAuditLogs: [{ status: "FAILED", createdAt: twoHoursAgo }],
      auditLastSeenAt: now,
      maintenanceEnabled: false,
      cronJobs: [{ lastStatus: "SUCCESS" }],
      nowMs: now,
      formatLabel,
    });

    assert.deepEqual(badges, {});
  });

  it("uses 7-day/14-day default lookbacks when lastSeenAt is null and uses primary variant for non-failed audit logs", () => {
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);
    const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString();

    const badges = computeSidebarBadges({
      permissions: ALL_PERMISSIONS,
      reportHistory: [
        { status: "COMPLETED", createdAt: fourDaysAgo, generatedAt: fourDaysAgo },
        { status: "COMPLETED", createdAt: eightDaysAgo, generatedAt: eightDaysAgo },
      ],
      reportsLastSeenAt: null,
      failedAuditLogs: [
        { status: "SUCCESS", createdAt: eightDaysAgo },
        { status: "SUCCESS", createdAt: twentyDaysAgo },
      ],
      auditLastSeenAt: null,
      nowMs: now,
      formatLabel,
    });

    assert.deepEqual(badges.reports, {
      count: 1,
      variant: "primary",
      label: "nav.badge.reports:1",
    });
    assert.deepEqual(badges.auditLogs, {
      count: 1,
      variant: "primary",
      label: "nav.badge.auditLogs:1",
    });
  });

  it("formats badge counts with max cap and displayText override", () => {
    assert.equal(
      formatBadgeCount({ count: 5, variant: "danger", label: "5" }),
      "5",
    );
    assert.equal(
      formatBadgeCount({ count: 120, variant: "danger", label: "120" }, 99),
      "99+",
    );
    assert.equal(
      formatBadgeCount({ count: 15, variant: "danger", label: "15" }, 9),
      "9+",
    );
    assert.equal(
      formatBadgeCount({
        count: 1,
        displayText: "ON",
        variant: "accent",
        label: "on",
      }),
      "ON",
    );
  });
});

describe("sidebar-seen-store", () => {
  it("handles missing window gracefully and persists seen timestamps per user", () => {
    assert.equal(getNavLastSeenAt("user-1", "reports"), null);

    const backing = new Map<string, string>();
    const prevWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => {
          backing.set(k, v);
        },
      },
    };

    try {
      markNavAsSeen("user-1", "reports", 1700000000000);
      markNavAsSeen("user-1", "auditLogs", 1700000050000);

      assert.equal(getNavLastSeenAt("user-1", "reports"), 1700000000000);
      assert.equal(getNavLastSeenAt("user-1", "auditLogs"), 1700000050000);
      assert.equal(getNavLastSeenAt("user-2", "reports"), null);
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    }
  });
});

