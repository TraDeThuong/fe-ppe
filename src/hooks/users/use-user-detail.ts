"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";
import type { ApiError } from "@/lib/axios";
import type { UserResponseDto } from "@/types";

export interface UseUserDetailOptions
  extends Omit<
    UseQueryOptions<UserResponseDto, ApiError, UserResponseDto, readonly unknown[]>,
    "queryKey" | "queryFn"
  > {}

/**
 * Hook lấy thông tin chi tiết của 1 người dùng theo ID.
 */
export function useUserDetail(id: string, options?: UseUserDetailOptions) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUserById(id),
    enabled: Boolean(id) && (options?.enabled !== undefined ? options.enabled : true),
    staleTime: 60 * 1000,
    ...options,
  });
}
