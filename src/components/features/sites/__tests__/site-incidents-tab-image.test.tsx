import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderWithDom, type DomContext } from "@/components/features/incidents/__tests__/render-with-dom";
import { apiClient } from "@/lib/axios";
import type { SiteItem } from "@/types";
import { SiteIncidentsTab } from "../detail/tabs/site-incidents-tab";

const incidentWithBrokenImage = {
  id: "aaaaaaaa-1",
  siteId: "site-1",
  cameraId: "cam-1",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status: "PENDING_REVIEW",
  detectedAt: "2026-11-24T10:00:00.000Z",
  createdAt: "2026-11-24T10:00:00.000Z",
  updatedAt: "2026-11-24T10:00:00.000Z",
  evidences: [
    {
      id: "ev-1",
      evidenceType: "SNAPSHOT",
      mimeType: "image/jpeg",
      fileName: "missing.jpg",
      storageKey: "evidences/site-1/cam-1/missing.jpg",
    },
  ],
};

apiClient.get = (async (url: string) => {
  if (url === "/incidents") {
    return { data: [incidentWithBrokenImage], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
  }
  return new Promise(() => {});
}) as never;

const site = { id: "site-1", name: "Site A", code: "S-A", status: "ACTIVE", zones: [] } as unknown as SiteItem;

async function failIncidentImage({ body, window, act }: DomContext) {
  const image = body.querySelector("img[src*='missing.jpg']");
  assert.ok(image, "incident thumbnail is rendered");
  await act(() => image.dispatchEvent(new window.Event("error")));
  // So sánh số lượng: assert trực tiếp trên node DOM khiến Node in cả cây JSDOM khi fail.
  assert.equal(body.querySelectorAll("img").length, 0, "broken image is replaced, not swapped");
  assert.doesNotMatch(body.innerHTML, /camera-live-evidence/);
  assert.ok(body.querySelector("svg.lucide-camera"), "camera placeholder icon");
}

it("table view shows the camera placeholder, not the sample image, when a thumbnail fails", async () => {
  await renderWithDom(<SiteIncidentsTab site={site} />, async (context) => {
    assert.ok(context.body.querySelector("table"), "table view is the default");
    await failIncidentImage(context);
  });
});

it("list view shows the camera placeholder, not the sample image, when a thumbnail fails", async () => {
  await renderWithDom(<SiteIncidentsTab site={site} />, async (context) => {
    const listButton = Array.from(context.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Danh sách",
    );
    assert.ok(listButton, "list view toggle");
    await context.act(() => listButton.click());
    assert.equal(context.body.querySelectorAll("table").length, 0);
    await failIncidentImage(context);
  });
});
