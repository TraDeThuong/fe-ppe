if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { ReportPersonnelPerformanceCard } from "../report-personnel-performance-card";
import { ReportResolutionFunnelCard } from "../report-resolution-funnel-card";
import type {
  ResolutionFunnelSummary,
  RoleSegmentedPersonnelSummary,
  SiteComparisonStat,
} from "@/lib/report-analytics-data";

let dom: JSDOM | null = null;
let root: Root | null = null;

function setupDom() {
  dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
    url: "http://localhost:3000/reports",
  });
  (globalThis as Record<string, unknown>).window = dom.window;
  (globalThis as Record<string, unknown>).self = dom.window;
  (globalThis as Record<string, unknown>).document = dom.window.document;
  (globalThis as Record<string, unknown>).HTMLElement = dom.window.HTMLElement;
  (globalThis as Record<string, unknown>).Node = dom.window.Node;
  (globalThis as Record<string, unknown>).localStorage = dom.window.localStorage;
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number;
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) =>
    clearTimeout(id);
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("ppe_locale", "vi-VN");
  return dom.window.document.getElementById("app")!;
}

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
    root = null;
  }
  dom?.window.close();
  dom = null;
});

const sampleSegmentedSummary: RoleSegmentedPersonnelSummary = {
  officer: {
    totalTrackedIncidents: 6,
    assignedIncidentsCount: 6,
    unassignedConfirmedCount: 0,
    staffCount: 3,
    activeHandlersCount: 2,
    idleStaffCount: 1,
    avgCompletionRate: 67,
    avgSlaComplianceRate: 75,
    items: [
      {
        userId: "u-high-workload",
        name: "Nguyễn Xử Lý Nhiều",
        email: "many@ppe.vn",
        role: "SAFETY_OFFICER",
        isUnassignedBucket: false,
        siteNames: ["Công trường A"],
        totalAssigned: 4,
        activeCount: 2,
        awaitingAcceptanceCount: 1,
        closedCount: 1,
        resolvedTotal: 2,
        completionRate: 50,
        avgMttrHours: 1.5,
        slaMetCount: 1,
        slaMeasuredCount: 2,
        slaComplianceRate: 50,
      },
      {
        userId: "u-high-sla",
        name: "Trần Đạt SLA Cao",
        email: "sla@ppe.vn",
        role: "SAFETY_OFFICER",
        isUnassignedBucket: false,
        siteNames: ["Công trường A"],
        totalAssigned: 2,
        activeCount: 0,
        awaitingAcceptanceCount: 0,
        closedCount: 2,
        resolvedTotal: 2,
        completionRate: 100,
        avgMttrHours: 0.25,
        slaMetCount: 2,
        slaMeasuredCount: 2,
        slaComplianceRate: 100,
      },
      {
        userId: "u-zero",
        name: "Lê Chưa Có Việc",
        email: "idle@ppe.vn",
        role: "SAFETY_OFFICER",
        isUnassignedBucket: false,
        siteNames: ["Công trường B"],
        totalAssigned: 0,
        activeCount: 0,
        awaitingAcceptanceCount: 0,
        closedCount: 0,
        resolvedTotal: 0,
        completionRate: 0,
        avgMttrHours: 0,
        slaMetCount: 0,
        slaMeasuredCount: 0,
        slaComplianceRate: 0,
      },
    ],
  },
  manager: {
    totalReviewActions: 7,
    totalClosedActions: 3,
    totalActions: 10,
    staffCount: 2,
    activeHandlersCount: 2,
    idleStaffCount: 0,
    avgReviewHours: 0.4,
    items: [
      {
        userId: "mgr-1",
        name: "Phạm Quản Lý A",
        email: "mgra@ppe.vn",
        role: "SAFETY_MANAGER",
        managedSiteIds: ["s1"],
        siteNames: ["Công trường A"],
        confirmedReviewCount: 4,
        dismissedReviewCount: 1,
        reviewedTotal: 5,
        closedAcceptanceCount: 3,
        directResolveCount: 0,
        totalActions: 8,
        avgReviewHours: 0.3,
        siteBacklogCount: 2,
      },
      {
        userId: "mgr-2",
        name: "Võ Quản Lý B",
        email: "mgrb@ppe.vn",
        role: "SAFETY_MANAGER",
        managedSiteIds: ["s2"],
        siteNames: ["Công trường B"],
        confirmedReviewCount: 2,
        dismissedReviewCount: 0,
        reviewedTotal: 2,
        closedAcceptanceCount: 0,
        directResolveCount: 0,
        totalActions: 2,
        avgReviewHours: 0.6,
        siteBacklogCount: 0,
      },
    ],
  },
  admin: {
    totalActions: 1,
    staffCount: 1,
    activeHandlersCount: 1,
    idleStaffCount: 0,
    items: [
      {
        userId: "adm-1",
        name: "Hoàng Quản Trị",
        email: "admin@ppe.vn",
        role: "ADMIN",
        siteNames: [],
        reviewAndCloseCount: 1,
        directResolveCount: 0,
        totalActions: 1,
        avgResponseHours: 0.2,
      },
    ],
  },
};

describe("Row 2 Reports Analytics Interactive Controls", () => {
  it("supports role tabs (Officer, Manager, Admin), 2-way sorting, and 0-task filtering", async () => {
    const container = setupDom();
    root = createRoot(container);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await act(async () => {
      root!.render(
        React.createElement(
          QueryClientProvider,
          { client: qc },
          React.createElement(
            LocaleProvider,
            null,
            React.createElement(ReportPersonnelPerformanceCard, {
              summary: sampleSegmentedSummary,
              canViewUsers: true,
            }),
          ),
        ),
      );
    });

    const getOrderedNames = () =>
      Array.from(container.querySelectorAll("p.truncate.text-xs.font-extrabold")).map(
        (el) => el.textContent,
      );

    const findButton = (text: string) =>
      Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes(text),
      );

    // Default Officer tab: Tổng việc desc
    assert.deepEqual(getOrderedNames(), [
      "Nguyễn Xử Lý Nhiều",
      "Trần Đạt SLA Cao",
      "Lê Chưa Có Việc",
    ]);

    // Click Tổng việc again -> flips to asc
    await act(async () => {
      findButton("Tổng việc")!.click();
    });
    assert.deepEqual(getOrderedNames(), [
      "Lê Chưa Có Việc",
      "Trần Đạt SLA Cao",
      "Nguyễn Xử Lý Nhiều",
    ]);

    // Click Hoàn tất -> Trần Đạt SLA Cao first
    await act(async () => {
      findButton("Hoàn tất")!.click();
    });
    assert.equal(getOrderedNames()[0], "Trần Đạt SLA Cao");

    // Click Đạt SLA twice -> toggles asc
    await act(async () => {
      findButton("Đạt SLA")!.click();
    });
    assert.equal(getOrderedNames()[0], "Trần Đạt SLA Cao");
    await act(async () => {
      findButton("Đạt SLA")!.click();
    });
    assert.equal(getOrderedNames()[0], "Lê Chưa Có Việc");

    // Switch to Quản lý điều hành tab
    await act(async () => {
      findButton("Quản lý điều hành")!.click();
    });
    assert.deepEqual(getOrderedNames(), ["Phạm Quản Lý A", "Võ Quản Lý B"]);

    // Toggle Tổng điều hành asc -> Võ Quản Lý B first
    await act(async () => {
      findButton("Tổng điều hành")!.click();
    });
    assert.deepEqual(getOrderedNames(), ["Võ Quản Lý B", "Phạm Quản Lý A"]);

    // Switch to Quản trị tab
    await act(async () => {
      findButton("Quản trị")!.click();
    });
    assert.deepEqual(getOrderedNames(), ["Hoàng Quản Trị"]);
  });

  it("switches between Phễu xử lý and Công trường and opens stage detail callout on click", async () => {
    const container = setupDom();
    root = createRoot(container);

    const funnel: ResolutionFunnelSummary = {
      totalDetected: 10,
      pendingReview: 2,
      awaitingDispatch: 1,
      remediating: 3,
      awaitingAcceptance: 1,
      closed: 2,
      dismissed: 1,
      trueViolationsTotal: 7,
      completedTotal: 3,
      resolutionRate: 43,
      falseAlarmRate: 12.5,
      bottleneckStage: "remediating",
      bottleneckCount: 3,
    };

    const siteStats: SiteComparisonStat[] = [
      {
        siteId: "s1",
        siteName: "Nhà máy Thép Miền Nam",
        siteCode: "NM-01",
        totalIncidents: 10,
        pendingReview: 2,
        confirmedActive: 4,
        resolvedCount: 3,
        falseAlarms: 1,
        complianceRate: 60,
        resolutionRate: 43,
        meanTimeToResolveHours: 1.2,
      },
    ];

    let selectedSite = "";
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await act(async () => {
      root!.render(
        React.createElement(
          QueryClientProvider,
          { client: qc },
          React.createElement(
            LocaleProvider,
            null,
            React.createElement(ReportResolutionFunnelCard, {
              funnel,
              siteStats,
              selectedSiteId: selectedSite,
              onSelectSite: (id) => {
                selectedSite = id;
              },
            }),
          ),
        ),
      );
    });

    const findButton = (text: string) =>
      Array.from(container.querySelectorAll("button")).find((btn) =>
        btn.textContent?.includes(text),
      );

    await act(async () => {
      findButton("Chờ thẩm duyệt")!.click();
    });
    assert.ok(container.textContent?.includes("Thẩm duyệt ngay"));

    await act(async () => {
      findButton("Công trường")!.click();
    });
    assert.ok(container.textContent?.includes("Nhà máy Thép Miền Nam"));
  });
});
