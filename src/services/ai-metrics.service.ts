import { apiClient } from "@/lib/axios";
import type {
  AiModelDto,
  AiModelVersionDto,
  AiPerformanceDto,
  AiPerformanceFilter,
  CreateAiModelDto,
  CreateAiModelVersionDto,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const aiMetricsService = {
  /**
   * GET /api/v1/statistics/ai-performance
   * Lấy tổng hợp chỉ số hiệu năng AI, độ trễ, và ma trận nhầm lẫn
   */
  async getAiPerformance(filter?: AiPerformanceFilter): Promise<AiPerformanceDto | null> {
    try {
      const res = await apiClient.get<ApiResponse<AiPerformanceDto | unknown>>(
        "/api/v1/statistics/ai-performance",
        { params: filter }
      );
      if (res.data?.data && typeof res.data.data === "object" && "mAP50" in res.data.data) {
        return res.data.data as AiPerformanceDto;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * GET /api/v1/ai-models/active-version
   * Lấy thông tin phiên bản mô hình AI đang chạy thực tế trong production
   */
  async getActiveModelVersion(): Promise<AiModelVersionDto | null> {
    try {
      const res = await apiClient.get<ApiResponse<AiModelVersionDto>>(
        "/api/v1/ai-models/active-version"
      );
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * GET /api/v1/ai-models
   * Lấy danh sách các dòng mô hình AI đã đăng ký
   */
  async getAiModels(): Promise<AiModelDto[]> {
    try {
      const res = await apiClient.get<ApiResponse<AiModelDto[]>>("/api/v1/ai-models");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  },


  /**
   * GET /api/v1/ai-models/:id
   * Lấy chi tiết mô hình AI kèm tất cả phiên bản
   */
  async getAiModelById(id: string): Promise<AiModelDto> {
    const res = await apiClient.get<ApiResponse<AiModelDto>>(`/api/v1/ai-models/${id}`);
    return res.data.data;
  },

  /**
   * GET /api/v1/ai-models/versions/:versionId
   * Lấy chi tiết phiên bản mô hình
   */
  async getModelVersionById(versionId: string): Promise<AiModelVersionDto> {
    const res = await apiClient.get<ApiResponse<AiModelVersionDto>>(
      `/api/v1/ai-models/versions/${versionId}`
    );
    return res.data.data;
  },

  /**
   * POST /api/v1/ai-models
   * Đăng ký mô hình AI mới
   */
  async createAiModel(dto: CreateAiModelDto): Promise<AiModelDto> {
    const res = await apiClient.post<ApiResponse<AiModelDto>>("/api/v1/ai-models", dto);
    return res.data.data;
  },

  /**
   * POST /api/v1/ai-models/:id/versions
   * Đăng ký phiên bản trọng số mới cho mô hình
   */
  async createAiModelVersion(
    modelId: string,
    dto: CreateAiModelVersionDto
  ): Promise<AiModelVersionDto> {
    const res = await apiClient.post<ApiResponse<AiModelVersionDto>>(
      `/api/v1/ai-models/${modelId}/versions`,
      dto
    );
    return res.data.data;
  },

  /**
   * PATCH /api/v1/ai-models/:id/versions/:versionId/deploy
   * Kích hoạt chuyển đổi nóng (Hot-swap deployment) phiên bản mô hình lên toàn hệ thống
   */
  async deployModelVersion(
    modelId: string,
    versionId: string
  ): Promise<AiModelVersionDto> {
    const res = await apiClient.patch<ApiResponse<AiModelVersionDto>>(
      `/api/v1/ai-models/${modelId}/versions/${versionId}/deploy`
    );
    return res.data.data;
  },
};
