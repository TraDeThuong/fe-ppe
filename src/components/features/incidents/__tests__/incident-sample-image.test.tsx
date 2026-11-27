import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { apiClient } from "@/lib/axios";
import type { EvidenceItem, IncidentItem } from "@/types";
import { IncidentEvidenceViewer } from "../incident-evidence-viewer";
import { IncidentQuickDetailPanel } from "../incident-quick-detail-panel";
import { IncidentTable } from "../incident-table";
import {
  resolveIncidentSnapshot,
  selectQuickDetailEvidence,
} from "../viewer/evidence-media-utils";
import { renderWithDom, withProviders } from "./render-with-dom";

apiClient.get = (() => new Promise(() => {})) as never;

const SAMPLE = "/images/camera-live-evidence.jpg";
const SAMPLE_RE = /camera-live-evidence/;

function evidence(id: string, over: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id,
    incidentId: "inc-1",
    cameraId: "cam-1",
    evidenceType: "SNAPSHOT",
    storageKey: `evidences/site-1/cam-1/${id}.jpg`,
    fileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    fileSize: 10,
    capturedAt: "2026-11-24T10:00:00.000Z",
    createdAt: "2026-11-24T10:00:00.000Z",
    ...over,
  };
}

function incident(over: Partial<IncidentItem> = {}): IncidentItem {
  return {
    id: "inc-1",
    siteId: "site-1",
    cameraId: "cam-1",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "PENDING_REVIEW",
    detectedAt: "2026-11-24T10:00:00.000Z",
    createdAt: "2026-11-24T10:00:00.000Z",
    updatedAt: "2026-11-24T10:00:00.000Z",
    evidences: [],
    ...over,
  };
}

// Backend hiện tại không có cột snapshotUrl, nên ảnh mẫu (nếu có trong DB) sẽ nằm ở evidence.
const SAMPLE_CASES: Record<string, IncidentItem> = {
  "snapshotUrl is the sample, a real evidence exists": incident({
    snapshotUrl: SAMPLE,
    evidences: [evidence("real")],
  }),
  "snapshotUrl is the sample, no evidence": incident({ snapshotUrl: SAMPLE }),
  "evidence.storageKey is the sample": incident({
    evidences: [evidence("old", { storageKey: "images/camera-live-evidence.jpg" })],
  }),
  "evidence.url is the sample": incident({
    evidences: [evidence("old", { url: `http://localhost:3000${SAMPLE}` })],
  }),
};

describe("sample image /images/camera-live-evidence.jpg is never shown for an incident", () => {
  for (const [name, item] of Object.entries(SAMPLE_CASES)) {
    it(`detail viewer, quick panel and table hide it when ${name}`, () => {
      const rendered = {
        viewer: (
          <IncidentEvidenceViewer
            evidence={item.evidences?.[0]}
            evidences={item.evidences}
            snapshotUrl={item.snapshotUrl}
            violationType={item.violationType}
          />
        ),
        quickPanel: <IncidentQuickDetailPanel incident={item} />,
        table: <IncidentTable incidents={[item]} viewMode="table" />,
      };
      for (const [screen, element] of Object.entries(rendered)) {
        const html = renderToStaticMarkup(withProviders(element));
        assert.doesNotMatch(html, SAMPLE_RE, screen);
        if (item.evidences?.[0]?.id === "real") {
          assert.match(html, /ppe-evidences\/evidences\/site-1\/cam-1\/real\.jpg/, screen);
        }
      }
    });
  }

  it("does not fall back to the sample when the real viewer image fails to load", async () => {
    await renderWithDom(
      <IncidentEvidenceViewer
        evidences={[evidence("real")]}
        snapshotUrl={SAMPLE}
        violationType="NO_HELMET"
      />,
      async ({ body, window, act }) => {
        const image = body.querySelector("img[alt^='Ảnh Vi Phạm PPE']");
        assert.ok(image, "main evidence image");
        await act(() => image.dispatchEvent(new window.Event("error")));
        assert.doesNotMatch(body.innerHTML, SAMPLE_RE);
        assert.match(body.textContent ?? "", /không thể tải tệp/);
      },
    );
  });

  it("recognises every spelling of the sample and keeps real evidence URLs", () => {
    for (const value of [SAMPLE, SAMPLE.slice(1), `https://app.test${SAMPLE}`, `${SAMPLE}?v=2`]) {
      assert.equal(resolveIncidentSnapshot(value), "", value);
    }
    assert.equal(resolveIncidentSnapshot("/evidence/real.jpg"), "/evidence/real.jpg");
    assert.equal(resolveIncidentSnapshot("evidences/clip.mp4"), "");
  });

  it("skips a sample-only record so it is neither the primary image nor used for signed URLs", () => {
    const selected = selectQuickDetailEvidence(
      incident({
        evidences: [
          evidence("old", { storageKey: "images/camera-live-evidence.jpg" }),
          evidence("real"),
          evidence("old_ref", { evidenceType: "REFERENCE_SNAPSHOT", storageKey: SAMPLE.slice(1) }),
        ],
      }),
      { incidentUrl: SAMPLE, referenceUrl: SAMPLE },
    );
    assert.equal(selected.primaryEvidence?.id, "real");
    assert.match(selected.primaryEvidenceUrl, /real\.jpg$/);
    assert.equal(selected.referenceEvidenceUrl, "");

    const onlySample = selectQuickDetailEvidence(
      incident({ evidences: [evidence("old", { url: SAMPLE, storageKey: SAMPLE })] }),
    );
    assert.equal(onlySample.primaryEvidence, null);
    assert.equal(onlySample.primaryEvidenceUrl, "");
  });
});
