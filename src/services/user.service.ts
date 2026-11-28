import { apiClient } from "@/lib/axios";
import type {
  AdminResetPasswordPayload,
  AdminResetPasswordResponseDto,
  CreateUserPayload,
  UpdateUserPayload,
  UserDeviceDto,
  UserListResponse,
  UserQueryParams,
  UserResponseDto,
  UserSessionDto,
} from "@/types";

/**
 * Service tầng Người dùng (User Management) — Giao tiếp trực tiếp với Backend API qua apiClient.
 *
 * NGUYÊN TẮC:
 * 1. 1 hàm = 1 endpoint backend (RESTful).
 * 2. Gọi axios và unwrap dữ liệu an toàn.
 * 3. Không chứa side-effects (toast, navigation) ở tầng service.
 */
export const userService = {
  /**
   * GET /api/v1/users/site-staff?siteId= (hợp đồng mục 5, chờ BE): nhân sự đang hoạt động của một
   * công trường, dùng được với PPE_INCIDENT_READ (không cần USER_READ), BE giới hạn theo công trường
   * của người gọi. Trả `null` khi BE chưa có endpoint (404/405/501) để nơi gọi dùng cách cũ.
   */
  async getSiteStaff(
    siteId: string,
    options?: { signal?: AbortSignal },
  ): Promise<UserResponseDto[] | null> {
    try {
      const res = await apiClient.get<unknown, unknown>("/users/site-staff", {
        params: { siteId },
        signal: options?.signal,
        suppressToast: true,
      } as Record<string, unknown>);
      const raw = res as { data?: unknown } | unknown[] | null;
      const list = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
          ? ((raw as { data: unknown[] }).data)
          : null;
      if (!list) return null;
      return (list as UserResponseDto[]).filter((u) => u && typeof u.id === "string");
    } catch (error) {
      const status = Number((error as { status?: unknown })?.status);
      // BE hiện tại khớp nhầm route `/users/:id` → 422 "Invalid user ID format"; 403 khi thiếu quyền.
      const errors = (error as { errors?: Array<{ field?: string }> })?.errors;
      const matchedUserIdRoute =
        (status === 400 || status === 422) && Array.isArray(errors) && errors.some((e) => e?.field === "id");
      if (status === 403 || status === 404 || status === 405 || status === 501 || matchedUserIdRoute) return null;
      throw error;
    }
  },

  /**
   * GET /api/v1/users
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc vai trò/trạng thái (bao gồm twoFactorEnabled và isLocked).
   */
  async getUsers(params?: UserQueryParams): Promise<UserListResponse> {
    const res = await apiClient.get<unknown, UserListResponse | UserResponseDto[]>("/users", {
      params,
    });

    // Trường hợp apiClient trả về object đầy đủ { data, meta }
    if (res && typeof res === "object" && "data" in res && Array.isArray((res as UserListResponse).data)) {
      return res as UserListResponse;
    }

    // Trường hợp fallback nếu chỉ trả mảng data
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
   * Tải toàn bộ danh sách người dùng khớp điều kiện truy vấn (quét tối đa 20 trang x 100 bản ghi).
   */
  async getAllUsers(
    params?: Omit<UserQueryParams, "page" | "limit">,
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    const limit = 100;
    const safeParams: Omit<UserQueryParams, "page" | "limit"> = {
      ...params,
    };
    const firstPage = await this.getUsers({ ...safeParams, page: 1, limit });
    const users = [...firstPage.data];
    const totalPages = Math.min(firstPage.meta?.totalPages ?? 1, 20);

    if (totalPages > 1) {
      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          this.getUsers({ ...safeParams, page: i + 2, limit }).catch(() => null),
        ),
      );
      for (const pageRes of restPages) {
        if (pageRes?.data?.length) {
          users.push(...pageRes.data);
        }
      }
    }

    return {
      data: users,
      total: firstPage.meta?.total ?? users.length,
    };
  },

  /**
   * GET /api/v1/users/summary
   * Tổng hợp số liệu người dùng (total, active, twoFactor, locked, byRole) bằng 1 request từ Backend.
   */
  async getUserSummary(): Promise<{
    total: number;
    active: number;
    twoFactor: number;
    locked: number;
    byRole: Record<string, number>;
  }> {
    const res = await apiClient.get<
      unknown,
      {
        total?: number;
        active?: number;
        twoFactor?: number;
        locked?: number;
        byRole?: Record<string, number>;
      }
    >("/users/summary");

    return {
      total: Number(res?.total ?? 0),
      active: Number(res?.active ?? 0),
      twoFactor: Number(res?.twoFactor ?? 0),
      locked: Number(res?.locked ?? 0),
      byRole: res?.byRole ?? {},
    };
  },

  /**
   * GET /api/v1/users/:id
   * Lấy thông tin chi tiết một người dùng theo ID.
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    return (await apiClient.get(`/users/${id}`)) as UserResponseDto;
  },

  /**
   * POST /api/v1/users
   * Tạo tài khoản người dùng mới (dành riêng cho Admin).
   */
  async createUser(payload: CreateUserPayload): Promise<UserResponseDto> {
    return (await apiClient.post("/users", payload)) as UserResponseDto;
  },

  /**
   * PUT /api/v1/users/:id
   * Cập nhật thông tin người dùng (Họ tên, SĐT, Trạng thái kích hoạt).
   */
  async updateUser(id: string, payload: UpdateUserPayload): Promise<UserResponseDto> {
    return (await apiClient.put(`/users/${id}`, payload)) as UserResponseDto;
  },

  /**
   * PUT /api/v1/users/:id/sites
   * Gán danh sách công trường được phép truy cập cho người dùng (chỉ dành cho Admin).
   */
  async assignUserSites(id: string, siteIds: string[]): Promise<UserResponseDto> {
    return (await apiClient.put(`/users/${id}/sites`, { siteIds })) as UserResponseDto;
  },

  /**
   * DELETE /api/v1/users/:id
   * Xóa mềm (khóa) tài khoản người dùng.
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/users/${id}`)) as { message: string };
  },

  /**
   * POST /api/v1/users/:id/restore
   * Khôi phục tài khoản người dùng đã bị xóa mềm.
   */
  async restoreUser(id: string): Promise<{ message: string }> {
    return (await apiClient.post(`/users/${id}/restore`)) as { message: string };
  },

  /**
   * POST /api/v1/users/:id/reset-password
   * Admin đặt lại mật khẩu cho người dùng (có thể nhận mật khẩu tạm thời sinh ngẫu nhiên).
   */
  async adminResetPassword(
    id: string,
    payload: AdminResetPasswordPayload,
  ): Promise<AdminResetPasswordResponseDto> {
    return (await apiClient.post(
      `/users/${id}/reset-password`,
      payload,
    )) as AdminResetPasswordResponseDto;
  },

  /**
   * GET /api/v1/users/:id/sessions
   * Xem danh sách các phiên đăng nhập đang hoạt động của người dùng.
   */
  async getUserSessions(id: string): Promise<UserSessionDto[]> {
    const res = await apiClient.get<unknown, UserSessionDto[] | { data: UserSessionDto[] }>(
      `/users/${id}/sessions`,
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * DELETE /api/v1/users/:id/sessions/:sessionId
   * Thu hồi một phiên đăng nhập cụ thể của người dùng.
   */
  async revokeUserSession(id: string, sessionId: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/users/${id}/sessions/${sessionId}`)) as { message: string };
  },

  /**
   * DELETE /api/v1/users/:id/sessions
   * Thu hồi tất cả các phiên đăng nhập của người dùng.
   */
  async revokeAllUserSessions(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/users/${id}/sessions`)) as { message: string };
  },

  /**
   * GET /api/v1/users/:id/devices
   * Lấy danh sách các thiết bị người dùng đã từng đăng nhập.
   */
  async getUserDevices(id: string): Promise<UserDeviceDto[]> {
    const res = await apiClient.get<unknown, UserDeviceDto[] | { data: UserDeviceDto[] }>(
      `/users/${id}/devices`,
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * DELETE /api/v1/users/:id/devices/:deviceId
   * Xóa một thiết bị khỏi danh sách thiết bị tin cậy của người dùng.
   */
  async deleteUserDevice(id: string, deviceId: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/users/${id}/devices/${deviceId}`)) as { message: string };
  },
};
