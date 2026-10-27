import type { PaginationMeta } from "./rbac.types";

/**
 * Contract quản lý người dùng (User Management) theo Backend smart-ppe-identity-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-identity-service/prisma/schema.prisma (model User, UserDevice, RefreshToken)
 * - DTOs & Validation: smart-ppe-identity-service/src/modules/users/user.dto.ts & user.validation.ts
 * - Routes: smart-ppe-identity-service/src/modules/users/user.route.ts
 */

// ============================================================================
// 1. DTO THÔNG TIN NGƯỜI DÙNG (USER DTOs)
// ============================================================================

export interface UserRoleSummary {
  id: string;
  name: string;
}

/** Thông tin người dùng trả về từ API backend */
export interface UserResponseDto {
  id: string;
  email: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  roleId: string;
  role?: UserRoleSummary;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  mustChangePassword?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | Date | null;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Alias chuẩn hóa */
export type UserDto = UserResponseDto;

/** DTO phản hồi khi Admin đặt lại mật khẩu */
export interface AdminResetPasswordResponseDto extends UserResponseDto {
  /** Mật khẩu tạm thời được hệ thống sinh ngẫu nhiên (nếu Admin không tự nhập) */
  temporaryPassword?: string;
}

// ============================================================================
// 2. DTO PHIÊN ĐĂNG NHẬP & THIẾT BỊ (SESSIONS & DEVICES)
// ============================================================================

export interface UserSessionDto {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string | Date;
  createdAt: string | Date;
  isCurrent?: boolean;
}

export interface UserDeviceDto {
  id: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  lastLoginAt?: string | Date | null;
  createdAt: string | Date;
}

// ============================================================================
// 3. THAM SỐ TRUY VẤN & PHÂN TRANG (QUERY PARAMS)
// ============================================================================

export type UserSortBy = "createdAt" | "email" | "fullName";
export type SortOrder = "asc" | "desc";

export interface UserQueryParams {
  search?: string;
  email?: string;
  fullName?: string;
  roleName?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  sortBy?: UserSortBy;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

/** Cấu trúc danh sách người dùng kèm phân trang */
export interface UserListResponse {
  data: UserResponseDto[];
  meta: PaginationMeta;
}

// ============================================================================
// 4. PAYLOADS ĐỘNG THÁI (MUTATIONS)
// ============================================================================

/** Payload tạo người dùng mới (POST /api/v1/users) */
export interface CreateUserPayload {
  email: string;
  password: string;
  roleId: string;
  fullName?: string;
  phoneNumber?: string;
  mustChangePassword?: boolean;
}

/** Payload cập nhật thông tin người dùng (PUT /api/v1/users/:id) */
export interface UpdateUserPayload {
  fullName?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

/** Payload Admin đặt lại mật khẩu cho người dùng (POST /api/v1/users/:id/reset-password) */
export interface AdminResetPasswordPayload {
  /** Mật khẩu mới tự đặt (nếu để trống, backend tự sinh chuỗi ngẫu nhiên) */
  newPassword?: string;
  /** Bắt buộc người dùng đổi mật khẩu khi đăng nhập lần đầu (mặc định true) */
  mustChangePassword?: boolean;
}
