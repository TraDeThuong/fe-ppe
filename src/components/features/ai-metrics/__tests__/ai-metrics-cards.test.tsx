import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  computeLatencyStatBarWidth,
  E2E_ALERT_LATENCY_SLA_MS,
  LatencyChartCard,
} from "../latency-chart-card";
import { buildGuideContent } from "../ai-metrics-guide-modal";
import { ConfusionMatrixHeatmap } from "../confusion-matrix-heatmap";
import { ActiveModelBanner } from "../active-model-banner";
import { ModelGovernanceTable } from "../model-governance-table";
import { AiMetricsKpiSummary } from "../ai-metrics-kpi-summary";
import { PerClassMetricsCard } from "../per-class-metrics-card";
import {
  formatVersionTag,
  MODEL_PATH_REGEX,
  suggestNextVersion,
} from "../ai-model-governance-modals";

function renderWithProviders(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(LocaleProvider, null, element),
    ),
  );
}

describe("ai-metrics cards", () => {
  it("LatencyChartCard renders loading skeleton when loading=true", () => {
    const html = renderWithProviders(
      React.createElement(LatencyChartCard, { loading: true }),
    );
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes("animate-pulse"));
  });

  it("LatencyChartCard loading skeleton has 6 KPI tiles matching the real 6-column grid", () => {
    const html = renderWithProviders(
      React.createElement(LatencyChartCard, { loading: true }),
    );
    assert.ok(html.includes("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"));
    assert.ok(!html.includes("xl:grid-cols-4"));
    const tiles = html.match(/h-28 rounded-\[17px\] bg-muted\/40/g) ?? [];
    assert.equal(tiles.length, 6);
  });

  it("computeLatencyStatBarWidth scales E2E alert latency against the 2000 ms SLA", () => {
    const chart = { highestLatency: 95, maxVal: 100 };
    assert.equal(E2E_ALERT_LATENCY_SLA_MS, 2000);
    // 412.6 / 2000 = 20.63%, không phụ thuộc đỉnh Inference Latency (95%)
    assert.ok(Math.abs(computeLatencyStatBarWidth("e2e", 412.6, chart) - 20.63) < 1e-9);
    assert.equal(computeLatencyStatBarWidth("e2e", 1000, chart), 50);
    assert.equal(computeLatencyStatBarWidth("e2e", 2500, chart), 100);
    assert.equal(computeLatencyStatBarWidth("e2e", null, chart), 0);
  });

  it("computeLatencyStatBarWidth keeps peak, inference and FPS formulas", () => {
    const chart = { highestLatency: 45, maxVal: 60 };
    assert.equal(computeLatencyStatBarWidth("peak", 45, chart), 75);
    assert.equal(computeLatencyStatBarWidth("inference", 31.2, chart), 31.2);
    assert.equal(computeLatencyStatBarWidth("inference", 150, chart), 100);
    assert.equal(computeLatencyStatBarWidth("fps", 30, chart), 50);
    assert.equal(computeLatencyStatBarWidth("fps", null, chart), 0);
  });

  it("latency-chart guide explains P95 (< 100 ms) and E2E Alert (< 2000 ms) in vi and en", () => {
    const vi = buildGuideContent("latency-chart", true).howToRead.map((row) => row.term);
    const en = buildGuideContent("latency-chart", false).howToRead.map((row) => row.term);
    assert.ok(vi.some((term) => term.includes("P95") && term.includes("100 ms")));
    assert.ok(vi.some((term) => term.includes("đầu-cuối") && term.includes("2000 ms")));
    assert.ok(en.some((term) => term.includes("P95") && term.includes("100 ms")));
    assert.ok(en.some((term) => term.includes("E2E") && term.includes("2000 ms")));
  });

  it("LatencyChartCard renders both latency and FPS series when data exists", () => {
    const html = renderWithProviders(
      React.createElement(LatencyChartCard, {
        avgLatencyMs: 18.5,
        p95LatencyMs: 31.2,
        e2eAlertLatencyMs: 412.6,
        avgFps: 28.5,
        latencyHistory: [
          { timestamp: "10-31", latencyMs: 18.4, fps: 28.5 },
          { timestamp: "11-01", latencyMs: 18.2, fps: 28.7 },
        ],
      }),
    );

    assert.ok(html.includes("10-31"));
    assert.ok(html.includes("11-01"));
    assert.ok(html.includes("fps"));
    assert.ok(html.includes("ms"));
    assert.ok(html.includes("28.5"));
    assert.ok(html.includes("18.4"));
    assert.ok(html.includes("31.2"));
    assert.ok(html.includes("412.6"));
  });

  it("AiMetricsKpiSummary renders p95LatencyMs and e2eAlertLatencyMs on the latency card", () => {
    const html = renderWithProviders(
      React.createElement(AiMetricsKpiSummary, {
        performance: {
          modelName: "YOLOv11s-PPE",
          version: "3.0.0",
          mAP50: 0.88,
          mAP50_95: 0.64,
          precision: 0.85,
          recall: 0.84,
          f1Score: 0.845,
          averageLatencyMs: 19.4,
          p95LatencyMs: 34.8,
          e2eAlertLatencyMs: 390.5,
          averageFps: 27.2,
          totalFramesProcessed: 12000,
          perClassMetrics: [],
          confusionMatrix: { classes: [], matrix: [] },
          latencyHistory: [],
        },
      }),
    );

    assert.ok(html.includes("34.8 ms"));
    assert.ok(html.includes("390.5 ms"));
  });

  it("ConfusionMatrixHeatmap highlights selectedClass when provided", () => {
    const html = renderWithProviders(
      React.createElement(ConfusionMatrixHeatmap, {
        selectedClass: "HARD_HAT",
        confusionMatrix: {
          classes: ["PERSON", "HARD_HAT"],
          matrix: [
            [100, 2],
            [3, 95],
          ],
        },
      }),
    );

    assert.ok(html.includes("ring-2 ring-primary/45"));
    assert.ok(html.includes("opacity-40"));
  });

  it("ActiveModelBanner displays exact framework without forcing FP16", () => {
    const html = renderWithProviders(
      React.createElement(ActiveModelBanner, {
        modelName: "RT-DETR",
        activeVersion: {
          id: "v1",
          modelId: "m1",
          version: "1.0.0",
          framework: "ONNX",
          inputSize: "640x640",
          status: "DEPLOYED",
          modelPath: "models/rtdetr.onnx",
          createdAt: "2026-11-01T00:00:00.000Z",
        },
      }),
    );

    assert.ok(html.includes("ONNX"));
    assert.ok(!html.includes("ONNX FP16"));
  });

  it("ModelGovernanceTable renders distinct badge for STAGING status", () => {
    const html = renderWithProviders(
      React.createElement(ModelGovernanceTable, {
        models: [
          {
            id: "m1",
            name: "YOLOv11s-PPE",
            code: "YOLO11S_PPE",
            modelType: "OBJECT_DETECTION",
            status: "ACTIVE",
            createdAt: "2026-11-01T00:00:00.000Z",
            updatedAt: "2026-11-01T00:00:00.000Z",
            versions: [
              {
                id: "v-staging",
                modelId: "m1",
                version: "3.1.0",
                framework: "PyTorch",
                inputSize: "640x640",
                status: "STAGING",
                createdAt: "2026-11-02T00:00:00.000Z",
              },
            ],
          },
        ],
      }),
    );

    assert.ok(html.includes("STAGING"));
    assert.ok(!html.includes("Archived"));
  });

  it("keeps guide buttons on the cards outside the KPI summary", () => {
    const noop = () => {};
    const bannerHtml = renderWithProviders(
      React.createElement(ActiveModelBanner, { onOpenGuide: noop }),
    );
    const kpiHtml = renderWithProviders(
      React.createElement(AiMetricsKpiSummary),
    );
    const perClassHtml = renderWithProviders(
      React.createElement(PerClassMetricsCard, { metrics: [], onOpenGuide: noop }),
    );
    const matrixHtml = renderWithProviders(
      React.createElement(ConfusionMatrixHeatmap, { onOpenGuide: noop }),
    );
    const chartHtml = renderWithProviders(
      React.createElement(LatencyChartCard, { onOpenGuide: noop }),
    );
    const tableHtml = renderWithProviders(
      React.createElement(ModelGovernanceTable, { models: [], onOpenGuide: noop }),
    );

    for (const html of [bannerHtml, perClassHtml, matrixHtml, chartHtml, tableHtml]) {
      assert.ok(html.includes("Giải thích"));
    }
    assert.equal(kpiHtml.match(/aria-label="Giải thích"/g), null);
    assert.ok(kpiHtml.includes("—"));
  });

  it("keeps Sandbox access separate from model read permission in the banner", () => {
    const readOnly = renderWithProviders(
      React.createElement(ActiveModelBanner, { canReadModels: false }),
    );
    assert.ok(readOnly.includes("Cần quyền đọc mô hình"));
    assert.ok(!readOnly.includes('href="/ai-metrics/test"'));
    const sandbox = renderWithProviders(
      React.createElement(ActiveModelBanner, { canReadModels: false, canTestModel: true }),
    );
    assert.ok(sandbox.includes('href="/ai-metrics/test"'));
  });

  it("ActiveModelBanner renders an empty Registry state when activeVersion is null", () => {
    const html = renderWithProviders(
      React.createElement(ActiveModelBanner, { activeVersion: null }),
    );
    assert.ok(html.includes("Registry chưa chọn phiên bản"));
    assert.ok(html.includes("bg-amber-500"));
  });

  it("ModelGovernanceTable hides Deploy button for INACTIVE models or DEPRECATED versions", () => {
    const html = renderWithProviders(
      React.createElement(ModelGovernanceTable, {
        canDeploy: true,
        onDeploy: () => {},
        models: [
          {
            id: "m-inactive",
            name: "Old YOLO",
            code: "OLD_YOLO",
            modelType: "OBJECT_DETECTION",
            status: "INACTIVE",
            createdAt: "2026-11-01T00:00:00.000Z",
            updatedAt: "2026-11-01T00:00:00.000Z",
            versions: [
              {
                id: "v-old",
                modelId: "m-inactive",
                version: "1.0.0",
                framework: "PyTorch",
                inputSize: "640x640",
                status: "STAGING",
                createdAt: "2026-11-01T00:00:00.000Z",
              },
            ],
          },
        ],
      }),
    );
    assert.ok(html.includes("Ngưng sử dụng"));
  });

  it("ModelGovernanceTable displays newly registered models without versions", () => {
    const html = renderWithProviders(
      React.createElement(ModelGovernanceTable, {
        canDeploy: true,
        onAddVersion: () => {},
        models: [
          {
            id: "m-empty",
            name: "YOLOv12-PPE",
            code: "YOLO12_PPE",
            modelType: "OBJECT_DETECTION",
            status: "ACTIVE",
            createdAt: "2026-11-01T00:00:00.000Z",
            updatedAt: "2026-11-01T00:00:00.000Z",
            versions: [],
          },
        ],
      }),
    );

    assert.ok(html.includes("YOLOv12-PPE"));
    assert.ok(html.includes("YOLO12_PPE"));
    assert.ok(html.includes("Thêm Version"));
  });

  it("ai-model governance helpers format version tags, suggest next SemVer, and validate modelPath", () => {
    assert.equal(formatVersionTag("1.2.0"), "v1.2.0");
    assert.equal(formatVersionTag("v1.2.0"), "v1.2.0");
    assert.equal(formatVersionTag("V2.0.1"), "v2.0.1");

    assert.equal(suggestNextVersion(undefined), "1.0.0");
    assert.equal(
      suggestNextVersion({
        id: "m1",
        name: "YOLO",
        code: "YOLO",
        modelType: "OBJECT_DETECTION",
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
        versions: [
          {
            id: "v1",
            modelId: "m1",
            version: "1.0.0",
            framework: "PyTorch",
            inputSize: "640x640",
            status: "DEPLOYED",
            createdAt: "",
          },
        ],
      }),
      "1.0.1",
    );

    assert.equal(MODEL_PATH_REGEX.test("models/best.pt"), true);
    assert.equal(MODEL_PATH_REGEX.test("s3://ppe-models/v2/yolo.onnx"), true);
    assert.equal(MODEL_PATH_REGEX.test("models/../secret.pt"), false);
    assert.equal(MODEL_PATH_REGEX.test("/etc/passwd"), false);
    assert.equal(MODEL_PATH_REGEX.test("models/best.txt"), false);
  });
});
