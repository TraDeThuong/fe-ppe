import axios from "axios";
import { apiClient } from "@/lib/axios";
import type { StatusCountsSupportedFilters } from "@/lib/incident-counts";
import type {
  ChecksumVerifyResult,
  CloseIncidentPayload,
  CreateAssignmentPayload,
  CreateEvidencePayload,
  CreateIncidentPayload,
  EvidenceItem,
  EvidenceQueryParams,
  EvidenceType,
  EvidenceUploadUrlResponse,
  FeedbackDatasetItem,
  FeedbackDatasetQueryParams,
  IncidentAssignmentItem,
  IncidentCommentItem,
  IncidentItem,
  IncidentQueryParams,
  IncidentStatusCounts,
  PaginationMeta,
  RequestEvidenceUploadUrlPayload,
  ResolveIncidentPayload,
  ReviewIncidentPayload,
  UpdateIncidentPayload,
} from "@/types";

/** Số mẫu mỗi trang khi xuất feedback dataset (BE giới hạn `limit` tối đa 100). */
export const FEEDBACK_EXPORT_PAGE_SIZE = 100;
/** Số trang tối đa gom cho một lần xuất. */
export const FEEDBACK_EXPORT_MAX_PAGES = 10;
/** Trần số mẫu trong một tệp xuất; vượt trần thì tệp chỉ gồm các mẫu mới nhất. */
export const FEEDBACK_EXPORT_MAX_SAMPLES = FEEDBACK_EXPORT_PAGE_SIZE * FEEDBACK_EXPORT_MAX_PAGES;

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

function serializeCameraIdsParam(
  cameraIds?: string[] | string,
): { empty: true } | { empty: false; value?: string } {
  if (cameraIds === undefined) return { empty: false, value: undefined };
  if (Array.isArray(cameraIds)) {
    const cleaned = cameraIds.map((id) => id.trim()).filter(Boolean);
    if (cleaned.length === 0) return { empty: true };
    return { empty: false, value: cleaned.join(",") };
  }
  const trimmed = cameraIds.trim();
  return { empty: false, value: trimmed || undefined };
}

export const incidentService = {
  /**
   * GET /api/v1/incidents
   * Lấy danh sách sự cố an toàn có bộ lọc và phân trang.
   */
  async getIncidents(
    params?: IncidentQueryParams,
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<{ items: IncidentItem[]; meta?: PaginationMeta }> {
    const camIds = serializeCameraIdsParam(params?.cameraIds);
    if (camIds.empty) {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      return {
        items: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }

    let sanitizedParams: Record<string, unknown> | undefined;
    if (params) {
      const { zoneId: _ignoredZoneId, cameraIds: _rawCamIds, ...rest } = params;
      sanitizedParams = {
        ...rest,
        ...(camIds.value ? { cameraIds: camIds.value } : {}),
      };
    }

    const res = await apiClient.get<unknown, any>("/incidents", {
      params: sanitizedParams,
      signal: options?.signal,
      ...(options?.suppressToast ? { suppressToast: true } : {}),
    } as Record<string, unknown>);
    return unwrapPaginated<IncidentItem>(res);
  },

  /**
   * POST /api/v1/incidents
   * Tạo mới một sự cố an toàn lao động PPE.
   */
  async createIncident(payload: CreateIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<unknown>("/incidents", payload);
    return unwrapData<IncidentItem>(res);
  },

  /**
   * GET /api/v1/incidents/:id
   * Lấy chi tiết sự cố kèm bằng chứng hình ảnh và nhật ký phân công.
   */
  async getIncidentById(
    id: string,
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<IncidentItem> {
    const res = await apiClient.get<unknown>(`/incidents/${id}`, {
      signal: options?.signal,
      ...(options?.suppressToast ? { suppressToast: true } : {}),
    } as Record<string, unknown>);
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
   * POST /api/v1/incidents/batch-review
   * Duyệt hoặc bác bỏ hàng loạt sự cố đang chờ thẩm duyệt.
   */
  async batchReviewIncidents(payload: {
    ids: string[];
    action: "CONFIRM" | "REJECT";
    resolutionNote?: string;
  }): Promise<{
    total: number;
    updatedCount: number;
    action: "CONFIRM" | "REJECT";
    newStatus: string;
    updatedIds: string[];
  }> {
    const res = await apiClient.post<unknown>("/incidents/batch-review", payload);
    return unwrapData(res);
  },

  /**
   * GET /api/v1/incidents/status-counts
   * Đếm nhanh số lượng sự cố theo trạng thái/mức độ cho Dashboard KPI.
   */
  async getStatusCounts(
    params?: StatusCountsSupportedFilters & {
      startDate?: string;
      endDate?: string;
    },
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<IncidentStatusCounts> {
    const camIds = serializeCameraIdsParam(params?.cameraIds);
    if (camIds.empty) {
      return {
        total: 0,
        pendingReview: 0,
        confirmed: 0,
        critical: 0,
        resolved: 0,
        closed: 0,
        dismissed: 0,
        bySeverity: {},
        byViolationType: {},
        remediated: 0,
        falseAlarms: 0,
      };
    }

    // BE chỉ áp dụng site / camera / khoảng ngày; tham số khác bị bỏ qua lặng lẽ nên không gửi.
    // Bộ đếm theo đủ bộ lọc danh sách nằm ở `fetchFilteredStatusCounts` (src/lib/incident-counts.ts).
    let sanitizedParams: Record<string, unknown> | undefined;
    if (params) {
      const supported = {
        siteId: params.siteId || undefined,
        cameraId: params.cameraId || undefined,
        cameraIds: camIds.value,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
        startDate: params.startDate || undefined,
        endDate: params.endDate || undefined,
      };
      sanitizedParams = Object.fromEntries(
        Object.entries(supported).filter(([, value]) => value !== undefined),
      );
    }

    const res = await apiClient.get<unknown>("/incidents/status-counts", {
      params: sanitizedParams,
      signal: options?.signal,
      ...(options?.suppressToast ? { suppressToast: true } : {}),
    } as Record<string, unknown>);
    const data = unwrapData<IncidentStatusCounts>(res);
    const requiredCounts = ["total", "pendingReview", "confirmed", "critical", "resolved", "closed", "dismissed"] as const;
    if (!data ||
        requiredCounts.some((key) => !Number.isSafeInteger(data[key]) || data[key] < 0) ||
        data.resolved < data.closed) {
      throw new Error("Invalid incident status counts");
    }
    return data;
  },

  /**
   * GET /api/v1/incidents/feedback-dataset
   * Truy xuất dữ liệu phản hồi Human Review (TRUE_VIOLATION / FALSE_ALARM) phục vụ cải tiến AI (D08).
   */
  async getFeedbackDataset(
    params?: FeedbackDatasetQueryParams,
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<{ items: FeedbackDatasetItem[]; meta?: PaginationMeta }> {
    const camIds = serializeCameraIdsParam(params?.cameraIds);
    if (camIds.empty) {
      return {
        items: [],
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          total: 0,
          totalPages: 0,
        },
      };
    }

    let sanitizedParams: Record<string, unknown> | undefined;
    if (params) {
      const { cameraIds: _rawCamIds, ...rest } = params;
      sanitizedParams = {
        ...rest,
        ...(camIds.value ? { cameraIds: camIds.value } : {}),
      };
    }

    const res = await apiClient.get<unknown>("/incidents/feedback-dataset", {
      params: sanitizedParams,
      signal: options?.signal,
      ...(options?.suppressToast ? { suppressToast: true } : {}),
    } as Record<string, unknown>);
    return unwrapPaginated<FeedbackDatasetItem>(res);
  },

  /**
   * Gom tối đa `maxPages` (mặc định 10 trang x 100 = 1.000 mẫu) từ /incidents/feedback-dataset
   * để xuất tệp JSON / CSV phục vụ huấn luyện lại mô hình AI.
   */
  async exportFeedbackDatasetAll(
    params?: Omit<FeedbackDatasetQueryParams, "page" | "limit">,
    options?: { maxPages?: number; signal?: AbortSignal },
  ): Promise<{ items: FeedbackDatasetItem[]; total: number }> {
    const limit = FEEDBACK_EXPORT_PAGE_SIZE;
    const maxPages = Math.max(1, Math.min(20, options?.maxPages ?? FEEDBACK_EXPORT_MAX_PAGES));
    const first = await incidentService.getFeedbackDataset(
      { ...params, page: 1, limit },
      { signal: options?.signal },
    );
    const collected: FeedbackDatasetItem[] = [...first.items];
    const total = first.meta?.total ?? collected.length;
    const totalPages = Math.min(first.meta?.totalPages ?? 1, maxPages);

    for (let page = 2; page <= totalPages; page += 1) {
      if (options?.signal?.aborted) break;
      const next = await incidentService.getFeedbackDataset(
        { ...params, page, limit },
        { signal: options?.signal, suppressToast: true },
      );
      collected.push(...next.items);
    }

    return { items: collected, total };
  },

  /**
   * POST /api/v1/incidents/:id/resolve
   * Đánh dấu sự cố đã được khắc phục tại hiện trường.
   */
  async resolveIncident(id: string, payload: ResolveIncidentPayload): Promise<IncidentItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${id}/resolve`,
      { resolutionNote: payload.resolutionNote },
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
  async getAssignments(
    id: string,
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<IncidentAssignmentItem[]> {
    const res = await apiClient.get<unknown>(`/incidents/${id}/assignments`, {
      signal: options?.signal,
      ...(options?.suppressToast ? { suppressToast: true } : {}),
    } as Record<string, unknown>);
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
   * GET /api/v1/evidences/:id
   * Lấy thông tin chi tiết một tệp bằng chứng số.
   */
  async getEvidenceById(evidenceId: string): Promise<EvidenceItem> {
    const res = await apiClient.get<unknown>(`/evidences/${evidenceId}`);
    return unwrapData<EvidenceItem>(res);
  },

  /**
   * GET /api/v1/evidences/:id/download-url
   * Lấy link presigned tải ảnh bằng chứng gốc từ MinIO (hỗ trợ action VIEW | DOWNLOAD).
   */
  async getEvidenceDownloadUrl(
    evidenceId: string,
    params?: { action?: "VIEW" | "DOWNLOAD"; expiresInSeconds?: number },
    options?: { signal?: AbortSignal; suppressToast?: boolean },
  ): Promise<{ downloadUrl: string; expiresInSeconds?: number; expiresIn?: number; fileName?: string; mimeType?: string }> {
    const res = await apiClient.get<unknown>(
      `/evidences/${evidenceId}/download-url`,
      { params, ...options },
    );
    return unwrapData<{ downloadUrl: string; expiresInSeconds?: number; expiresIn?: number; fileName?: string; mimeType?: string }>(res);
  },

  /**
   * PUT <presignedEvidenceUploadUrl>
   */
  async uploadEvidenceToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
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

  /**
   * PUT /api/v1/incidents/:id
   * Cập nhật thông tin phân loại, mức độ hoặc mô tả sự cố.
   */
  async updateIncident(
    id: string,
    payload: UpdateIncidentPayload,
  ): Promise<IncidentItem> {
    const res = await apiClient.put<unknown>(`/incidents/${id}`, payload);
    return unwrapData<IncidentItem>(res);
  },

  /**
   * POST /api/v1/incidents/:id/evidences
   * Thêm bằng chứng số mới (ảnh chụp / video clip) vào sự cố.
   */
  async addEvidence(
    incidentId: string,
    payload: CreateEvidencePayload,
  ): Promise<EvidenceItem> {
    const res = await apiClient.post<unknown>(
      `/incidents/${incidentId}/evidences`,
      payload,
    );
    return unwrapData<EvidenceItem>(res);
  },

  /**
   * POST /api/v1/evidences/upload-url
   * Lấy presigned URL để tải lên tệp bằng chứng trực tiếp lên MinIO.
   */
  async requestEvidenceUploadUrl(
    payload: RequestEvidenceUploadUrlPayload,
  ): Promise<EvidenceUploadUrlResponse> {
    const res = await apiClient.post<unknown>(
      "/evidences/upload-url",
      payload,
    );
    return unwrapData<EvidenceUploadUrlResponse>(res);
  },

  /**
   * GET /api/v1/evidences
   * Lấy danh sách toàn bộ bằng chứng số có lọc và phân trang.
   */
  async getAllEvidences(
    params?: EvidenceQueryParams,
  ): Promise<{ items: EvidenceItem[]; meta?: PaginationMeta }> {
    const res = await apiClient.get<unknown>("/evidences", { params });
    return unwrapPaginated<EvidenceItem>(res);
  },

  /**
   * DELETE /api/v1/evidences/:id
   * Xóa một tệp bằng chứng số khỏi hệ thống.
   */
  async deleteEvidence(evidenceId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<unknown, any>(
      `/evidences/${evidenceId}`,
    );
    return { message: res?.message || "Evidence deleted successfully" };
  },

  /**
   * POST /api/v1/evidences/direct-upload
   * Tải tệp bằng chứng thực tế lên Object Storage (MinIO) và liên kết trực tiếp vào sự cố.
   */
  async uploadEvidenceDirect(data: {
    incidentId: string;
    cameraId: string;
    evidenceType?: EvidenceType | string;
    file: File | Blob;
    fileName?: string;
    aiDetections?: Record<string, unknown>;
  }): Promise<EvidenceItem> {
    const formData = new FormData();
    formData.append("incidentId", data.incidentId);
    formData.append("cameraId", data.cameraId);
    formData.append("evidenceType", data.evidenceType || "SNAPSHOT");
    if (data.aiDetections) {
      formData.append("aiDetections", JSON.stringify(data.aiDetections));
    }
    const finalFile =
      data.file instanceof File
        ? data.file
        : new File(
            [data.file],
            data.fileName || `evidence_${Date.now()}.jpg`,
            { type: "image/jpeg" },
          );
    formData.append("file", finalFile);

    const res = await apiClient.post<unknown>("/evidences/direct-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrapData<EvidenceItem>(res);
  },
};
