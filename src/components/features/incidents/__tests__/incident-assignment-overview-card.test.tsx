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
import { IncidentAssignmentOverviewCard } from "../incident-assignment-overview-card";
import { IncidentConsoleHeader } from "../incident-console-header";
import { AppSidebar } from "@/components/features/app-shell/app-sidebar";
import type { ResponsiblePersonRef } from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";

const managerA: ResponsiblePersonRef = {
  id: "mgr-1",
  name: "Nguyễn Quản Lý",
  email: "manager@ppe.local",
  role: "SAFETY_MANAGER",
};

const officerA: ResponsiblePersonRef = {
  id: "off-1",
  name: "Trần Cán Bộ",
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

const sampleIncidents: IncidentItem[] = [
  {
    id: "inc-pending-1",
    siteId: "site-1",
    siteName: "Công trường A",
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "PENDING_REVIEW",
    detectedAt: "2026-11-18T08:00:00Z",
    createdAt: "2026-11-18T08:00:00Z",
    updatedAt: "2026-11-18T08:00:00Z",
    assignments: [],
  },
  {
    id: "inc-unassigned-1",
    siteId: "site-1",
    siteName: "Công trường A",
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    violationType: "NO_VEST",
    severity: "MEDIUM",
    status: "CONFIRMED",
    detectedAt: "2026-11-18T08:05:00Z",
    createdAt: "2026-11-18T08:05:00Z",
    updatedAt: "2026-11-18T08:05:00Z",
    assignments: [],
  },
  {
    id: "inc-officer-active-1",
    siteId: "site-1",
    siteName: "Công trường A",
    cameraId: "cam-2",
    cameraCode: "CAM-02",
    violationType: "NO_HELMET",
    severity: "CRITICAL",
    status: "CONFIRMED",
    detectedAt: "2026-11-18T08:10:00Z",
    createdAt: "2026-11-18T08:10:00Z",
    updatedAt: "2026-11-18T08:10:00Z",
    assignments: [
      {
        id: "assign-1",
        incidentId: "inc-officer-active-1",
        assignedTo: "off-1",
        assignedToName: "Trần Cán Bộ",
        assignedAt: "2026-11-18T08:12:00Z",
        status: "ACTIVE",
      },
    ],
  },
  {
    id: "inc-resolved-1",
    siteId: "site-1",
    siteName: "Công trường A",
    cameraId: "cam-2",
    cameraCode: "CAM-02",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "RESOLVED",
    detectedAt: "2026-11-18T08:15:00Z",
    createdAt: "2026-11-18T08:15:00Z",
    updatedAt: "2026-11-18T08:15:00Z",
    assignments: [
      {
        id: "assign-2",
        incidentId: "inc-resolved-1",
        assignedTo: "off-1",
        assignedToName: "Trần Cán Bộ",
        assignedAt: "2026-11-18T08:16:00Z",
        status: "COMPLETED",
      },
    ],
  },
];

function renderWithProviders(element: React.ReactElement, role = "ADMIN") {
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
              id: role === "SAFETY_OFFICER" ? "off-1" : "mgr-1",
              email: "test@ppe.local",
              fullName: "Test User",
              role,
              permissions: ["PPE_INCIDENT_READ", "PPE_SITE_READ", "PPE_CAMERA_READ"],
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

describe("IncidentAssignmentOverviewCard (3 Role Views) & Sidebar Consolidation", () => {
  it("renders ADMIN oversight overview card linking to /incidents/assignments", () => {
    const html = renderWithProviders(
      <IncidentAssignmentOverviewCard
        incidents={sampleIncidents}
        userRole="ADMIN"
        userId="admin-1"
        usersById={usersById}
        siteManagersBySiteId={siteManagersBySiteId}
      />,
      "ADMIN",
    );

    assert.ok(html.includes('href="/incidents/assignments"'));
    assert.ok(html.includes('data-role-view="ADMIN"'));
    assert.ok(html.includes("Giám sát Nhóm Sự cố"));
    assert.ok(html.includes("Đầu vào • Manager Triage"));
    assert.ok(html.includes("Hiện trường • Officer Xử lý"));
    assert.ok(html.includes("Đầu ra • Chờ Nghiệm thu"));
  });

  it("renders SAFETY_MANAGER 3-step dispatch overview card linking to /incidents/assignments", () => {
    const html = renderWithProviders(
      <IncidentAssignmentOverviewCard
        incidents={sampleIncidents}
        userRole="SAFETY_MANAGER"
        userId="mgr-1"
        usersById={usersById}
        siteManagersBySiteId={siteManagersBySiteId}
      />,
      "SAFETY_MANAGER",
    );

    assert.ok(html.includes('href="/incidents/assignments"'));
    assert.ok(html.includes('data-role-view="SAFETY_MANAGER"'));
    assert.ok(html.includes("Bàn Điều phối"));
    assert.ok(html.includes("Bước 1"));
    assert.ok(html.includes("Bước 2"));
    assert.ok(html.includes("Bước 3"));
  });

  it("renders SAFETY_OFFICER personal tasks overview card linking to /incidents/assignments", () => {
    const html = renderWithProviders(
      <IncidentAssignmentOverviewCard
        incidents={sampleIncidents}
        userRole="SAFETY_OFFICER"
        userId="off-1"
        usersById={usersById}
        siteManagersBySiteId={siteManagersBySiteId}
      />,
      "SAFETY_OFFICER",
    );

    assert.ok(html.includes('href="/incidents/assignments"'));
    assert.ok(html.includes('data-role-view="SAFETY_OFFICER"'));
    assert.ok(html.includes("Bàn Công việc Hiện trường"));
    assert.ok(html.includes("Cần tôi khắc phục ngay"));
    assert.ok(html.includes("Đợt / Nhóm giao việc"));
    assert.ok(html.includes("Đã báo cáo khắc phục"));
  });

  it("does not render separate /incidents/assignments link in AppSidebar", () => {
    const html = renderWithProviders(<AppSidebar badges={{}} />, "ADMIN");
    assert.ok(html.includes('href="/incidents"'));
    assert.equal(html.includes('href="/incidents/assignments"'), false);
  });

  it("renders IncidentConsoleHeader matching /cameras & /dashboard style without quick-scope tabs", () => {
    const html = renderWithProviders(
      <IncidentConsoleHeader
        isConnected={true}
        isRefreshing={false}
        onRefresh={() => {}}
        canCreateIncident={true}
        onCreateIncident={() => {}}
        siteName="Công trường Cầu Thủ Thiêm"
        userRole="ADMIN"
        criticalCount={2}
      />,
      "ADMIN",
    );

    assert.equal(html.includes('role="tablist"'), false);
    assert.equal(html.includes("Tất cả Sự cố"), false);
    assert.equal(html.includes("Chờ Thẩm duyệt"), false);
    assert.equal(html.includes("Việc giao cho tôi"), false);
    assert.ok(html.includes("Realtime Active"));
    assert.ok(html.includes("Công trường Cầu Thủ Thiêm"));
    assert.ok(html.includes("Báo cáo Sự cố"));
  });
});
