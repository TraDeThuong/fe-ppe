if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { apiClient } from "@/lib/axios";
import { resolveZoneCameraIds } from "@/lib/incident-list-scope";
import { LocaleProvider } from "@/providers/locale-provider";
import { incidentService } from "@/services/incident.service";
import type { FeedbackDatasetItem, IncidentItem } from "@/types";
import {
  serializeFeedbackDatasetToCsv,
  serializeFeedbackDatasetToJson,
} from "../export-feedback-dataset-modal";
import { IncidentAssignmentOverviewCard } from "../incident-assignment-overview-card";
import { IncidentConsoleHeader } from "../incident-console-header";
import { IncidentEvidenceViewer } from "../incident-evidence-viewer";
import { IncidentKpiSummary } from "../incident-kpi-summary";
import { IncidentMetaCard } from "../incident-meta-card";
import { IncidentQuickDetailPanel } from "../incident-quick-detail-panel";
import { IncidentTable } from "../incident-table";
import { isVideoEvidence } from "../viewer/evidence-media-utils";

const noop = () => {};

function renderWithAuth(
  element: React.ReactElement,
  role: "ADMIN" | "SAFETY_MANAGER" | "SAFETY_OFFICER" = "SAFETY_OFFICER",
  permissions: string[] = [
    "PPE_INCIDENT_READ",
    "PPE_INCIDENT_REVIEW",
    "PPE_INCIDENT_UPDATE",
    "PPE_SITE_READ",
    "PPE_CAMERA_READ",
  ],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthContext.Provider
          value={{
            status: "authenticated",
            user: {
              id: "off-1",
              email: "officer@ppe.local",
              fullName: "Trần Thị An Toàn",
              role,
              permissions,
              isActive: true,
              twoFactorEnabled: false,
              mustChangePassword: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            } as any,
            setUser: noop,
            logout: async () => {},
          }}
        >
          {element}
        </AuthContext.Provider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("D08 /incidents Standardization (RBAC, VIDEO_CLIP, Real AI Telemetry, Contract & Export)", () => {
  it("shows a single empty message inside the table body or the alternate view's results", () => {
    const emptyMessage = /Không tìm thấy sự cố vi phạm nào\./g;

    for (const viewMode of ["table", "grouped", "camera", "split"] as const) {
      const html = renderWithAuth(
        <IncidentTable incidents={[]} viewMode={viewMode} tableState={{ fetching: true }} />,
      );
      assert.equal(html.match(emptyMessage)?.length, 1);

      if (viewMode === "table") {
        assert.match(html, /role="status"[^>]*>.*?0 bản ghi/);
        assert.match(html, /<tbody[^>]*><tr><td colSpan="\d+"[^>]*>.*?Không tìm thấy sự cố vi phạm nào\./i);
      } else {
        assert.match(html, /role="status"[^>]*>.*?Không tìm thấy sự cố vi phạm nào\./);
      }
    }
  });

  it("shows loading and retry feedback in both grouped views", () => {
    const emptyMessage = /Không tìm thấy sự cố vi phạm nào\./;

    for (const viewMode of ["grouped", "camera"] as const) {
      const loading = renderWithAuth(<IncidentTable incidents={[]} viewMode={viewMode} loading />);
      assert.match(loading, /aria-busy="true"/);
      assert.doesNotMatch(loading, emptyMessage);

      const error = renderWithAuth(
        <IncidentTable
          incidents={[]}
          viewMode={viewMode}
          tableState={{ error: new Error("Lỗi tải sự cố"), onRetry: noop }}
        />,
      );
      assert.match(error, /role="alert".*Lỗi tải sự cố.*Thử lại/);
      assert.doesNotMatch(error, emptyMessage);
    }
  });

  it("allows SAFETY_OFFICER with PPE_INCIDENT_REVIEW to select pending rows & batch review in IncidentTable without exposing Manager-only dispatch/close", () => {
    const pendingIncident: IncidentItem = {
      id: "inc-officer-rev-1",
      siteId: "site-1",
      siteName: "Công trường Thủ Thiêm",
      cameraId: "cam-1",
      cameraCode: "CAM-01",
      violationType: "NO_HELMET",
      severity: "HIGH",
      status: "PENDING_REVIEW",
      trackId: 12,
      confidence: 0.89,
      detectedAt: "2026-11-24T09:00:00.000Z",
      createdAt: "2026-11-24T09:00:00.000Z",
      updatedAt: "2026-11-24T09:00:00.000Z",
      snapshotUrl: "/images/camera-live-evidence.jpg",
      assignments: [],
    };

    const html = renderWithAuth(
      <IncidentTable
        incidents={[pendingIncident]}
        viewMode="table"
        onReview={noop}
        onBatchReview={noop}
      />,
      "SAFETY_OFFICER",
    );

    // Quick-select pending button & row selection enabled for SAFETY_OFFICER
    assert.match(html, /Chọn chờ duyệt \(1\)/);
    assert.match(html, /role="checkbox"|type="checkbox"/);
    // Real Track # and AI % rendered in table mode
    assert.match(html, /Track #12/);
    assert.match(html, /AI 89%/);
    assert.doesNotMatch(html, /camera-live-evidence\.jpg/);
    assert.match(html, /aria-label="No snapshot"/);

    const realSnapshotHtml = renderWithAuth(
      <IncidentTable
        incidents={[{ ...pendingIncident, snapshotUrl: "/evidence/real-incident.jpg" }]}
        viewMode="table"
      />,
    );
    assert.match(realSnapshotHtml, /src="\/evidence\/real-incident\.jpg"/);
  });

  it("renders <video controls preload='metadata'> for VIDEO_CLIP in IncidentEvidenceViewer & IncidentQuickDetailPanel and never shows fake 96% when confidence is missing", () => {
    assert.equal(isVideoEvidence({ url: "https://storage.example.test/clip.webm?download=1" }), true);
    const videoEvidenceIncident: IncidentItem = {
      id: "inc-video-01",
      siteId: "site-1",
      cameraId: "cam-1",
      cameraCode: "CAM-01",
      violationType: "NO_VEST",
      severity: "CRITICAL",
      status: "PENDING_REVIEW",
      trackId: 7,
      confidence: null,
      detectedAt: "2026-11-24T10:00:00.000Z",
      createdAt: "2026-11-24T10:00:00.000Z",
      updatedAt: "2026-11-24T10:00:00.000Z",
      evidences: [
        {
          id: "ev-vid-1",
          incidentId: "inc-video-01",
          cameraId: "cam-1",
          evidenceType: "VIDEO_CLIP",
          storageKey: "evidences/site-1/cam-1/clip_track7.mp4",
          fileName: "clip_track7.mp4",
          mimeType: "video/mp4",
          fileSize: 1048576,
          capturedAt: "2026-11-24T10:00:00.000Z",
          createdAt: "2026-11-24T10:00:00.000Z",
          url: "http://localhost:9000/ppe-evidences/clip_track7.mp4",
        },
      ],
    };

    const viewerHtml = renderWithAuth(
      <IncidentEvidenceViewer
        evidence={videoEvidenceIncident.evidences?.[0]}
        evidences={videoEvidenceIncident.evidences}
        violationType="NO_VEST"
        confidence={null}
        trackId={7}
        cameraId="cam-1"
        incidentId="inc-video-01"
      />,
    );

    assert.match(viewerHtml, /<video[^>]*controls/);
    assert.match(viewerHtml, /preload="metadata"/);
    assert.match(viewerHtml, /Track #7/);
    assert.doesNotMatch(viewerHtml, /96%/);

    const quickPanelHtml = renderWithAuth(
      <IncidentQuickDetailPanel
        incident={videoEvidenceIncident}
        onReview={noop}
      />,
    );

    assert.match(quickPanelHtml, /<video[^>]*controls/);
    assert.match(quickPanelHtml, /Track #7/);
    assert.doesNotMatch(quickPanelHtml, /96%/);
  });

  it("displays Track # and AI % in IncidentMetaCard when present and omits them cleanly when absent", () => {
    const withTelemetry: IncidentItem = {
      id: "inc-meta-1",
      siteId: "site-1",
      siteName: "Công trường B",
      cameraId: "cam-1",
      cameraCode: "CAM-01",
      violationType: "NO_HELMET",
      severity: "HIGH",
      status: "CONFIRMED",
      trackId: 25,
      confidence: 0.91,
      detectedAt: "2026-11-24T10:00:00.000Z",
      createdAt: "2026-11-24T10:00:00.000Z",
      updatedAt: "2026-11-24T10:00:00.000Z",
    };

    const htmlWith = renderWithAuth(<IncidentMetaCard incident={withTelemetry} />);
    assert.match(htmlWith, /Track #25/);
    assert.match(htmlWith, /AI 91%/);

    const htmlWithout = renderWithAuth(
      <IncidentMetaCard
        incident={{ ...withTelemetry, trackId: null, confidence: null }}
      />,
    );
    assert.doesNotMatch(htmlWithout, /Track #/);
    assert.doesNotMatch(htmlWithout, /AI \d+%/);
  });

  it("uses the aggregate counts in KPI cards and the compact dispatch bar", () => {
    const mixedSeverityIncidents: IncidentItem[] = [
      {
        id: "inc-crit-1",
        siteId: "site-1",
        cameraId: "cam-1",
        violationType: "RESTRICTED_AREA",
        severity: "CRITICAL",
        status: "PENDING_REVIEW",
        detectedAt: "2026-11-24T10:00:00.000Z",
        createdAt: "2026-11-24T10:00:00.000Z",
        updatedAt: "2026-11-24T10:00:00.000Z",
      },
      {
        id: "inc-high-1",
        siteId: "site-1",
        cameraId: "cam-2",
        violationType: "NO_HELMET",
        severity: "HIGH",
        status: "CONFIRMED",
        detectedAt: "2026-11-24T10:05:00.000Z",
        createdAt: "2026-11-24T10:05:00.000Z",
        updatedAt: "2026-11-24T10:05:00.000Z",
      },
    ];

    const kpiHtml = renderWithAuth(
      <IncidentKpiSummary
        incidents={mixedSeverityIncidents}
        statusCounts={{
          total: 40,
          pendingReview: 8,
          confirmed: 12,
          critical: 3,
          resolved: 20,
          closed: 15,
          dismissed: 0,
        }}
      />,
    );
    for (const value of [40, 8, 3, 5]) assert.match(kpiHtml, new RegExp(`>${value}<`));

    const compactHtml = renderWithAuth(
      <IncidentAssignmentOverviewCard
        variant="compact"
        userRole="SAFETY_MANAGER"
        statusCounts={{
          total: 40,
          pendingReview: 8,
          confirmed: 12,
          critical: 3,
          resolved: 20,
          closed: 15,
          dismissed: 0,
        }}
      />,
      "SAFETY_MANAGER",
    );
    assert.match(compactHtml, /href="\/incidents\/assignments"/);
    assert.match(compactHtml, /Chờ duyệt:/);
    assert.match(compactHtml, />8</);
    assert.match(compactHtml, />12</);
    // Pure awaiting closure = resolved (20) - closed (15) = 5
    assert.match(compactHtml, />5</);
  });

  it("maps zoneId -> cameraIds, strips zoneId from API params, short-circuits empty zones, and serializes AI Feedback Dataset CSV/JSON", async () => {
    const cameras = [
      { id: "cam-a1", siteId: "site-1", zoneId: "zone-a" },
      { id: "cam-a2", siteId: "site-1", zoneId: "zone-a" },
      { id: "cam-b1", siteId: "site-1", zoneId: "zone-b" },
    ];
    assert.deepEqual(resolveZoneCameraIds("zone-a", cameras, "site-1"), [
      "cam-a1",
      "cam-a2",
    ]);
    assert.deepEqual(resolveZoneCameraIds("zone-empty", cameras, "site-1"), []);
    assert.equal(resolveZoneCameraIds(undefined, cameras, "site-1"), undefined);
    assert.notDeepEqual(
      incidentKeys.statusCounts({ siteId: "site-1", cameraIds: [] }),
      incidentKeys.statusCounts({ siteId: "site-1" }),
    );

    const origGet = apiClient.get;
    const capturedCalls: Array<{ url: string; params?: Record<string, unknown> }> = [];
    apiClient.get = (async (url: string, config?: any) => {
      capturedCalls.push({ url, params: config?.params });
      if (url === "/incidents/status-counts") {
        return {
          data: {
            total: 10,
            pendingReview: 3,
            confirmed: 2,
            critical: 1,
            resolved: 4,
            closed: 3,
            dismissed: 1,
          },
        };
      }
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }) as any;

    try {
      // Empty cameraIds (zone with 0 cameras) makes ZERO network calls
      const emptyPage = await incidentService.getIncidents({
        siteId: "site-1",
        zoneId: "zone-empty",
        cameraIds: [],
      });
      assert.equal(emptyPage.items.length, 0);
      assert.equal(capturedCalls.length, 0);

      // Non-empty cameraIds serializes comma-separated & strips zoneId
      await incidentService.getIncidents({
        siteId: "site-1",
        zoneId: "zone-a",
        cameraIds: ["cam-a1", "cam-a2"],
      });
      assert.equal(capturedCalls.length, 1);
      assert.equal(capturedCalls[0].params?.cameraIds, "cam-a1,cam-a2");
      assert.equal("zoneId" in (capturedCalls[0].params || {}), false);

      const counts = await incidentService.getStatusCounts({
        siteId: "site-1",
        cameraIds: ["cam-a1"],
      });
      assert.equal(counts.confirmed, 2);
      assert.equal(counts.closed, 3);
      assert.equal(counts.dismissed, 1);
    } finally {
      apiClient.get = origGet;
    }

    // Export button visible on header when canExportFeedback=true
    const headerHtml = renderWithAuth(
      <IncidentConsoleHeader
        isConnected
        isRefreshing={false}
        onRefresh={noop}
        canCreateIncident
        onCreateIncident={noop}
        canExportFeedback
        onExportFeedback={noop}
        criticalCount={1}
      />,
      "ADMIN",
    );
    assert.match(headerHtml, /Feedback AI/);

    // CSV & JSON Feedback Dataset serialization
    const sampleFeedback: FeedbackDatasetItem[] = [
      {
        incidentId: "inc-fb-1",
        label: "FALSE_ALARM",
        status: "DISMISSED",
        reviewReason: 'Ánh sáng phản chiếu, "mũ vàng" bị che',
        reviewedBy: "off-1",
        reviewedAt: "2026-11-24T11:00:00.000Z",
        violationType: "NO_HELMET",
        confidence: 0.72,
        trackId: 4,
        cameraId: "cam-1",
        siteId: "site-1",
        detectedAt: "2026-11-24T10:58:00.000Z",
        snapshotStorageKey: "evidences/site-1/cam-1/snap.jpg",
        aiDetections: { confidence: 0.72 },
      },
    ];
    const csv = serializeFeedbackDatasetToCsv(sampleFeedback);
    assert.ok(csv.startsWith("\uFEFFincidentId,label,status"));
    assert.match(csv, /FALSE_ALARM/);
    assert.match(csv, /"Ánh sáng phản chiếu, ""mũ vàng"" bị che"/);
    assert.match(csv, /aiDetections\r\n/);
    assert.match(csv, /""confidence"":0\.72/);
    assert.match(serializeFeedbackDatasetToCsv([
      { ...sampleFeedback[0], reviewReason: "+ Cần xem lại" },
    ]), /'\+ Cần xem lại/);

    const json = JSON.parse(serializeFeedbackDatasetToJson(sampleFeedback, 1));
    assert.equal(json.count, 1);
    assert.equal(json.items[0].label, "FALSE_ALARM");
    assert.equal(json.items[0].trackId, 4);
  });
});
