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
import {
  AssignmentConsoleHeader,
  ManagerDispatchWorkspace,
  OfficerTasksWorkspace,
  type CategorizedAssignments,
  type ManagerTabKey,
} from "../index";
import type { IncidentItem } from "@/types";

const incident = (id: string, status: IncidentItem["status"], assignedTo?: string): IncidentItem => ({
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
  assignments: assignedTo
    ? [{ id: `a-${id}`, incidentId: id, assignedTo, status: "ACTIVE", assignedAt: "2026-11-18T09:00:00Z" }]
    : [],
});

const pending = [incident("p1", "PENDING_REVIEW"), incident("p2", "PENDING_REVIEW")];
const categorized: CategorizedAssignments = {
  pendingReview: pending,
  unassignedConfirmed: [],
  triageItems: pending,
  assignedConfirmed: [incident("c1", "CONFIRMED", "off-1")],
  awaitingAcceptance: [incident("r1", "RESOLVED", "off-1")],
  closedOrDismissed: [],
  myActiveConfirmed: [incident("c1", "CONFIRMED", "off-1")],
  myCompleted: [],
};
const formatters = {
  resolveSiteLabel: (_sid: string, fallback?: string) => fallback || "Công trường A",
  resolveCameraLabel: (inc: IncidentItem) => inc.cameraCode || inc.cameraId,
  formatViolation: (v: string) => v,
};
const responsibilityContext = {
  resolveSiteName: formatters.resolveSiteLabel,
  resolveCameraLabel: formatters.resolveCameraLabel,
};
const rowActions = { onReview: () => {}, onDispatch: () => {}, onClose: () => {}, onResolve: () => {} };
const noop = () => {};

function render(node: React.ReactNode, user: { id: string; role: string; permissions: string[] }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <AuthContext.Provider
          value={{ status: "authenticated", user: user as never, setUser: noop, logout: async () => {} }}
        >
          {node}
        </AuthContext.Provider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function manager(tab: ManagerTabKey, permissions: string[]) {
  return render(
    <ManagerDispatchWorkspace
      managerTab={tab}
      categorized={categorized}
      siteFilter=""
      onSiteChange={noop}
      sites={[]}
      selectedIds={new Set()}
      onToggleSelectOne={noop}
      onToggleSelectMany={noop}
      batchReviewPending={false}
      batchActionPending={false}
      onBatchConfirmOnly={noop}
      onBatchReject={noop}
      onBatchDispatch={noop}
      onBatchClose={noop}
      currentUserId="u-1"
      responsibilityContext={responsibilityContext}
      formatters={formatters}
      rowActions={rowActions}
      initialGroupMode="camera"
    />,
    { id: "u-1", role: "CUSTOM_VIEWER", permissions },
  );
}

const READ = ["PPE_INCIDENT_READ"];

describe("/incidents/assignments theo permission (không theo tên role)", () => {
  it("role lạ chỉ có PPE_INCIDENT_READ: không có nút thao tác, thanh hàng loạt hay ô chọn", () => {
    for (const tab of ["triage", "dispatched", "acceptance"] as const) {
      const html = manager(tab, READ);
      assert.ok(html.includes("CAM-01"), `${tab}: vẫn xem được hồ sơ`);
      for (const text of ["Duyệt &amp; Giao", "Chỉ Xác nhận", "Báo nhầm", "Đổi Officer", "Nghiệm thu &amp; Đóng", "Chọn tất cả", "Giao Officer", "Duyệt<"]) {
        assert.ok(!html.includes(text), `${tab}: không được có "${text}"`);
      }
      assert.ok(!html.includes('type="checkbox"'), `${tab}: không có ô chọn`);
    }
  });

  it("chỉ có quyền REVIEW: được xác nhận/bác bỏ nhưng không được giao", () => {
    const html = manager("triage", [...READ, "PPE_INCIDENT_REVIEW"]);
    assert.ok(html.includes("Chỉ Xác nhận"));
    assert.ok(html.includes("Báo nhầm"));
    assert.ok(!html.includes("Duyệt &amp; Giao Officer"));
    assert.ok(html.includes('type="checkbox"'));
  });

  it("đủ REVIEW + MANAGE: hiện đủ nút điều phối", () => {
    const perms = [...READ, "PPE_INCIDENT_REVIEW", "PPE_INCIDENT_MANAGE"];
    assert.ok(manager("triage", perms).includes("Duyệt &amp; Giao Officer"));
    assert.ok(manager("dispatched", perms).includes("Đổi Officer phụ trách"));
    assert.ok(manager("acceptance", perms).includes("Nghiệm thu &amp; Đóng hàng loạt"));
  });

  it("officer thiếu PPE_INCIDENT_UPDATE: không có nút báo cáo khắc phục và ô chọn", () => {
    const officer = (permissions: string[]) => render(
      <OfficerTasksWorkspace
        officerTab="pending"
        categorized={categorized}
        dispatchedGroups={[]}
        usersById={new Map()}
        selectedIds={new Set()}
        onToggleSelectOne={noop}
        onToggleSelectMany={noop}
        batchActionPending={false}
        onBatchResolve={noop}
        currentUserId="off-1"
        responsibilityContext={responsibilityContext}
        formatters={formatters}
        rowActions={rowActions}
      />,
      { id: "off-1", role: "SAFETY_OFFICER", permissions },
    );
    const readOnly = officer(READ);
    assert.ok(!readOnly.includes("Báo cáo khắc phục"));
    assert.ok(!readOnly.includes('type="checkbox"'));
    assert.ok(officer([...READ, "PPE_INCIDENT_UPDATE"]).includes("Báo cáo khắc phục"));
  });

  it("header hiện nhãn Chế độ chỉ xem khi readOnly", () => {
    const header = (readOnly: boolean) => render(
      <AssignmentConsoleHeader
        roleView="SAFETY_MANAGER"
        isAdminRole={false}
        adminInterventionMode={false}
        onToggleAdminIntervention={noop}
        isConnected={false}
        isRefreshing={false}
        onRefresh={noop}
        totalIncidentsCount={3}
        categorized={categorized}
        readOnly={readOnly}
      />,
      { id: "u-1", role: "CUSTOM_VIEWER", permissions: READ },
    );
    assert.ok(header(true).includes("Chế độ chỉ xem"));
    assert.ok(header(true).includes("Polling (30s)"));
    assert.ok(!header(false).includes("Chế độ chỉ xem"));
  });
});
