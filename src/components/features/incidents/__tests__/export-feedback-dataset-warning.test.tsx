import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { apiClient } from "@/lib/axios";
import { incidentService } from "@/services/incident.service";
import type { FeedbackDatasetItem } from "@/types";
import { ExportFeedbackDatasetModal } from "../export-feedback-dataset-modal";
import { renderWithDom, type DomContext } from "./render-with-dom";

type Params = Record<string, unknown>;
let calls: Params[] = [];
let totalFor: (params: Params) => number = () => 0;

apiClient.get = (async (url: string, config?: { params?: Params }) => {
  assert.equal(url, "/incidents/feedback-dataset");
  const params = config?.params ?? {};
  calls.push(params);
  const total = totalFor(params);
  return { data: [], meta: { page: 1, limit: 1, total, totalPages: total } };
}) as never;

const modal = (open: boolean, onOpenChange: (open: boolean) => void = () => {}) => (
  <ExportFeedbackDatasetModal
    open={open}
    onOpenChange={onOpenChange}
    siteId="site-1"
    fromDate="2026-10-31T17:00:00.000Z"
    toDate="2026-11-30T16:59:59.999Z"
  />
);

const warningText = (body: HTMLElement) => body.querySelector("[role='status']")?.textContent ?? "";
const downloadButton = (body: HTMLElement) =>
  Array.from(body.querySelectorAll("button")).find((b) => b.type === "submit");

const sample: FeedbackDatasetItem = {
  incidentId: "incident-1",
  label: "TRUE_VIOLATION",
  status: "CONFIRMED",
  reviewReason: null,
  reviewedBy: null,
  reviewedAt: null,
  violationType: "NO_HELMET",
  confidence: null,
  trackId: null,
  cameraId: "camera-1",
  siteId: "site-1",
  detectedAt: "2026-11-15T00:00:00.000Z",
  snapshotStorageKey: null,
  aiDetections: null,
};

async function selectFalseAlarm({ body, window, act }: DomContext) {
  const select = body.querySelector<HTMLSelectElement>("#feedback-label-select");
  assert.ok(select);
  await act(() => {
    select.value = "FALSE_ALARM";
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

describe("ExportFeedbackDatasetModal warnings", () => {
  beforeEach(() => {
    calls = [];
  });

  it("warns with the matched total, using the same page filters, and re-counts when the label changes", async () => {
    totalFor = (params) => (params.label === "FALSE_ALARM" ? 1000 : 1500);
    await renderWithDom(modal(true), async (dom) => {
      const { body } = dom;
      assert.equal(
        warningText(body),
        "Bộ lọc hiện khớp 1.500 mẫu. Tệp chỉ gồm 1.000 mẫu mới nhất. Hãy thu hẹp bộ lọc thời gian ở đầu trang.",
      );
      assert.deepEqual(
        { page: calls[0].page, limit: calls[0].limit, siteId: calls[0].siteId, toDate: calls[0].toDate },
        { page: 1, limit: 1, siteId: "site-1", toDate: "2026-11-30T16:59:59.999Z" },
      );
      assert.equal(downloadButton(body)?.disabled, false, "download is never blocked");

      await selectFalseAlarm(dom);
      assert.equal(calls.at(-1)?.label, "FALSE_ALARM");
      assert.equal(warningText(body), "", "exactly 1.000 samples still fits in one file");
    });
  });

  it("shows nothing extra within the cap, and does not count while closed", async () => {
    totalFor = () => 258;
    await renderWithDom(modal(true), async ({ body }) => {
      assert.equal(calls.length, 1);
      assert.equal(warningText(body), "");
    });

    calls = [];
    await renderWithDom(modal(false), async () => {
      assert.equal(calls.length, 0);
    });
  });

  it("stays silent and keeps export available when counting fails", async () => {
    totalFor = () => {
      throw new Error("count failed");
    };
    await renderWithDom(modal(true), async ({ body }) => {
      assert.equal(calls.length, 1);
      assert.equal(warningText(body), "");
      assert.equal(downloadButton(body)?.disabled, false);
    });
  });

  it("downloads the partial file and keeps the actual count visible until the filter changes", async (t) => {
    totalFor = (params) => (params.label === "FALSE_ALARM" ? 1000 : 1500);
    t.mock.method(incidentService, "exportFeedbackDatasetAll", async () => ({ items: [sample], total: 1300 }));
    const openChanges: boolean[] = [];
    const downloads: string[] = [];

    await renderWithDom(modal(true, (open) => openChanges.push(open)), async (dom) => {
      const { body, window, act } = dom;
      t.mock.method(window.HTMLAnchorElement.prototype, "click", function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
      const download = downloadButton(body);
      assert.ok(download);
      assert.match(warningText(body), /Bộ lọc hiện khớp 1\.500 mẫu/);
      await act(() => download.click());

      assert.equal(downloads.length, 1);
      assert.match(downloads[0], /\.csv$/);
      assert.deepEqual(openChanges, []);
      assert.equal(
        warningText(body),
        "Đã xuất 1 trên 1.300 mẫu khớp bộ lọc. Hãy thu hẹp bộ lọc thời gian ở đầu trang.",
      );
      assert.equal(download.disabled, false);

      await selectFalseAlarm(dom);
      assert.equal(warningText(body), "");
    });
  });

  it("uses the export result when the preliminary count fails and closes after a complete download", async (t) => {
    totalFor = () => {
      throw new Error("count failed");
    };
    let result: { items: FeedbackDatasetItem[]; total: number } = { items: [], total: 5 };
    t.mock.method(incidentService, "exportFeedbackDatasetAll", async () => result);
    const openChanges: boolean[] = [];

    await renderWithDom(modal(true, (open) => openChanges.push(open)), async ({ body, window, act }) => {
      const downloadAnchor = t.mock.method(window.HTMLAnchorElement.prototype, "click", () => {});
      const download = downloadButton(body);
      assert.ok(download);
      assert.equal(warningText(body), "");
      await act(() => download.click());

      assert.equal(downloadAnchor.mock.callCount(), 0);
      assert.deepEqual(openChanges, []);
      assert.equal(
        warningText(body),
        "Đã xuất 0 trên 5 mẫu khớp bộ lọc. Hãy thu hẹp bộ lọc thời gian ở đầu trang.",
      );

      result = { items: [sample], total: 1 };
      await act(() => download.click());
      assert.equal(downloadAnchor.mock.callCount(), 1);
      assert.deepEqual(openChanges, [false]);
      assert.equal(warningText(body), "");
    });
  });
});
