"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { handleMutationError, type MutationHookOptions } from "@/hooks/auth/auth-hook-utils";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { toast } from "@/lib/toast";
import { rbacService } from "@/services/rbac.service";
import { rbacKeys } from "./rbac.query-keys";
import type {
  AssignUserRolePayload,
  CreateRolePayload,
  RoleDto,
  SyncRolePermissionsPayload,
  UpdateRolePayload,
} from "@/types";

/**
 * Hook tạo vai trò mới (POST /api/v1/rbac/roles).
 */
export function useCreateRole(
  options?: MutationHookOptions<RoleDto, CreateRolePayload>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: CreateRolePayload) => rbacService.createRole(payload),
    onSuccess: async (...args) => {
      const [role] = args;
      await queryClient.invalidateQueries({ queryKey: rbacKeys.roles() });
      toast.success(`Đã tạo vai trò "${role.name}" thành công.`);
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface UpdateRoleVariables {
  id: string;
  payload: UpdateRolePayload;
}

/**
 * Hook cập nhật thông tin vai trò (PUT /api/v1/rbac/roles/:id).
 */
export function useUpdateRole(
  options?: MutationHookOptions<RoleDto, UpdateRoleVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, payload }: UpdateRoleVariables) =>
      rbacService.updateRole(id, payload),
    onSuccess: async (...args) => {
      const [role] = args;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacKeys.roles() }),
        queryClient.invalidateQueries({ queryKey: rbacKeys.roleDetail(role.id) }),
      ]);
      toast.success(`Đã cập nhật vai trò "${role.name}" thành công.`);
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface DeleteRoleVariables {
  id: string;
  name?: string;
}

/**
 * Hook xóa vai trò (DELETE /api/v1/rbac/roles/:id).
 */
export function useDeleteRole(
  options?: MutationHookOptions<{ message: string }, DeleteRoleVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id }: DeleteRoleVariables) => rbacService.deleteRole(id),
    onSuccess: async (...args) => {
      const [, variables] = args;
      await queryClient.invalidateQueries({ queryKey: rbacKeys.roles() });
      toast.success(
        variables.name
          ? `Đã xóa vai trò "${variables.name}" thành công.`
          : "Đã xóa vai trò thành công.",
      );
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface SyncPermissionsVariables {
  roleId: string;
  permissionIds: string[];
  roleName?: string;
}

/**
 * Hook đồng bộ phân quyền cho vai trò (POST /api/v1/rbac/roles/:id/permissions).
 *
 * ĐẶC ĐIỂM:
 * - Invalidate cache roles và permissions của role.
 * - Nếu vai trò đang cập nhật trùng với roleId của user hiện tại, tự động invalidate
 *   authKeys.me() để session của user nhận ngay quyền mới mà không cần đăng nhập lại.
 */
export function useSyncRolePermissions(
  options?: MutationHookOptions<RoleDto, SyncPermissionsVariables>,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ roleId, permissionIds }: SyncPermissionsVariables) => {
      const payload: SyncRolePermissionsPayload = { permissionIds };
      return rbacService.syncRolePermissions(roleId, payload);
    },
    onSuccess: async (...args) => {
      const [role, variables] = args;

      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: rbacKeys.roles() }),
        queryClient.invalidateQueries({ queryKey: rbacKeys.roleDetail(variables.roleId) }),
        queryClient.invalidateQueries({ queryKey: rbacKeys.rolePermissions(variables.roleId) }),
      ];

      // Nếu cập nhật vai trò của chính người dùng hiện tại -> refresh auth/me
      if (user?.roleId === variables.roleId || user?.role === role.name) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: authKeys.me() }));
      }

      await Promise.all(invalidations);

      toast.success(`Đã cập nhật quyền cho vai trò "${role.name}" thành công.`);
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface AssignUserRoleVariables {
  userId: string;
  payload: AssignUserRolePayload;
}

/**
 * Hook gán vai trò cho người dùng (PUT /api/v1/rbac/users/:id/role).
 */
export function useAssignUserRole(
  options?: MutationHookOptions<{ message: string }, AssignUserRoleVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ userId, payload }: AssignUserRoleVariables) =>
      rbacService.assignUserRole(userId, payload),
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rbacKeys.roles() }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]);
      toast.success("Đã phân vai trò cho người dùng thành công.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
