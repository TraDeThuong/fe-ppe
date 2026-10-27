"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { handleMutationError, type MutationHookOptions } from "@/hooks/auth/auth-hook-utils";
import { toast } from "@/lib/toast";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";
import type { ApiError } from "@/lib/axios";
import type { UserDeviceDto, UserSessionDto } from "@/types";

export interface UseUserSessionsOptions
  extends Omit<
    UseQueryOptions<UserSessionDto[], ApiError, UserSessionDto[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook truy vấn danh sách phiên làm việc đang hoạt động của người dùng.
 */
export function useUserSessions(userId: string, options?: UseUserSessionsOptions) {
  return useQuery({
    queryKey: userKeys.sessions(userId),
    queryFn: () => userService.getUserSessions(userId),
    enabled: Boolean(userId) && (options?.enabled !== undefined ? options.enabled : true),
    ...options,
  });
}

export interface RevokeSessionVariables {
  userId: string;
  sessionId: string;
}

/**
 * Hook thu hồi 1 phiên đăng nhập cụ thể của người dùng.
 */
export function useRevokeUserSession(
  options?: MutationHookOptions<{ message: string }, RevokeSessionVariables>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: ({ userId, sessionId }: RevokeSessionVariables) =>
      userService.revokeUserSession(userId, sessionId),
    onSuccess: async (...args) => {
      const [, variables] = args;
      await queryClient.invalidateQueries({ queryKey: userKeys.sessions(variables.userId) });
      toast.success("Đã thu hồi phiên đăng nhập thành công.");
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
 * Hook thu hồi tất cả các phiên đăng nhập của người dùng (đăng xuất khỏi tất cả thiết bị).
 */
export function useRevokeAllUserSessions(
  options?: MutationHookOptions<{ message: string }, string>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options ?? {};

  return useMutation({
    ...restOptions,
    mutationFn: (userId: string) => userService.revokeAllUserSessions(userId),
    onSuccess: async (...args) => {
      const [, userId] = args;
      await queryClient.invalidateQueries({ queryKey: userKeys.sessions(userId) });
      toast.success("Đã đăng xuất người dùng khỏi tất cả các thiết bị.");
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      const [error] = args;
      handleMutationError(error, options?.suppressToast);
      await onError?.(...args);
    },
  });
}

export interface UseUserDevicesOptions
  extends Omit<
    UseQueryOptions<UserDeviceDto[], ApiError, UserDeviceDto[], readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook truy vấn danh sách thiết bị người dùng đã từng đăng nhập.
 */
export function useUserDevices(userId: string, options?: UseUserDevicesOptions) {
  return useQuery({
    queryKey: userKeys.devices(userId),
    queryFn: () => userService.getUserDevices(userId),
    enabled: Boolean(userId) && (options?.enabled !== undefined ? options.enabled : true),
    ...options,
  });
}
