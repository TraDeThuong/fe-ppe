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
import { ReportResolutionFunnelCard } from "../report-resolution-funnel-card";
import type {
  ResolutionFunnelSummary,
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

describe("Row 2 Reports Analytics Interactive Controls", () => {
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
