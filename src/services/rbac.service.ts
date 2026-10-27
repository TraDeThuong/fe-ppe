import { apiClient } from "@/lib/axios";
import type {
  AssignUserRolePayload,
  CreateRolePayload,
  PermissionDto,
  PermissionQueryParams,
  RoleDto,
  RoleQueryParams,
  SyncRolePermissionsPayload,
  UpdateRolePayload,
} from "@/types";

/**
 * Service tầng RBAC — Giao tiếp trực tiếp với Backend API qua apiClient (Traefik gateway / Identity service).
 *
 * NGUYÊN TẮC:
 * 1. 1 hàm = 1 endpoint backend (chuẩn RESTful).
 * 2. Gọi axios và trả về dữ liệu (interceptor trong apiClient đã unwrap data và chuẩn hóa ApiError).
 * 3. Không chứa side-effects (toast, router navigation) ở tầng service.
 */
export const rbacService = {
  // ── 1. Quản lý Vai trò (Roles) ──────────────────────────────────────────

  /**
   * GET /api/v1/rbac/roles
   * Lấy danh sách các vai trò (kèm danh sách quyền và số lượng người dùng).
   */
  async getRoles(params?: RoleQueryParams): Promise<RoleDto[]> {
    const res = await apiClient.get<unknown, RoleDto[] | { data: RoleDto[] }>("/rbac/roles", {
      params,
    });
    // Trả về trực tiếp mảng RoleDto (xử lý an toàn nếu kết quả là { data: [...] } hoặc [...])
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * GET /api/v1/rbac/roles/:id
   * Lấy thông tin chi tiết của một vai trò theo ID.
   */
  async getRoleById(id: string): Promise<RoleDto> {
    return (await apiClient.get(`/rbac/roles/${id}`)) as RoleDto;
  },

  /**
   * POST /api/v1/rbac/roles
   * Tạo vai trò mới (chữ in hoa, gạch dưới, mô tả và quyền khởi tạo tùy chọn).
   */
  async createRole(payload: CreateRolePayload): Promise<RoleDto> {
    return (await apiClient.post("/rbac/roles", payload)) as RoleDto;
  },

  /**
   * PUT /api/v1/rbac/roles/:id
   * Cập nhật thông tin vai trò (Backend tự động chặn đổi tên nếu là System role).
   */
  async updateRole(id: string, payload: UpdateRolePayload): Promise<RoleDto> {
    return (await apiClient.put(`/rbac/roles/${id}`, payload)) as RoleDto;
  },

  /**
   * DELETE /api/v1/rbac/roles/:id
   * Xóa vai trò (Backend tự động chặn xóa nếu là System role hoặc còn user đang gán).
   */
  async deleteRole(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/rbac/roles/${id}`)) as { message: string };
  },

  // ── 2. Quản lý Quyền hạn (Permissions) ─────────────────────────────────

  /**
   * GET /api/v1/rbac/permissions
   * Lấy danh mục tất cả quyền hệ thống (mặc định lấy toàn bộ khi không truyền limit).
   */
  async getPermissions(params?: PermissionQueryParams): Promise<PermissionDto[]> {
    const res = await apiClient.get<unknown, PermissionDto[] | { data: PermissionDto[] }>(
      "/rbac/permissions",
      {
        params: {
          limit: 100, // Đảm bảo lấy đủ toàn bộ 54 quyền hệ thống
          ...params,
        },
      },
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * GET /api/v1/rbac/roles/:id/permissions
   * Lấy danh sách quyền được cấp riêng cho một vai trò.
   */
  async getRolePermissions(roleId: string): Promise<PermissionDto[]> {
    const res = await apiClient.get<unknown, PermissionDto[] | { data: PermissionDto[] }>(
      `/rbac/roles/${roleId}/permissions`,
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  /**
   * POST /api/v1/rbac/roles/:id/permissions
   * Đồng bộ / Cập nhật toàn bộ quyền cho vai trò.
   * Có cơ chế Anti-lockout: ADMIN luôn phải giữ ROLE_PERMISSION_ASSIGN.
   */
  async syncRolePermissions(
    roleId: string,
    payload: SyncRolePermissionsPayload,
  ): Promise<RoleDto> {
    return (await apiClient.post(`/rbac/roles/${roleId}/permissions`, payload)) as RoleDto;
  },

  /**
   * DELETE /api/v1/rbac/roles/:id/permissions/:permissionId
   * Gỡ bỏ 1 quyền cụ thể khỏi vai trò.
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<RoleDto> {
    return (await apiClient.delete(
      `/rbac/roles/${roleId}/permissions/${permissionId}`,
    )) as RoleDto;
  },

  /**
   * PUT /api/v1/rbac/users/:id/role
   * Gán vai trò cho người dùng cụ thể.
   */
  async assignUserRole(userId: string, payload: AssignUserRolePayload): Promise<{ message: string }> {
    return (await apiClient.put(`/rbac/users/${userId}/role`, payload)) as { message: string };
  },
};
