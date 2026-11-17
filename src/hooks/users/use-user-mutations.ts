"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { handleMutationError, type MutationHookOptions } from "@/hooks/auth/auth-hook-utils";
import { pickLocaleText } from "@/lib/i18n-runtime";
import { toast } from "@/lib/toast";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";
import type {
  AdminResetPasswordPayload,
  AdminResetPasswordResponseDto,
  CreateUserPayload,
  UpdateUserPayload,
  UserResponseDto,
} from "@/types";

/**
 * Hook tạo người dùng mới (POST /api/v1/users).
 */
export function useCreateUser(
  options?: MutationHookOptions<UserResponseDto, CreateUserPayload>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (payload: CreateUserPayload) => userService.createUser(payload),
    onSuccess: async (...args) => {
      const [user] = args;
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      if (!options?.suppressToast) {
        const displayName = user.fullName || user.email;
        toast.success(
          pickLocaleText(
            `Đã tạo tài khoản cho "${displayName}" thành công.`,
            `Account created for "${displayName}".`,
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface UpdateUserVariables {
  id: string;
  payload: UpdateUserPayload;
}

/**
 * Hook cập nhật thông tin người dùng (PUT /api/v1/users/:id).
 */
export function useUpdateUser(
  options?: MutationHookOptions<UserResponseDto, UpdateUserVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, payload }: UpdateUserVariables) => userService.updateUser(id, payload),
    onSuccess: async (...args) => {
      const [user, variables] = args;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) }),
      ]);
      if (!options?.suppressToast) {
        const displayName = user.fullName || user.email;
        toast.success(
          pickLocaleText(
            `Đã cập nhật thông tin cho "${displayName}" thành công.`,
            `Updated profile for "${displayName}".`,
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook xóa mềm người dùng (DELETE /api/v1/users/:id).
 */
export function useDeleteUser(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: async (...args) => {
      const [, id] = args;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]);
      if (!options?.suppressToast) {
        toast.success(
          pickLocaleText(
            "Đã xóa tài khoản người dùng thành công.",
            "User account deleted successfully.",
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook khôi phục tài khoản người dùng bị xóa mềm (POST /api/v1/users/:id/restore).
 */
export function useRestoreUser(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (id: string) => userService.restoreUser(id),
    onSuccess: async (...args) => {
      const [, id] = args;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]);
      if (!options?.suppressToast) {
        toast.success(
          pickLocaleText(
            "Đã khôi phục tài khoản người dùng thành công.",
            "User account restored successfully.",
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface AdminResetPasswordVariables {
  id: string;
  payload: AdminResetPasswordPayload;
}

export interface AssignUserSitesVariables {
  id: string;
  siteIds: string[];
}

/**
 * Hook gán danh sách công trường cho người dùng (PUT /api/v1/users/:id/sites).
 */
export function useAssignUserSites(
  options?: MutationHookOptions<UserResponseDto, AssignUserSitesVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, siteIds }: AssignUserSitesVariables) =>
      userService.assignUserSites(id, siteIds),
    onSuccess: async (...args) => {
      const [user, variables] = args;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) }),
      ]);
      if (!options?.suppressToast) {
        const displayName = user.fullName || user.email;
        toast.success(
          pickLocaleText(
            `Đã phân công công trường cho "${displayName}" thành công.`,
            `Assigned sites to "${displayName}".`,
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

/**
 * Hook Admin đặt lại mật khẩu cho người dùng (POST /api/v1/users/:id/reset-password).
 */
export function useAdminResetPassword(
  options?: MutationHookOptions<AdminResetPasswordResponseDto, AdminResetPasswordVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ id, payload }: AdminResetPasswordVariables) =>
      userService.adminResetPassword(id, payload),
    onSuccess: async (...args) => {
      const [, variables] = args;
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      if (!options?.suppressToast) {
        toast.success(
          pickLocaleText(
            "Đã đặt lại mật khẩu thành công.",
            "Password reset successfully.",
          ),
        );
      }
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
