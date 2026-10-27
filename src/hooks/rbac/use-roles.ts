"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { rbacService } from "@/services/rbac.service";
import { rbacKeys } from "./rbac.query-keys";
import type { ApiError } from "@/lib/axios";
import type { RoleDto, RoleQueryParams } from "@/types";

export interface UseRolesOptions
  extends Omit<
    UseQueryOptions<RoleDto[], ApiError, RoleDto[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh sách vai trò (kèm danh sách quyền và số lượng người dùng).
 *
 * ĐẶC ĐIỂM:
 * - Tự động cập nhật theo params (search, sort, pagination).
 * - staleTime: 60s để tránh gọi lại API liên tục khi đóng mở modal.
 */
export function useRoles(params?: RoleQueryParams, options?: UseRolesOptions) {
  return useQuery({
    queryKey: rbacKeys.rolesList(params),
    queryFn: () => rbacService.getRoles(params),
    staleTime: 60 * 1000,
    ...options,
  });
}

export interface UseRoleDetailOptions
  extends Omit<
    UseQueryOptions<RoleDto, ApiError, RoleDto, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy chi tiết một vai trò theo ID.
 */
export function useRoleDetail(id: string, options?: UseRoleDetailOptions) {
  return useQuery({
    queryKey: rbacKeys.roleDetail(id),
    queryFn: () => rbacService.getRoleById(id),
    enabled: Boolean(id) && (options?.enabled !== undefined ? options.enabled : true),
    staleTime: 60 * 1000,
    ...options,
  });
}
