import { apiClient } from "@/lib/axios";
import type {
  AiModelDto,
  AiModelVersionDto,
  AiPerformanceDto,
  AiPerformanceFilter,
  AiPerformanceResponse,
  AiPerformanceStatDto,
  CreateAiModelDto,
  CreateAiModelVersionDto,
  RecordAiPerformanceDto,
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

export const aiMetricsService = {
  /**
   * GET /api/v1/statistics/ai-performance
   * Lấy tổng hợp chỉ số hiệu năng AI, độ trễ, và ma trận nhầm lẫn từ Backend
   */
  async getAiPerformance(
    params: Pick<AiPerformanceFilter, "cameraId" | "startDate" | "endDate"> = {},
    signal?: AbortSignal,
  ): Promise<AiPerformanceResponse> {
    const response = await apiClient.get<unknown>("/statistics/ai-performance", {
      params,
      signal,
    });
    const data = unwrapData<unknown>(response);
    if (Array.isArray(data)) {
      return { kind: "rows", rows: data as AiPerformanceStatDto[] };
    }
    if (data && typeof data === "object" && ("mAP50" in data || "latencyHistory" in data)) {
      return { kind: "summary", summary: data as AiPerformanceDto };
    }
    throw new Error("Unexpected AI performance response");
  },

  /**
   * GET /api/v1/ai-models/active-version
   * Lấy phiên bản được chọn trong Registry
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
  async getAiModels(options?: { signal?: AbortSignal; strict?: boolean }): Promise<AiModelDto[]> {
    try {
      const res = await apiClient.get<unknown>("/ai-models", { signal: options?.signal });
      return unwrapArray<AiModelDto>(res);
    } catch (error) {
      if (options?.strict) throw error;
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
   * Cập nhật phiên bản được chọn trong Registry
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

  /**
   * POST /api/v1/statistics/record-ai-performance
   * Ghi nhận benchmark hiệu năng FPS / Latency thực tế của camera & model version
   */
  async recordAiPerformance(dto: RecordAiPerformanceDto): Promise<AiPerformanceStatDto> {
    const res = await apiClient.post<unknown>("/statistics/record-ai-performance", dto);
    return unwrapData<AiPerformanceStatDto>(res);
  },
};
