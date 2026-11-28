import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { SiteItem } from "@/types";
import { SiteDetailKpiBar } from "../detail/site-detail-kpi-bar";
import { SiteDetailTabs } from "../detail/site-detail-tabs";
import { resolveSiteCameraCounts } from "../site-helpers";

const site: SiteItem = {
  id: "site-1",
  name: "Site 1",
  code: "SITE-1",
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

function renderCameraKpi(counts: ReturnType<typeof resolveSiteCameraCounts>) {
  const markup = renderToStaticMarkup(<SiteDetailKpiBar site={{ ...site, cameraCount: 7 }} {...counts} />);
  const card = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
    ?.find((button) => button.includes("lucide-camera"));
  assert.ok(card);
  return card;
}

function renderCameraTabs(cameraCount?: number) {
  return renderToStaticMarkup(
    <SiteDetailTabs
      activeTab="cameras"
      visibleTabs={["cameras"]}
      onTabChange={() => {}}
      cameraCount={cameraCount}
    />,
  );
}

it("keeps detail camera counts unknown without permission, while loading, or on a query error", () => {
  const data = { total: 4, online: 2, offline: 2 };
  const states = [
    { canRead: false, query: { isSuccess: true, data } },
    { canRead: true, query: { isSuccess: false } },
    { canRead: true, query: { isSuccess: false, data } },
  ];

  for (const { canRead, query } of states) {
    const counts = resolveSiteCameraCounts(undefined, canRead, query);
    assert.deepEqual(counts, { cameraCount: undefined, onlineCameraCount: undefined });
    const card = renderCameraKpi(counts);
    assert.match(card, />--<\/span>/);
    assert.doesNotMatch(card, />\/\d|>\d+%<\/span>/);
    assert.doesNotMatch(card, /bg-danger/);
    assert.match(card, /Chưa có trạng thái camera/);
    const tabs = renderCameraTabs(counts.cameraCount);
    assert.match(tabs, /aria-hidden="true">--<\/span>/);
    assert.match(tabs, /class="sr-only">Chưa có tổng số camera<\/span>/);
  }
});

it("uses the site total as a fallback and leaves online counts unknown when only the total is known", () => {
  const counts = resolveSiteCameraCounts(4, true, { isSuccess: false });
  assert.deepEqual(counts, { cameraCount: 4, onlineCameraCount: undefined });
  assert.deepEqual(resolveSiteCameraCounts(0, false, { isSuccess: false }), {
    cameraCount: 0,
    onlineCameraCount: 0,
  });
  const card = renderCameraKpi(counts);
  assert.match(card, />--<\/span>/);
  assert.match(card, />\/4<\/span>/);
  assert.doesNotMatch(card, />\d+%<\/span>/);
});

it("preserves a confirmed zero and uses the same total in the KPI and Camera badge", () => {
  for (const total of [0, 4]) {
    const counts = resolveSiteCameraCounts(7, true, {
      isSuccess: true,
      data: { total, online: 0, offline: total },
    });
    const card = renderCameraKpi(counts);
    assert.match(card, new RegExp(`>/${total}</span>`));
    assert.match(card, />0%<\/span>/);
    const tabs = renderCameraTabs(counts.cameraCount);
    assert.match(tabs, new RegExp(`aria-hidden="true">${total}</span>`));
    assert.match(tabs, new RegExp(`class="sr-only">Tổng số camera là ${total}</span>`));
  }
});
