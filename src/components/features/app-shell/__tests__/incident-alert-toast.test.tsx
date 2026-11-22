if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  extractEvidenceIdFromApiPath,
  isDockerInternalMinioUrl,
  resolveEvidenceUrl,
} from "@/lib/evidence-url";
import {
  WoodenIncidentToast,
  resolveIncidentToastVisual,
  toast as hotToast,
} from "@ui/toaster";
import {
  buildIncidentToastPayload,
  type IncidentAlertPayload,
} from "@/lib/incident-toast-payload";
import {
  resetIncidentToastTracker,
  toast,
} from "@/lib/toast";
import { appendIncidentGroupLink } from "@/lib/incident-group";

describe("Unified Incident WoodenToast, Violation Colors & Evidence URL Normalizer", () => {
  describe("resolveEvidenceUrl", () => {
    it("preserves absolute HTTP/HTTPS URLs", () => {
      const url = "http://localhost:9000/ppe-evidences/camera1/snapshot.jpg";
      assert.strictEqual(resolveEvidenceUrl(url), url);
    });

    it("rewrites Docker internal ppe-minio host to localhost for browser compatibility", () => {
      const dockerUrl = "http://ppe-minio:9000/ppe-evidences/camera1/snap.jpg";
      assert.strictEqual(
        resolveEvidenceUrl(dockerUrl),
        "http://localhost:9000/ppe-evidences/camera1/snap.jpg",
      );
    });

    it("prefixes relative /api/ URLs with the Gateway host", () => {
      const relative = "/api/v1/incidents/evidences/ev-123/download";
      const resolved = resolveEvidenceUrl(relative);
      assert.ok(resolved.includes("/api/v1/incidents/evidences/ev-123/download"));
      assert.ok(resolved.startsWith("http"));
    });

    it("preserves static images and videos path from public directory", () => {
      assert.strictEqual(
        resolveEvidenceUrl("/images/evidence/camera-01.jpg"),
        "/images/evidence/camera-01.jpg",
      );
      assert.strictEqual(
        resolveEvidenceUrl("evidence/camera-01.jpg"),
        "/evidence/camera-01.jpg",
      );
      assert.strictEqual(
        resolveEvidenceUrl("/videos/cameras/job_123/evidence/evidence_123.jpg"),
        "/videos/cameras/job_123/evidence/evidence_123.jpg",
      );
      assert.strictEqual(
        resolveEvidenceUrl("videos/cameras/evidence.jpg"),
        "/videos/cameras/evidence.jpg",
      );
    });

    it("resolves raw storageKey to MinIO ppe-evidences bucket", () => {
      const key = "tenant/site/camera/snap.jpg";
      assert.strictEqual(
        resolveEvidenceUrl(key),
        "http://localhost:9000/ppe-evidences/tenant/site/camera/snap.jpg",
      );
    });

    it("returns empty string for null, undefined or empty values", () => {
      assert.strictEqual(resolveEvidenceUrl(""), "");
      assert.strictEqual(resolveEvidenceUrl(null as any), "");
      assert.strictEqual(resolveEvidenceUrl(undefined), "");
    });

    it("extracts UUID from BE virtual evidence download paths", () => {
      const id = "01a1b59b-b6a9-7864-bec6-5bae898fa2fd";
      assert.strictEqual(
        extractEvidenceIdFromApiPath(`/api/v1/incidents/evidences/${id}/download`),
        id,
      );
      assert.strictEqual(
        extractEvidenceIdFromApiPath(
          `http://localhost/api/v1/evidences/${id}/download-url?action=VIEW`,
        ),
        id,
      );
      assert.strictEqual(
        extractEvidenceIdFromApiPath("http://localhost:9000/ppe-evidences/snap.jpg"),
        null,
      );
    });

    it("detects Docker internal MinIO URLs", () => {
      assert.strictEqual(
        isDockerInternalMinioUrl("http://ppe-minio:9000/ppe-evidences/test.jpg"),
        true,
      );
      assert.strictEqual(
        isDockerInternalMinioUrl("http://localhost:9000/ppe-evidences/test.jpg"),
        false,
      );
    });
  });

  describe("Violation Color Differentiation (resolveIncidentToastVisual)", () => {
    it("assigns distinct light & dark accents for every primary violation type", () => {
      const restricted = resolveIncidentToastVisual({
        kind: "RAW_AI_ALERT",
        violationType: "RESTRICTED_AREA",
        severity: "CRITICAL",
      });
      const helmet = resolveIncidentToastVisual({
        kind: "RAW_AI_ALERT",
        violationType: "NO_HELMET",
        severity: "HIGH",
      });
      const vest = resolveIncidentToastVisual({
        kind: "RAW_AI_ALERT",
        violationType: "NO_VEST",
        severity: "HIGH",
      });
      const multi = resolveIncidentToastVisual({
        kind: "RAW_AI_ALERT",
        violationType: "MULTI_VIOLATION",
        severity: "CRITICAL",
      });
      const boots = resolveIncidentToastVisual({
        kind: "RAW_AI_ALERT",
        violationType: "NO_BOOTS",
        severity: "NORMAL",
      });

      const lightColors = new Set([
        restricted.primary.accentLight,
        helmet.primary.accentLight,
        vest.primary.accentLight,
        multi.primary.accentLight,
        boots.primary.accentLight,
      ]);
      const darkColors = new Set([
        restricted.primary.accentDark,
        helmet.primary.accentDark,
        vest.primary.accentDark,
        multi.primary.accentDark,
        boots.primary.accentDark,
      ]);

      assert.strictEqual(lightColors.size, 5);
      assert.strictEqual(darkColors.size, 5);
      assert.strictEqual(restricted.durationMs, 8000);
      assert.strictEqual(helmet.durationMs, 7000);
      assert.strictEqual(boots.durationMs, 5500);
    });

    it("uses dispatch blue for MANAGER_DISPATCH while preserving secondary violation badge", () => {
      const dispatch = resolveIncidentToastVisual({
        kind: "MANAGER_DISPATCH",
        violationType: "NO_HELMET",
        severity: "HIGH",
      });

      assert.strictEqual(dispatch.primary.code, "MANAGER_DISPATCH");
      assert.strictEqual(dispatch.primary.accentLight, "#0369a1");
      assert.strictEqual(dispatch.violationBadge?.code, "NO_HELMET");
      assert.strictEqual(dispatch.violationBadge?.accentLight, "#c2410c");
    });

    it("uses olive emerald success tone and 5s duration for OFFICER_RESOLVED_REPORT", () => {
      const resolved = resolveIncidentToastVisual({
        kind: "OFFICER_RESOLVED_REPORT",
        violationType: "NO_VEST",
        severity: "NORMAL",
      });

      assert.strictEqual(resolved.primary.code, "OFFICER_RESOLVED_REPORT");
      assert.strictEqual(resolved.isCritical, false);
      assert.strictEqual(resolved.durationMs, 5000);
    });
  });

  describe("WoodenIncidentToast Component", () => {
    it("renders inside unified .ppe-toast shell without thumbnail while keeping incident & compare links", () => {
      const html = renderToStaticMarkup(
        <WoodenIncidentToast
          kind="RAW_AI_ALERT"
          violationType="NO_HELMET"
          violationLabel="Không đội mũ bảo hộ"
          severity="CRITICAL"
          title="Phát hiện không đội mũ bảo hộ"
          description="Công nhân chưa đội mũ bảo hộ tại cổng số 2."
          cameraLabel="CAM-GATE-02"
          siteLabel="Landmark 81 Tower"
          incidentHref="/incidents/0194e1e0-a43b-7341-9426-38290f6da867"
          compareHref="/incidents/0194e1e0-a43b-7341-9426-38290f6da867?focus=compare"
          onOpen={() => {}}
          onCompare={() => {}}
          onDismiss={() => {}}
        />,
      );

      assert.ok(html.includes("ppe-toast"));
      assert.ok(html.includes('data-toast-variant="incident"'));
      assert.ok(html.includes('data-violation-code="NO_HELMET"'));
      assert.ok(html.includes("CAM-GATE-02"));
      assert.ok(html.includes("Landmark 81 Tower"));
      assert.ok(html.includes("CRITICAL"));
      assert.ok(html.includes("Xem sự cố"));
      assert.ok(html.includes("Đối chiếu"));
      // Đảm bảo đã bỏ hoàn toàn thumbnail <img> trong toast
      assert.ok(!html.includes("<img"));
    });

    it("renders burst badge when burstCount > 1 and group action label for group targets", () => {
      const html = renderToStaticMarkup(
        <WoodenIncidentToast
          kind="MANAGER_DISPATCH"
          violationType="RESTRICTED_AREA"
          severity="HIGH"
          title="Nhiệm vụ xử lý 3 sự cố vi phạm"
          cameraLabel="CAM-ZONE-A"
          burstCount={3}
          isGroupTarget
          groupCount={3}
          onOpen={() => {}}
          onDismiss={() => {}}
        />,
      );

      assert.ok(html.includes('data-incident-kind="MANAGER_DISPATCH"'));
      assert.ok(html.includes("×3"));
      assert.ok(html.includes("Nhóm (3)"));
      assert.ok(html.includes("Xâm nhập vùng cấm"));
    });
  });

  describe("buildIncidentToastPayload", () => {
    it("cleans raw violation codes, resolves UUIDs via lookup, and preserves incident/compare routes", () => {
      const rawPayload: IncidentAlertPayload = {
        incidentId: "0194e1e0-a43b-7341-9426-38290f6da867",
        siteId: "0194e1e0-a43b-7341-9426-38290f6da111",
        cameraId: "0194e1e0-a43b-7341-9426-38290f6da222",
        violationType: "NO_HELMET",
        severity: "CRITICAL",
        title: "Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET",
        content: "Phát hiện NO_HELMET tại cổng 2. Mức độ: CRITICAL.",
      };

      const built = buildIncidentToastPayload({
        alertData: rawPayload,
        kind: "RAW_AI_ALERT",
        severity: "CRITICAL",
        isVietnamese: true,
        resolveCameraCode: (id) =>
          id === rawPayload.cameraId ? "CAM-GATE-02" : undefined,
        resolveSiteName: (id) =>
          id === rawPayload.siteId ? "Landmark 81" : undefined,
      });

      assert.strictEqual(built.input.cameraLabel, "CAM-GATE-02");
      assert.strictEqual(built.input.siteLabel, "Landmark 81");
      assert.ok(!built.input.title.includes("[CRITICAL]"));
      assert.ok(!built.input.title.includes("NO_HELMET"));
      assert.strictEqual(
        built.incidentHref,
        "/incidents/0194e1e0-a43b-7341-9426-38290f6da867",
      );
      assert.strictEqual(
        built.compareHref,
        "/incidents/0194e1e0-a43b-7341-9426-38290f6da867?focus=compare",
      );
      assert.strictEqual(built.burstKey, "RAW_AI_ALERT:CAM-GATE-02:NO_HELMET");
    });

    it("preserves grouped dispatch route and groupCount for officer notifications", () => {
      const inc1 = "0194e1e0-a43b-7341-9426-38290f6da867";
      const inc2 = "0194e1e0-a43b-7341-9426-38290f6da868";
      const content = appendIncidentGroupLink(
        "[ĐIỀU PHỐI] Quản lý đã giao 2 sự cố vi phạm tại CAM-01 — Chỉ đạo: Kiểm tra ngay",
        {
          v: 1,
          groupId: "0194e1e0-a43b-7341-9426-38290f6da999",
          incidentIds: [inc1, inc2],
          assignedBy: "0194e1e0-a43b-7341-9426-38290f6da001",
          assignedTo: "0194e1e0-a43b-7341-9426-38290f6da002",
          createdAt: "2026-11-21T10:00:00.000Z",
        },
      );

      const built = buildIncidentToastPayload({
        alertData: {
          incidentId: inc1,
          cameraCode: "CAM-01",
          violationType: "NO_VEST",
          content,
        },
        kind: "MANAGER_DISPATCH",
        severity: "HIGH",
        isVietnamese: true,
      });

      assert.strictEqual(built.input.isGroupTarget, true);
      assert.strictEqual(built.input.groupCount, 2);
      assert.ok(built.incidentHref?.includes("group=0194e1e0-a43b-7341-9426-38290f6da999"));
      assert.strictEqual(built.input.description, "Kiểm tra ngay");
    });
  });

  describe("toast.incident Smart Burst Coalescing & Max-3 Cap", () => {
    beforeEach(() => {
      resetIncidentToastTracker();
    });

    it("coalesces rapid identical burstKey alerts into the same toast id and caps active toasts at 3", () => {
      const createdCalls: Array<{ id?: string; duration?: number }> = [];
      const dismissedIds: Array<string | undefined> = [];

      const customMock = mock.method(
        hotToast,
        "custom",
        (_renderer: unknown, opts?: { id?: string; duration?: number }) => {
          createdCalls.push({ id: opts?.id, duration: opts?.duration });
          return opts?.id || `generated-${createdCalls.length}`;
        },
      );
      const dismissMock = mock.method(hotToast, "dismiss", (id?: string) => {
        dismissedIds.push(id);
      });

      try {
        // 2 sự cố giống nhau cùng camera + loại vi phạm trong cửa sổ 5s -> gom vào cùng id
        const firstId = toast.incident(
          { title: "No helmet #1", violationType: "NO_HELMET", severity: "HIGH" },
          { id: "inc-1", burstKey: "RAW_AI_ALERT:CAM-01:NO_HELMET" },
        );
        const secondId = toast.incident(
          { title: "No helmet #2", violationType: "NO_HELMET", severity: "HIGH" },
          { id: "inc-2", burstKey: "RAW_AI_ALERT:CAM-01:NO_HELMET" },
        );

        assert.strictEqual(firstId, "inc-1");
        assert.strictEqual(secondId, "inc-1");
        assert.strictEqual(dismissedIds.length, 0);

        // Thêm 3 sự cố khác nhau nữa -> tổng vượt 3 slot, slot cũ nhất ("inc-1") bị dismiss tự động
        toast.incident(
          { title: "No vest", violationType: "NO_VEST", severity: "HIGH" },
          { id: "inc-3", burstKey: "RAW_AI_ALERT:CAM-02:NO_VEST" },
        );
        toast.incident(
          { title: "Restricted", violationType: "RESTRICTED_AREA", severity: "CRITICAL" },
          { id: "inc-4", burstKey: "RAW_AI_ALERT:CAM-03:RESTRICTED_AREA" },
        );
        assert.strictEqual(dismissedIds.length, 0);

        toast.incident(
          { title: "Multi", violationType: "MULTI_VIOLATION", severity: "CRITICAL" },
          { id: "inc-5", burstKey: "RAW_AI_ALERT:CAM-04:MULTI_VIOLATION" },
        );
        assert.deepStrictEqual(dismissedIds, ["inc-1"]);
      } finally {
        customMock.mock.restore();
        dismissMock.mock.restore();
      }
    });
  });
});
