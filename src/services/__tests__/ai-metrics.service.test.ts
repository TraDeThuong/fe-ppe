import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiClient } from "@/lib/axios";
import { AxiosError } from "axios";
import { resolveAiPerformance } from "@/lib/ai-performance";
import { aiMetricsService } from "../ai-metrics.service";

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

const SAMPLE_MODELS = [
  {
    id: "model-1",
    name: "YOLOv11s-PPE",
    code: "YOLO11S_PPE",
    modelType: "OBJECT_DETECTION",
    status: "ACTIVE",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    versions: [
      {
        id: "ver-1",
        modelId: "model-1",
        version: "3.0.0",
        modelPath: "models/best.pt",
        framework: "PyTorch FP16",
        inputSize: "640x640",
        status: "DEPLOYED",
        metrics: {
          mAP50: 0.8791,
          precision: 0.8067,
          recall: 0.8383,
          f1Score: 0.8222,
          latencyMs: 18.4,
          fps: 28.5,
          totalFramesProcessed: 148520,
          perClassMetrics: [
            { className: "PERSON", precision: 0.9, recall: 0.9, f1Score: 0.9, sampleCount: 100 },
          ],
          confusionMatrix: {
            classes: ["PERSON"],
            matrix: [[100]],
          },
        },
        deployedAt: "2026-11-01T00:00:00.000Z",
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ],
  },
  {
    id: "model-2",
    name: "RT-DETR-PPE",
    code: "RTDETR_PPE",
    modelType: "OBJECT_DETECTION",
    status: "ACTIVE",
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
    versions: [
      {
        id: "ver-2",
        modelId: "model-2",
        version: "1.0.0",
        modelPath: "models/rtdetr.pt",
        framework: "ONNX",
        inputSize: "640x640",
        status: "DEVELOPMENT",
        metrics: {
          mAP50: 0.91,
          precision: 0.89,
          recall: 0.88,
        },
        createdAt: "2026-11-02T00:00:00.000Z",
      },
    ],
  },
];

const version = SAMPLE_MODELS[0].versions[0];

function mockStatistics(data: unknown) {
  const requests: string[] = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config.url ?? "");
    assert.equal(config.url, "/statistics/ai-performance");
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { success: true, data },
    };
  };
  return requests;
}

describe("aiMetricsService.getAiPerformance", () => {
  it("only requests statistics and combines same-day camera rows with supplied registry data", async () => {
    const requests = mockStatistics([
      { cameraId: "cam-1", modelVersionId: "ver-1", statDate: "2026-11-01", avgFps: 30, avgLatencyMs: 20, totalFrames: "1000" },
      { cameraId: "cam-2", modelVersionId: "ver-1", statDate: "2026-11-01", avgFps: 24, avgLatencyMs: 30, totalFrames: "3000" },
      { cameraId: "cam-1", modelVersionId: "ver-1", statDate: "2026-10-31", avgFps: 28, avgLatencyMs: 18, totalFrames: "2000" },
    ]);

    const response = await aiMetricsService.getAiPerformance();
    assert.deepEqual(requests, ["/statistics/ai-performance"]);
    const result = resolveAiPerformance(response, {}, SAMPLE_MODELS, version);
    assert.ok(result);
    assert.deepEqual(result.latencyHistory, [
      { timestamp: "10-31", latencyMs: 18, fps: 28 },
      { timestamp: "11-01", latencyMs: 27.5, fps: 25.5 },
    ]);
    assert.equal(result.totalFramesProcessed, 6000);
  });

  it("distinguishes empty telemetry from a measured zero", async () => {
    const requests = mockStatistics([]);
    const response = await aiMetricsService.getAiPerformance({
      cameraId: "cam-99",
      startDate: "2026-11-14",
      endDate: "2026-11-21",
    });
    const result = resolveAiPerformance(response, {}, SAMPLE_MODELS, version);
    assert.deepEqual(requests, ["/statistics/ai-performance"]);
    assert.ok(result);
    assert.equal(result.mAP50, 0.8791);
    assert.equal(result.averageLatencyMs, null);
    assert.equal(result.averageFps, null);
    assert.equal(result.totalFramesProcessed, null);
    assert.deepEqual(result.latencyHistory, []);

    mockStatistics([{ statDate: "2026-11-21", avgFps: 0, avgLatencyMs: 0, totalFrames: "0" }]);
    const zero = resolveAiPerformance(await aiMetricsService.getAiPerformance(), {}, []);
    assert.ok(zero);
    assert.equal(zero.averageLatencyMs, 0);
    assert.equal(zero.averageFps, 0);
    assert.equal(zero.totalFramesProcessed, 0);
    assert.equal(zero.mAP50, null);
  });

  it("reuses the same rows when switching models", async () => {
    const requests = mockStatistics([
      { cameraId: "cam-1", modelVersionId: "ver-1", statDate: "2026-11-01", avgFps: 28, avgLatencyMs: 18, totalFrames: "2000" },
    ]);
    const response = await aiMetricsService.getAiPerformance();
    const result = resolveAiPerformance(response, { modelId: "model-2" }, SAMPLE_MODELS, version);
    assert.ok(result);
    assert.equal(result.modelName, "RT-DETR-PPE");
    assert.equal(result.mAP50, 0.91);
    assert.equal(result.totalFramesProcessed, null);
    assert.deepEqual(result.latencyHistory, []);
    assert.deepEqual(result.perClassMetrics, []);
    assert.deepEqual(result.confusionMatrix, { classes: [], matrix: [] });
    assert.deepEqual(requests, ["/statistics/ai-performance"]);
  });

  it("supports a legacy summary and surfaces request failures", async () => {
    const summary = { mAP50: 0, averageLatencyMs: 0, latencyHistory: [] };
    mockStatistics(summary);
    assert.deepEqual(resolveAiPerformance(await aiMetricsService.getAiPerformance(), {}, []), summary);

    apiClient.defaults.adapter = async () => {
      throw new AxiosError("Request failed");
    };
    await assert.rejects(aiMetricsService.getAiPerformance());
  });
});
