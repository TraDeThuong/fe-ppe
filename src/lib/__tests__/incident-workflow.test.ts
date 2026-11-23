import { describe, it, mock } from "node:test";
import assert from "node:assert";
import {
  buildDispatchSignalDescription,
  buildResolvedReportDescription,
  classifyIncidentAlert,
  groupIncidentsByCamera,
  groupIncidentsByResponsibility,
  groupIncidentsBySiteResponsibility,
  isIncidentAssignedToUser,
  resolveIncidentResponsibility,
  runInBatches,
  type ResponsiblePersonRef,
} from "../incident-workflow";
import { resolveIncidentsWithReport } from "../incident-actions";
import { getVisibleNavItems, isNavItemActive, resolveRoutePermission } from "@/config/navigation";
import { incidentService } from "@/services/incident.service";
import type { IncidentItem } from "@/types";

describe("Incident Workflow & Role-Based SSE Signal Classification", () => {
  describe("classifyIncidentAlert", () => {
    it("triggers bell & toast for RAW_AI_ALERT only on SAFETY_MANAGER and ADMIN, suppressing SAFETY_OFFICER", () => {
      const rawPayload = {
        incidentId: "inc-1",
        content: "Phát hiện vi phạm NO_HELMET tại camera CAM-01.",
        severity: "HIGH",
      };

      const mgr = classifyIncidentAlert(rawPayload, "notification:ppe_violation", "SAFETY_MANAGER");
      assert.strictEqual(mgr.kind, "RAW_AI_ALERT");
      assert.strictEqual(mgr.shouldTriggerBellAndToast, true);
      assert.strictEqual(mgr.toastSeverity, "CRITICAL");

      const admin = classifyIncidentAlert(rawPayload, "notification:ppe_violation", "ADMIN");
      assert.strictEqual(admin.shouldTriggerBellAndToast, true);

      const officer = classifyIncidentAlert(rawPayload, "notification:ppe_violation", "SAFETY_OFFICER");
      assert.strictEqual(officer.kind, "RAW_AI_ALERT");
      assert.strictEqual(officer.shouldTriggerBellAndToast, false);
    });

    it("triggers bell & toast for [ĐIỀU PHỐI] signal only on SAFETY_OFFICER", () => {
      const dispatchPayload = {
        incidentId: "inc-2",
        content: buildDispatchSignalDescription({
          count: 4,
          cameraLabel: "CAM-01",
          note: "Kiểm tra tổ thi công",
          managerName: "Nguyễn Quản Lý",
        }),
        severity: "HIGH",
      };

      const officer = classifyIncidentAlert(dispatchPayload, "notification:ppe_violation", "SAFETY_OFFICER");
      assert.strictEqual(officer.kind, "MANAGER_DISPATCH");
      assert.strictEqual(officer.shouldTriggerBellAndToast, true);
      assert.strictEqual(officer.toastSeverity, "HIGH");

      const mgr = classifyIncidentAlert(dispatchPayload, "notification:ppe_violation", "SAFETY_MANAGER");
      assert.strictEqual(mgr.kind, "MANAGER_DISPATCH");
      assert.strictEqual(mgr.shouldTriggerBellAndToast, false);
    });

    it("triggers NORMAL severity toast for [BÁO CÁO ĐÃ KHẮC PHỤC] only on Manager/Admin", () => {
      const reportPayload = {
        incidentId: "inc-3",
        content: buildResolvedReportDescription({
          count: 3,
          cameraLabel: "CAM-02",
          resolutionNote: "Công nhân đã đội đủ mũ",
          officerName: "Trần Cán Bộ",
        }),
        severity: "HIGH",
      };

      const mgr = classifyIncidentAlert(reportPayload, "notification:ppe_violation", "SAFETY_MANAGER");
      assert.strictEqual(mgr.kind, "OFFICER_RESOLVED_REPORT");
      assert.strictEqual(mgr.shouldTriggerBellAndToast, true);
      assert.strictEqual(mgr.toastSeverity, "NORMAL");

      const officer = classifyIncidentAlert(reportPayload, "notification:ppe_violation", "SAFETY_OFFICER");
      assert.strictEqual(officer.kind, "OFFICER_RESOLVED_REPORT");
      assert.strictEqual(officer.shouldTriggerBellAndToast, false);
    });
  });

  describe("isIncidentAssignedToUser", () => {
    it("matches active assignments by assignedTo and ignores COMPLETED ones", () => {
      assert.strictEqual(
        isIncidentAssignedToUser(
          {
            assignments: [
              { id: "a1", incidentId: "i1", assignedTo: "u1", assignedAt: "", status: "ACTIVE" },
            ],
          },
          "u1",
        ),
        true,
      );
      assert.strictEqual(
        isIncidentAssignedToUser(
          {
            assignments: [
              { id: "a1", incidentId: "i1", assignedTo: "u1", assignedAt: "", status: "COMPLETED" },
            ],
          },
          "u1",
        ),
        false,
      );
    });
  });

  describe("groupIncidentsByCamera", () => {
    it("groups incidents by camera and counts actionable statuses", () => {
      const base: Partial<IncidentItem> = {
        siteId: "s1",
        violationType: "NO_HELMET",
        severity: "HIGH",
        detectedAt: "2026-11-17T08:00:00Z",
        createdAt: "2026-11-17T08:00:00Z",
        updatedAt: "2026-11-17T08:00:00Z",
      };
      const items = [
        { ...base, id: "1", cameraId: "c1", cameraCode: "CAM-01", status: "PENDING_REVIEW" },
        { ...base, id: "2", cameraId: "c1", cameraCode: "CAM-01", status: "CONFIRMED" },
        { ...base, id: "3", cameraId: "c2", cameraCode: "CAM-02", status: "RESOLVED" },
      ] as IncidentItem[];

      const groups = groupIncidentsByCamera(items, (i) => i.cameraCode || i.cameraId);
      assert.strictEqual(groups.length, 2);
      assert.strictEqual(groups[0].cameraLabel, "CAM-01");
      assert.deepStrictEqual(groups[0].pendingIds, ["1"]);
      assert.deepStrictEqual(groups[0].confirmedIds, ["2"]);
      assert.deepStrictEqual(groups[0].dispatchableIds, ["1", "2"]);
      assert.deepStrictEqual(groups[1].resolvedIds, ["3"]);
    });
  });

  describe("runInBatches", () => {
    it("processes items in batches and isolates failures", async () => {
      const res = await runInBatches([1, 2, 3, 4, 5], 2, async (n) => {
        if (n === 3) throw new Error("boom");
        return n * 10;
      });
      assert.deepStrictEqual(res.succeeded, [10, 20, 40, 50]);
      assert.strictEqual(res.failed.length, 1);
      assert.strictEqual(res.failed[0].item, 3);
    });
  });

  describe("resolveIncidentResponsibility & Admin Group Aggregation", () => {
    const managerA: ResponsiblePersonRef = {
      id: "mgr-1",
      name: "Nguyễn Văn Quản Lý",
      email: "manager@ppe.local",
      role: "SAFETY_MANAGER",
    };
    const officerA: ResponsiblePersonRef = {
      id: "off-1",
      name: "Trần Thị An Toàn",
      email: "officer@ppe.local",
      role: "SAFETY_OFFICER",
    };

    const siteManagersBySiteId = new Map<string, ResponsiblePersonRef[]>([
      ["site-1", [managerA]],
    ]);
    const usersById = new Map<string, ResponsiblePersonRef>([
      [managerA.id, managerA],
      [officerA.id, officerA],
    ]);

    const makeIncident = (
      id: string,
      status: string,
      assignedTo?: string,
    ): IncidentItem => ({
      id,
      siteId: "site-1",
      siteName: "Công trường Cầu Thủ Thiêm",
      cameraId: "cam-1",
      cameraCode: "CAM-01",
      violationType: "NO_HELMET",
      severity: "HIGH",
      status,
      detectedAt: "2026-11-18T08:00:00Z",
      createdAt: "2026-11-18T08:00:00Z",
      updatedAt: "2026-11-18T08:00:00Z",
      assignments: assignedTo
        ? [
            {
              id: `assign-${id}`,
              incidentId: id,
              assignedTo,
              assignedAt: "2026-11-18T08:05:00Z",
              status: "ACTIVE",
            },
          ]
        : [],
    });

    it("resolves responsibility across all 5 lifecycle phases", () => {
      const ctx = { siteManagersBySiteId, usersById };

      const r1 = resolveIncidentResponsibility(makeIncident("i1", "PENDING_REVIEW"), ctx);
      assert.strictEqual(r1.phase, "AWAITING_MANAGER_REVIEW");
      assert.strictEqual(r1.ownerRole, "SAFETY_MANAGER");
      assert.deepStrictEqual(r1.ownerNames, ["Nguyễn Văn Quản Lý"]);

      const r2 = resolveIncidentResponsibility(makeIncident("i2", "CONFIRMED"), ctx);
      assert.strictEqual(r2.phase, "AWAITING_MANAGER_DISPATCH");
      assert.strictEqual(r2.ownerRole, "SAFETY_MANAGER");

      const r3 = resolveIncidentResponsibility(makeIncident("i3", "CONFIRMED", "off-1"), ctx);
      assert.strictEqual(r3.phase, "OFFICER_REMEDIATING");
      assert.strictEqual(r3.ownerRole, "SAFETY_OFFICER");
      assert.strictEqual(r3.assignedOfficerName, "Trần Thị An Toàn");

      const r4 = resolveIncidentResponsibility(makeIncident("i4", "RESOLVED", "off-1"), ctx);
      assert.strictEqual(r4.phase, "AWAITING_MANAGER_ACCEPTANCE");
      assert.strictEqual(r4.ownerRole, "SAFETY_MANAGER");
      assert.strictEqual(r4.assignedOfficerName, "Trần Thị An Toàn");

      const r5 = resolveIncidentResponsibility(makeIncident("i5", "CLOSED", "off-1"), ctx);
      assert.strictEqual(r5.phase, "COMPLETED");
      assert.strictEqual(r5.ownerRole, "COMPLETED");
    });

    it("aggregates incidents into managerGroups, officerGroups and siteGroups for Admin oversight", () => {
      const items = [
        makeIncident("i1", "PENDING_REVIEW"),
        makeIncident("i2", "CONFIRMED"),
        makeIncident("i3", "CONFIRMED", "off-1"),
        makeIncident("i4", "RESOLVED", "off-1"),
      ];

      const { managerGroups, officerGroups } = groupIncidentsByResponsibility(items, {
        siteManagersBySiteId,
        usersById,
        resolveSiteName: (_sid, fallback) => fallback || "Site 1",
        resolveCameraLabel: (inc) => inc.cameraCode || inc.cameraId,
      });

      assert.strictEqual(managerGroups.length, 1);
      assert.strictEqual(managerGroups[0].managerName, "Nguyễn Văn Quản Lý");
      assert.strictEqual(managerGroups[0].pendingReviewItems.length, 1);
      assert.strictEqual(managerGroups[0].unassignedConfirmedItems.length, 1);
      assert.strictEqual(managerGroups[0].awaitingAcceptanceItems.length, 1);

      assert.strictEqual(officerGroups.length, 1);
      assert.strictEqual(officerGroups[0].officerName, "Trần Thị An Toàn");
      assert.strictEqual(officerGroups[0].activeConfirmedItems.length, 1);
      assert.strictEqual(officerGroups[0].resolvedItems.length, 1);
      assert.strictEqual(officerGroups[0].completionRate, 50);

      const siteGroups = groupIncidentsBySiteResponsibility(items, {
        siteManagersBySiteId,
        usersById,
        resolveSiteName: (_sid, fallback) => fallback || "Site 1",
      });
      assert.strictEqual(siteGroups.length, 1);
      assert.deepStrictEqual(siteGroups[0].managerNames, ["Nguyễn Văn Quản Lý"]);
      assert.deepStrictEqual(siteGroups[0].officerNames, ["Trần Thị An Toàn"]);
    });

    it("does not swallow afterFixFile upload errors in resolveIncidentsWithReport", async () => {
      const inc = makeIncident("i-upload-fail", "CONFIRMED", "off-1");
      const uploadMock = mock.method(
        incidentService,
        "uploadEvidenceDirect",
        async () => {
          throw new Error("MinIO upload failed");
        },
      );
      const resolveMock = mock.method(
        incidentService,
        "resolveIncident",
        async () => inc,
      );

      try {
        const fakeFile = new File(["img"], "after.jpg", { type: "image/jpeg" });
        const res = await resolveIncidentsWithReport({
          incidents: [inc],
          resolutionNote: "Đã đội mũ bảo hộ",
          afterFixFile: fakeFile,
        });

        assert.strictEqual(res.resolvedCount, 0);
        assert.strictEqual(res.failedCount, 1);
        assert.strictEqual(resolveMock.mock.callCount(), 0);
      } finally {
        uploadMock.mock.restore();
        resolveMock.mock.restore();
      }
    });
  });

  describe("Sidebar Navigation Consolidation (/incidents/assignments & /evidences merged under /incidents)", () => {
    it("hides /incidents/assignments and /evidences from visible sidebar items while keeping /incidents visible, highlighted on /evidences, and route permission guarded", () => {
      const visible = getVisibleNavItems(["PPE_INCIDENT_READ"]);
      const incidentsItem = visible.find((item) => item.route === "/incidents");
      assert.ok(incidentsItem);
      assert.strictEqual(
        visible.some((item) => item.route === "/incidents/assignments"),
        false,
      );
      assert.strictEqual(
        visible.some((item) => item.route === "/evidences"),
        false,
      );
      assert.strictEqual(
        resolveRoutePermission("/incidents/assignments"),
        "PPE_INCIDENT_READ",
      );
      assert.strictEqual(
        resolveRoutePermission("/evidences"),
        "PPE_INCIDENT_READ",
      );
      assert.strictEqual(
        isNavItemActive("/evidences", incidentsItem, visible),
        true,
      );
    });
  });
});
