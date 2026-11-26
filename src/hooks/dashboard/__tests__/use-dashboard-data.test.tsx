import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { apiClient } from "@/lib/axios";
import { dashboardPeriod } from "@/lib/dashboard-data";
import {
  useDashboardData,
  useDashboardPeriod,
} from "../use-dashboard-data";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const globals = globalThis as unknown as {
    window: Window;
    document: Document;
    IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  };
  const previousActEnvironment = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.window = dom.window as unknown as Window;
  globals.document = dom.window.document;
  globals.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    container: dom.window.document.getElementById("root")!,
    restore() {
      globals.window = previousWindow;
      globals.document = previousDocument;
      globals.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      dom.window.close();
    },
  };
}

describe("useDashboardData", () => {
  it("loads tab-specific statistics only on their tab, including manual refresh", async () => {
    const dom = installDom();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const calls = new Map<string, number>();
    const getMock = mock.method(apiClient, "get", async (url: string) => {
      calls.set(url, (calls.get(url) ?? 0) + 1);
      return null;
    });
    let refetchPeriod: (() => Promise<unknown>) | undefined;
    const period = dashboardPeriod("today", "2026-03-20");

    function Probe({ activeTab }: { activeTab: "overview" | "safety" | "devices" }) {
      const data = useDashboardData({
        userId: "test-user",
        siteId: null,
        period,
        activeTab,
        incidents: false,
        analytics: true,
        cameras: false,
        model: false,
        ready: true,
      });
      refetchPeriod = data.periodQuery.refetch;
      return null;
    }

    const root = createRoot(dom.container);
    const renderTab = async (activeTab: "overview" | "safety" | "devices") => {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <Probe activeTab={activeTab} />
          </QueryClientProvider>,
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    try {
      await renderTab("overview");
      assert.equal(calls.get("/statistics/hourly-risk") ?? 0, 0);
      assert.equal(calls.get("/statistics/by-camera") ?? 0, 0);

      await act(async () => {
        await refetchPeriod?.();
      });
      assert.equal(calls.get("/statistics/hourly-risk") ?? 0, 0);
      assert.equal(calls.get("/statistics/by-camera") ?? 0, 0);

      await renderTab("safety");
      assert.equal(calls.get("/statistics/hourly-risk"), 1);
      assert.equal(calls.get("/statistics/by-camera") ?? 0, 0);

      await renderTab("devices");
      assert.equal(calls.get("/statistics/hourly-risk"), 1);
      assert.equal(calls.get("/statistics/by-camera"), 1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      queryClient.clear();
      getMock.mock.restore();
      dom.restore();
    }
  });

  it("checks for a new Vietnam date every 60 seconds", () => {
    const dom = installDom();
    const intervalMock = mock.method(globalThis, "setInterval");
    const root = createRoot(dom.container);

    function Probe() {
      useDashboardPeriod();
      return null;
    }

    try {
      act(() => {
        root.render(<Probe />);
      });
      assert.equal(intervalMock.mock.calls[0]?.arguments[1], 60_000);
    } finally {
      act(() => {
        root.unmount();
      });
      intervalMock.mock.restore();
      dom.restore();
    }
  });
});
