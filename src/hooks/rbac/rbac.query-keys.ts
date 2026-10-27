import type { PermissionQueryParams, RoleQueryParams } from "@/types";

/**
 * Factory tập trung quản lý React Query Keys cho RBAC.
 * Giúp invalidate hoặc refetch cache đồng bộ, tránh phân mảnh key string.
 */
export const rbacKeys = {
  all: ["rbac"] as const,
  roles: () => [...rbacKeys.all, "roles"] as const,
  rolesList: (params?: RoleQueryParams) => [...rbacKeys.roles(), "list", params] as const,
  roleDetail: (id: string) => [...rbacKeys.roles(), "detail", id] as const,
  rolePermissions: (id: string) => [...rbacKeys.roles(), "permissions", id] as const,
  permissions: () => [...rbacKeys.all, "permissions"] as const,
  permissionsList: (params?: PermissionQueryParams) =>
    [...rbacKeys.permissions(), "list", params] as const,
};
