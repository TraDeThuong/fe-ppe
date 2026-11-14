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
   * GET /api/v1/users
   * Lấy danh sách người dùng có phân trang, tìm kiếm và lọc vai trò/trạng thái.
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
   * Tổng hợp số liệu người dùng (total, active, twoFactor, locked) từ GET /api/v1/users
   * (khớp với smart-ppe-identity-service trên nhánh origin/develop).
   */
  async getUserSummary(): Promise<{ total: number; active: number; twoFactor: number; locked: number }> {
    const limit = 100;
    const firstPage = await this.getUsers({ page: 1, limit });
    const users = [...firstPage.data];
    const totalPages = Math.min(firstPage.meta?.totalPages ?? 1, 20);

    if (totalPages > 1) {
      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          this.getUsers({ page: i + 2, limit }).catch(() => null),
        ),
      );
      for (const pageRes of restPages) {
        if (pageRes?.data?.length) {
          users.push(...pageRes.data);
        }
      }
    }

    const nowMs = Date.now();
    let active = 0;
    let twoFactor = 0;
    let locked = 0;

    for (const user of users) {
      const lockedUntilMs = user.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
      const isLocked = !user.isActive || (Number.isFinite(lockedUntilMs) && lockedUntilMs > nowMs);
      if (isLocked) {
        locked++;
      } else {
        active++;
      }
      if (user.twoFactorEnabled) {
        twoFactor++;
      }
    }

    return {
      total: firstPage.meta?.total ?? users.length,
      active,
      twoFactor,
      locked,
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
