if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolveEvidenceUrl } from "@/lib/evidence-url";
import {
  IncidentAlertToast,
  type IncidentAlertPayload,
} from "../incident-alert-toast";
import { LocaleProvider } from "@/providers/locale-provider";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        {ui}
      </LocaleProvider>
    </QueryClientProvider>
  );
}

describe("IncidentAlertToast & Evidence URL Normalizer", () => {
  describe("resolveEvidenceUrl", () => {
    it("preserves absolute HTTP/HTTPS URLs", () => {
      const url = "http://localhost:9000/ppe-evidences/camera1/snapshot.jpg";
      assert.strictEqual(resolveEvidenceUrl(url), url);
    });

    it("prefixes relative /api/ URLs with the Gateway host", () => {
      const relative = "/api/v1/incidents/evidences/ev-123/download";
      const resolved = resolveEvidenceUrl(relative);
      assert.ok(resolved.includes("/api/v1/incidents/evidences/ev-123/download"));
      assert.ok(resolved.startsWith("http"));
    });

    it("preserves static images and videos path from public directory", () => {
      assert.strictEqual(
        resolveEvidenceUrl("/images/evidence/camera-01.jpg"),
        "/images/evidence/camera-01.jpg"
      );
      assert.strictEqual(
        resolveEvidenceUrl("evidence/camera-01.jpg"),
        "/evidence/camera-01.jpg"
      );
      assert.strictEqual(
        resolveEvidenceUrl("/videos/cameras/job_123/evidence/evidence_123.jpg"),
        "/videos/cameras/job_123/evidence/evidence_123.jpg"
      );
      assert.strictEqual(
        resolveEvidenceUrl("videos/cameras/evidence.jpg"),
        "/videos/cameras/evidence.jpg"
      );
    });

    it("resolves raw storageKey to MinIO ppe-evidences bucket", () => {
      const key = "tenant/site/camera/snap.jpg";
      assert.strictEqual(
        resolveEvidenceUrl(key),
        "http://localhost:9000/ppe-evidences/tenant/site/camera/snap.jpg"
      );
    });

    it("returns empty string for null, undefined or empty values", () => {
      assert.strictEqual(resolveEvidenceUrl(""), "");
      assert.strictEqual(resolveEvidenceUrl(null as any), "");
      assert.strictEqual(resolveEvidenceUrl(undefined), "");
    });
  });

  describe("IncidentAlertToast Component", () => {
    const mockPayload: IncidentAlertPayload = {
      incidentId: "0194e1e0-a43b-7341-9426-38290f6da867",
      siteId: "site-101",
      siteName: "Landmark 81 Tower",
      cameraId: "cam-202",
      cameraCode: "CAM-GATE-02",
      violationType: "NO_HELMET",
      severity: "CRITICAL",
      title: "Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET",
      content: "Phát hiện công nhân không đội mũ bảo hộ tại cổng số 2.",
      evidenceUrl: "http://localhost:9000/ppe-evidences/camera-evidence.jpg",
      detectedAt: "2026-11-03T12:00:00.000Z",
    };

    it("renders alert toast with title, severity and metadata chips", () => {
      const html = renderWithProviders(
        <IncidentAlertToast
          visible={true}
          data={mockPayload}
          onClose={() => {}}
          onOpenIncident={() => {}}
          onOpenCompare={() => {}}
        />
      );

      assert.ok(html.includes("CAM-GATE-02"));
      assert.ok(html.includes("Landmark 81 Tower"));
      assert.ok(html.includes("CRITICAL"));
      assert.ok(html.includes("Cảnh báo vi phạm an toàn"));
    });

    it("renders violation thumbnail with resolved evidenceUrl", () => {
      const html = renderWithProviders(
        <IncidentAlertToast
          visible={true}
          data={mockPayload}
          onClose={() => {}}
          onOpenIncident={() => {}}
        />
      );

      assert.ok(html.includes('src="http://localhost:9000/ppe-evidences/camera-evidence.jpg"'));
      assert.ok(html.includes('alt="Bằng chứng vi phạm"'));
    });

    it("renders dual action buttons for Compare and Details", () => {
      const html = renderWithProviders(
        <IncidentAlertToast
          visible={true}
          data={mockPayload}
          onClose={() => {}}
          onOpenIncident={() => {}}
          onOpenCompare={() => {}}
        />
      );

      assert.ok(html.includes("Đối chiếu") || html.includes("Compare"));
      assert.ok(html.includes("Xem sự cố") || html.includes("Details"));
    });
  });
});
