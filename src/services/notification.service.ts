import { apiClient } from "@/lib/axios";
import type {
  BroadcastNotificationPayload,
  CreateNotificationTemplatePayload,
  EmailLogsListResponse,
  EmailLogsQueryParams,
  ListNotificationsQuery,
  NotificationItemDto,
  NotificationListResponse,
  NotificationPreferenceDto,
  NotificationTemplateItemDto,
  PreviewTemplatePayload,
  PreviewTemplateResponse,
  SendNotificationPayload,
  TemplateListResponse,
  TemplateQueryParams,
  TestSendTemplatePayload,
  UnreadCountResponse,
  UpdateNotificationPreferencePayload,
  UpdateNotificationTemplatePayload,
} from "@/types";

/**
 * Service tầng Thông báo (Notification Service) — Giao tiếp trực tiếp với Backend API qua apiClient.
 *
 * NGUYÊN TẮC:
 * 1. 1 hàm = 1 endpoint backend (RESTful).
 * 2. Gọi axios và unwrap dữ liệu an toàn.
 * 3. Không chứa side-effects (toast, navigation) ở tầng service.
 */
export const notificationService = {
  // ==========================================================================
  // 1. HỘP THƯ THÔNG BÁO (NOTIFICATION INBOX)
  // ==========================================================================

  /**
   * GET /api/v1/notifications
   * Lấy danh sách thông báo có phân trang, lọc mức độ, kênh, trạng thái và tìm kiếm.
   */
  async getNotifications(
    params?: ListNotificationsQuery,
  ): Promise<NotificationListResponse> {
    const res = await apiClient.get<
      unknown,
      NotificationListResponse | NotificationItemDto[]
    >("/notifications", {
      params,
    });

    if (
      res &&
      typeof res === "object" &&
      "data" in res &&
      Array.isArray((res as NotificationListResponse).data)
    ) {
      return res as NotificationListResponse;
    }

    if (Array.isArray(res)) {
      return {
        data: res,
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? res.length,
          total: res.length,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  /**
   * GET /api/v1/notifications/unread-count
   * Lấy tổng số lượng thông báo chưa đọc của người dùng hiện tại.
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<unknown, UnreadCountResponse | { unreadCount: number } | number>(
      "/notifications/unread-count",
    );

    if (typeof res === "number") return res;
    if (res && typeof res === "object" && "unreadCount" in res) {
      return (res as UnreadCountResponse).unreadCount;
    }
    return 0;
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   * Đánh dấu 1 thông báo là đã đọc.
   */
  async markAsRead(id: string): Promise<{ message: string }> {
    return (await apiClient.patch(`/notifications/${id}/read`)) as {
      message: string;
    };
  },

  /**
   * PATCH /api/v1/notifications/read-all
   * Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc.
   */
  async markAllAsRead(): Promise<{ message: string }> {
    return (await apiClient.patch("/notifications/read-all")) as {
      message: string;
    };
  },

  /**
   * DELETE /api/v1/notifications/:id
   * Xóa một thông báo khỏi hộp thư người dùng.
   */
  async deleteNotification(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/notifications/${id}`)) as {
      message: string;
    };
  },

  // ==========================================================================
  // 2. CẤU HÌNH KÊNH & NGƯỠNG CHỐNG ALERT FATIGUE (PREFERENCES)
  // ==========================================================================

  /**
   * GET /api/v1/notifications/preferences
   * Lấy danh sách cấu hình kênh nhận thông báo của người dùng hiện tại.
   */
  async getPreferences(): Promise<NotificationPreferenceDto[]> {
    const res = await apiClient.get<unknown, NotificationPreferenceDto[]>(
      "/notifications/preferences",
    );
    return Array.isArray(res) ? res : [];
  },

  /**
   * PUT /api/v1/notifications/preferences
   * Cập nhật trạng thái bật/tắt hoặc ngưỡng độ nghiêm trọng tối thiểu của một kênh.
   */
  async updatePreference(
    payload: UpdateNotificationPreferencePayload,
  ): Promise<NotificationPreferenceDto> {
    return (await apiClient.put(
      "/notifications/preferences",
      payload,
    )) as NotificationPreferenceDto;
  },

  // ==========================================================================
  // 3. PHÁT THÔNG BÁO HỆ THỐNG & CHỈ ĐỊNH (BROADCAST & DIRECT SEND)
  // ==========================================================================

  /**
   * POST /api/v1/notifications/broadcast
   * Gửi thông báo khẩn cấp toàn hệ thống (yêu cầu quyền NOTIFICATION_CREATE).
   */
  async broadcastNotification(
    payload: BroadcastNotificationPayload,
  ): Promise<{ message: string }> {
    return (await apiClient.post(
      "/notifications/broadcast",
      payload,
    )) as { message: string };
  },

  /**
   * POST /api/v1/notifications/send
   * Gửi thông báo đến danh sách người dùng chỉ định (yêu cầu quyền NOTIFICATION_CREATE).
   */
  async sendNotification(
    payload: SendNotificationPayload,
  ): Promise<{ message: string }> {
    return (await apiClient.post("/notifications/send", payload)) as {
      message: string;
    };
  },

  // ==========================================================================
  // 4. MẪU THÔNG BÁO (NOTIFICATION TEMPLATES - ADMIN/MANAGER)
  // ==========================================================================

  /**
   * GET /api/v1/notifications/templates
   * Lấy danh sách mẫu thông báo có phân trang và tìm kiếm.
   */
  async getTemplates(
    params?: TemplateQueryParams,
  ): Promise<TemplateListResponse> {
    const res = await apiClient.get<
      unknown,
      TemplateListResponse | NotificationTemplateItemDto[]
    >("/notifications/templates", { params });

    if (
      res &&
      typeof res === "object" &&
      "data" in res &&
      Array.isArray((res as TemplateListResponse).data)
    ) {
      return res as TemplateListResponse;
    }

    if (Array.isArray(res)) {
      return {
        data: res,
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? res.length,
          total: res.length,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  /**
   * GET /api/v1/notifications/templates/:code
   * Lấy thông tin chi tiết một mẫu thông báo theo mã code.
   */
  async getTemplateByCode(
    code: string,
  ): Promise<NotificationTemplateItemDto> {
    return (await apiClient.get(
      `/notifications/templates/${code}`,
    )) as NotificationTemplateItemDto;
  },

  /**
   * POST /api/v1/notifications/templates
   * Tạo mẫu thông báo mới (yêu cầu quyền NOTIFICATION_TEMPLATE_MANAGE).
   */
  async createTemplate(
    payload: CreateNotificationTemplatePayload,
  ): Promise<NotificationTemplateItemDto> {
    return (await apiClient.post(
      "/notifications/templates",
      payload,
    )) as NotificationTemplateItemDto;
  },

  /**
   * PUT /api/v1/notifications/templates/:id
   * Cập nhật nội dung câu chữ hoặc tiêu đề của mẫu thông báo.
   */
  async updateTemplate(
    id: string,
    payload: UpdateNotificationTemplatePayload,
  ): Promise<NotificationTemplateItemDto> {
    return (await apiClient.put(
      `/notifications/templates/${id}`,
      payload,
    )) as NotificationTemplateItemDto;
  },

  /**
   * DELETE /api/v1/notifications/templates/:id
   * Xóa mẫu thông báo.
   */
  async deleteTemplate(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(
      `/notifications/templates/${id}`,
    )) as { message: string };
  },

  /**
   * POST /api/v1/notifications/templates/:code/preview
   * Xem trước nội dung mẫu thông báo sau khi điền các biến dữ liệu giả lập.
   */
  async previewTemplate(
    code: string,
    payload: PreviewTemplatePayload,
  ): Promise<PreviewTemplateResponse> {
    return (await apiClient.post(
      `/notifications/templates/${code}/preview`,
      payload,
    )) as PreviewTemplateResponse;
  },

  /**
   * POST /api/v1/notifications/templates/:code/test-send
   * Gửi thử nghiệm mẫu thông báo tới email hoặc in-app để duyệt nội dung.
   */
  async testSendTemplate(
    code: string,
    payload: TestSendTemplatePayload,
  ): Promise<{ message: string }> {
    return (await apiClient.post(
      `/notifications/templates/${code}/test-send`,
      payload,
    )) as { message: string };
  },

  // ==========================================================================
  // 5. NHẬT KÝ HÀNG ĐỢI EMAIL (EMAIL QUEUE & LOGS - ADMIN)
  // ==========================================================================

  /**
   * GET /api/v1/notifications/emails
   * Lấy danh sách email trong hàng đợi gửi (yêu cầu quyền NOTIFICATION_READ).
   */
  async getEmailLogs(
    params?: EmailLogsQueryParams,
  ): Promise<EmailLogsListResponse> {
    const res = await apiClient.get<
      unknown,
      EmailLogsListResponse | EmailLogsListResponse["data"]
    >("/notifications/emails", { params });

    if (
      res &&
      typeof res === "object" &&
      "data" in res &&
      Array.isArray((res as EmailLogsListResponse).data)
    ) {
      return res as EmailLogsListResponse;
    }

    if (Array.isArray(res)) {
      return {
        data: res,
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? res.length,
          total: res.length,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  /**
   * POST /api/v1/notifications/emails/:id/retry
   * Lên lịch thử lại gửi email bị lỗi.
   */
  async retryEmail(id: string): Promise<{ message: string }> {
    return (await apiClient.post(
      `/notifications/emails/${id}/retry`,
    )) as { message: string };
  },
};
