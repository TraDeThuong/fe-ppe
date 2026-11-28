import { apiClient } from "@/lib/axios";
import { stripEmojis } from "@/lib/strip-emojis";
import type {
  BroadcastNotificationPayload,
  CreateNotificationTemplatePayload,
  DispatchIncidentNotificationPayload,
  DispatchIncidentNotificationResult,
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
  SendZaloTestPayload,
  ZaloAdminBotInfoDto,
  ZaloAdminWebhookResultDto,
  ZaloBotStatusDto,
  ZaloLinkTokenDto,
  ZaloTestResultDto,
  ZaloUnlinkResultDto,
} from "@/types";

/**
 * Service tầng Thông báo (Notification Service) — Giao tiếp trực tiếp với Backend API qua apiClient.
 *
 * NGUYÊN TẮC:
 * 1. 1 hàm = 1 endpoint backend (RESTful).
 * 2. Gọi axios và unwrap dữ liệu an toàn.
 * 3. Không chứa side-effects (toast, navigation) ở tầng service.
 */
/** Chuẩn hóa item thông báo từ API, loại bỏ emoji khỏi title/content hiển thị */
function sanitizeNotificationItem(item: NotificationItemDto): NotificationItemDto {
  return {
    ...item,
    title: stripEmojis(item.title),
    content: stripEmojis(item.content),
  };
}

/** Chuẩn hóa mẫu thông báo từ API, loại bỏ emoji khỏi tên/tiêu đề/nội dung */
function sanitizeTemplateItem(
  tpl: NotificationTemplateItemDto,
): NotificationTemplateItemDto {
  return {
    ...tpl,
    name: stripEmojis(tpl.name),
    subjectTemplate: tpl.subjectTemplate
      ? stripEmojis(tpl.subjectTemplate)
      : tpl.subjectTemplate,
    contentTemplate: stripEmojis(tpl.contentTemplate),
  };
}

/** Chuẩn hóa tham số ngày YYYY-MM-DD sang ISO 8601 (UTC Z) tương thích z.string().datetime({ offset: true }) của Backend */
function normalizeNotificationDateParam(
  raw: string | undefined,
  endOfDay: boolean,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const date = endOfDay
      ? new Date(year, month, day, 23, 59, 59, 999)
      : new Date(year, month, day, 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
  }
  return trimmed;
}

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
    options?: { signal?: AbortSignal; strictPagination?: boolean },
  ): Promise<NotificationListResponse> {
    const normalizedParams =
      params && (params.fromDate || params.toDate)
        ? {
            ...params,
            ...(params.fromDate
              ? { fromDate: normalizeNotificationDateParam(params.fromDate, false) }
              : {}),
            ...(params.toDate
              ? { toDate: normalizeNotificationDateParam(params.toDate, true) }
              : {}),
          }
        : params;

    const res = await apiClient.get<
      unknown,
      NotificationListResponse | NotificationItemDto[]
    >("/notifications", {
      params: normalizedParams,
      signal: options?.signal,
    });

    if (
      res &&
      typeof res === "object" &&
      "data" in res &&
      Array.isArray((res as NotificationListResponse).data)
    ) {
      const typed = res as NotificationListResponse;
      if (options?.strictPagination && !typed.meta) throw new Error("Thiếu metadata phân trang hộp thư.");
      return {
        ...typed,
        data: typed.data.map(sanitizeNotificationItem),
      };
    }

    if (Array.isArray(res)) {
      if (options?.strictPagination) throw new Error("Thiếu metadata phân trang hộp thư.");
      return {
        data: res.map(sanitizeNotificationItem),
        meta: {
          page: params?.page ?? 1,
          limit: params?.limit ?? res.length,
          total: res.length,
          totalPages: 1,
        },
      };
    }

    if (options?.strictPagination) throw new Error("Phản hồi hộp thư không hợp lệ.");
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

  /**
   * PATCH /api/v1/notifications/archive-read
   * Lưu trữ toàn bộ thông báo đã đọc của người dùng hiện tại trên server.
   */
  async archiveAllRead(): Promise<{ archivedCount: number }> {
    const res = await apiClient.patch<unknown, { archivedCount?: number }>(
      "/notifications/archive-read",
    );
    return {
      archivedCount:
        res && typeof res === "object" && typeof res.archivedCount === "number"
          ? res.archivedCount
          : 0,
    };
  },

  /**
   * PATCH /api/v1/notifications/:id/archive
   * Lưu trữ một thông báo trên server.
   */
  async archiveNotification(id: string): Promise<{ message: string }> {
    return (await apiClient.patch(`/notifications/${id}/archive`)) as {
      message: string;
    };
  },

  /**
   * PATCH /api/v1/notifications/:id/unarchive
   * Khôi phục một thông báo đã lưu trữ về hộp thư trên server.
   */
  async unarchiveNotification(id: string): Promise<{ message: string }> {
    return (await apiClient.patch(`/notifications/${id}/unarchive`)) as {
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

  /**
   * POST /api/v1/notifications/trigger-incident
   * Phát đi cảnh báo vi phạm PPE tới người dùng và cán bộ phụ trách.
   */
  async triggerIncidentNotification(
    payload: DispatchIncidentNotificationPayload,
  ): Promise<DispatchIncidentNotificationResult> {
    return (await apiClient.post(
      "/notifications/trigger-incident",
      payload,
    )) as DispatchIncidentNotificationResult;
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
      const typed = res as TemplateListResponse;
      return {
        ...typed,
        data: typed.data.map(sanitizeTemplateItem),
      };
    }

    if (Array.isArray(res)) {
      return {
        data: res.map(sanitizeTemplateItem),
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
    const res = (await apiClient.get(
      `/notifications/templates/${code}`,
    )) as NotificationTemplateItemDto;
    return sanitizeTemplateItem(res);
  },

  /**
   * POST /api/v1/notifications/templates
   * Tạo mẫu thông báo mới (yêu cầu quyền NOTIFICATION_TEMPLATE_MANAGE).
   */
  async createTemplate(
    payload: CreateNotificationTemplatePayload,
  ): Promise<NotificationTemplateItemDto> {
    const res = (await apiClient.post(
      "/notifications/templates",
      payload,
    )) as NotificationTemplateItemDto;
    return sanitizeTemplateItem(res);
  },

  /**
   * PUT /api/v1/notifications/templates/:id
   * Cập nhật nội dung câu chữ hoặc tiêu đề của mẫu thông báo.
   */
  async updateTemplate(
    id: string,
    payload: UpdateNotificationTemplatePayload,
  ): Promise<NotificationTemplateItemDto> {
    const res = (await apiClient.put(
      `/notifications/templates/${id}`,
      payload,
    )) as NotificationTemplateItemDto;
    return sanitizeTemplateItem(res);
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
    const res = (await apiClient.post(
      `/notifications/templates/${code}/preview`,
      payload,
    )) as PreviewTemplateResponse;
    return {
      ...res,
      subject: res.subject ? stripEmojis(res.subject) : res.subject,
      content: stripEmojis(res.content),
      html: res.html ? stripEmojis(res.html) : res.html,
    };
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
      const typed = res as EmailLogsListResponse;
      return {
        ...typed,
        data: typed.data.map((log) => ({
          ...log,
          subject: stripEmojis(log.subject),
        })),
      };
    }

    if (Array.isArray(res)) {
      return {
        data: res.map((log) => ({
          ...log,
          subject: stripEmojis(log.subject),
        })),
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

  // ==========================================================================
  // 6. KÊNH ZALO BOT PLATFORM (ZALO_BOT)
  // ==========================================================================

  /**
   * GET /api/v1/notifications/zalo/status
   * Trạng thái cấu hình Bot trên server và liên kết hội thoại Zalo của người dùng hiện tại.
   */
  async getZaloStatus(): Promise<ZaloBotStatusDto> {
    return (await apiClient.get("/notifications/zalo/status")) as ZaloBotStatusDto;
  },

  /**
   * POST /api/v1/notifications/zalo/link-token (rate-limited)
   * Tạo mã liên kết dùng 1 lần (hết hạn sau 10 phút) để gửi lệnh /link cho Bot.
   */
  async createZaloLinkToken(): Promise<ZaloLinkTokenDto> {
    return (await apiClient.post("/notifications/zalo/link-token")) as ZaloLinkTokenDto;
  },

  /**
   * DELETE /api/v1/notifications/zalo/binding
   * Hủy liên kết Zalo Bot; BE tự tắt preference ZALO_BOT.
   */
  async unlinkZalo(): Promise<ZaloUnlinkResultDto> {
    return (await apiClient.delete("/notifications/zalo/binding")) as ZaloUnlinkResultDto;
  },

  /**
   * POST /api/v1/notifications/zalo/test (rate-limited)
   * Gửi tin nhắn thử tới hội thoại Zalo đã liên kết.
   */
  async sendZaloTest(payload?: SendZaloTestPayload): Promise<ZaloTestResultDto> {
    return (await apiClient.post(
      "/notifications/zalo/test",
      payload ?? {},
    )) as ZaloTestResultDto;
  },

  /**
   * GET /api/v1/notifications/zalo/admin/info (NOTIFICATION_TEMPLATE_MANAGE)
   */
  async getZaloAdminInfo(): Promise<ZaloAdminBotInfoDto> {
    return (await apiClient.get(
      "/notifications/zalo/admin/info",
    )) as ZaloAdminBotInfoDto;
  },

  /**
   * POST /api/v1/notifications/zalo/admin/webhook (NOTIFICATION_TEMPLATE_MANAGE)
   * URL phải là HTTPS công khai.
   */
  async setZaloAdminWebhook(url: string): Promise<ZaloAdminWebhookResultDto> {
    return (await apiClient.post("/notifications/zalo/admin/webhook", {
      url,
    })) as ZaloAdminWebhookResultDto;
  },

  /**
   * DELETE /api/v1/notifications/zalo/admin/webhook (NOTIFICATION_TEMPLATE_MANAGE)
   */
  async deleteZaloAdminWebhook(): Promise<{ deleted: boolean }> {
    return (await apiClient.delete("/notifications/zalo/admin/webhook")) as {
      deleted: boolean;
    };
  },
};
