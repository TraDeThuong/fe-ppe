import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildDispatchSignalDescription,
  buildResolvedReportDescription,
  classifyIncidentAlert,
  groupIncidentsByCamera,
  isIncidentAssignedToUser,
  runInBatches,
} from "../incident-workflow";
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
});
