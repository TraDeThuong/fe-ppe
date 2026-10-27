/**
 * Contract RBAC (Role-Based Access Control) theo Backend smart-ppe-identity-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-identity-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-identity-service/src/modules/rbac/rbac.dto.ts & rbac.validation.ts
 * - Routes: smart-ppe-identity-service/src/modules/rbac/rbac.route.ts
 */

// ============================================================================
// 1. CÁC HẰNG SỐ VAI TRÒ & NHÓM QUYỀN (CONSTANTS & ENUMS)
// ============================================================================

/** Tên 5 vai trò hệ thống mặc định */
export const SYSTEM_ROLES = {
  ADMIN: "ADMIN",
  SAFETY_MANAGER: "SAFETY_MANAGER",
  SAFETY_OFFICER: "SAFETY_OFFICER",
  MANAGER: "MANAGER",
  USER: "USER",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * 21 nhóm tài nguyên (Resource Domains) được quản lý trong hệ thống Smart PPE.
 */
export const PERMISSION_RESOURCES = {
  // Giám sát & An toàn công trường
  PPE_INCIDENT: "PPE_INCIDENT",
  PPE_CAMERA: "PPE_CAMERA",
  PPE_SITE: "PPE_SITE",
  PPE_ZONE: "PPE_ZONE",
  PPE_RESTRICTED_AREA: "PPE_RESTRICTED_AREA",
  PPE_SAFETY_CONFIG: "PPE_SAFETY_CONFIG",

  // Báo cáo & Trí tuệ nhân tạo (AI)
  PPE_REPORTING: "PPE_REPORTING",
  PPE_AI_METRICS: "PPE_AI_METRICS",
  PPE_MODEL: "PPE_MODEL",

  // Định danh & Phân quyền
  USER: "USER",
  ROLE: "ROLE",
  PERMISSION: "PERMISSION",
  ROLE_PERMISSION: "ROLE_PERMISSION",

  // Cấu hình & Vận hành hệ thống
  NOTIFICATION: "NOTIFICATION",
  NOTIFICATION_TEMPLATE: "NOTIFICATION_TEMPLATE",
  AUDIT_LOG: "AUDIT_LOG",
  MAINTENANCE: "MAINTENANCE",
  API_KEY: "API_KEY",
  WEBHOOK: "WEBHOOK",
  SYSTEM_CONFIG: "SYSTEM_CONFIG",
  CRON_JOB: "CRON_JOB",
  FILE: "FILE",
} as const;

export type PermissionResource =
  (typeof PERMISSION_RESOURCES)[keyof typeof PERMISSION_RESOURCES];

/** 4 nhóm danh mục tài nguyên phân cấp lớn phục vụ hiển thị UI trực quan */
export const RESOURCE_CATEGORIES = {
  MONITORING: "MONITORING",
  ANALYTICS: "ANALYTICS",
  IDENTITY: "IDENTITY",
  SYSTEM: "SYSTEM",
} as const;

export type ResourceCategory =
  (typeof RESOURCE_CATEGORIES)[keyof typeof RESOURCE_CATEGORIES];

/** Ánh xạ từng resource vào 1 trong 4 danh mục lớn */
export const RESOURCE_CATEGORY_MAP: Record<PermissionResource, ResourceCategory> = {
  PPE_INCIDENT: RESOURCE_CATEGORIES.MONITORING,
  PPE_CAMERA: RESOURCE_CATEGORIES.MONITORING,
  PPE_SITE: RESOURCE_CATEGORIES.MONITORING,
  PPE_ZONE: RESOURCE_CATEGORIES.MONITORING,
  PPE_RESTRICTED_AREA: RESOURCE_CATEGORIES.MONITORING,
  PPE_SAFETY_CONFIG: RESOURCE_CATEGORIES.MONITORING,

  PPE_REPORTING: RESOURCE_CATEGORIES.ANALYTICS,
  PPE_AI_METRICS: RESOURCE_CATEGORIES.ANALYTICS,
  PPE_MODEL: RESOURCE_CATEGORIES.ANALYTICS,

  USER: RESOURCE_CATEGORIES.IDENTITY,
  ROLE: RESOURCE_CATEGORIES.IDENTITY,
  PERMISSION: RESOURCE_CATEGORIES.IDENTITY,
  ROLE_PERMISSION: RESOURCE_CATEGORIES.IDENTITY,

  NOTIFICATION: RESOURCE_CATEGORIES.SYSTEM,
  NOTIFICATION_TEMPLATE: RESOURCE_CATEGORIES.SYSTEM,
  AUDIT_LOG: RESOURCE_CATEGORIES.SYSTEM,
  MAINTENANCE: RESOURCE_CATEGORIES.SYSTEM,
  API_KEY: RESOURCE_CATEGORIES.SYSTEM,
  WEBHOOK: RESOURCE_CATEGORIES.SYSTEM,
  SYSTEM_CONFIG: RESOURCE_CATEGORIES.SYSTEM,
  CRON_JOB: RESOURCE_CATEGORIES.SYSTEM,
  FILE: RESOURCE_CATEGORIES.SYSTEM,
};

// ============================================================================
// 2. DTO QUYỀN HẠN (PERMISSIONS)
// ============================================================================

/** Quyền hạn đơn lẻ theo contract Backend */
export interface PermissionDto {
  id: string;
  name: string;
  description: string | null;
  resource: PermissionResource | string;
  action: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Cấu trúc nhóm quyền hạn theo Resource phục vụ hiển thị Accordion/Grid UI */
export interface ResourcePermissionGroup {
  resource: PermissionResource | string;
  category: ResourceCategory;
  permissions: PermissionDto[];
  total: number;
}

// ============================================================================
// 3. DTO VAI TRÒ (ROLES)
// ============================================================================

/** Thông tin vai trò đầy đủ kèm danh sách quyền và số lượng người dùng */
export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  /** Số lượng người dùng đang được gán vai trò này */
  userCount: number;
  /** Danh sách quyền chi tiết được cấp cho vai trò */
  permissions: PermissionDto[];
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu phân trang từ Backend */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response danh sách vai trò có phân trang (khi không bị client unwrap) */
export interface RoleListResponse {
  data: RoleDto[];
  meta: PaginationMeta;
}

/** Tham số tìm kiếm và lọc danh sách vai trò */
export interface RoleQueryParams {
  search?: string;
  sortBy?: "name" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/** Tham số truy vấn danh mục quyền */
export interface PermissionQueryParams {
  resource?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// 4. PAYLOADS ĐỘNG THÁI (MUTATIONS)
// ============================================================================

/** Payload tạo vai trò mới (POST /api/v1/rbac/roles) */
export interface CreateRolePayload {
  /** Tên vai trò chỉ gồm chữ hoa, số và dấu gạch dưới (VD: SAFETY_AUDITOR) */
  name: string;
  description?: string;
  /** Danh sách ID quyền được cấp ban đầu cho vai trò */
  permissionIds?: string[];
}

/** Payload cập nhật thông tin vai trò (PUT /api/v1/rbac/roles/:id) */
export interface UpdateRolePayload {
  /** Lưu ý: Backend cấm đổi tên đối với vai trò hệ thống (isSystem = true) */
  name?: string;
  description?: string;
}

/** Payload đồng bộ toàn bộ quyền cho vai trò (POST /api/v1/rbac/roles/:id/permissions) */
export interface SyncRolePermissionsPayload {
  /** Backend yêu cầu tối thiểu 1 ID quyền */
  permissionIds: string[];
}

/** Payload gán vai trò cho người dùng (PUT /api/v1/rbac/users/:id/role) */
export interface AssignUserRolePayload {
  roleId: string;
}
