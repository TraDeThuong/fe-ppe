import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import IncidentDetailContent from "../../../../../app/(auth)/incidents/[id]/incident-detail-content";
import { apiClient } from "@/lib/axios";
import { notificationService } from "@/services";
import type { DispatchIncidentNotificationPayload } from "@/types";
import { renderWithDom } from "./render-with-dom";

const stamp = "2026-11-24T10:00:00.000Z";

const evidence = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  incidentId: "inc-1",
  cameraId: "cam-1",
  evidenceType: "SNAPSHOT",
  mimeType: "image/jpeg",
  fileName: `${id}.jpg`,
  storageKey: `evidences/site-1/cam-1/${id}.jpg`,
  fileSize: 1,
  capturedAt: stamp,
  createdAt: stamp,
  ...over,
});

// BE sắp evidence theo capturedAt giảm dần, nên phần tử đầu không chắc là ảnh vi phạm.
const incident = {
  id: "inc-1",
  siteId: "site-1",
  cameraId: "cam-1",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status: "PENDING_REVIEW",
  detectedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
  assignments: [],
  comments: [],
  statusHistory: [],
  evidences: [
    evidence("old", { storageKey: "images/camera-live-evidence.jpg" }),
    evidence("baseline_ref", { evidenceType: "REFERENCE_SNAPSHOT" }),
    evidence("violation"),
  ],
};

apiClient.get = (async (url: string) => {
  if (url === "/incidents/inc-1") return { data: incident };
  if (url === "/incidents/inc-2") {
    sessionStorage.setItem("ppe_incident_evidence_inc-2", "/images/camera-live-evidence.jpg");
    return {
      data: {
        ...incident,
        id: "inc-2",
        evidences: [],
        snapshotUrl: "/evidence/incident-snapshot.jpg",
      },
    };
  }
  return new Promise(() => {});
}) as never;

const sent: DispatchIncidentNotificationPayload[] = [];
notificationService.triggerIncidentNotification = (async (payload: DispatchIncidentNotificationPayload) => {
  sent.push(payload);
  return {};
}) as never;

/** Mọi URL mà trình duyệt sẽ tải hoặc mở từ trang (ảnh, video, link, ảnh nền). */
function loadableUrls(body: HTMLElement) {
  return Array.from(body.querySelectorAll("img, video, source, a, [style]")).flatMap((node) =>
    ["src", "poster", "href", "style"].map((name) => node.getAttribute(name) ?? ""),
  );
}

it("incident detail page neither shows the sample image nor sends it when re-sending the alert", async () => {
  await renderWithDom(
    <SearchParamsContext.Provider value={new URLSearchParams() as never}>
      <IncidentDetailContent id="inc-1" />
    </SearchParamsContext.Provider>,
    async ({ body, act }) => {
      const urls = loadableUrls(body);
      assert.ok(urls.some((url) => url.includes("violation.jpg")), "real violation image is shown");
      assert.deepEqual(urls.filter((url) => url.includes("camera-live-evidence")), []);

      const resend = Array.from(body.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Báo động lại"),
      );
      assert.ok(resend, "re-send alert button");
      await act(() => resend.click());

      assert.equal(sent.length, 1);
      // Gửi đường dẫn nội bộ của đúng ảnh vi phạm (notification-service tự tải qua M2M), không phải link bucket thô.
      assert.equal(sent[0].evidenceUrl, "/api/v1/incidents/evidences/violation/download", "sends the violation snapshot");
    },
    { desktop: true },
  );
});

it("incident detail page uses the real snapshot when session storage contains the sample", async () => {
  await renderWithDom(
    <SearchParamsContext.Provider value={new URLSearchParams() as never}>
      <IncidentDetailContent id="inc-2" />
    </SearchParamsContext.Provider>,
    async ({ body }) => {
      assert.ok(body.querySelector('img[src="/evidence/incident-snapshot.jpg"]'));
      assert.doesNotMatch(body.innerHTML, /camera-live-evidence/);
    },
    { desktop: true },
  );
});
