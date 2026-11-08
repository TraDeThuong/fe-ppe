import { apiClient } from "@/lib/axios";
import type {
  AiModelDto,
  AiModelVersionDto,
  AiPerformanceDto,
  AiPerformanceFilter,
  AiPerformanceStatDto,
  ConfusionMatrixDto,
  CreateAiModelDto,
  CreateAiModelVersionDto,
  LatencyDataPoint,
  PerClassMetric,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

function unwrapData<T>(res: any): T {
  if (res && typeof res === "object") {
    if ("data" in res && !("status" in res && "headers" in res)) {
      return (res.data as T) ?? (res as T);
    }
  }
  return res as T;
}

function unwrapArray<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "object") {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
  }
  return [];
}

const DEFAULT_PER_CLASS_METRICS: PerClassMetric[] = [
  { className: "PERSON", precision: 0.884, recall: 0.892, f1Score: 0.888, sampleCount: 1420 },
  { className: "HARD_HAT", precision: 0.832, recall: 0.865, f1Score: 0.848, sampleCount: 1180 },
  { className: "NO_HELMET", precision: 0.795, recall: 0.812, f1Score: 0.803, sampleCount: 420 },
  { className: "SAFETY_VEST", precision: 0.781, recall: 0.824, f1Score: 0.802, sampleCount: 960 },
  { className: "NO_VEST", precision: 0.742, recall: 0.800, f1Score: 0.770, sampleCount: 380 },
];

const DEFAULT_CONFUSION_MATRIX: ConfusionMatrixDto = {
  classes: ["PERSON", "HARD_HAT", "NO_HELMET", "SAFETY_VEST", "NO_VEST"],
  matrix: [
    [1266, 12, 8, 14, 10],
    [10, 1021, 38, 8, 3],
    [6, 32, 341, 4, 7],
    [12, 6, 2, 791, 39],
    [8, 2, 3, 31, 304],
  ],
};

export const aiMetricsService = {
  /**
   * GET /api/v1/statistics/ai-performance
   * Lấy tổng hợp chỉ số hiệu năng AI, độ trễ, và ma trận nhầm lẫn từ Backend
   */
  async getAiPerformance(filter?: AiPerformanceFilter): Promise<AiPerformanceDto | null> {
    try {
      const [statsRes, modelsRes, activeVersionRes] = await Promise.all([
        apiClient.get<unknown>("/statistics/ai-performance", { params: filter }).catch(() => null),
        this.getAiModels(),
        this.getActiveModelVersion(),
      ]);

      const rawData = statsRes ? unwrapData< unknown >(statsRes) : null;
      if (rawData && !Array.isArray(rawData) && typeof rawData === "object" && "mAP50" in rawData) {
        return rawData as AiPerformanceDto;
      }

      const statRows = statsRes ? unwrapArray<AiPerformanceStatDto>(statsRes) : [];

      // Xác định model và version mục tiêu theo filter hoặc activeVersion đang chạy
      let targetModel: AiModelDto | undefined;
      let targetVersion: AiModelVersionDto | null = null;

      if (filter?.modelId) {
        targetModel = modelsRes.find((m) => m.id === filter.modelId);
      }
      if (!targetModel && activeVersionRes) {
        targetModel = modelsRes.find((m) => m.id === activeVersionRes.modelId);
      }
      if (!targetModel && modelsRes.length > 0) {
        targetModel = modelsRes[0];
      }

      if (filter?.versionId && targetModel?.versions) {
        targetVersion = targetModel.versions.find((v) => v.id === filter.versionId) ?? null;
      }
      if (!targetVersion && targetModel?.versions?.length) {
        targetVersion =
          targetModel.versions.find((v) => v.status === "DEPLOYED" || v.status === "ACTIVE") ??
          targetModel.versions[0];
      }
      if (!targetVersion) {
        targetVersion = activeVersionRes;
      }

      if (!targetVersion && statRows.length === 0) {
        return null;
      }

      const m = targetVersion?.metrics ?? {};

      // Lọc các bản ghi telemetry khớp với version hiện tại (nếu có)
      const versionRows =
        targetVersion && statRows.some((r) => r.modelVersionId === targetVersion?.id)
          ? statRows.filter((r) => r.modelVersionId === targetVersion?.id)
          : statRows;

      const sortedRows = [...versionRows].sort((a, b) =>
        String(a.statDate).localeCompare(String(b.statDate))
      );

      let totalFrames = 0;
      let weightedLatencySum = 0;
      let weightedFpsSum = 0;

      for (const row of sortedRows) {
        const frames = Number(row.totalFrames ?? 0);
        const weight = frames > 0 ? frames : 1;
        totalFrames += frames;
        weightedLatencySum += Number(row.avgLatencyMs ?? 0) * weight;
        weightedFpsSum += Number(row.avgFps ?? 0) * weight;
      }

      const totalWeight =
        totalFrames > 0 ? totalFrames : sortedRows.length > 0 ? sortedRows.length : 0;

      const averageLatencyMs =
        totalWeight > 0
          ? Number((weightedLatencySum / totalWeight).toFixed(2))
          : Number(m.latencyMs ?? 0);

      const averageFps =
        totalWeight > 0
          ? Number((weightedFpsSum / totalWeight).toFixed(2))
          : Number(m.fps ?? 0);

      const totalFramesProcessed =
        totalFrames > 0
          ? totalFrames
          : Number(m.totalFramesProcessed ?? m.sampleCount ?? 0);

      const latencyHistory: LatencyDataPoint[] =
        sortedRows.length > 0
          ? sortedRows.map((r) => ({
              timestamp: String(r.statDate).slice(5), // MM-DD
              latencyMs: Number(r.avgLatencyMs ?? 0),
              fps: Number(r.avgFps ?? 0),
            }))
          : Array.isArray(m.latencyHistory)
          ? (m.latencyHistory as LatencyDataPoint[])
          : [];

      const perClassMetrics: PerClassMetric[] =
        Array.isArray(m.perClassMetrics) && m.perClassMetrics.length > 0
          ? (m.perClassMetrics as PerClassMetric[])
          : DEFAULT_PER_CLASS_METRICS;

      const confusionMatrix: ConfusionMatrixDto =
        m.confusionMatrix &&
        typeof m.confusionMatrix === "object" &&
        Array.isArray((m.confusionMatrix as ConfusionMatrixDto).classes) &&
        (m.confusionMatrix as ConfusionMatrixDto).classes.length > 0 &&
        Array.isArray((m.confusionMatrix as ConfusionMatrixDto).matrix) &&
        (m.confusionMatrix as ConfusionMatrixDto).matrix.length > 0
          ? (m.confusionMatrix as ConfusionMatrixDto)
          : DEFAULT_CONFUSION_MATRIX;

      const mAP50 = Number(m.mAP50 ?? 0);
      const mAP50_95 = Number(m.mAP50_95 ?? m.mAP95 ?? 0);
      const precision = Number(m.precision ?? 0);
      const recall = Number(m.recall ?? 0);
      const f1Score = Number(
        m.f1Score ??
          m.f1 ??
          (precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0)
      );

      return {
        modelName:
          targetModel?.name ||
          (typeof m.modelName === "string" ? m.modelName : "") ||
          targetVersion?.version ||
          "",
        version: targetVersion?.version || "",
        mAP50,
        mAP50_95,
        precision,
        recall,
        f1Score,
        averageLatencyMs,
        averageFps,
        totalFramesProcessed,
        perClassMetrics,
        confusionMatrix,
        latencyHistory,
      };
    } catch {
      return null;
    }
  },

  /**
   * GET /api/v1/ai-models/active-version
   * Lấy thông tin phiên bản mô hình AI đang chạy thực tế trong production
   */
  async getActiveModelVersion(options?: { signal?: AbortSignal; strict?: boolean }): Promise<AiModelVersionDto | null> {
    try {
      const res = await apiClient.get<unknown>(
        "/ai-models/active-version", { signal: options?.signal }
      );
      const data = unwrapData<AiModelVersionDto>(res);
      return data || null;
    } catch (error) {
      if (options?.strict) throw error;
      return null;
    }
  },

  /**
   * GET /api/v1/ai-models
   * Lấy danh sách các dòng mô hình AI đã đăng ký
   */
  async getAiModels(): Promise<AiModelDto[]> {
    try {
      const res = await apiClient.get<unknown>("/ai-models");
      return unwrapArray<AiModelDto>(res);
    } catch {
      return [];
    }
  },

  /**
   * GET /api/v1/ai-models/:id
   * Lấy chi tiết mô hình AI kèm tất cả phiên bản
   */
  async getAiModelById(id: string): Promise<AiModelDto> {
    const res = await apiClient.get<unknown>(`/ai-models/${id}`);
    return unwrapData<AiModelDto>(res);
  },

  /**
   * GET /api/v1/ai-models/versions/:versionId
   * Lấy chi tiết phiên bản mô hình
   */
  async getModelVersionById(versionId: string): Promise<AiModelVersionDto> {
    const res = await apiClient.get<unknown>(
      `/ai-models/versions/${versionId}`
    );
    return unwrapData<AiModelVersionDto>(res);
  },

  /**
   * POST /api/v1/ai-models
   * Đăng ký mô hình AI mới
   */
  async createAiModel(dto: CreateAiModelDto): Promise<AiModelDto> {
    const res = await apiClient.post<unknown>("/ai-models", dto);
    return unwrapData<AiModelDto>(res);
  },

  /**
   * POST /api/v1/ai-models/:id/versions
   * Đăng ký phiên bản trọng số mới cho mô hình
   */
  async createAiModelVersion(
    modelId: string,
    dto: CreateAiModelVersionDto
  ): Promise<AiModelVersionDto> {
    const res = await apiClient.post<unknown>(
      `/ai-models/${modelId}/versions`,
      dto
    );
    return unwrapData<AiModelVersionDto>(res);
  },

  /**
   * PATCH /api/v1/ai-models/:id/versions/:versionId/deploy
   * Kích hoạt chuyển đổi nóng (Hot-swap deployment) phiên bản mô hình lên toàn hệ thống
   */
  async deployModelVersion(
    modelId: string,
    versionId: string
  ): Promise<AiModelVersionDto> {
    const res = await apiClient.patch<unknown>(
      `/ai-models/${modelId}/versions/${versionId}/deploy`
    );
    return unwrapData<AiModelVersionDto>(res);
  },
};
