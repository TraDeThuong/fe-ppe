import { apiClient } from "@/lib/axios";
import type {
  ChecksumVerifyResult,
  CloseIncidentPayload,
  CreateAssignmentPayload,
  IncidentAssignmentItem,
  IncidentCommentItem,
  IncidentItem,
  IncidentQueryParams,
  PaginationMeta,
  ResolveIncidentPayload,
  ReviewIncidentPayload,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export const incidentService = {
  /**
   * GET /api/v1/incidents
   * Lấy danh sách sự cố an toàn có bộ lọc và phân trang.
   */
  async getIncidents(
    params?: IncidentQueryParams,
  ): Promise<{ items: IncidentItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<ApiResponse<IncidentItem[]>>("/api/v1/incidents", {
      params,
    });
    return {
      items: res.data.data || [],
      meta: res.data.meta,
    };
  },

  /**
   * GET /api/v1/incidents/:id
   * Lấy chi tiết sự cố kèm bằng chứng hình ảnh và nhật ký phân công.
   */
  async getIncidentById(id: string): Promise<IncidentItem> {
    const res = await apiClient.get<ApiResponse<IncidentItem>>(`/api/v1/incidents/${id}`);
    return res.data.data;
  },

  /**
   * POST /api/v1/incidents/:id/review
   * Thẩm duyệt sự cố: Xác nhận (CONFIRMED) hoặc Bác bỏ (DISMISSED).
   */
  async reviewIncident(id: string, payload: ReviewIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<ApiResponse<IncidentItem>>(
      `/api/v1/incidents/${id}/review`,
      payload,
    );
    return res.data.data;
  },

  /**
   * POST /api/v1/incidents/:id/resolve
   * Đánh dấu sự cố đã được khắc phục tại hiện trường.
   */
  async resolveIncident(id: string, payload: ResolveIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<ApiResponse<IncidentItem>>(
      `/api/v1/incidents/${id}/resolve`,
      payload,
    );
    return res.data.data;
  },

  /**
   * POST /api/v1/incidents/:id/close
   * Nghiệm thu và đóng hoàn tất hồ sơ sự cố.
   */
  async closeIncident(id: string, payload?: CloseIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<ApiResponse<IncidentItem>>(
      `/api/v1/incidents/${id}/close`,
      payload || {},
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/incidents/:id/assignments
   * Lấy lịch sử phân công cán bộ xử lý sự cố.
   */
  async getAssignments(id: string): Promise<IncidentAssignmentItem[]> {
    const res = await apiClient.get<ApiResponse<IncidentAssignmentItem[]>>(
      `/api/v1/incidents/${id}/assignments`,
    );
    return res.data.data || [];
  },

  /**
   * POST /api/v1/incidents/:id/assignments
   * Phân công cán bộ an toàn điều phối hiện trường.
   */
  async assignOfficer(
    id: string,
    payload: CreateAssignmentPayload,
  ): Promise<IncidentAssignmentItem> {
    const res = await apiClient.post<ApiResponse<IncidentAssignmentItem>>(
      `/api/v1/incidents/${id}/assignments`,
      payload,
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/incidents/:id/comments
   * Lấy danh sách trao đổi bình luận nội bộ.
   */
  async getComments(id: string): Promise<IncidentCommentItem[]> {
    const res = await apiClient.get<ApiResponse<IncidentCommentItem[]>>(
      `/api/v1/incidents/${id}/comments`,
    );
    return res.data.data || [];
  },

  /**
   * POST /api/v1/incidents/:id/comments
   * Gửi bình luận trao đổi hiện trường.
   */
  async addComment(id: string, comment: string): Promise<IncidentCommentItem> {
    const res = await apiClient.post<ApiResponse<IncidentCommentItem>>(
      `/api/v1/incidents/${id}/comments`,
      { comment },
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/evidences/:id/download-url
   * Lấy link presigned tải ảnh bằng chứng gốc từ MinIO.
   */
  async getEvidenceDownloadUrl(evidenceId: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const res = await apiClient.get<ApiResponse<{ downloadUrl: string; expiresIn: number }>>(
      `/api/v1/evidences/${evidenceId}/download-url`,
    );
    return res.data.data;
  },

  /**
   * GET /api/v1/evidences/:id/verify-checksum
   * Giám định tính toàn vẹn mã băm SHA-256 chống can thiệp bằng chứng.
   */
  async verifyEvidenceIntegrity(evidenceId: string): Promise<ChecksumVerifyResult> {
    const res = await apiClient.get<ApiResponse<ChecksumVerifyResult>>(
      `/api/v1/evidences/${evidenceId}/verify-checksum`,
    );
    return res.data.data;
  },

  /**
   * DELETE /api/v1/incidents/:id
   * Xóa hồ sơ sự cố.
   */
  async deleteIncident(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/api/v1/incidents/${id}`,
    );
    return { message: res.data.message || "Incident deleted successfully" };
  },
};
