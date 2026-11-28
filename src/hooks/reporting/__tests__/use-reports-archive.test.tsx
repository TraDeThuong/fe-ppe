import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it, mock } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useReportsArchive } from "../../../../app/(auth)/reports/reports-archive-tab";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { reportingService } from "@/services/reporting.service";
import type { ReportHistoryQueryDto } from "@/types";

it("keeps archive counts scoped to the loaded site and resets the KPI selection when filters change", async () => {
  const dom = new JSDOM("<div id='root'></div>");
  const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previousGlobals = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Reflect.get(globalThis, key)]),
  );
  Object.assign(globalThis, globals);

  const auth: AuthContextValue = {
    user: null,
    status: "authenticated",
    setUser: () => {},
    logout: async () => {},
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const root = createRoot(dom.window.document.getElementById("root")!);
  const siteBReady = Promise.withResolvers<void>();
  let siteATotal = 24;
  const history = mock.method(
    reportingService,
    "getReportHistory",
    async ({ siteId, page = 1, limit = 20 }: ReportHistoryQueryDto = {}) => {
      if (siteId === "site-b") await siteBReady.promise;
      const total = siteId === "site-b" ? 7 : siteATotal;
      return { items: [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },
  );
  const templates = mock.method(reportingService, "getTemplates", async () => []);
  let archive: ReturnType<typeof useReportsArchive>;

  function Probe({ enabled }: { enabled: boolean }) {
    archive = useReportsArchive({ enabled, loadTemplates: false, siteIdParam: "site-a", sites: [] });
    return null;
  }

  const render = (enabled: boolean) => act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <Probe enabled={enabled} />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
  });
  const settle = () => act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  const countRequests = () =>
    history.mock.calls.filter(({ arguments: [params] }) => params?.limit === 1).length;
  const archiveStats = () => archive.archiveStats;

  try {
    await render(false);
    assert.equal(history.mock.callCount(), 0);
    assert.equal(templates.mock.callCount(), 0);
    assert.equal(archiveStats(), undefined);
    assert.equal(archive!.templateCounts, undefined);

    await render(true);
    await settle();
    assert.equal(archiveStats()?.totalReports, 24);
    const initialCountRequests = countRequests();

    await act(async () => archive.handleSelectArchiveKpi("periodic"));
    assert.equal(archive!.archiveKpiFilter, "periodic");
    assert.equal(archive!.historyType, "PERIODIC");

    await act(async () => archive.selectHistoryStatus("COMPLETED"));
    assert.equal(archive!.archiveKpiFilter, null);
    assert.equal(archive!.historyType, "PERIODIC");
    assert.equal(archive!.historyStatus, "COMPLETED");

    await act(async () => archive.selectHistoryType("DAILY"));
    await settle();
    await act(async () => archive.setHistoryPage(2));
    await settle();
    assert.equal(archiveStats()?.totalReports, 24);
    assert.equal(countRequests(), initialCountRequests);

    siteATotal = 25;
    await act(async () => archive.refreshHistory());
    await settle();
    assert.equal(archiveStats()?.totalReports, 25);

    await act(async () => archive.selectHistorySite("site-b"));
    assert.equal(archiveStats(), undefined);
    assert.equal(archive!.isHistoryLoading, true);
    await act(async () => siteBReady.resolve());
    await settle();
    assert.equal(archiveStats()?.totalReports, 7);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    history.mock.restore();
    templates.mock.restore();
    Object.assign(globalThis, previousGlobals);
    dom.window.close();
  }
});
