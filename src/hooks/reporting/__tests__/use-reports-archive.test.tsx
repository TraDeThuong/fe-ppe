import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it, mock } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ReportsArchiveTab, useReportsArchive } from "../../../../app/(auth)/reports/reports-archive-tab";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { reportingService } from "@/services/reporting.service";
import type { ReportHistoryQueryDto } from "@/types";

it("shows scoped archive counts, group selection, and loading and error states", async () => {
  const dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
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
      if (siteId === "site-c" && limit === 1) throw new Error("Counts unavailable");
      const total = siteId === "site-b" ? 7 : siteATotal;
      return { items: [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },
  );
  const templates = mock.method(reportingService, "getTemplates", async () => []);
  let archive: ReturnType<typeof useReportsArchive>;

  function Probe({ enabled }: { enabled: boolean }) {
    archive = useReportsArchive({ enabled, loadTemplates: false, siteIdParam: "site-a", sites: [] });
    return enabled ? (
      <ReportsArchiveTab
        archive={archive}
        canExportReports={false}
        onGenerate={() => {}}
        onOpenPreview={() => {}}
        onCreateTemplate={() => {}}
        onDeleteTemplate={() => {}}
      />
    ) : null;
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
  const strip = () => dom.window.document.querySelector('[aria-label="Danh mục Loại Báo cáo Hệ thống"]')!;
  const summary = () => dom.window.document.querySelector('[aria-label="Chỉ số kho báo cáo"]')!;

  try {
    await render(false);
    assert.equal(history.mock.callCount(), 0);
    assert.equal(templates.mock.callCount(), 0);
    assert.equal(archiveStats(), undefined);
    assert.equal(archive!.templateCounts, undefined);

    await render(true);
    await settle();
    assert.equal(archiveStats()?.totalReports, 24);
    assert.match(summary().textContent ?? "", /Tổng hồ sơ báo cáo/);
    const initialCountRequests = countRequests();

    await act(async () => archive.handleSelectArchiveKpi("periodic"));
    assert.equal(archive!.archiveKpiFilter, "periodic");
    assert.equal(archive!.historyType, "PERIODIC");
    assert.match(strip().textContent ?? "", /Nhóm Định kỳ/);
    assert.equal(strip().querySelectorAll("[aria-describedby]").length, 3);

    await act(async () => archive.selectHistoryStatus("COMPLETED"));
    assert.equal(archive!.archiveKpiFilter, null);
    assert.equal(archive!.historyType, "PERIODIC");
    assert.equal(archive!.historyStatus, "COMPLETED");
    assert.match(strip().textContent ?? "", /Nhóm Định kỳ/);

    await act(async () => archive.selectHistoryType("DAILY"));
    await settle();
    assert.doesNotMatch(strip().textContent ?? "", /Nhóm Định kỳ/);
    assert.match(strip().querySelector('[aria-pressed="true"]')?.textContent ?? "", /Ca Hàng ngày/);
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
    assert.equal(strip().getAttribute("aria-busy"), "true");
    assert.match(strip().textContent ?? "", /\.\.\./);
    assert.match(summary().textContent ?? "", /\.\.\./);
    await act(async () => siteBReady.resolve());
    await settle();
    assert.equal(archiveStats()?.totalReports, 7);
    assert.equal(strip().getAttribute("aria-busy"), "false");

    await act(async () => archive.selectHistorySite("site-c"));
    await settle();
    assert.equal(strip().getAttribute("aria-busy"), "false");
    assert.match(strip().textContent ?? "", /–/);
    assert.match(
      dom.window.document.body.textContent ?? "",
      /Không tải được số liệu kho báo cáo\. Bấm Làm mới ở đầu trang để thử lại\./,
    );
  } finally {
    await act(async () => root.unmount());
    client.clear();
    history.mock.restore();
    templates.mock.restore();
    Object.assign(globalThis, previousGlobals);
    dom.window.close();
  }
});
