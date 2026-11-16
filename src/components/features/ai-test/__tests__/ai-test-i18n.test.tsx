import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider, useLocale } from "@/providers/locale-provider";
import viDict from "@/i18n/vi-VN.json";
import enDict from "@/i18n/en-US.json";
import {
  AiTestHeader,
  EvidenceGalleryPanel,
  EvidenceLightboxModal,
  EvidencePairCard,
  LiveStreamPanel,
  OfflinePlayerPanel,
  formatViolationLabel,
} from "../index";
import type { EvidenceItem, JobSummary, ModelInfo } from "@/types/ai-test.types";

const MOCK_MODELS: ModelInfo[] = [
  { name: "yolo-ppe-v2.pt", path: "/models/yolo-ppe-v2.pt", size_mb: 42.5, is_default: true },
];

const MOCK_JOBS: JobSummary[] = [
  {
    job_id: "job-12345678",
    status: "done",
    video_name: "site-gate.mp4",
    model: "yolo-ppe-v2.pt",
    evidence_count: 2,
  },
];

const MOCK_EVIDENCES: EvidenceItem[] = [
  {
    id: "ev-1",
    source: "job",
    sourceId: "job-12345678",
    type: "NO_HELMET",
    trackId: "7",
    frameIdx: 120,
    timeSec: 4.8,
    beforeUrl: "/api/jobs/job-12345678/evidence/before.jpg",
    afterUrl: "/api/jobs/job-12345678/evidence/after.jpg",
    primaryUrl: "/api/jobs/job-12345678/evidence/after.jpg",
  },
];

function extractPlaceholders(str: string): string[] {
  return Array.from(str.matchAll(/\{(\w+)\}/g))
    .map((m) => m[1])
    .sort();
}

function setupDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost:3000/ai-metrics/test",
  });
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    localStorage: globalThis.localStorage,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    fetch: globalThis.fetch,
    IS_REACT_ACT_ENVIRONMENT: (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT,
  };

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });

  return {
    dom,
    cleanup() {
      Object.assign(globalThis, prev);
      dom.window.close();
    },
  };
}

function LocaleSwitchTrigger() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      data-testid="switch-locale"
      onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
    >
      {locale}
    </button>
  );
}

describe("AI Test Page i18n (vi-VN & en-US)", () => {
  it("keeps full key and placeholder parity for all aiTest.* entries", () => {
    const viKeys = Object.keys(viDict).filter((k) => k.startsWith("aiTest."));
    const enKeys = Object.keys(enDict).filter((k) => k.startsWith("aiTest."));

    assert.ok(viKeys.length > 100);
    assert.deepEqual(
      viKeys.filter((k) => !(k in enDict)),
      [],
    );
    assert.deepEqual(
      enKeys.filter((k) => !(k in viDict)),
      [],
    );

    for (const key of viKeys) {
      const viVal = (viDict as Record<string, string>)[key];
      const enVal = (enDict as Record<string, string>)[key];
      assert.ok(viVal.trim().length > 0, `Empty vi-VN value for ${key}`);
      assert.ok(enVal.trim().length > 0, `Empty en-US value for ${key}`);
      assert.deepEqual(
        extractPlaceholders(viVal),
        extractPlaceholders(enVal),
        `Placeholder mismatch for ${key}`,
      );
    }
  });

  it("formats violation labels in Vietnamese and English", () => {
    assert.equal(formatViolationLabel("no_helmet", "vi-VN"), "Thiếu mũ bảo hộ (NO_HELMET)");
    assert.equal(formatViolationLabel("no_helmet", "en-US"), "Missing Helmet (NO_HELMET)");
    assert.equal(formatViolationLabel("no_safety_vest", "vi-VN"), "Thiếu áo phản quang (NO_VEST)");
    assert.equal(formatViolationLabel("no_safety_vest", "en-US"), "Missing Safety Vest (NO_VEST)");
    assert.equal(formatViolationLabel("restricted_area", "vi-VN"), "Vùng nguy hiểm (RESTRICTED_AREA)");
    assert.equal(formatViolationLabel("restricted_area", "en-US"), "Restricted Area (RESTRICTED_AREA)");
  });

  it("renders all ai-test components in Vietnamese and switches cleanly to English", async () => {
    const env = setupDom();
    const container = env.dom.window.document.getElementById("root")!;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <LocaleProvider>
              <LocaleSwitchTrigger />
              <AiTestHeader
                activeTab="live"
                onTabChange={() => {}}
                backendOnline={false}
                backendError="Connection refused"
                models={MOCK_MODELS}
                activeLiveCameraId={null}
                activeJobId="job-12345678"
                galleryCount={1}
                isRefreshing={false}
                onRefreshAll={() => {}}
              />
              <LiveStreamPanel
                models={MOCK_MODELS}
                activeCameraId={null}
                onActiveCameraChange={() => {}}
                onLiveEvidencesChange={() => {}}
                onInspectEvidence={() => {}}
                onOpenGallery={() => {}}
              />
              <OfflinePlayerPanel
                models={MOCK_MODELS}
                jobs={MOCK_JOBS}
                onRefreshJobs={async () => {}}
                activeJobId={null}
                onActiveJobChange={() => {}}
                onJobEvidencesChange={() => {}}
                onInspectEvidence={() => {}}
              />
              <EvidenceGalleryPanel
                items={MOCK_EVIDENCES}
                onInspectEvidence={() => {}}
                onSeekToJobTime={() => {}}
              />
              <EvidencePairCard
                item={MOCK_EVIDENCES[0]}
                onInspect={() => {}}
                onSeekToTime={() => {}}
              />
              <EvidenceLightboxModal
                open={false}
                items={MOCK_EVIDENCES}
                activeIndex={0}
                onClose={() => {}}
                onChangeIndex={() => {}}
              />
            </LocaleProvider>
          </QueryClientProvider>,
        );
      });

      const viText = container.textContent ?? "";
      assert.ok(viText.includes("Bảng kiểm thử AI Service"));
      assert.ok(viText.includes("AI Engine Ngoại tuyến"));
      assert.ok(viText.includes("Phân tích Offline"));
      assert.ok(viText.includes("Thư viện Bằng chứng"));
      assert.ok(viText.includes("Cấu hình Live Stream & Hot Config"));
      assert.ok(viText.includes("Tạo Job & Cấu hình Inference"));
      assert.ok(viText.includes("Thư viện Ảnh Bằng Chứng"));
      assert.ok(!viText.includes("aiTest."));

      const switchBtn = container.querySelector('[data-testid="switch-locale"]') as HTMLButtonElement;
      await act(async () => {
        switchBtn.click();
      });

      const enText = container.textContent ?? "";
      assert.ok(enText.includes("AI Service Test Bench"));
      assert.ok(enText.includes("AI Engine Offline"));
      assert.ok(enText.includes("Offline Analysis"));
      assert.ok(enText.includes("Evidence Gallery"));
      assert.ok(enText.includes("Live Stream & Hot Config"));
      assert.ok(enText.includes("Job Creator & Inference Config"));
      assert.ok(enText.includes("Evidence Image Gallery"));
      assert.ok(enText.includes("Missing Helmet"));
      assert.ok(!enText.includes("aiTest."));
      assert.equal(env.dom.window.document.documentElement.lang, "en-US");
    } finally {
      await act(async () => {
        root.unmount();
      });
      env.cleanup();
    }
  });
});
