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

function unwrapPaginated<T>(res: any): { items: T[]; meta?: PaginationMeta } {
  if (!res) return { items: [] };
  if (Array.isArray(res)) return { items: res };
  const raw = res as any;
  const items = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const meta = raw.meta ?? raw.data?.meta;
  return { items, meta };
}

export const incidentService = {
  /**
   * GET /api/v1/incidents
   * Lấy danh sách sự cố an toàn có bộ lọc và phân trang.
   */
  async getIncidents(
    params?: IncidentQueryParams,
  ): Promise<{ items: IncidentItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<unknown, any>("/incidents", {
      params,
    });
    return unwrapPaginated<IncidentItem>(res);
  },

  /**
   * GET /api/v1/incidents/:id
   * Lấy chi tiết sự cố kèm bằng chứng hình ảnh và nhật ký phân công.
   */
  async getIncidentById(id: string): Promise<IncidentItem> {
    const res = await apiClient.get<unknown>(`/incidents/${id}`);
    return unwrapData<IncidentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/review
   * Thẩm duyệt sự cố: Xác nhận (CONFIRMED) hoặc Bác bỏ (DISMISSED).
   */
  async reviewIncident(id: string, payload: ReviewIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/review`,
      payload,
    );
    return unwrapData<IncidentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/resolve
   * Đánh dấu sự cố đã được khắc phục tại hiện trường.
   */
  async resolveIncident(id: string, payload: ResolveIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/resolve`,
      payload,
    );
    return unwrapData<IncidentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/close
   * Nghiệm thu và đóng hoàn tất hồ sơ sự cố.
   */
  async closeIncident(id: string, payload?: CloseIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/close`,
      payload || {},
    );
    return unwrapData<IncidentItem>(res);
  },

  /**
   * GET /api/v1/incidents/:id/assignments
   * Lấy lịch sử phân công cán bộ xử lý sự cố.
   */
  async getAssignments(id: string): Promise<IncidentAssignmentItem[]> {
    const res = await apiClient.get<unknown>(
      `/incidents/${id}/assignments`,
    );
    return unwrapArray<IncidentAssignmentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/assignments
   * Phân công cán bộ an toàn điều phối hiện trường.
   */
  async assignOfficer(
    id: string,
    payload: CreateAssignmentPayload,
  ): Promise<IncidentAssignmentItem> {
    const finalPayload = {
      assignedTo: payload.assignedTo || payload.assignedToUserId,
      priority: payload.priority,
      deadline: payload.deadline,
      note: payload.note,
    };
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/assignments`,
      finalPayload,
    );
    return unwrapData<IncidentAssignmentItem>(res);
  },

  /**
   * GET /api/v1/incidents/:id/comments
   * Lấy danh sách trao đổi bình luận nội bộ.
   */
  async getComments(id: string): Promise<IncidentCommentItem[]> {
    const res = await apiClient.get<unknown>(
      `/incidents/${id}/comments`,
    );
    return unwrapArray<IncidentCommentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/comments
   * Gửi bình luận trao đổi hiện trường.
   */
  async addComment(id: string, comment: string): Promise<IncidentCommentItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/comments`,
      { comment },
    );
    return unwrapData<IncidentCommentItem>(res);
  },

  /**
   * GET /api/v1/evidences/:id/download-url
   * Lấy link presigned tải ảnh bằng chứng gốc từ MinIO.
   */
  async getEvidenceDownloadUrl(evidenceId: string): Promise<{ downloadUrl: string; expiresIn: number }> {
    const res = await apiClient.get<unknown>(
      `/evidences/${evidenceId}/download-url`,
    );
    return unwrapData<{ downloadUrl: string; expiresIn: number }>(res);
  },

  /**
   * GET /api/v1/evidences/:id/verify-checksum
   * Giám định tính toàn vẹn mã băm SHA-256 chống can thiệp bằng chứng.
   */
  async verifyEvidenceIntegrity(evidenceId: string): Promise<ChecksumVerifyResult> {
    const res = await apiClient.get<unknown>(
      `/evidences/${evidenceId}/verify-checksum`,
    );
    return unwrapData<ChecksumVerifyResult>(res);
  },

  /**
   * DELETE /api/v1/incidents/:id
   * Xóa hồ sơ sự cố.
   */
  async deleteIncident(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/incidents/${id}`,
    );
    return { message: res?.message || "Incident deleted successfully" };
  },
};
