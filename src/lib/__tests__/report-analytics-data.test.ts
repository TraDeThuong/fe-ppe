import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessGeneratedReport,
  computePersonnelPerformanceStats,
  computeReportArchiveStats,
  computeResolutionFunnel,
  computeResolutionFunnelFromSummary,
  computeRoleSegmentedPersonnelStats,
  computeSiteComparisonStats,
  detectReportFormat,
  filterIncidentsInDateRange,
  getReportDateRange,
  getVietnamDateBoundaries,
  reconcileReportTrends,
  validateReportPeriod,
} from "../report-analytics-data";
import type {
  IncidentItem,
  ReportGenerationDto,
  ReportTemplateDto,
  SiteItem,
  StatisticsSummaryDto,
  TrendItemDto,
  UserResponseDto,
} from "@/types";

function makeIncident(overrides: Partial<IncidentItem> & { id: string }): IncidentItem {
  return {
    siteId: "site-1",
    cameraId: "cam-1",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "CONFIRMED",
    detectedAt: "2026-11-18T08:00:00.000Z",
    createdAt: "2026-11-18T08:00:00.000Z",
    updatedAt: "2026-11-18T08:00:00.000Z",
    ...overrides,
  };
}

describe("report-analytics-data", () => {
  it("computes inclusive Vietnam date ranges for presets and custom periods", () => {
    assert.deepEqual(getReportDateRange("today", undefined, undefined, "2026-11-20"), {
      startDate: "2026-11-20",
      endDate: "2026-11-20",
    });
    assert.deepEqual(getReportDateRange("7d", undefined, undefined, "2026-11-20"), {
      startDate: "2026-11-14",
      endDate: "2026-11-20",
    });
    assert.deepEqual(getReportDateRange("30d", undefined, undefined, "2026-11-20"), {
      startDate: "2026-10-22",
      endDate: "2026-11-20",
    });
    assert.deepEqual(getReportDateRange("custom", "2026-11-01", "2026-11-15", "2026-11-20"), {
      startDate: "2026-11-01",
      endDate: "2026-11-15",
    });
  });

  it("converts date bounds to full-day UTC+7 ISO boundaries", () => {
    const bounds = getVietnamDateBoundaries("2026-11-01", "2026-11-18");
    assert.equal(bounds.fromDate, "2026-10-31T17:00:00.000Z");
    assert.equal(bounds.toDate, "2026-11-18T16:59:59.999Z");
  });

  it("filters incidents using Vietnam calendar day instead of UTC date", () => {
    const items = [
      // 2026-11-18 22:00 UTC = 2026-11-19 05:00 VN -> outside 2026-11-01..2026-11-18
      makeIncident({ id: "1", detectedAt: "2026-11-18T22:00:00.000Z" }),
      // 2026-11-01 01:00 VN (2026-10-31 18:00 UTC) -> inside 2026-11-01..2026-11-18
      makeIncident({ id: "2", detectedAt: "2026-10-31T18:00:00.000Z" }),
      makeIncident({ id: "3", siteId: "site-2", detectedAt: "2026-11-10T08:00:00.000Z" }),
    ];

    const filtered = filterIncidentsInDateRange(items, "2026-11-01", "2026-11-18", "site-1");
    assert.deepEqual(
      filtered.map((x) => x.id),
      ["2"],
    );
  });

  it("falls back to live incidents and zero-fills continuous buckets when rollup is stale or zeroed", () => {
    const staleRollupSummary: StatisticsSummaryDto = {
      totalIncidents: 100, // e.g., BE summary fallback
      openIncidents: 50,
      resolvedIncidents: 20,
      trueViolations: 30,
      falseAlarms: 0,
      falseAlarmRate: 0,
      complianceRate: 70,
      meanTimeToResolveHours: 1,
    };
    const zeroedRawTrends: TrendItemDto[] = [
      { date: "2026-11-17", totalIncidents: 0, trueViolations: 0, falseAlarms: 0, resolvedCount: 0 },
    ];
    const liveIncidents = [
      makeIncident({ id: "1", status: "PENDING_REVIEW", detectedAt: "2026-11-17T03:00:00.000Z" }),
      makeIncident({ id: "2", status: "RESOLVED", detectedAt: "2026-11-18T05:00:00.000Z" }),
      makeIncident({ id: "3", status: "DISMISSED", detectedAt: "2026-11-18T06:00:00.000Z" }),
    ];

    const trends = reconcileReportTrends({
      rawTrends: zeroedRawTrends,
      rawSummary: staleRollupSummary,
      filteredIncidents: liveIncidents,
      startDate: "2026-11-16",
      endDate: "2026-11-19",
      groupBy: "DAY",
    });

    assert.equal(trends.length, 4);
    assert.deepEqual(trends, [
      { date: "2026-11-16", totalIncidents: 0, trueViolations: 0, falseAlarms: 0, resolvedCount: 0 },
      { date: "2026-11-17", totalIncidents: 1, trueViolations: 1, falseAlarms: 0, resolvedCount: 0 },
      { date: "2026-11-18", totalIncidents: 2, trueViolations: 1, falseAlarms: 1, resolvedCount: 1 },
      { date: "2026-11-19", totalIncidents: 0, trueViolations: 0, falseAlarms: 0, resolvedCount: 0 },
    ]);
  });

  it("returns empty array when neither rollup nor live incidents have any data in range", () => {
    const trends = reconcileReportTrends({
      rawTrends: [],
      rawSummary: null,
      filteredIncidents: [],
      startDate: "2026-11-14",
      endDate: "2026-11-20",
      groupBy: "DAY",
    });

    assert.deepEqual(trends, []);
  });

  it("groups trends by WEEK and MONTH and zero-fills all buckets in range", () => {
    const liveIncidents = [
      makeIncident({ id: "1", status: "CONFIRMED", detectedAt: "2026-11-02T05:00:00.000Z" }),
      makeIncident({ id: "2", status: "CLOSED", detectedAt: "2026-11-18T05:00:00.000Z" }),
    ];

    const weekly = reconcileReportTrends({
      rawTrends: [],
      filteredIncidents: liveIncidents,
      startDate: "2026-11-02",
      endDate: "2026-11-18",
      groupBy: "WEEK",
    });

    assert.deepEqual(
      weekly.map((w) => w.date),
      ["2026-W45", "2026-W46", "2026-W47"],
    );
    assert.equal(weekly[0].trueViolations, 1);
    assert.equal(weekly[1].trueViolations, 0);
    assert.equal(weekly[2].resolvedCount, 1);

    const monthly = reconcileReportTrends({
      rawTrends: [],
      filteredIncidents: liveIncidents,
      startDate: "2026-10-22",
      endDate: "2026-11-20",
      groupBy: "MONTH",
    });

    assert.deepEqual(
      monthly.map((m) => m.date),
      ["2026-10", "2026-11"],
    );
    assert.equal(monthly[0].totalIncidents, 0);
    assert.equal(monthly[1].totalIncidents, 2);
  });

  it("detects report formats, checks BOLA report access, and computes archive KPI stats", () => {
    const reports: ReportGenerationDto[] = [
      {
        id: "r1",
        templateId: "t1",
        siteId: "s1",
        reportType: "DAILY",
        periodStart: "2026-11-01",
        periodEnd: "2026-11-07",
        generatedBy: "user-1",
        status: "COMPLETED",
        fileName: "report_daily.pdf",
        generatedAt: "2026-11-07T08:00:00Z",
        createdAt: "2026-11-07T08:00:00Z",
      },
      {
        id: "r2",
        templateId: "t2",
        siteId: "s1",
        reportType: "MONTHLY",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        generatedBy: "user-2",
        status: "COMPLETED",
        fileName: "report_monthly.xlsx",
        fileType: "EXCEL",
        generatedAt: "2026-11-01T08:00:00Z",
        createdAt: "2026-11-01T08:00:00Z",
      },
      {
        id: "r3",
        templateId: "t3",
        siteId: "s1",
        reportType: "AI_PERFORMANCE",
        periodStart: "2026-11-01",
        periodEnd: "2026-11-10",
        generatedBy: "user-1",
        status: "PROCESSING",
        fileName: "report_ai.pdf",
        generatedAt: "2026-11-10T08:00:00Z",
        createdAt: "2026-11-10T08:00:00Z",
      },
    ];

    const templates: ReportTemplateDto[] = [
      {
        id: "t1",
        name: "Daily",
        code: "DAILY",
        fileType: "PDF",
        version: "1.0.0",
        status: "ACTIVE",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
      {
        id: "t2",
        name: "Monthly",
        code: "MONTHLY",
        fileType: "EXCEL",
        version: "1.0.0",
        status: "INACTIVE",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ];

    assert.equal(detectReportFormat(reports[0]), "PDF");
    assert.equal(detectReportFormat(reports[1]), "EXCEL");

    assert.equal(canAccessGeneratedReport(reports[0], "user-1", false), true);
    assert.equal(canAccessGeneratedReport(reports[1], "user-1", false), false);
    assert.equal(canAccessGeneratedReport(reports[1], "user-1", true), true);

    // Site tenancy & PPE_REPORTING_READ alignment (Backend Issue #4):
    // Same-site Viewer / Safety Manager can access reports for their assigned site
    assert.equal(
      canAccessGeneratedReport(reports[1], "viewer-1", false, {
        canReadReports: true,
        siteIds: ["s1"],
      }),
      true,
    );
    // Different-site user is blocked from other site's reports
    assert.equal(
      canAccessGeneratedReport(reports[1], "viewer-2", false, {
        canReadReports: true,
        siteIds: ["s2"],
      }),
      false,
    );
    // Explicit lack of PPE_REPORTING_READ blocks access
    assert.equal(
      canAccessGeneratedReport(reports[1], "viewer-1", false, {
        canReadReports: false,
        siteIds: ["s1"],
      }),
      false,
    );

    // Validate report export periods (<= 90 days, no future dates)
    assert.equal(validateReportPeriod("2026-11-01", "2026-11-20", "2026-11-20"), true);
    assert.equal(validateReportPeriod("2026-11-21", "2026-11-20", "2026-11-20"), false);
    assert.equal(validateReportPeriod("2026-11-01", "2026-11-21", "2026-11-20"), false);
    assert.equal(validateReportPeriod("2026-07-01", "2026-11-20", "2026-11-20"), false);

    // Derive funnel directly from StatisticsSummaryDto
    const summaryFunnel = computeResolutionFunnelFromSummary({
      totalIncidents: 10,
      openIncidents: 2,
      trueViolations: 3,
      resolvedIncidents: 4,
      falseAlarms: 1,
      falseAlarmRate: 12.5,
      complianceRate: 70,
      meanTimeToResolveHours: 1.5,
    });
    assert.equal(summaryFunnel.totalDetected, 10);
    assert.equal(summaryFunnel.pendingReview, 2);
    assert.equal(summaryFunnel.remediating, 3);
    assert.equal(summaryFunnel.completedTotal, 4);
    assert.equal(summaryFunnel.dismissed, 1);
    assert.equal(summaryFunnel.bottleneckStage, "remediating");

    const stats = computeReportArchiveStats(reports, templates, 12);
    assert.equal(stats.totalReports, 12);
    assert.equal(stats.completedCount, 2);
    assert.equal(stats.processingCount, 1);
    assert.equal(stats.periodicCount, 2);
    assert.equal(stats.specializedCount, 1);
    assert.equal(stats.pdfCount, 2);
    assert.equal(stats.excelCount, 1);
    assert.equal(stats.activeTemplatesCount, 1);
    assert.equal(stats.totalTemplatesCount, 2);
  });

  it("computes 5-stage resolution funnel and bottleneck stage accurately", () => {
    const incidents: IncidentItem[] = [
      makeIncident({ id: "i1", status: "PENDING_REVIEW" }),
      makeIncident({ id: "i2", status: "CONFIRMED", assignments: [] }),
      makeIncident({
        id: "i3",
        status: "CONFIRMED",
        assignments: [
          {
            id: "a1",
            incidentId: "i3",
            assignedTo: "u1",
            assignedAt: "2026-11-18T08:05:00.000Z",
            status: "ACTIVE",
          },
        ],
      }),
      makeIncident({
        id: "i4",
        status: "CONFIRMED",
        _count: { assignments: 1 },
      }),
      makeIncident({ id: "i5", status: "RESOLVED" }),
      makeIncident({ id: "i6", status: "CLOSED" }),
      makeIncident({ id: "i7", status: "DISMISSED" }),
    ];

    const funnel = computeResolutionFunnel(incidents);
    assert.equal(funnel.totalDetected, 7);
    assert.equal(funnel.pendingReview, 1);
    assert.equal(funnel.awaitingDispatch, 1);
    assert.equal(funnel.remediating, 2);
    assert.equal(funnel.awaitingAcceptance, 1);
    assert.equal(funnel.closed, 1);
    assert.equal(funnel.dismissed, 1);
    assert.equal(funnel.trueViolationsTotal, 5);
    assert.equal(funnel.completedTotal, 2);
    assert.equal(funnel.resolutionRate, 40);
    assert.equal(funnel.falseAlarmRate, 16.7);
    assert.equal(funnel.bottleneckStage, "remediating");
    assert.equal(funnel.bottleneckCount, 2);
  });

  it("computes site comparison stats with compliance, resolution rate, and MTTR", () => {
    const sites: SiteItem[] = [
      { id: "site-1", name: "Công trường A", code: "SITE-A", status: "ACTIVE", createdAt: "", updatedAt: "" },
      { id: "site-2", name: "Công trường B", code: "SITE-B", status: "ACTIVE", createdAt: "", updatedAt: "" },
    ];
    const incidents: IncidentItem[] = [
      makeIncident({ id: "s1-1", siteId: "site-1", status: "CONFIRMED" }),
      makeIncident({
        id: "s1-2",
        siteId: "site-1",
        status: "CLOSED",
        detectedAt: "2026-11-18T08:00:00.000Z",
        resolvedAt: "2026-11-18T09:00:00.000Z",
      }),
      makeIncident({ id: "s2-1", siteId: "site-2", status: "DISMISSED" }),
    ];

    const stats = computeSiteComparisonStats(incidents, sites);
    assert.equal(stats.length, 2);
    assert.equal(stats[0].siteId, "site-1");
    assert.equal(stats[0].totalIncidents, 2);
    assert.equal(stats[0].complianceRate, 50);
    assert.equal(stats[0].resolutionRate, 50);
    assert.equal(stats[0].meanTimeToResolveHours, 1);
    assert.equal(stats[1].siteId, "site-2");
    assert.equal(stats[1].falseAlarms, 1);
    assert.equal(stats[1].complianceRate, 100);
  });

  it("computes personnel workload, completion rate, MTTR, and SLA compliance", () => {
    const usersById = new Map([
      ["u-off-1", { id: "u-off-1", name: "Nguyễn Văn A", email: "a@ppe.vn", role: "SAFETY_OFFICER" }],
      ["u-off-2", { id: "u-off-2", name: "Trần Thị B", email: "b@ppe.vn", role: "SAFETY_OFFICER" }],
    ]);

    const incidents: IncidentItem[] = [
      // u-off-1: 1 CLOSED in 20m (HIGH SLA=30m -> met), 1 RESOLVED in 90m (HIGH SLA=30m -> missed), 1 CONFIRMED
      makeIncident({
        id: "p1",
        severity: "HIGH",
        status: "CLOSED",
        detectedAt: "2026-11-18T08:00:00.000Z",
        resolvedAt: "2026-11-18T08:20:00.000Z",
        assignments: [
          { id: "a1", incidentId: "p1", assignedTo: "u-off-1", assignedAt: "2026-11-18T08:05:00.000Z", status: "COMPLETED" },
        ],
      }),
      makeIncident({
        id: "p2",
        severity: "HIGH",
        status: "RESOLVED",
        detectedAt: "2026-11-18T08:00:00.000Z",
        resolvedAt: "2026-11-18T09:30:00.000Z",
        assignments: [
          { id: "a2", incidentId: "p2", assignedTo: "u-off-1", assignedAt: "2026-11-18T08:05:00.000Z", status: "COMPLETED" },
        ],
      }),
      makeIncident({
        id: "p3",
        severity: "CRITICAL",
        status: "CONFIRMED",
        assignments: [
          { id: "a3", incidentId: "p3", assignedTo: "u-off-1", assignedAt: "2026-11-18T08:05:00.000Z", status: "ACTIVE" },
        ],
      }),
      // u-off-2 via statusHistory fallback (resolved directly without assignment)
      makeIncident({
        id: "p4",
        severity: "MEDIUM",
        status: "CLOSED",
        detectedAt: "2026-11-18T08:00:00.000Z",
        resolvedAt: "2026-11-18T08:30:00.000Z",
        assignments: [],
        statusHistory: [
          {
            id: "h1",
            incidentId: "p4",
            oldStatus: "CONFIRMED",
            newStatus: "RESOLVED",
            changedBy: "u-off-2",
            changedAt: "2026-11-18T08:30:00.000Z",
          },
        ],
      }),
      // Unassigned confirmed incident
      makeIncident({ id: "p5", status: "CONFIRMED", assignments: [] }),
      // Ignored statuses
      makeIncident({ id: "p6", status: "PENDING_REVIEW" }),
      makeIncident({ id: "p7", status: "DISMISSED" }),
    ];

    const summary = computePersonnelPerformanceStats(incidents, {
      usersById,
      resolveSiteName: () => "Công trường A",
    });

    assert.equal(summary.totalTrackedIncidents, 5);
    assert.equal(summary.assignedIncidentsCount, 4);
    assert.equal(summary.unassignedConfirmedCount, 1);
    assert.equal(summary.staffCount, 2);

    const first = summary.items[0];
    assert.equal(first.userId, "u-off-1");
    assert.equal(first.name, "Nguyễn Văn A");
    assert.equal(first.totalAssigned, 3);
    assert.equal(first.closedCount, 1);
    assert.equal(first.awaitingAcceptanceCount, 1);
    assert.equal(first.activeCount, 1);
    assert.equal(first.completionRate, 67);
    assert.equal(first.slaMetCount, 1);
    assert.equal(first.slaMeasuredCount, 2);
    assert.equal(first.slaComplianceRate, 50);

    const second = summary.items[1];
    assert.equal(second.userId, "u-off-2");
    assert.equal(second.slaComplianceRate, 100);

    const unassigned = summary.items[2];
    assert.equal(unassigned.isUnassignedBucket, true);
    assert.equal(unassigned.activeCount, 1);
  });

  it("seeds all active directory users including zero-workload users and scopes by site", () => {
    const allUsers: UserResponseDto[] = [
      {
        id: "u-1",
        email: "a@ppe.vn",
        fullName: "Nguyễn Văn A",
        roleId: "r1",
        role: { id: "r1", name: "SAFETY_OFFICER" },
        siteIds: ["site-1"],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "u-2",
        email: "b@ppe.vn",
        fullName: "Lê Văn B",
        roleId: "r1",
        role: { id: "r1", name: "SAFETY_OFFICER" },
        siteIds: ["site-1"],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "u-3",
        email: "c@ppe.vn",
        fullName: "Phạm Thị C",
        roleId: "r1",
        role: { id: "r1", name: "SAFETY_OFFICER" },
        siteIds: ["site-2"],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "u-deleted",
        email: "del@ppe.vn",
        fullName: "Deleted User",
        roleId: "r1",
        role: { id: "r1", name: "SAFETY_OFFICER" },
        siteIds: ["site-1"],
        isActive: true,
        deletedAt: "2026-11-01T00:00:00Z",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const incidents: IncidentItem[] = [
      makeIncident({
        id: "inc-1",
        siteId: "site-1",
        status: "CLOSED",
        assignments: [
          {
            id: "a1",
            incidentId: "inc-1",
            assignedTo: "u-1",
            assignedAt: "2026-11-18T08:05:00.000Z",
            status: "COMPLETED",
          },
        ],
      }),
    ];

    const summary = computePersonnelPerformanceStats(incidents, {
      allUsers,
      selectedSiteId: "site-1",
      resolveSiteName: (sid) => (sid === "site-1" ? "Công trường A" : "Công trường B"),
    });

    assert.equal(summary.staffCount, 2);
    assert.equal(summary.activeHandlersCount, 1);
    assert.equal(summary.idleStaffCount, 1);
    assert.deepEqual(
      summary.items.map((x) => [x.userId, x.totalAssigned]),
      [
        ["u-1", 1],
        ["u-2", 0],
      ],
    );
    assert.deepEqual(summary.items[1].siteNames, ["Công trường A"]);
  });

  it("separates Safety Officers, Safety Managers, and Admins with role-appropriate metrics", () => {
    const allUsers: UserResponseDto[] = [
      {
        id: "off-1",
        email: "off1@ppe.vn",
        fullName: "Officer Một",
        roleId: "r-off",
        role: { id: "r-off", name: "SAFETY_OFFICER" },
        siteIds: ["site-1"],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "mgr-1",
        email: "mgr1@ppe.vn",
        fullName: "Manager Một",
        roleId: "r-mgr",
        role: { id: "r-mgr", name: "SAFETY_MANAGER" },
        siteIds: ["site-1"],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "adm-1",
        email: "adm1@ppe.vn",
        fullName: "Admin Một",
        roleId: "r-adm",
        role: { id: "r-adm", name: "ADMIN" },
        siteIds: [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const incidents: IncidentItem[] = [
      makeIncident({
        id: "i-closed",
        siteId: "site-1",
        status: "CLOSED",
        severity: "HIGH",
        detectedAt: "2026-11-18T08:00:00.000Z",
        resolvedAt: "2026-11-18T08:25:00.000Z",
        assignments: [
          {
            id: "a1",
            incidentId: "i-closed",
            assignedTo: "off-1",
            assignedAt: "2026-11-18T08:10:00.000Z",
            status: "COMPLETED",
          },
        ],
        statusHistory: [
          {
            id: "h1",
            incidentId: "i-closed",
            oldStatus: "PENDING_REVIEW",
            newStatus: "CONFIRMED",
            changedBy: "mgr-1",
            changedAt: "2026-11-18T08:05:00.000Z",
          },
          {
            id: "h2",
            incidentId: "i-closed",
            oldStatus: "CONFIRMED",
            newStatus: "RESOLVED",
            changedBy: "off-1",
            changedAt: "2026-11-18T08:25:00.000Z",
          },
          {
            id: "h3",
            incidentId: "i-closed",
            oldStatus: "RESOLVED",
            newStatus: "CLOSED",
            changedBy: "mgr-1",
            changedAt: "2026-11-18T08:40:00.000Z",
          },
        ],
      }),
      makeIncident({
        id: "i-dismissed",
        siteId: "site-1",
        status: "DISMISSED",
        detectedAt: "2026-11-18T09:00:00.000Z",
        statusHistory: [
          {
            id: "h4",
            incidentId: "i-dismissed",
            oldStatus: "PENDING_REVIEW",
            newStatus: "DISMISSED",
            changedBy: "mgr-1",
            changedAt: "2026-11-18T09:30:00.000Z",
          },
        ],
      }),
      makeIncident({
        id: "i-pending",
        siteId: "site-1",
        status: "PENDING_REVIEW",
      }),
    ];

    const result = computeRoleSegmentedPersonnelStats(incidents, {
      allUsers,
      resolveSiteName: () => "Công trường A",
    });

    // Officer: 1 incident assigned & closed, SLA met
    assert.equal(result.officer.staffCount, 1);
    assert.equal(result.officer.items[0].totalAssigned, 1);
    assert.equal(result.officer.items[0].closedCount, 1);
    assert.equal(result.officer.items[0].slaComplianceRate, 100);

    // Manager: 2 reviews (1 confirmed + 1 dismissed) + 1 closed acceptance = 3 totalActions, backlog = 1 pending
    assert.equal(result.manager.staffCount, 1);
    assert.equal(result.manager.items[0].confirmedReviewCount, 1);
    assert.equal(result.manager.items[0].dismissedReviewCount, 1);
    assert.equal(result.manager.items[0].closedAcceptanceCount, 1);
    assert.equal(result.manager.items[0].totalActions, 3);
    assert.equal(result.manager.items[0].siteBacklogCount, 1);

    // Admin: 1 admin in directory with 0 interventions
    assert.equal(result.admin.staffCount, 1);
    assert.equal(result.admin.items[0].totalActions, 0);
  });
});
