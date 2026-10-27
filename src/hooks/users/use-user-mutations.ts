"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { handleMutationError, type MutationHookOptions } from "@/hooks/auth/auth-hook-utils";
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
      await queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success(`Đã tạo tài khoản cho "${user.fullName || user.email}" thành công.`);
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
        queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) }),
      ]);
      toast.success(`Đã cập nhật thông tin cho "${user.fullName || user.email}" thành công.`);
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
 * Hook xóa mềm (khóa) người dùng (DELETE /api/v1/users/:id).
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
        queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]);
      toast.success("Đã khóa tài khoản người dùng thành công.");
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
        queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]);
      toast.success("Đã khôi phục tài khoản người dùng thành công.");
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
      toast.success("Đã đặt lại mật khẩu thành công.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}
