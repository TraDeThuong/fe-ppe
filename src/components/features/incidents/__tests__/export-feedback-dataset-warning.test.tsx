import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { apiClient } from "@/lib/axios";
import { ExportFeedbackDatasetModal } from "../export-feedback-dataset-modal";
import { renderWithDom } from "./render-with-dom";

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

const modal = (open: boolean) => (
  <ExportFeedbackDatasetModal
    open={open}
    onOpenChange={() => {}}
    siteId="site-1"
    fromDate="2026-10-31T17:00:00.000Z"
    toDate="2026-11-30T16:59:59.999Z"
  />
);

const warningText = (body: HTMLElement) => body.querySelector("[role='status']")?.textContent ?? "";
const downloadButton = (body: HTMLElement) =>
  Array.from(body.querySelectorAll("button")).find((b) => b.type === "submit");

describe("ExportFeedbackDatasetModal: warn before download when the filter exceeds the 1.000 cap", () => {
  beforeEach(() => {
    calls = [];
  });

  it("warns with the matched total, using the same page filters, and re-counts when the label changes", async () => {
    totalFor = (params) => (params.label === "FALSE_ALARM" ? 1000 : 1500);
    await renderWithDom(modal(true), async ({ body, window, act }) => {
      assert.equal(
        warningText(body),
        "Bộ lọc hiện khớp 1.500 mẫu. Tệp chỉ gồm 1.000 mẫu mới nhất. Hãy thu hẹp bộ lọc thời gian ở đầu trang.",
      );
      assert.deepEqual(
        { page: calls[0].page, limit: calls[0].limit, siteId: calls[0].siteId, toDate: calls[0].toDate },
        { page: 1, limit: 1, siteId: "site-1", toDate: "2026-11-30T16:59:59.999Z" },
      );
      assert.equal(downloadButton(body)?.disabled, false, "download is never blocked");

      const select = body.querySelector<HTMLSelectElement>("#feedback-label-select");
      assert.ok(select);
      await act(() => {
        const setValue = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!;
        setValue.call(select, "FALSE_ALARM");
        select.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
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
});
