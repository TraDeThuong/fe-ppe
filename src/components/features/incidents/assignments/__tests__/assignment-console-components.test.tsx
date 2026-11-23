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
import { LocaleProvider } from "@/providers/locale-provider";
import {
  AdminOversightWorkspace,
  AssignmentConsoleHeader,
  AssignmentKpiSummary,
  AssignmentPagination,
  ManagerDispatchWorkspace,
  OfficerTasksWorkspace,
  paginateItems,
  type CategorizedAssignments,
} from "../index";
import type { IncidentItem } from "@/types";

const dummyIncident = (id: string, status: string): IncidentItem => ({
  id,
  siteId: "site-1",
  siteName: "Công trường A",
  cameraId: "cam-1",
  cameraCode: "CAM-01",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status,
  detectedAt: "2026-11-18T08:00:00Z",
  createdAt: "2026-11-18T08:00:00Z",
  updatedAt: "2026-11-18T08:00:00Z",
  assignments: [],
});

const categorized: CategorizedAssignments = {
  pendingReview: [dummyIncident("i1", "PENDING_REVIEW")],
  unassignedConfirmed: [dummyIncident("i2", "CONFIRMED")],
  triageItems: [
    dummyIncident("i1", "PENDING_REVIEW"),
    dummyIncident("i2", "CONFIRMED"),
  ],
  assignedConfirmed: [dummyIncident("i3", "CONFIRMED")],
  awaitingAcceptance: [dummyIncident("i4", "RESOLVED")],
  closedOrDismissed: [dummyIncident("i5", "CLOSED")],
  myActiveConfirmed: [dummyIncident("i3", "CONFIRMED")],
  myCompleted: [dummyIncident("i4", "RESOLVED")],
};

function renderWithLocale(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{node}</LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("AssignmentConsoleHeader & AssignmentKpiSummary (3 Roles)", () => {
  it("renders camera-style header (without header tabs) and 4 synced KPI cards for ADMIN", () => {
    const html = renderWithLocale(
      <>
        <AssignmentConsoleHeader
          roleView="ADMIN"
          isAdminRole={true}
          adminInterventionMode={false}
          onToggleAdminIntervention={() => {}}
          isConnected={true}
          isRefreshing={false}
          onRefresh={() => {}}
          totalIncidentsCount={5}
          categorized={categorized}
        />
        <AssignmentKpiSummary
          roleView="ADMIN"
          isAdminRole={true}
          adminInterventionMode={false}
          totalIncidentsCount={5}
          categorized={categorized}
          activeOfficersCount={1}
          dispatchedGroupsCount={0}
          adminGroupMode="responsibility"
          onAdminGroupModeChange={() => {}}
          managerTab="triage"
          onManagerTabChange={() => {}}
          officerTab="pending"
          onOfficerTabChange={() => {}}
        />
      </>,
    );

    assert.equal(html.includes('role="tablist"'), false);
    assert.equal(html.includes("Nhân sự &amp; Trách nhiệm"), false);
    assert.equal(html.includes("Theo Cụm Camera"), false);
    assert.ok(html.includes('href="/incidents"'));
    assert.ok(html.includes("Trách nhiệm Manager (Đầu vào)"));
    assert.ok(html.includes("Trách nhiệm Officer (Hiện trường)"));
    assert.ok(html.includes("Trách nhiệm Manager (Nghiệm thu)"));
    assert.ok(html.includes("Đã Khép Hồ Sơ"));
  });

  it("renders header without switch track and 4 synced KPI cards for SAFETY_MANAGER", () => {
    const html = renderWithLocale(
      <>
        <AssignmentConsoleHeader
          roleView="SAFETY_MANAGER"
          isAdminRole={false}
          adminInterventionMode={false}
          onToggleAdminIntervention={() => {}}
          isConnected={true}
          isRefreshing={false}
          onRefresh={() => {}}
          totalIncidentsCount={5}
          categorized={categorized}
        />
        <AssignmentKpiSummary
          roleView="SAFETY_MANAGER"
          isAdminRole={false}
          adminInterventionMode={false}
          totalIncidentsCount={5}
          categorized={categorized}
          activeOfficersCount={1}
          dispatchedGroupsCount={0}
          adminGroupMode="responsibility"
          onAdminGroupModeChange={() => {}}
          managerTab="triage"
          onManagerTabChange={() => {}}
          officerTab="pending"
          onOfficerTabChange={() => {}}
        />
      </>,
    );

    assert.equal(html.includes('role="tablist"'), false);
    assert.equal(html.includes("Cần Duyệt &amp; Giao việc"), false);
    assert.ok(html.includes("Bước 1 • Duyệt &amp; Giao việc"));
    assert.ok(html.includes("Bước 2 • Đang giao Officer"));
    assert.ok(html.includes("Bước 3 • Chờ Nghiệm thu"));
    assert.ok(html.includes("Đã Khép Hồ Sơ"));
  });

  it("renders header without switch track and 4 synced KPI cards for SAFETY_OFFICER", () => {
    const html = renderWithLocale(
      <>
        <AssignmentConsoleHeader
          roleView="SAFETY_OFFICER"
          isAdminRole={false}
          adminInterventionMode={false}
          onToggleAdminIntervention={() => {}}
          isConnected={false}
          isRefreshing={false}
          onRefresh={() => {}}
          totalIncidentsCount={5}
          categorized={categorized}
        />
        <AssignmentKpiSummary
          roleView="SAFETY_OFFICER"
          isAdminRole={false}
          adminInterventionMode={false}
          totalIncidentsCount={5}
          categorized={categorized}
          activeOfficersCount={1}
          dispatchedGroupsCount={2}
          adminGroupMode="responsibility"
          onAdminGroupModeChange={() => {}}
          managerTab="triage"
          onManagerTabChange={() => {}}
          officerTab="pending"
          onOfficerTabChange={() => {}}
        />
      </>,
    );

    assert.equal(html.includes('role="tablist"'), false);
    assert.ok(html.includes("Sự cố cần tôi khắc phục"));
    assert.ok(html.includes("Tôi đã báo cáo khắc phục"));
    assert.ok(html.includes("Nhóm / Đợt giao việc"));
    assert.ok(html.includes("Tỷ lệ hoàn thành"));
  });

  it("paginates incident lists accurately and clamps out-of-range page numbers", () => {
    const items = Array.from({ length: 23 }, (_, idx) => `inc-${idx + 1}`);

    const page1 = paginateItems(items, 1, 5);
    assert.equal(page1.page, 1);
    assert.equal(page1.pageCount, 5);
    assert.equal(page1.startIndex, 1);
    assert.equal(page1.endIndex, 5);
    assert.deepEqual(page1.items, ["inc-1", "inc-2", "inc-3", "inc-4", "inc-5"]);

    const clamped = paginateItems(items, 99, 5);
    assert.equal(clamped.page, 5);
    assert.equal(clamped.startIndex, 21);
    assert.equal(clamped.endIndex, 23);
    assert.deepEqual(clamped.items, ["inc-21", "inc-22", "inc-23"]);

    const empty = paginateItems([], 2, 10);
    assert.equal(empty.page, 1);
    assert.equal(empty.pageCount, 1);
    assert.equal(empty.startIndex, 0);
    assert.equal(empty.endIndex, 0);
    assert.deepEqual(empty.items, []);
  });

  it("renders AssignmentPagination bar with Vietnamese range and page counters", () => {
    const html = renderWithLocale(
      <AssignmentPagination
        page={2}
        pageCount={5}
        pageSize={5}
        totalItems={23}
        startIndex={6}
        endIndex={10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        variant="embedded"
      />,
    );

    assert.ok(html.includes('data-testid="assignment-pagination"'));
    assert.ok(html.includes("6–10"));
    assert.ok(html.includes("23"));
    assert.ok(html.includes("Trang 2 / 5"));
  });

  it("renders all 3 role workspaces with paginated rows cleanly without undefined references", () => {
    const sampleItems = Array.from({ length: 7 }, (_, i) =>
      dummyIncident(`inc-${i + 1}`, "PENDING_REVIEW"),
    );
    const formatters = {
      resolveSiteLabel: (_sid: string, fallback?: string) =>
        fallback || "Công trường A",
      resolveCameraLabel: (inc: IncidentItem) => inc.cameraCode || inc.cameraId,
      formatViolation: (v: string) => v,
    };
    const responsibilityContext = {
      resolveSiteName: formatters.resolveSiteLabel,
      resolveCameraLabel: formatters.resolveCameraLabel,
    };
    const rowActions = {
      onReview: () => {},
      onDispatch: () => {},
      onClose: () => {},
      onResolve: () => {},
    };

    const adminHtml = renderWithLocale(
      <AdminOversightWorkspace
        adminGroupMode="camera"
        siteFilter=""
        onSiteChange={() => {}}
        sites={[]}
        expandedKeys={{ cam_cam_1: true }}
        onToggleExpand={() => {}}
        managerGroups={[]}
        officerGroups={[]}
        siteGroups={[]}
        cameraGroups={[
          {
            cameraKey: "cam_1",
            cameraId: "cam-1",
            cameraLabel: "CAM-01",
            items: sampleItems,
            pendingIds: sampleItems.map((i) => i.id),
            confirmedIds: [],
            resolvedIds: [],
            dispatchableIds: sampleItems.map((i) => i.id),
          },
        ]}
        currentUserId="admin-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
        onBatchDispatch={() => {}}
        onBatchClose={() => {}}
      />,
    );
    assert.ok(adminHtml.includes("CAM-01"));
    assert.ok(adminHtml.includes("Trang 1 / 2"));

    const mgrHtml = renderWithLocale(
      <ManagerDispatchWorkspace
        managerTab="triage"
        categorized={{
          ...categorized,
          triageItems: sampleItems,
          pendingReview: sampleItems,
        }}
        siteFilter=""
        onSiteChange={() => {}}
        sites={[]}
        selectedIds={new Set()}
        onToggleSelectOne={() => {}}
        onToggleSelectMany={() => {}}
        batchReviewPending={false}
        batchActionPending={false}
        onBatchConfirmOnly={() => {}}
        onBatchReject={() => {}}
        onBatchDispatch={() => {}}
        onBatchClose={() => {}}
        currentUserId="mgr-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
      />,
    );
    assert.ok(mgrHtml.includes("CAM-01"));
    assert.ok(mgrHtml.includes("Trang 1 / 2"));

    const offHtml = renderWithLocale(
      <OfficerTasksWorkspace
        officerTab="pending"
        categorized={{
          ...categorized,
          myActiveConfirmed: sampleItems,
        }}
        dispatchedGroups={[]}
        usersById={new Map()}
        selectedIds={new Set()}
        onToggleSelectOne={() => {}}
        onToggleSelectMany={() => {}}
        batchActionPending={false}
        onBatchResolve={() => {}}
        currentUserId="off-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
      />,
    );
    assert.ok(offHtml.includes('data-testid="assignment-pagination"'));
  });

  it("renders multi-dimension grouping toolbar, rich work group breakdown, and shift/hour/person/officer modes", () => {
    const formatters = {
      resolveSiteLabel: (_sid: string, fallback?: string) =>
        fallback || "Công trường A",
      resolveCameraLabel: (inc: IncidentItem) => inc.cameraCode || inc.cameraId,
      formatViolation: (v: string) =>
        v === "NO_HELMET"
          ? "Không đội mũ bảo hộ"
          : v === "NO_VEST"
            ? "Không mặc áo phản quang"
            : v,
    };
    const responsibilityContext = {
      usersById: new Map([
        ["off-1", { id: "off-1", name: "Nguyễn Văn An", email: "an@ppe.local" }],
      ]),
      resolveSiteName: formatters.resolveSiteLabel,
      resolveCameraLabel: formatters.resolveCameraLabel,
    };
    const rowActions = {
      onReview: () => {},
      onDispatch: () => {},
      onClose: () => {},
      onResolve: () => {},
    };

    const assignedItems: IncidentItem[] = [
      {
        ...dummyIncident("a-1", "CONFIRMED"),
        severity: "CRITICAL",
        violationType: "NO_HELMET",
        assignments: [
          {
            id: "as-1",
            incidentId: "a-1",
            assignedTo: "off-1",
            assignedToName: "Nguyễn Văn An",
            assignedAt: "2026-11-22T09:00:00Z",
            status: "ACTIVE",
          },
        ],
      },
      {
        ...dummyIncident("a-2", "CONFIRMED"),
        severity: "HIGH",
        violationType: "NO_VEST",
        assignments: [
          {
            id: "as-2",
            incidentId: "a-2",
            assignedTo: "off-1",
            assignedToName: "Nguyễn Văn An",
            assignedAt: "2026-11-22T09:00:00Z",
            status: "ACTIVE",
          },
        ],
      },
    ];

    // Manager Step 1 (triage) defaults to Camera and exposes Person/Severity/Hour/Shift options
    const mgrTriageHtml = renderWithLocale(
      <ManagerDispatchWorkspace
        managerTab="triage"
        categorized={{
          ...categorized,
          triageItems: assignedItems,
          pendingReview: assignedItems,
        }}
        siteFilter=""
        onSiteChange={() => {}}
        sites={[]}
        selectedIds={new Set()}
        onToggleSelectOne={() => {}}
        onToggleSelectMany={() => {}}
        batchReviewPending={false}
        batchActionPending={false}
        onBatchConfirmOnly={() => {}}
        onBatchReject={() => {}}
        onBatchDispatch={() => {}}
        onBatchClose={() => {}}
        currentUserId="mgr-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
      />,
    );
    assert.ok(mgrTriageHtml.includes('data-testid="assignment-group-toolbar"'));
    assert.ok(mgrTriageHtml.includes('data-testid="assignment-work-group-card"'));
    assert.ok(mgrTriageHtml.includes('data-group-by="camera"'));
    assert.ok(mgrTriageHtml.includes("Đối tượng &amp; Đa vi phạm"));
    assert.ok(mgrTriageHtml.includes("Khung giờ"));
    assert.ok(mgrTriageHtml.includes("Ca trực"));
    assert.ok(mgrTriageHtml.includes("1 Khẩn cấp"));

    // Manager Step 2 (dispatched) defaults to Officer grouping
    const mgrDispatchedHtml = renderWithLocale(
      <ManagerDispatchWorkspace
        managerTab="dispatched"
        categorized={{
          ...categorized,
          assignedConfirmed: assignedItems,
        }}
        siteFilter=""
        onSiteChange={() => {}}
        sites={[]}
        selectedIds={new Set()}
        onToggleSelectOne={() => {}}
        onToggleSelectMany={() => {}}
        batchReviewPending={false}
        batchActionPending={false}
        onBatchConfirmOnly={() => {}}
        onBatchReject={() => {}}
        onBatchDispatch={() => {}}
        onBatchClose={() => {}}
        currentUserId="mgr-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
      />,
    );
    assert.ok(mgrDispatchedHtml.includes('data-group-by="officer"'));
    assert.ok(mgrDispatchedHtml.includes("Nguyễn Văn An"));

    // Admin oversight supports dynamic shift/severity/person modes with toolbar
    const adminSeverityHtml = renderWithLocale(
      <AdminOversightWorkspace
        adminGroupMode="severity"
        onAdminGroupModeChange={() => {}}
        siteFilter=""
        onSiteChange={() => {}}
        sites={[]}
        incidents={assignedItems}
        expandedKeys={{}}
        onToggleExpand={() => {}}
        managerGroups={[]}
        officerGroups={[]}
        siteGroups={[]}
        cameraGroups={[]}
        currentUserId="admin-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
        onBatchDispatch={() => {}}
        onBatchClose={() => {}}
      />,
    );
    assert.ok(adminSeverityHtml.includes('data-testid="assignment-group-toolbar"'));
    assert.ok(adminSeverityHtml.includes('data-group-by="severity"'));
    assert.ok(adminSeverityHtml.includes("Khẩn cấp (CRITICAL)"));
  });

  it("displays full-DB statusTotals in AssignmentKpiSummary and AssignmentConsoleHeader when provided", () => {
    const html = renderWithLocale(
      <>
        <AssignmentConsoleHeader
          roleView="SAFETY_MANAGER"
          isAdminRole={false}
          adminInterventionMode={false}
          onToggleAdminIntervention={() => {}}
          isConnected={true}
          isRefreshing={false}
          onRefresh={() => {}}
          totalIncidentsCount={766}
          categorized={categorized}
          statusTotals={{
            pendingReview: 526,
            confirmed: 122,
            resolved: 2,
            closed: 115,
            dismissed: 1,
            closedOrDismissed: 116,
            total: 766,
          }}
        />
        <AssignmentKpiSummary
          roleView="SAFETY_MANAGER"
          isAdminRole={false}
          adminInterventionMode={false}
          totalIncidentsCount={766}
          categorized={categorized}
          statusTotals={{
            pendingReview: 526,
            confirmed: 122,
            resolved: 2,
            closed: 115,
            dismissed: 1,
            closedOrDismissed: 116,
            total: 766,
          }}
          activeOfficersCount={4}
          dispatchedGroupsCount={0}
          adminGroupMode="responsibility"
          onAdminGroupModeChange={() => {}}
          managerTab="triage"
          onManagerTabChange={() => {}}
          officerTab="pending"
          onOfficerTabChange={() => {}}
        />
      </>,
    );

    assert.ok(html.includes("526 chờ duyệt AI • 1 chưa giao"));
    assert.ok(html.includes("15% hoàn tất trên 766 hồ sơ"));
    assert.ok(html.includes("(766)"));
  });
});
