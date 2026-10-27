"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { rbacService } from "@/services/rbac.service";
import { rbacKeys } from "./rbac.query-keys";
import type { ApiError } from "@/lib/axios";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_MAP,
  type PermissionDto,
  type PermissionQueryParams,
  type PermissionResource,
  type ResourceCategory,
  type ResourcePermissionGroup,
} from "@/types";

export interface UsePermissionsOptions
  extends Omit<
    UseQueryOptions<PermissionDto[], ApiError, PermissionDto[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy danh mục tất cả 54 quyền hạn hệ thống.
 *
 * ĐẶC ĐIỂM:
 * - staleTime: 5 phút vì danh mục quyền hệ thống rất ổn định.
 */
export function usePermissions(
  params?: PermissionQueryParams,
  options?: UsePermissionsOptions,
) {
  return useQuery({
    queryKey: rbacKeys.permissionsList(params),
    queryFn: () => rbacService.getPermissions(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook lấy danh sách quyền của một vai trò cụ thể.
 */
export function useRolePermissions(roleId: string, options?: UsePermissionsOptions) {
  return useQuery({
    queryKey: rbacKeys.rolePermissions(roleId),
    queryFn: () => rbacService.getRolePermissions(roleId),
    enabled: Boolean(roleId) && (options?.enabled !== undefined ? options.enabled : true),
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Gom nhóm danh sách quyền theo 21 nhóm Resource và 4 danh mục lớn.
 */
export function groupPermissionsByResource(
  permissions: PermissionDto[] = [],
): ResourcePermissionGroup[] {
  const map = new Map<string, PermissionDto[]>();

  for (const perm of permissions) {
    const list = map.get(perm.resource) ?? [];
    list.push(perm);
    map.set(perm.resource, list);
  }

  const groups: ResourcePermissionGroup[] = [];

  for (const [resource, perms] of map.entries()) {
    const category: ResourceCategory =
      RESOURCE_CATEGORY_MAP[resource as PermissionResource] ?? RESOURCE_CATEGORIES.SYSTEM;

    groups.push({
      resource,
      category,
      permissions: perms,
      total: perms.length,
    });
  }

  return groups;
}

/**
 * Hook lấy danh mục quyền đã gom nhóm sẵn theo Resource và Category.
 * Phục vụ render Accordion, Tabs hoặc Ma trận phân quyền.
 */
export function useGroupedPermissions(params?: PermissionQueryParams) {
  const query = usePermissions(params);

  const grouped = useMemo(() => {
    return groupPermissionsByResource(query.data ?? []);
  }, [query.data]);

  const groupedByCategory = useMemo(() => {
    const categories: Record<ResourceCategory, ResourcePermissionGroup[]> = {
      MONITORING: [],
      ANALYTICS: [],
      IDENTITY: [],
      SYSTEM: [],
    };

    for (const group of grouped) {
      categories[group.category]?.push(group);
    }

    return categories;
  }, [grouped]);

  return {
    ...query,
    grouped,
    groupedByCategory,
  };
}
