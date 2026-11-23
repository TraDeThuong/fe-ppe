if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";
import { IncidentSplitView } from "../incident-split-view";
import { IncidentQuickDetailPanel } from "../incident-quick-detail-panel";
import { IncidentDetailHeader } from "../incident-detail-header";
import type { IncidentItem } from "@/types";

const noop = () => {};

const basePermissionsByRole: Record<string, string[]> = {
  ADMIN: [
    "PPE_INCIDENT_READ",
    "PPE_INCIDENT_REVIEW",
    "PPE_INCIDENT_MANAGE",
    "PPE_INCIDENT_UPDATE",
    "PPE_INCIDENT_DELETE",
    "PPE_SITE_READ",
    "PPE_CAMERA_READ",
    "NOTIFICATION_CREATE",
  ],
  SAFETY_OFFICER: [
    "PPE_INCIDENT_READ",
    "PPE_INCIDENT_UPDATE",
    "PPE_SITE_READ",
    "PPE_CAMERA_READ",
  ],
};

function renderWithProviders(
  element: React.ReactElement,
  role: "ADMIN" | "SAFETY_OFFICER" = "ADMIN",
  userId?: string,
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
              id: userId ?? (role === "SAFETY_OFFICER" ? "off-1" : "mgr-1"),
              email: "test@ppe.local",
              fullName: role === "SAFETY_OFFICER" ? "Trần Cán Bộ" : "Nguyễn Quản Lý",
              role,
              permissions: basePermissionsByRole[role],
              isActive: true,
              twoFactorEnabled: false,
              mustChangePassword: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            } as any,
            setUser: () => {},
            logout: async () => {},
          }}
        >
          {element}
        </AuthContext.Provider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

const sampleIncidents: IncidentItem[] = [
  {
    id: "inc-pending-1111",
    siteId: "site-1",
    siteName: "Công trường Cầu Giấy",
    zoneId: "zone-1",
    zoneName: "Khu A - Giàn giáo",
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    cameraName: "Cổng chính",
    violationType: "NO_HELMET",
    severity: "CRITICAL",
    status: "PENDING_REVIEW",
    detectedAt: "2026-11-22T08:30:00.000Z",
    createdAt: "2026-11-22T08:30:00.000Z",
    updatedAt: "2026-11-22T08:30:00.000Z",
    description: "Công nhân không đội mũ bảo hộ khi đi qua cổng chính.",
    confidence: 0.95,
    snapshotUrl: "/images/camera-live-evidence.jpg",
    assignments: [],
  },
  {
    id: "inc-confirmed-2222",
    siteId: "site-1",
    siteName: "Công trường Cầu Giấy",
    cameraId: "cam-2",
    cameraCode: "CAM-02",
    cameraName: "Khu cẩu tháp",
    violationType: "NO_VEST",
    severity: "HIGH",
    status: "CONFIRMED",
    detectedAt: "2026-11-22T09:00:00.000Z",
    createdAt: "2026-11-22T09:00:00.000Z",
    updatedAt: "2026-11-22T09:00:00.000Z",
    assignments: [
      {
        id: "assign-1",
        incidentId: "inc-confirmed-2222",
        assignedTo: "off-1",
        assignedToName: "Trần Cán Bộ",
        assignedAt: "2026-11-22T09:05:00.000Z",
        status: "ACTIVE",
        priority: "HIGH",
      },
    ],
  },
  {
    id: "inc-resolved-3333",
    siteId: "site-1",
    siteName: "Công trường Cầu Giấy",
    cameraId: "cam-2",
    cameraCode: "CAM-02",
    violationType: "RESTRICTED_AREA",
    severity: "MEDIUM",
    status: "RESOLVED",
    detectedAt: "2026-11-22T09:15:00.000Z",
    createdAt: "2026-11-22T09:15:00.000Z",
    updatedAt: "2026-11-22T09:15:00.000Z",
    assignments: [],
  },
];

describe("IncidentSplitView & IncidentQuickDetailPanel", () => {
  it("renders 2-column split view with checkboxes, cards, quick detail, and excludes heavy [id] sections", () => {
    const html = renderWithProviders(
      <IncidentSplitView
        incidents={sampleIncidents}
        canSelectRows
        selectedIdSet={new Set(["inc-pending-1111"])}
        onToggleRowSelection={noop}
        page={1}
        limit={10}
        total={3}
        totalPages={1}
        onPageChange={noop}
        onLimitChange={noop}
        onReview={noop}
        onAssign={noop}
        onResolve={noop}
        onClose={noop}
        onEdit={noop}
        onDelete={noop}
      />,
      "ADMIN",
    );

    // Left column cards & bulk checkboxes
    assert.match(html, /role="listbox"/);
    assert.match(html, /type="checkbox"/);
    assert.match(html, /#inc-pend/);
    assert.match(html, /#inc-conf/);
    assert.match(html, /#inc-reso/);
    assert.match(html, /CAM-01/);
    assert.match(html, /Công trường Cầu Giấy/);

    // Right column quick detail for first incident (PENDING_REVIEW)
    assert.match(html, /href="\/incidents\/inc-pending-1111"/);
    assert.match(html, /95%/);
    assert.match(html, /Khu A - Giàn giáo/);
    assert.match(html, /Công nhân không đội mũ bảo hộ khi đi qua cổng chính/);

    // Must NOT include heavy [id] sections (comments input, SHA-256 verifier, audit trail)
    assert.doesNotMatch(html, /Trao đổi &amp; Bình luận Hiện trường/);
    assert.doesNotMatch(html, /IncidentCommentsTimeline/);
    assert.doesNotMatch(html, /Nhật ký Tác động Sự cố/);
  });

  it("enforces SAFETY_OFFICER RBAC: allows resolve only when assigned, hides manager-only actions", () => {
    const assignedHtml = renderWithProviders(
      <IncidentQuickDetailPanel
        incident={sampleIncidents[1]}
        onReview={noop}
        onAssign={noop}
        onResolve={noop}
        onCloseIncident={noop}
      />,
      "SAFETY_OFFICER",
      "off-1",
    );

    assert.match(assignedHtml, /Việc của bạn/);
    assert.match(assignedHtml, /Trần Cán Bộ/);
    // Resolve CTA is shown for assigned officer
    assert.match(assignedHtml, /Khắc phục|Giải quyết|Resolve/);
    // Manager-only actions hidden
    assert.doesNotMatch(assignedHtml, /Đổi người/);
    assert.doesNotMatch(assignedHtml, /Báo động lại/);

    // Unassigned officer viewing the same incident cannot resolve
    const unassignedHtml = renderWithProviders(
      <IncidentQuickDetailPanel
        incident={sampleIncidents[1]}
        onReview={noop}
        onAssign={noop}
        onResolve={noop}
        onCloseIncident={noop}
      />,
      "SAFETY_OFFICER",
      "off-other",
    );

    assert.match(unassignedHtml, /Đã giao cán bộ khác/);
  });

  it("shows Close CTA for RESOLVED incidents and hides Edit button when CLOSED", () => {
    const resolvedHtml = renderWithProviders(
      <IncidentQuickDetailPanel
        incident={sampleIncidents[2]}
        onCloseIncident={noop}
        onEdit={noop}
      />,
      "ADMIN",
    );
    assert.match(resolvedHtml, /Đóng/);

    const closedIncident: IncidentItem = {
      ...sampleIncidents[2],
      status: "CLOSED",
    };
    const closedHtml = renderWithProviders(
      <IncidentQuickDetailPanel
        incident={closedIncident}
        onCloseIncident={noop}
        onEdit={noop}
      />,
      "ADMIN",
    );
    assert.match(closedHtml, /Đã đóng hồ sơ/);
    assert.doesNotMatch(closedHtml, /aria-label="Sửa"/);
  });

  it("renders clean empty state when incidents list is empty", () => {
    const html = renderWithProviders(
      <IncidentSplitView
        incidents={[]}
        page={1}
        limit={10}
        total={0}
        totalPages={1}
        onPageChange={noop}
        onLimitChange={noop}
      />,
      "ADMIN",
    );

    assert.match(html, /Chọn một sự cố để xem nhanh/);
  });

  it("renders redesigned IncidentDetailHeader matching IncidentConsoleHeader with grouped utility dock and clear CTA hierarchy", () => {
    const html = renderWithProviders(
      <IncidentDetailHeader
        incident={sampleIncidents[1]}
        isConnected
        hasAssignments
        canUpdate
        canTriggerAlert
        canReview={false}
        canAssign
        canSelfOrAssignedResolve
        canClose={false}
        onRefresh={noop}
        onEdit={noop}
        onTriggerAlert={noop}
        onReview={noop}
        onAssign={noop}
        onResolve={noop}
        onClose={noop}
      />,
      "ADMIN",
    );

    // Back link to /incidents, Layer 2 Navigation buttons (Xem Camera + Mở Công trường)
    assert.match(html, /href="\/incidents"/);
    assert.match(html, /href="\/sites\/site-1\?tab=live-cameras"/);
    assert.match(html, /href="\/cameras\/cam-2"/);
    assert.match(html, /Xem Camera/);
    assert.match(html, /Mở Công trường/);
    // Layer 2 Action buttons with full labels (Sửa, Báo động lại, Phân công) + Layer 1 Primary CTA (Giải quyết)
    assert.match(html, /Sửa/);
    assert.match(html, /Báo động lại/);
    assert.match(html, /Phân công/);
    assert.match(html, /Giải quyết/);
  });
});
