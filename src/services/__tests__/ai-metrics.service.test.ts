import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiClient } from "@/lib/axios";
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

describe("aiMetricsService.getAiPerformance", () => {
  it("aggregates multiple cameras on the same statDate into a single daily point", async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/statistics/ai-performance") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            success: true,
            data: [
              {
                id: "s1",
                cameraId: "cam-1",
                modelVersionId: "ver-1",
                statDate: "2026-11-01",
                avgFps: 30,
                avgLatencyMs: 20,
                maxLatencyMs: 25,
                totalFrames: "1000",
              },
              {
                id: "s2",
                cameraId: "cam-2",
                modelVersionId: "ver-1",
                statDate: "2026-11-01",
                avgFps: 24,
                avgLatencyMs: 30,
                maxLatencyMs: 35,
                totalFrames: "3000",
              },
              {
                id: "s3",
                cameraId: "cam-1",
                modelVersionId: "ver-1",
                statDate: "2026-10-31",
                avgFps: 28,
                avgLatencyMs: 18,
                maxLatencyMs: 22,
                totalFrames: "2000",
              },
            ],
          },
        };
      }
      if (config.url === "/ai-models") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: SAMPLE_MODELS },
        };
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: SAMPLE_MODELS[0].versions[0] },
      };
    };

    const result = await aiMetricsService.getAiPerformance();
    assert.ok(result);
    assert.equal(result.latencyHistory.length, 2);
    assert.equal(result.latencyHistory[0].timestamp, "10-31");
    assert.equal(result.latencyHistory[1].timestamp, "11-01");
    // Weighted average for 11-01: (20*1000 + 30*3000)/4000 = 27.5ms; (30*1000 + 24*3000)/4000 = 25.5fps
    assert.equal(result.latencyHistory[1].latencyMs, 27.5);
    assert.equal(result.latencyHistory[1].fps, 25.5);
    assert.equal(result.totalFramesProcessed, 6000);
  });

  it("returns 0 latency/fps/frames when scoped by cameraId or date range with empty telemetry", async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/statistics/ai-performance") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: [] },
        };
      }
      if (config.url === "/ai-models") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: SAMPLE_MODELS },
        };
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: SAMPLE_MODELS[0].versions[0] },
      };
    };

    const result = await aiMetricsService.getAiPerformance({
      startDate: "2026-11-14",
      endDate: "2026-11-21",
      cameraId: "cam-99",
    });

    assert.ok(result);
    assert.equal(result.mAP50, 0.8791);
    assert.equal(result.averageLatencyMs, 0);
    assert.equal(result.averageFps, 0);
    assert.equal(result.totalFramesProcessed, 0);
    assert.deepEqual(result.latencyHistory, []);
  });

  it("does not leak telemetry or default mock matrices when selecting a model without telemetry", async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/statistics/ai-performance") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            success: true,
            data: [
              {
                id: "s1",
                cameraId: "cam-1",
                modelVersionId: "ver-1",
                statDate: "2026-11-01",
                avgFps: 28,
                avgLatencyMs: 18,
                maxLatencyMs: 22,
                totalFrames: "2000",
              },
            ],
          },
        };
      }
      if (config.url === "/ai-models") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: { success: true, data: SAMPLE_MODELS },
        };
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: SAMPLE_MODELS[0].versions[0] },
      };
    };

    const result = await aiMetricsService.getAiPerformance({ modelId: "model-2" });
    assert.ok(result);
    assert.equal(result.modelName, "RT-DETR-PPE");
    assert.equal(result.mAP50, 0.91);
    assert.equal(result.totalFramesProcessed, 0);
    assert.deepEqual(result.latencyHistory, []);
    assert.deepEqual(result.perClassMetrics, []);
    assert.deepEqual(result.confusionMatrix, { classes: [], matrix: [] });
  });
});
